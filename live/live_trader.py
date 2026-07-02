"""
LIVE TRADER — runs the exact same strategy the backtest validated, across a
small portfolio of major pairs.

Signals come from importing add_indicators() and add_signals() from
trading_algorithm.py — the live system and the backtest share one signal
implementation, so live behavior cannot silently drift from what was tested.

Modes (--mode):
  signals  : Telegram alert per setup (entry/stop/target/risk) — YOU click it.
  auto     : additionally place/manage the order on MT5 automatically.
  both     : alias of auto (auto always alerts too).

Runners:
  python live/live_trader.py --once            # one check; schedule hourly
  python live/live_trader.py --loop            # keeps running, wakes each bar close
  python live/live_trader.py --paper --steps 5000   # simulated dry-run, any OS

LAYERED RISK, checked in this order every cycle:
  1. ACCOUNT GUARD (before anything else):
       equity <= 95% of challenge start  -> close everything, halt permanently
       equity >= 110% of challenge start -> close everything, lock the pass
       daily loss >= 3% of start         -> no new entries until next UTC day
  2. PORTFOLIO GUARD (before any entry):
       total open risk capped (max_portfolio_risk, default 2%)
       max 1 position per USD-exposure direction — EURUSD long and GBPUSD
       long are ~the same macro bet; letting both on doubles risk while
       pretending to diversify
  3. TRADE GUARD:
       news blackout (no entries within ±45 min of high-impact releases),
       cool-down after stop-outs, min reward filter, time stop after 24 bars.

State persists in live_state.json; a heartbeat lands in output/heartbeat.json
every cycle so live/watchdog.py can raise the alarm if this process dies.
"""

import argparse
import json
import math
import os
import sys
import time
from datetime import datetime, timedelta, timezone

import pandas as pd

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, REPO_ROOT)

from trading_algorithm import CONFIG as STRATEGY_CONFIG          # noqa: E402
from trading_algorithm import add_indicators, add_signals        # noqa: E402
from live.mt5_client import MT5Broker, PaperBroker               # noqa: E402
from live.news_filter import NewsCalendar                        # noqa: E402
from live.telegram_alerts import send_telegram, format_signal    # noqa: E402

STATE_PATH = os.path.join(REPO_ROOT, "live_state.json")
SIGNAL_LOG = os.path.join(REPO_ROOT, "output", "live_signals.csv")
HEARTBEAT_PATH = os.path.join(REPO_ROOT, "output", "heartbeat.json")
NEWS_CACHE = os.path.join(REPO_ROOT, "output", "news_calendar_cache.json")


# ---------------------------------------------------------------------------
# configuration: strategy params from trading_algorithm + credentials overlay
# ---------------------------------------------------------------------------
def load_config():
    cfg = dict(STRATEGY_CONFIG)
    cfg.setdefault("mt5_symbols", ["EURUSD"])
    cfg.setdefault("max_portfolio_risk", 0.02)     # sum of open initial risks
    cfg.setdefault("max_same_usd_exposure", 1)     # correlation guard
    cfg.setdefault("news_filter_enabled", True)
    cfg.setdefault("news_blackout_minutes", 45)
    path = os.path.join(REPO_ROOT, "config.json")
    if os.path.exists(path):
        with open(path) as f:
            cfg.update(json.load(f))
    if "mt5_symbol" in cfg and "mt5_symbols" not in cfg:   # old config compat
        cfg["mt5_symbols"] = [cfg["mt5_symbol"]]
    # allow the walk-forward lab to promote validated parameters
    rec = os.path.join(REPO_ROOT, "research", "recommended_params.json")
    if os.path.exists(rec):
        with open(rec) as f:
            promoted = json.load(f).get("params", {})
        cfg.update(promoted)
        print(f"Applied lab-validated params: {promoted}")
    return cfg


# ---------------------------------------------------------------------------
# persistent risk state — the guard must survive restarts and crashes
# ---------------------------------------------------------------------------
def load_state(broker, cfg):
    if os.path.exists(STATE_PATH):
        with open(STATE_PATH) as f:
            state = json.load(f)
        state.setdefault("symbols", {})
    else:
        eq = broker.equity()                 # first run: anchor the challenge
        state = {"challenge_start": eq, "halted": None,
                 "day": None, "day_start_equity": eq, "symbols": {}}
        print(f"Initialized challenge anchor at ${eq:,.2f}")
    for sym in cfg["mt5_symbols"]:
        state["symbols"].setdefault(sym, {"last_processed_bar": None,
                                          "cooldown_until": None})
    save_state(state)
    return state


def save_state(state):
    with open(STATE_PATH, "w") as f:
        json.dump(state, f, indent=2, default=str)


def write_heartbeat(broker, state, now):
    """The watchdog's lifeline — written every cycle, even when halted."""
    os.makedirs(os.path.dirname(HEARTBEAT_PATH), exist_ok=True)
    with open(HEARTBEAT_PATH, "w") as f:
        json.dump({"time": now.isoformat(), "equity": broker.equity(),
                   "halted": state["halted"],
                   "open_positions": len(broker.positions_all())}, f, indent=2)


def log_signal(row):
    os.makedirs(os.path.dirname(SIGNAL_LOG), exist_ok=True)
    pd.DataFrame([row]).to_csv(SIGNAL_LOG, mode="a", index=False,
                               header=not os.path.exists(SIGNAL_LOG))


def usd_exposure(symbol, direction):
    """Collapse a position to its USD bet: long EURUSD = short USD (-1),
    long USDJPY = long USD (+1), non-USD crosses = 0 (uncapped)."""
    if symbol[:3].upper() == "USD":
        return direction
    if symbol[3:6].upper() == "USD":
        return -direction
    return 0


# ---------------------------------------------------------------------------
# one decision cycle — called once per closed 1H bar, covers all symbols
# ---------------------------------------------------------------------------
def process_cycle(broker, cfg, state, mode, news, now=None):
    now = now or datetime.now(timezone.utc)
    equity = broker.equity()
    start = state["challenge_start"]

    # ---- day roll: reset the daily loss budget at UTC midnight -------------
    today = str(now.date())
    if state["day"] != today:
        state["day"] = today
        state["day_start_equity"] = equity

    # ---- 1. ACCOUNT GUARD: checked before any trading logic ----------------
    if state["halted"]:
        write_heartbeat(broker, state, now)
        return                # kill switch or target lock fired — never trade
    if equity <= start * (1 - cfg["max_drawdown"]):
        broker.close_all("KILL_SWITCH")
        state["halted"] = "KILL_SWITCH"
        save_state(state)
        write_heartbeat(broker, state, now)
        send_telegram(cfg, f"🛑 KILL SWITCH: equity ${equity:,.0f} breached "
                           f"-{cfg['max_drawdown']*100:.0f}% floor. All positions "
                           f"closed. Trading halted permanently.")
        return
    if equity >= start * (1 + cfg["profit_target"]):
        broker.close_all("TARGET_LOCK")
        state["halted"] = "TARGET_HIT"
        save_state(state)
        write_heartbeat(broker, state, now)
        send_telegram(cfg, f"🏆 PROFIT TARGET HIT: equity ${equity:,.0f} "
                           f"(+{cfg['profit_target']*100:.0f}%). Locked in — "
                           f"trading stopped. Submit the challenge.")
        return
    daily_ok = (equity - state["day_start_equity"]) > -cfg["daily_loss_limit"] * start

    # ---- cool-downs from broker-side stop-outs (MT5 fills SL on server) ----
    for out in broker.recent_stop_outs(now - timedelta(hours=6)):
        sym_state = state["symbols"].get(out["symbol"])
        if sym_state is not None and str(out["time"]) != sym_state.get("last_stop_seen"):
            sym_state["last_stop_seen"] = str(out["time"])
            sym_state["cooldown_until"] = str(
                pd.Timestamp(out["time"]) + pd.Timedelta(hours=cfg["cooldown_bars"]))

    open_positions = broker.positions_all()

    for symbol in cfg["mt5_symbols"]:
        sym_state = state["symbols"][symbol]

        # ---- data: last closed bars, indicators, signal ---------------------
        bars = broker.get_bars(symbol, 600)       # EMA200 needs long warm-up
        if len(bars) < 250:
            continue
        last_bar_ts = str(bars.index[-1])
        if sym_state["last_processed_bar"] == last_bar_ts:
            continue                              # bar already handled
        sym_state["last_processed_bar"] = last_bar_ts
        feat = add_signals(add_indicators(bars, cfg), cfg)
        last = feat.iloc[-1]                      # most recent CLOSED bar

        # ---- manage the open position: time stop is client-side -------------
        pos = broker.position(symbol)
        if pos is not None:
            held_h = (now - pd.Timestamp(pos["entry_time"])).total_seconds() / 3600
            if held_h >= cfg["time_stop_bars"]:
                broker.close_position(symbol, "TIME")
                send_telegram(cfg, f"⏱ Time stop: closed {symbol} after "
                                   f"{held_h:.0f}h (reversion didn't come).")
            continue                              # one position per symbol

        # ---- 3. TRADE GUARD --------------------------------------------------
        if sym_state["cooldown_until"] and now < pd.Timestamp(sym_state["cooldown_until"]):
            continue
        direction = 1 if last["sig_long"] else (-1 if last["sig_short"] else 0)
        if direction == 0 or not daily_ok or math.isnan(last["atr"]):
            continue
        if cfg["news_filter_enabled"] and news is not None:
            event = news.blocking_event(now, symbol)
            if event:
                dt, ccy, title = event
                log_signal({"time": now, "symbol": symbol, "bar": last_bar_ts,
                            "direction": direction, "skipped": f"NEWS:{title}",
                            "equity": equity, "mode": mode, "executed": False})
                send_telegram(cfg, f"📰 {symbol} signal SKIPPED — high-impact "
                                   f"{ccy} news within blackout window: "
                                   f"{title} @ {dt:%H:%M} UTC")
                continue

        # ---- 2. PORTFOLIO GUARD ----------------------------------------------
        open_risk = len(open_positions) * cfg["risk_per_trade"]
        if open_risk + cfg["risk_per_trade"] > cfg["max_portfolio_risk"] + 1e-9:
            continue                              # total risk budget is full
        same_exposure = sum(1 for p in open_positions
                            if usd_exposure(p["symbol"], p["dir"])
                            == usd_exposure(symbol, direction) != 0)
        if same_exposure >= cfg["max_same_usd_exposure"]:
            log_signal({"time": now, "symbol": symbol, "bar": last_bar_ts,
                        "direction": direction, "skipped": "CORRELATION_CAP",
                        "equity": equity, "mode": mode, "executed": False})
            continue                              # same USD bet already on

        # ---- entry math (mirrors the backtest's open_position) ---------------
        entry_est = float(last["close"])          # market order ≈ last close
        stop_dist = cfg["stop_atr_mult"] * float(last["atr"])
        sl = entry_est - direction * stop_dist
        tp = float(last["bb_mid"])
        if (tp - entry_est) * direction < cfg["min_rr"] * stop_dist:
            continue                              # reward too small vs risk
        risk_amount = equity * cfg["risk_per_trade"]

        # ---- act: alert always, execute only in auto mode --------------------
        msg = format_signal(direction, symbol, entry_est, sl, tp, risk_amount,
                            cfg["risk_per_trade"] * 100,
                            reason="1H band re-entry + trend filter")
        send_telegram(cfg, msg)
        executed = False
        if mode in ("auto", "both"):
            executed = broker.open_market(symbol, direction, risk_amount,
                                          stop_dist, sl, tp, comment="bb-meanrev")
            send_telegram(cfg, f"{'✅ Order placed' if executed else '⚠️ Order FAILED'}"
                               f" — {symbol}.")
            if executed:
                open_positions = broker.positions_all()   # refresh for caps
        log_signal({"time": now, "symbol": symbol, "bar": last_bar_ts,
                    "direction": direction, "skipped": "",
                    "entry_est": entry_est, "sl": sl, "tp": tp,
                    "risk_amount": round(risk_amount, 2), "equity": equity,
                    "mode": mode, "executed": executed})

    save_state(state)
    write_heartbeat(broker, state, now)


# ---------------------------------------------------------------------------
# runners
# ---------------------------------------------------------------------------
def run_paper(cfg, steps):
    """Dry-run the ENTIRE multi-symbol loop on simulated bars — proves the
    machinery (state, guards, caps, sizing, alerts, logging, heartbeat)
    before any real money is near it."""
    from trading_algorithm import simulate_eurusd_1h
    if os.path.exists(STATE_PATH):
        os.remove(STATE_PATH)                 # fresh challenge per paper run
    feeds = {}
    for i, sym in enumerate(cfg["mt5_symbols"]):
        sim_cfg = dict(cfg); sim_cfg["sim_seed"] = cfg["sim_seed"] + i * 101
        feeds[sym] = simulate_eurusd_1h(sim_cfg)
    broker = PaperBroker(cfg, cfg["starting_capital"])
    state = load_state(broker, cfg)
    news = None                               # no live calendar for past dates
    timeline = feeds[cfg["mt5_symbols"][0]].index
    warm = 300
    for t in timeline[warm:warm + steps]:
        for sym, data in feeds.items():
            if t in data.index:
                row = data.loc[t]
                broker.feed_bar(sym, t, row["open"], row["high"],
                                row["low"], row["close"])
        process_cycle(broker, cfg, state, mode="auto", news=news, now=t)
        if state["halted"]:
            break
    trades = pd.DataFrame(broker.closed_trades)
    print(f"\nPaper run ({', '.join(cfg['mt5_symbols'])}): {len(trades)} trades, "
          f"final equity ${broker.equity():,.2f}, halt={state['halted']}")
    if len(trades):
        print(trades.tail(12).to_string(index=False))
        print("\nBy symbol:")
        print(trades.groupby("symbol")["pnl"].agg(["count", "sum"]).to_string())
    return broker, state


def seconds_to_next_bar():
    now = datetime.now(timezone.utc)
    return (60 - now.minute) * 60 - now.second + 30   # bar close + 30s buffer


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--mode", choices=["signals", "auto", "both"],
                    default="signals")
    ap.add_argument("--once", action="store_true",
                    help="single cycle (for Task Scheduler / cron)")
    ap.add_argument("--loop", action="store_true",
                    help="run forever, waking at each 1H bar close")
    ap.add_argument("--paper", action="store_true",
                    help="simulated dry-run of the full loop (any OS)")
    ap.add_argument("--steps", type=int, default=5000,
                    help="bars to run in --paper mode")
    args = ap.parse_args()

    cfg = load_config()
    if args.paper:
        run_paper(cfg, args.steps)
        return

    broker = MT5Broker(cfg)
    if not broker.connect():
        send_telegram(cfg, "⚠️ Live trader could not connect to MT5.")
        sys.exit("Could not connect to MT5 — is the terminal running?")
    state = load_state(broker, cfg)
    news = NewsCalendar(NEWS_CACHE,
                        blackout_minutes=cfg["news_blackout_minutes"]) \
        if cfg["news_filter_enabled"] else None
    try:
        if args.loop:
            print(f"Live loop started in {args.mode} mode on "
                  f"{', '.join(cfg['mt5_symbols'])}.")
            while True:
                process_cycle(broker, cfg, state, args.mode, news)
                if state["halted"]:
                    print(f"Halted: {state['halted']}. Exiting loop.")
                    break
                time.sleep(max(seconds_to_next_bar(), 60))
        else:
            process_cycle(broker, cfg, state, args.mode, news)
    finally:
        broker.shutdown()


if __name__ == "__main__":
    main()
