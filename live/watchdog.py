"""
WATCHDOG — dead-man's switch for the live trader.

The kill switch inside live_trader.py protects you from bad trades, but not
from a dead process: if the script crashes or MT5 disconnects while you're
asleep, an open position sits there managed only by its server-side SL/TP and
nobody knows. This script is the "nobody knows" fix.

live_trader.py writes output/heartbeat.json every cycle. This watchdog runs as
a SEPARATE scheduled task (that's the point — it must survive the trader
dying) and alerts your Telegram when:
  * the heartbeat is older than --max-age minutes during FX market hours
  * the trader reported a halt (kill switch / target hit) — echoed once
  * equity has dropped more than 1% since the last watchdog check
    (fast-moving problem between hourly bars)

Setup (Windows Task Scheduler, every 15 minutes, independent of the trader):
    python live/watchdog.py
"""

import argparse
import json
import os
import sys
from datetime import datetime, timezone

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, REPO_ROOT)

from live.telegram_alerts import send_telegram          # noqa: E402

HEARTBEAT_PATH = os.path.join(REPO_ROOT, "output", "heartbeat.json")
WATCH_STATE = os.path.join(REPO_ROOT, "output", "watchdog_state.json")


def load_json(path):
    if os.path.exists(path):
        try:
            with open(path) as f:
                return json.load(f)
        except Exception:
            return None
    return None


def market_open(now):
    """FX trades Sun ~21:00 UTC to Fri ~21:00 UTC; the strategy only acts
    Mon-Fri, so we only demand heartbeats then."""
    return now.weekday() < 5


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--max-age", type=int, default=90,
                    help="minutes before a heartbeat counts as dead")
    args = ap.parse_args()

    cfg = load_json(os.path.join(REPO_ROOT, "config.json")) or {}
    now = datetime.now(timezone.utc)
    hb = load_json(HEARTBEAT_PATH)
    prev = load_json(WATCH_STATE) or {}
    alerts = []

    if hb is None:
        if market_open(now):
            alerts.append("🚨 WATCHDOG: no heartbeat file found — has the "
                          "live trader ever started?")
    else:
        age_min = (now - datetime.fromisoformat(hb["time"])).total_seconds() / 60
        if market_open(now) and age_min > args.max_age and not hb.get("halted"):
            alerts.append(f"🚨 WATCHDOG: live trader heartbeat is "
                          f"{age_min:.0f} min old (limit {args.max_age}). "
                          f"The process is likely DEAD or MT5 disconnected. "
                          f"Open positions: {hb.get('open_positions', '?')} — "
                          f"server-side SL/TP still protect them, but the "
                          f"time stop and kill switch are NOT running.")
        if hb.get("halted") and prev.get("halted_notified") != hb["halted"]:
            alerts.append(f"ℹ️ WATCHDOG: trader reports halt state "
                          f"'{hb['halted']}' (equity ${hb.get('equity', 0):,.0f}).")
            prev["halted_notified"] = hb["halted"]
        last_eq = prev.get("last_equity")
        if last_eq and hb.get("equity") and hb["equity"] < last_eq * 0.99:
            alerts.append(f"⚠️ WATCHDOG: equity fell "
                          f"{(1 - hb['equity']/last_eq)*100:.1f}% since last "
                          f"check (${last_eq:,.0f} -> ${hb['equity']:,.0f}).")
        prev["last_equity"] = hb.get("equity")

    for msg in alerts:
        print(msg)
        send_telegram(cfg, msg)
    if not alerts:
        print(f"watchdog ok @ {now.isoformat(timespec='seconds')}")

    prev["last_run"] = now.isoformat()
    os.makedirs(os.path.dirname(WATCH_STATE), exist_ok=True)
    with open(WATCH_STATE, "w") as f:
        json.dump(prev, f, indent=2)


if __name__ == "__main__":
    main()
