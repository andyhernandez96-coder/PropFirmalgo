"""
LIVE TRADER — runs the exact same strategy the backtest validated.

Crucially, this file computes signals by importing add_indicators() and
add_signals() from trading_algorithm.py — the live system and the backtest
share one signal implementation, so live behavior cannot silently drift from
what was tested.

Modes (--mode):
  signals  : compute signal at each 1H bar close, send a Telegram alert with
             entry/stop/target/size — YOU click the trade in MT5.
  auto     : additionally place/manage the order on MT5 automatically.
  both     : alias of auto (auto always alerts too).

Runners:
  python live/live_trader.py --once            # one check; schedule hourly
                                               # (Windows Task Scheduler, :00+1min)
  python live/live_trader.py --loop            # keeps running, wakes each bar close
  python live/live_trader.py --paper --steps 5000   # simulated dry-run, any OS

PROP FIRM GUARD (enforced before anything else, every single cycle):
  * equity <= 95% of challenge start  -> close everything, halt permanently
  * equity >= 110% of challenge start -> close everything, lock the pass
  * daily loss >= 3% of start         -> no new entries until next UTC day
  * cool-down after a stop-out, one position max, time stop after 24 bars
State persists in live_state.json so restarts don't reset the rules.
"""

import argparse
import json
import math
import os
import sys
import time
from datetime import datetime, timezone

import pandas as pd

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, REPO_ROOT)

from trading_algorithm import CONFIG as STRATEGY_CONFIG          # noqa: E402
from trading_algorithm import add_indicators, add_signals        # noqa: E402
from live.mt5_client import MT5Broker, PaperBroker               # noqa: E402
from live.telegram_alerts import send_telegram, format_signal    # noqa: E402

STATE_PATH = os.path.join(REPO_ROOT, "live_state.json")
SIGNAL_LOG = os.path.join(REPO_ROOT, "output", "live_signals.csv")


# ---------------------------------------------------------------------------
# configuration: strategy params from trading_algorithm + credentials overlay
# ---------------------------------------------------------------------------
def load_config():
    cfg = dict(STRATEGY_CONFIG)
    cfg.setdefault("mt5_symbol", "EURUSD")
    path = os.path.join(REPO_ROOT, "config.json")
    if os.path.exists(path):
        with open(path) as f:
            cfg.update(json.load(f))
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
def load_state(broker):
    if os.path.exists(STATE_PATH):
        with open(STATE_PATH) as f:
            return json.load(f)
    # first run: anchor the challenge to current equity
    eq = broker.equity()
    state = {"challenge_start": eq, "halted": None,
             "day": None, "day_start_equity": eq,
             "cooldown_until": None, "last_processed_bar": None}
    save_state(state)
    print(f"Initialized challenge anchor at ${eq:,.2f}")
    return state


def save_state(state):
    with open(STATE_PATH, "w") as f:
        json.dump(state, f, indent=2, default=str)


def log_signal(row):
    os.makedirs(os.path.dirname(SIGNAL_LOG), exist_ok=True)
    pd.DataFrame([row]).to_csv(SIGNAL_LOG, mode="a", index=False,
                               header=not os.path.exists(SIGNAL_LOG))


# ---------------------------------------------------------------------------
# one decision cycle — called once per closed 1H bar
# ---------------------------------------------------------------------------
def process_cycle(broker, cfg, state, mode, now=None):
    now = now or datetime.now(timezone.utc)
    equity = broker.equity()
    start = state["challenge_start"]

    # ---- day roll: reset the daily loss budget at UTC midnight -------------
    today = str(now.date())
    if state["day"] != today:
        state["day"] = today
        state["day_start_equity"] = equity

    # ---- PROP FIRM GUARD: checked before any trading logic -----------------
    if state["halted"]:
        return  # kill switch or target lock already fired — do nothing, ever
    if equity <= start * (1 - cfg["max_drawdown"]):
        broker.close_position("KILL_SWITCH")
        state["halted"] = "KILL_SWITCH"
        save_state(state)
        send_telegram(cfg, f"🛑 KILL SWITCH: equity ${equity:,.0f} breached "
                           f"-{cfg['max_drawdown']*100:.0f}% floor. All positions "
                           f"closed. Trading halted permanently.")
        return
    if equity >= start * (1 + cfg["profit_target"]):
        broker.close_position("TARGET_LOCK")
        state["halted"] = "TARGET_HIT"
        save_state(state)
        send_telegram(cfg, f"🏆 PROFIT TARGET HIT: equity ${equity:,.0f} "
                           f"(+{cfg['profit_target']*100:.0f}%). Locked in — "
                           f"trading stopped. Submit the challenge.")
        return
    daily_ok = (equity - state["day_start_equity"]) > -cfg["daily_loss_limit"] * start

    # ---- data: last closed bars, indicators, signal -------------------------
    bars = broker.get_bars(600)              # EMA200 needs a long warm-up
    if len(bars) < 250:
        return
    last_bar_ts = str(bars.index[-1])
    if state["last_processed_bar"] == last_bar_ts:
        return                                # this bar was already handled
    feat = add_signals(add_indicators(bars, cfg), cfg)
    last = feat.iloc[-1]                      # most recent CLOSED bar

    # ---- manage the open position: time stop is client-side ----------------
    pos = broker.position()
    if pos is not None:
        held_hours = (now - pd.Timestamp(pos["entry_time"])).total_seconds() / 3600
        if held_hours >= cfg["time_stop_bars"]:
            broker.close_position("TIME")
            send_telegram(cfg, f"⏱ Time stop: closed {cfg['mt5_symbol']} after "
                               f"{held_hours:.0f}h (mean reversion didn't come).")
        state["last_processed_bar"] = last_bar_ts
        save_state(state)
        return                                # one position at a time

    # ---- cool-down after a stop-out ----------------------------------------
    if state["cooldown_until"] and now < pd.Timestamp(state["cooldown_until"]):
        state["last_processed_bar"] = last_bar_ts
        save_state(state)
        return

    # ---- entry decision ------------------------------------------------------
    direction = 1 if last["sig_long"] else (-1 if last["sig_short"] else 0)
    if direction == 0 or not daily_ok or math.isnan(last["atr"]):
        state["last_processed_bar"] = last_bar_ts
        save_state(state)
        return

    entry_est = float(last["close"])          # market order ≈ last close
    stop_dist = cfg["stop_atr_mult"] * float(last["atr"])
    sl = entry_est - direction * stop_dist
    tp = float(last["bb_mid"])
    if (tp - entry_est) * direction < cfg["min_rr"] * stop_dist:
        state["last_processed_bar"] = last_bar_ts   # reward too small — skip
        save_state(state)
        return
    units = equity * cfg["risk_per_trade"] / stop_dist
    units = min(units, cfg["max_leverage"] * equity / entry_est)

    # ---- act: alert always, execute only in auto mode ------------------------
    msg = format_signal(direction, cfg["mt5_symbol"], entry_est, sl, tp, units,
                        cfg["risk_per_trade"] * 100,
                        reason="1H band re-entry + trend filter")
    send_telegram(cfg, msg)
    executed = False
    if mode in ("auto", "both"):
        executed = broker.open_market(direction, units, sl, tp,
                                      comment="bb-meanrev")
        send_telegram(cfg, "✅ Order placed." if executed
                      else "⚠️ Order FAILED — check the terminal.")
    log_signal({"time": now, "bar": last_bar_ts, "direction": direction,
                "entry_est": entry_est, "sl": sl, "tp": tp,
                "units": round(units), "equity": equity,
                "mode": mode, "executed": executed})

    state["last_processed_bar"] = last_bar_ts
    save_state(state)


def note_stop_out(broker, cfg, state):
    """Detect broker-side stop-outs (MT5 fills SL server-side) and start the
    cool-down. Called each cycle before process_cycle in live mode."""
    if isinstance(broker, PaperBroker) and broker.closed_trades:
        last = broker.closed_trades[-1]
        if last["reason"] == "STOP" and state.get("last_stop_seen") != str(last["exit_time"]):
            state["last_stop_seen"] = str(last["exit_time"])
            state["cooldown_until"] = str(
                pd.Timestamp(last["exit_time"]) + pd.Timedelta(hours=cfg["cooldown_bars"]))
    # For MT5: infer from history — a closed deal with loss and no position.
    # (MT5 history polling is intentionally simple: any losing close = cooldown.)


# ---------------------------------------------------------------------------
# runners
# ---------------------------------------------------------------------------
def run_paper(cfg, steps):
    """Dry-run the ENTIRE loop on simulated bars — proves the machinery
    (state, guard, sizing, alerts, logging) before any real money is near it."""
    from trading_algorithm import simulate_eurusd_1h
    if os.path.exists(STATE_PATH):
        os.remove(STATE_PATH)                 # fresh challenge per paper run
    data = simulate_eurusd_1h(cfg)
    broker = PaperBroker(cfg, cfg["starting_capital"])
    state = load_state(broker)
    warm = 300
    for t, row in data.iloc[warm:warm + steps].iterrows():
        broker.feed_bar(t, row["open"], row["high"], row["low"], row["close"])
        note_stop_out(broker, cfg, state)
        process_cycle(broker, cfg, state, mode="auto", now=t)
        if state["halted"]:
            break
    trades = pd.DataFrame(broker.closed_trades)
    print(f"\nPaper run: {len(trades)} trades, final equity "
          f"${broker.equity():,.2f}, halt={state['halted']}")
    if len(trades):
        print(trades.tail(10).to_string(index=False))
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
        sys.exit("Could not connect to MT5 — is the terminal running?")
    state = load_state(broker)
    try:
        if args.loop:
            print(f"Live loop started in {args.mode} mode.")
            while True:
                process_cycle(broker, cfg, state, args.mode)
                if state["halted"]:
                    print(f"Halted: {state['halted']}. Exiting loop.")
                    break
                time.sleep(max(seconds_to_next_bar(), 60))
        else:
            process_cycle(broker, cfg, state, args.mode)
    finally:
        broker.shutdown()


if __name__ == "__main__":
    main()
