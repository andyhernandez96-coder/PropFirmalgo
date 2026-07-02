"""
DAILY / WEEKLY REPORT — a scoreboard sent to your phone so you're not
reconstructing performance by hand from raw logs.

Two modes, one script (run it once a day; it figures out which report to send):
  DAILY  (every day):  trades closed since the last report, today's P&L,
                       today's P&L vs the 3% daily-loss limit, running
                       distance to the +10%/-5% challenge boundaries.
  WEEKLY (Sundays):    everything daily has, PLUS a real equity-curve PNG
                       chart built from output/equity_history.csv.

Data source: broker.closed_deals(since) — for MT5Broker this reads the
account's actual deal history (profit + commission + swap: the number the
prop firm sees), not the paper simulator's approximation. For a live-mode
report, connect to MT5 first; --test builds everything from synthetic
deals so the report format can be checked without a broker at hand.

State: output/report_state.json tracks the last time each report type ran,
so re-running this on a schedule (once a day) never double-sends.
Equity is appended to output/equity_history.csv every time this runs —
that history file, not any single day's MT5 call, is what the weekly
chart is drawn from, so it needs to run daily to have data for Sunday.

Schedule (Windows Task Scheduler): once a day, e.g. 21:05 UTC (after the NY
session closes) —
    python live/daily_report.py
"""

import argparse
import json
import os
import sys
from datetime import datetime, timedelta, timezone

import pandas as pd

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, REPO_ROOT)

from live.telegram_alerts import send_telegram, send_telegram_photo   # noqa: E402

STATE_PATH = os.path.join(REPO_ROOT, "output", "report_state.json")
EQUITY_HISTORY = os.path.join(REPO_ROOT, "output", "equity_history.csv")
CHART_PATH = os.path.join(REPO_ROOT, "output", "weekly_equity_chart.png")
LIVE_STATE = os.path.join(REPO_ROOT, "live_state.json")


# ---------------------------------------------------------------------------
def load_json(path, default=None):
    if os.path.exists(path):
        with open(path) as f:
            return json.load(f)
    return default


def save_json(path, obj):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w") as f:
        json.dump(obj, f, indent=2, default=str)


def append_equity_point(now, equity):
    """One row per calendar day — overwrite if we already logged today."""
    os.makedirs(os.path.dirname(EQUITY_HISTORY), exist_ok=True)
    row = pd.DataFrame([{"date": now.date().isoformat(), "equity": equity}])
    if os.path.exists(EQUITY_HISTORY):
        hist = pd.read_csv(EQUITY_HISTORY)
        hist = hist[hist["date"] != row["date"].iloc[0]]
        hist = pd.concat([hist, row], ignore_index=True)
    else:
        hist = row
    hist.to_csv(EQUITY_HISTORY, index=False)
    return hist


# ---------------------------------------------------------------------------
def summarize_deals(deals):
    if not deals:
        return {"n": 0, "pnl": 0.0, "wins": 0, "losses": 0,
                "win_rate": 0.0, "by_symbol": {}}
    df = pd.DataFrame(deals)
    wins = int((df["pnl"] > 0).sum())
    losses = int((df["pnl"] <= 0).sum())
    by_symbol = df.groupby("symbol")["pnl"].sum().round(2).to_dict()
    return {"n": len(df), "pnl": round(float(df["pnl"].sum()), 2),
            "wins": wins, "losses": losses,
            "win_rate": round(wins / len(df) * 100, 1) if len(df) else 0.0,
            "by_symbol": by_symbol}


def challenge_status(cfg, equity, challenge_start):
    dd_floor = challenge_start * (1 - cfg["max_drawdown"])
    target = challenge_start * (1 + cfg["profit_target"])
    dd_used_pct = max(0.0, (challenge_start - equity) / challenge_start * 100)
    progress_pct = (equity - challenge_start) / challenge_start * 100
    return {"dd_floor": dd_floor, "target": target,
            "dd_used_pct": round(dd_used_pct, 2),
            "dd_budget_pct": round(cfg["max_drawdown"] * 100, 2),
            "progress_pct": round(progress_pct, 2),
            "target_pct": round(cfg["profit_target"] * 100, 2)}


def format_daily(now, equity, today_deals, cfg, challenge_start, halted):
    s = summarize_deals(today_deals)
    c = challenge_status(cfg, equity, challenge_start)
    emoji = "🟢" if s["pnl"] >= 0 else "🔴"
    lines = [f"<b>📊 Daily Report — {now:%Y-%m-%d}</b>",
             f"Equity: ${equity:,.2f}",
             f"Today: {emoji} {'+' if s['pnl']>=0 else ''}${s['pnl']:,.2f} "
             f"({s['n']} trades, {s['wins']}W/{s['losses']}L)"]
    for sym, pnl in s["by_symbol"].items():
        lines.append(f"  {sym}: {'+' if pnl>=0 else ''}${pnl:,.2f}")
    lines.append(f"Challenge: {'+' if c['progress_pct']>=0 else ''}"
                 f"{c['progress_pct']:.2f}% (target +{c['target_pct']:.0f}%) | "
                 f"drawdown used {c['dd_used_pct']:.2f}% of "
                 f"{c['dd_budget_pct']:.0f}% budget")
    if halted:
        lines.append(f"⚠️ Trading halted: {halted}")
    return "\n".join(lines)


def format_weekly(now, equity, week_deals, cfg, challenge_start, halted):
    s = summarize_deals(week_deals)
    c = challenge_status(cfg, equity, challenge_start)
    emoji = "🟢" if s["pnl"] >= 0 else "🔴"
    lines = [f"<b>📈 Weekly Report — week ending {now:%Y-%m-%d}</b>",
             f"Equity: ${equity:,.2f}",
             f"This week: {emoji} {'+' if s['pnl']>=0 else ''}${s['pnl']:,.2f} "
             f"({s['n']} trades, win rate {s['win_rate']:.0f}%)"]
    for sym, pnl in s["by_symbol"].items():
        lines.append(f"  {sym}: {'+' if pnl>=0 else ''}${pnl:,.2f}")
    lines.append(f"Challenge: {'+' if c['progress_pct']>=0 else ''}"
                 f"{c['progress_pct']:.2f}% (target +{c['target_pct']:.0f}%) | "
                 f"drawdown used {c['dd_used_pct']:.2f}% of "
                 f"{c['dd_budget_pct']:.0f}% budget")
    if halted:
        lines.append(f"⚠️ Trading halted: {halted}")
    return "\n".join(lines)


def render_equity_chart(hist, cfg, challenge_start, path):
    hist = hist.sort_values("date")
    dates = pd.to_datetime(hist["date"])
    fig, ax = plt.subplots(figsize=(9, 4.5))
    ax.plot(dates, hist["equity"], lw=1.5, color="#2563eb", marker="o",
           markersize=3)
    ax.axhline(challenge_start, color="#6b7280", lw=0.8, ls="--", label="start")
    ax.axhline(challenge_start * (1 + cfg["profit_target"]), color="#059669",
              lw=0.8, ls="--", label="+10% target")
    ax.axhline(challenge_start * (1 - cfg["max_drawdown"]), color="#dc2626",
              lw=0.8, ls="--", label="-5% kill switch")
    ax.set_title("Equity — trailing history")
    ax.set_ylabel("Account equity ($)")
    ax.legend(loc="best", fontsize=8)
    fig.autofmt_xdate()
    fig.tight_layout()
    os.makedirs(os.path.dirname(path), exist_ok=True)
    fig.savefig(path, dpi=130)
    plt.close(fig)
    return path


# ---------------------------------------------------------------------------
def run(cfg, broker, now=None):
    now = now or datetime.now(timezone.utc)
    state = load_json(STATE_PATH, {"last_daily": None, "last_weekly": None})
    live_state = load_json(LIVE_STATE, {})
    challenge_start = live_state.get("challenge_start")
    halted = live_state.get("halted")

    equity = broker.equity()
    if challenge_start is None:
        challenge_start = equity            # no live_state yet — best effort

    hist = append_equity_point(now, equity)

    today = now.date().isoformat()
    if state.get("last_daily") != today:
        since = now - timedelta(hours=24)
        today_deals = broker.closed_deals(since)
        msg = format_daily(now, equity, today_deals, cfg, challenge_start, halted)
        send_telegram(cfg, msg)
        state["last_daily"] = today
        print(msg)

    is_sunday = now.weekday() == 6
    this_week = now.strftime("%G-W%V")
    if is_sunday and state.get("last_weekly") != this_week:
        since = now - timedelta(days=7)
        week_deals = broker.closed_deals(since)
        msg = format_weekly(now, equity, week_deals, cfg, challenge_start, halted)
        chart = render_equity_chart(hist, cfg, challenge_start, CHART_PATH)
        send_telegram_photo(cfg, chart, caption=msg)
        state["last_weekly"] = this_week
        print(msg, f"\n[chart: {chart}]")

    save_json(STATE_PATH, state)


# ---------------------------------------------------------------------------
def run_test():
    """Build a fake broker + fake history so the report format and chart can
    be checked without a live MT5 connection."""
    from trading_algorithm import CONFIG
    import random

    class FakeBroker:
        def __init__(self):
            self._equity = 101_850.0
            random.seed(3)
            self._deals = []
            t = datetime.now(timezone.utc) - timedelta(days=2)
            for i in range(6):
                pnl = random.choice([850, -620, 1100, -540, 700, -410])
                self._deals.append({"symbol": random.choice(["EURUSD", "GBPUSD"]),
                                    "pnl": pnl,
                                    "time": t + timedelta(hours=i * 7)})

        def equity(self):
            return self._equity

        def closed_deals(self, since):
            return [d for d in self._deals if d["time"] >= since]

    cfg = dict(CONFIG)
    broker = FakeBroker()

    # seed a fake equity history so the weekly chart has a curve to draw
    start = 100_000.0
    rows = []
    eq = start
    base = datetime.now(timezone.utc) - timedelta(days=9)
    for i in range(10):
        eq += random.choice([-300, 200, 450, -150, 600, 100])
        rows.append({"date": (base + timedelta(days=i)).date().isoformat(),
                     "equity": round(eq, 2)})
    pd.DataFrame(rows).to_csv(EQUITY_HISTORY, index=False)
    save_json(LIVE_STATE, {"challenge_start": start, "halted": None})

    print("=== Simulating a Sunday so both reports fire ===")
    sunday = datetime.now(timezone.utc)
    sunday += timedelta(days=(6 - sunday.weekday()) % 7)
    run(cfg, broker, now=sunday)
    print(f"\nEquity history now has {len(pd.read_csv(EQUITY_HISTORY))} rows.")
    print(f"Chart exists: {os.path.exists(CHART_PATH)}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--test", action="store_true",
                    help="run with a synthetic broker (no MT5 needed)")
    args = ap.parse_args()

    if args.test:
        run_test()
        return

    from live.live_trader import load_config
    from live.mt5_client import MT5Broker
    cfg = load_config()
    broker = MT5Broker(cfg)
    if not broker.connect():
        sys.exit("Could not connect to MT5 — is the terminal running?")
    try:
        run(cfg, broker)
    finally:
        broker.shutdown()


if __name__ == "__main__":
    main()
