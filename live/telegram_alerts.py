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
import os
import urllib.request
import uuid


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


def send_telegram_photo(cfg, image_path, caption=""):
    """Send a PNG (e.g. the weekly equity curve). Never raises."""
    token = cfg.get("telegram_token")
    chat_id = cfg.get("telegram_chat_id")
    if not token or not chat_id or not os.path.exists(image_path):
        print(f"[telegram disabled] photo: {image_path} — {caption}")
        return False
    boundary = uuid.uuid4().hex
    with open(image_path, "rb") as f:
        img = f.read()
    parts = b""
    for name, value in (("chat_id", str(chat_id)), ("caption", caption)):
        parts += (f"--{boundary}\r\nContent-Disposition: form-data; "
                  f'name="{name}"\r\n\r\n{value}\r\n').encode()
    parts += (f"--{boundary}\r\nContent-Disposition: form-data; "
              f'name="photo"; filename="report.png"\r\n'
              f"Content-Type: image/png\r\n\r\n").encode()
    body = parts + img + f"\r\n--{boundary}--\r\n".encode()
    req = urllib.request.Request(
        f"https://api.telegram.org/bot{token}/sendPhoto", data=body,
        headers={"Content-Type": f"multipart/form-data; boundary={boundary}"})
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return resp.status == 200
    except Exception as e:
        print(f"[telegram error] {e}: photo {image_path}")
        return False


def format_signal(direction, symbol, entry, sl, tp, risk_amount, risk_pct,
                  reason=""):
    arrow = "🟢 LONG" if direction == 1 else "🔴 SHORT"
    return (f"<b>{arrow} {symbol}</b>\n"
            f"Entry ≈ {entry:.5f}\n"
            f"Stop   = {sl:.5f}\n"
            f"Target = {tp:.5f}\n"
            f"Risk   = ${risk_amount:,.0f} ({risk_pct:.1f}% of equity)\n"
            f"{reason}")
