"""
Broker layer for the live trader.

Two interchangeable implementations of the same small interface:

  * MT5Broker   — real MetaTrader 5 terminal (Windows only, `pip install MetaTrader5`).
                  Used on your Windows PC/VPS next to the prop firm's MT5 terminal.
  * PaperBroker — in-memory fills against a bar feed. Used for --paper testing on
                  any OS, and for dry-running the loop before risking the account.

Interface every broker exposes:
    connect() -> bool
    equity() -> float
    get_bars(n) -> DataFrame[open, high, low, close] of CLOSED 1H bars, UTC index
    position() -> dict | None   {"ticket", "dir", "entry", "units", "entry_time"}
    open_market(direction, units, sl, tp, comment) -> bool
    close_position(reason) -> bool
    shutdown()
"""

import math
from datetime import datetime, timezone

import pandas as pd

try:
    import MetaTrader5 as mt5          # Windows-only official package
    HAS_MT5 = True
except ImportError:                    # Linux/macOS: paper mode still works
    mt5 = None
    HAS_MT5 = False


class MT5Broker:
    """Thin wrapper around the official MetaTrader5 python API.

    NOTE: MT5 stores SL/TP on the server, so stop-loss and take-profit fire
    even if this script crashes — that's why we pass them on the order rather
    than managing them client-side. Only the time stop needs the loop alive.
    """

    def __init__(self, cfg):
        if not HAS_MT5:
            raise RuntimeError(
                "MetaTrader5 package not available. It is Windows-only: run this "
                "on the Windows PC/VPS with your prop firm's MT5 terminal, after "
                "`pip install MetaTrader5`. Use --paper elsewhere.")
        self.cfg = cfg
        self.symbol = cfg["mt5_symbol"]
        self.magic = int(cfg.get("mt5_magic", 970431))   # tags our orders

    def connect(self):
        kwargs = {}
        if self.cfg.get("mt5_login"):
            kwargs = dict(login=int(self.cfg["mt5_login"]),
                          password=self.cfg["mt5_password"],
                          server=self.cfg["mt5_server"])
        if not mt5.initialize(**kwargs):
            print(f"MT5 initialize failed: {mt5.last_error()}")
            return False
        if not mt5.symbol_select(self.symbol, True):
            print(f"MT5 could not select symbol {self.symbol}")
            return False
        return True

    def equity(self):
        info = mt5.account_info()
        if info is None:
            raise RuntimeError(f"account_info failed: {mt5.last_error()}")
        return float(info.equity)

    def get_bars(self, n=600):
        # position 0 is the still-forming bar — start at 1 so every bar is CLOSED
        rates = mt5.copy_rates_from_pos(self.symbol, mt5.TIMEFRAME_H1, 1, n)
        if rates is None or len(rates) == 0:
            raise RuntimeError(f"copy_rates failed: {mt5.last_error()}")
        df = pd.DataFrame(rates)
        df.index = pd.to_datetime(df["time"], unit="s", utc=True)
        return df[["open", "high", "low", "close"]]

    def position(self):
        positions = mt5.positions_get(symbol=self.symbol)
        ours = [p for p in (positions or []) if p.magic == self.magic]
        if not ours:
            return None
        p = ours[0]
        return {"ticket": p.ticket,
                "dir": 1 if p.type == mt5.POSITION_TYPE_BUY else -1,
                "entry": p.price_open,
                "units": p.volume * 100_000,      # lots -> base-currency units
                "entry_time": datetime.fromtimestamp(p.time, tz=timezone.utc)}

    def _lots(self, units):
        """Convert units to a valid lot size, respecting broker min/step."""
        info = mt5.symbol_info(self.symbol)
        step = info.volume_step or 0.01
        lots = max(info.volume_min, math.floor(units / 100_000 / step) * step)
        return min(round(lots, 2), info.volume_max)

    def open_market(self, direction, units, sl, tp, comment=""):
        tick = mt5.symbol_info_tick(self.symbol)
        price = tick.ask if direction == 1 else tick.bid
        request = {
            "action": mt5.TRADE_ACTION_DEAL,
            "symbol": self.symbol,
            "volume": self._lots(units),
            "type": mt5.ORDER_TYPE_BUY if direction == 1 else mt5.ORDER_TYPE_SELL,
            "price": price,
            "sl": round(sl, 5), "tp": round(tp, 5),
            "deviation": 20,                       # max slippage in points
            "magic": self.magic,
            "comment": comment[:26],               # MT5 comment length limit
            "type_time": mt5.ORDER_TIME_GTC,
            "type_filling": mt5.ORDER_FILLING_IOC,
        }
        result = mt5.order_send(request)
        ok = result is not None and result.retcode == mt5.TRADE_RETCODE_DONE
        if not ok:
            print(f"order_send failed: {getattr(result, 'retcode', None)} "
                  f"{getattr(result, 'comment', mt5.last_error())}")
        return ok

    def close_position(self, reason=""):
        pos = self.position()
        if pos is None:
            return True
        tick = mt5.symbol_info_tick(self.symbol)
        request = {
            "action": mt5.TRADE_ACTION_DEAL,
            "symbol": self.symbol,
            "volume": pos["units"] / 100_000,
            "type": mt5.ORDER_TYPE_SELL if pos["dir"] == 1 else mt5.ORDER_TYPE_BUY,
            "position": pos["ticket"],
            "price": tick.bid if pos["dir"] == 1 else tick.ask,
            "deviation": 20,
            "magic": self.magic,
            "comment": f"close:{reason}"[:26],
            "type_time": mt5.ORDER_TIME_GTC,
            "type_filling": mt5.ORDER_FILLING_IOC,
        }
        result = mt5.order_send(request)
        return result is not None and result.retcode == mt5.TRADE_RETCODE_DONE

    def shutdown(self):
        mt5.shutdown()


class PaperBroker:
    """Simulated broker fed one bar at a time. Fills SL/TP against each bar's
    high/low with the same conservative stop-first assumption as the backtest,
    and charges the configured spread+slippage on every fill."""

    def __init__(self, cfg, starting_equity):
        self.cfg = cfg
        self.cost = cfg["cost_pips_per_side"] * cfg["pip"]
        self._equity = starting_equity
        self._pos = None
        self._history = pd.DataFrame()
        self.closed_trades = []

    def connect(self):
        return True

    def feed_bar(self, bar_time, o, h, l, c):
        """Advance one bar: manage SL/TP of the open position, extend history."""
        row = pd.DataFrame({"open": [o], "high": [h], "low": [l], "close": [c]},
                           index=[bar_time])
        self._history = pd.concat([self._history, row]).tail(2000)
        if self._pos is None:
            return
        p = self._pos
        hit_sl = l <= p["sl"] if p["dir"] == 1 else h >= p["sl"]
        hit_tp = h >= p["tp"] if p["dir"] == 1 else l <= p["tp"]
        if hit_sl:                                   # stop first: honest ordering
            self._settle(p["sl"], "STOP", bar_time)
        elif hit_tp:
            self._settle(p["tp"], "TARGET", bar_time)

    def _settle(self, price, reason, t):
        p = self._pos
        fill = price - self.cost * p["dir"]
        pnl = p["units"] * (fill - p["entry"]) * p["dir"]
        self._equity += pnl
        self.closed_trades.append({"entry_time": p["entry_time"], "exit_time": t,
                                   "dir": p["dir"], "entry": p["entry"],
                                   "exit": fill, "pnl": pnl, "reason": reason})
        self._pos = None

    def equity(self):
        return self._equity

    def get_bars(self, n=600):
        return self._history.tail(n)

    def position(self):
        return self._pos

    def open_market(self, direction, units, sl, tp, comment=""):
        last = self._history.iloc[-1]
        self._pos = {"ticket": len(self.closed_trades) + 1, "dir": direction,
                     "entry": last["close"] + self.cost * direction,
                     "units": units, "sl": sl, "tp": tp,
                     "entry_time": self._history.index[-1]}
        return True

    def close_position(self, reason=""):
        if self._pos is None:
            return True
        last = self._history.iloc[-1]
        self._settle(last["close"], reason, self._history.index[-1])
        return True

    def shutdown(self):
        pass
