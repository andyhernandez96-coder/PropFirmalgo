"""
NEWS BLACKOUT FILTER — don't open trades into scheduled high-impact releases.

Why: the backtest's 2-pip cost assumption is calibrated to normal liquid
hours. In the minutes around NFP, CPI, FOMC etc., spreads on majors blow out
to 10-30 pips and stops get slipped — and prop firms specifically flag P&L
from news spikes as "unrealistic". Skipping entries near these events costs
almost nothing in expectancy and removes the strategy's worst tail risk.

Data source: ForexFactory's public weekly calendar JSON
(https://nfs.faireconomy.media/ff_calendar_thisweek.json). It's fetched at
most every few hours and cached to disk, so a temporary outage falls back to
the cached week. If there's no calendar at all (fresh install, network down),
the filter FAILS OPEN with a loud warning — the strategy's session filter
still applies, and blocking all trading on a missing convenience feed would
be worse than trading without it.

Only ENTRIES are blocked. Exits, stops, and the kill switch always run.
"""

import json
import os
import urllib.request
from datetime import datetime, timedelta, timezone

FEED_URL = "https://nfs.faireconomy.media/ff_calendar_thisweek.json"


class NewsCalendar:
    def __init__(self, cache_path, blackout_minutes=45, refresh_hours=4):
        self.cache_path = cache_path
        self.blackout = timedelta(minutes=blackout_minutes)
        self.refresh = timedelta(hours=refresh_hours)
        self._events = None          # list of (utc_datetime, currency, title)
        self._warned_missing = False

    # ------------------------------------------------------------------ fetch
    def _fetch(self):
        req = urllib.request.Request(FEED_URL,
                                     headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=15) as resp:
            raw = json.loads(resp.read().decode())
        os.makedirs(os.path.dirname(self.cache_path), exist_ok=True)
        with open(self.cache_path, "w") as f:
            json.dump({"fetched_at": datetime.now(timezone.utc).isoformat(),
                       "events": raw}, f)
        return raw

    def _load(self, now):
        """Return the raw event list, refreshing the cache when stale."""
        cached, fetched_at = None, None
        if os.path.exists(self.cache_path):
            try:
                with open(self.cache_path) as f:
                    blob = json.load(f)
                cached = blob["events"]
                fetched_at = datetime.fromisoformat(blob["fetched_at"])
            except Exception:
                cached = None
        stale = fetched_at is None or (now - fetched_at) > self.refresh
        if stale:
            try:
                return self._fetch()
            except Exception as e:
                if cached is not None:
                    print(f"[news] fetch failed ({e}); using cached calendar "
                          f"from {fetched_at}")
                    return cached
                if not self._warned_missing:
                    print(f"[news] WARNING: no calendar available ({e}) — "
                          f"news filter is INACTIVE (failing open).")
                    self._warned_missing = True
                return []
        return cached

    # ------------------------------------------------------------------ parse
    @staticmethod
    def _parse(raw):
        """ForexFactory items: {"title", "country" (currency code),
        "date" (ISO 8601 with offset), "impact" ("High"/"Medium"/...)}."""
        events = []
        for item in raw or []:
            if str(item.get("impact", "")).lower() != "high":
                continue
            try:
                dt = datetime.fromisoformat(item["date"])
                if dt.tzinfo is None:
                    dt = dt.replace(tzinfo=timezone.utc)
                events.append((dt.astimezone(timezone.utc),
                               item.get("country", "").upper(),
                               item.get("title", "")))
            except Exception:
                continue     # one malformed row must not kill the filter
        return events

    # ------------------------------------------------------------------ query
    def blocking_event(self, now, symbol):
        """Return (time, currency, title) of a high-impact event within the
        blackout window for either of the symbol's currencies, else None."""
        self._events = self._parse(self._load(now))
        currencies = {symbol[:3].upper(), symbol[3:6].upper()}
        for dt, ccy, title in self._events:
            if ccy in currencies and abs(now - dt) <= self.blackout:
                return (dt, ccy, title)
        return None

    def is_blackout(self, now, symbol):
        return self.blocking_event(now, symbol) is not None
