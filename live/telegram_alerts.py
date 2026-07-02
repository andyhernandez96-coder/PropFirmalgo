"""
Telegram signal alerts — so every trade decision reaches your phone whether
you're in signals-only mode (you execute manually) or full-auto (audit trail).

Setup (2 minutes):
  1. Message @BotFather on Telegram -> /newbot -> copy the bot token.
  2. Message your new bot anything, then open
     https://api.telegram.org/bot<TOKEN>/getUpdates and copy your chat id.
  3. Put both in config.json ("telegram_token", "telegram_chat_id").
"""

import json
import urllib.request


def send_telegram(cfg, text):
    """Send a message; never raise — a dead Telegram must not stop trading."""
    token = cfg.get("telegram_token")
    chat_id = cfg.get("telegram_chat_id")
    if not token or not chat_id:
        print(f"[telegram disabled] {text}")
        return False
    url = f"https://api.telegram.org/bot{token}/sendMessage"
    payload = json.dumps({"chat_id": chat_id, "text": text,
                          "parse_mode": "HTML"}).encode()
    req = urllib.request.Request(
        url, data=payload, headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            return resp.status == 200
    except Exception as e:          # log-and-continue by design
        print(f"[telegram error] {e}: {text}")
        return False


def format_signal(direction, symbol, entry, sl, tp, units, risk_pct, reason=""):
    arrow = "🟢 LONG" if direction == 1 else "🔴 SHORT"
    lots = units / 100_000
    return (f"<b>{arrow} {symbol}</b>\n"
            f"Entry ≈ {entry:.5f}\n"
            f"Stop   = {sl:.5f}\n"
            f"Target = {tp:.5f}\n"
            f"Size   = {lots:.2f} lots ({risk_pct:.1f}% risk)\n"
            f"{reason}")
