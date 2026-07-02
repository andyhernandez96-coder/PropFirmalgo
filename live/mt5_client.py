"""
Broker layer for the live trader — multi-symbol.

Two interchangeable implementations of the same interface:

  * MT5Broker   — real MetaTrader 5 terminal (Windows only, `pip install MetaTrader5`).
  * PaperBroker — in-memory fills against simulated bar feeds. Used for --paper
                  testing on any OS before real money is anywhere near this.

Interface (symbol is passed per call — one broker serves the whole portfolio):
    connect() -> bool
    equity() -> float
    get_bars(symbol, n) -> DataFrame[open, high, low, close], CLOSED 1H bars, UTC
    position(symbol) -> dict | None
    positions_all() -> list[dict]
    open_market(symbol, direction, risk_amount, stop_dist, sl, tp, comment) -> bool
    close_position(symbol, reason) -> bool
    close_all(reason)
    shutdown()

Sizing lives IN the broker because that's where the currency data lives:
MT5 exposes trade_tick_value (account-currency value of one tick per lot),
which makes the risk math correct for ANY pair — including JPY quotes where
the naive units = risk$/stop_distance formula is wrong by a factor of ~150.
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
    """Wrapper around the official MetaTrader5 python API.

    SL/TP are stored on the MT5 server, so stops fire even if this script
    dies — only the time stop and the account-level guard need the loop alive
    (which is what live/watchdog.py monitors).
    """

    def __init__(self, cfg):
        if not HAS_MT5:
            raise RuntimeError(
                "MetaTrader5 package not available. It is Windows-only: run this "
                "on the Windows PC/VPS with your prop firm's MT5 terminal, after "
                "`pip install MetaTrader5`. Use --paper elsewhere.")
        self.cfg = cfg
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
        for sym in self.cfg["mt5_symbols"]:
            if not mt5.symbol_select(sym, True):
                print(f"MT5 could not select symbol {sym}")
                return False
        return True

    def equity(self):
        info = mt5.account_info()
        if info is None:
            raise RuntimeError(f"account_info failed: {mt5.last_error()}")
        return float(info.equity)

    def get_bars(self, symbol, n=600):
        # position 0 is the still-forming bar — start at 1 so every bar is CLOSED
        rates = mt5.copy_rates_from_pos(symbol, mt5.TIMEFRAME_H1, 1, n)
        if rates is None or len(rates) == 0:
            raise RuntimeError(f"copy_rates({symbol}) failed: {mt5.last_error()}")
        df = pd.DataFrame(rates)
        df.index = pd.to_datetime(df["time"], unit="s", utc=True)
        return df[["open", "high", "low", "close"]]

    def _to_dict(self, p):
        return {"symbol": p.symbol, "ticket": p.ticket,
                "dir": 1 if p.type == mt5.POSITION_TYPE_BUY else -1,
                "entry": p.price_open, "lots": p.volume,
                "entry_time": datetime.fromtimestamp(p.time, tz=timezone.utc)}

    def position(self, symbol):
        ours = [p for p in (mt5.positions_get(symbol=symbol) or [])
                if p.magic == self.magic]
        return self._to_dict(ours[0]) if ours else None

    def positions_all(self):
        return [self._to_dict(p) for p in (mt5.positions_get() or [])
                if p.magic == self.magic]

    def _lots_for_risk(self, symbol, risk_amount, stop_dist, entry_price):
        """Risk-correct lot size for any pair, margin-capped.

        value_per_unit = account-currency P&L of a 1.0 price move per lot.
        This is the tick_value/tick_size trick — it absorbs quote-currency
        conversion (JPY pairs etc.) using the broker's own numbers.
        """
        info = mt5.symbol_info(symbol)
        value_per_unit = info.trade_tick_value / info.trade_tick_size
        lots = risk_amount / (stop_dist * value_per_unit)
        # margin cap: never let one position consume >30% of free margin
        order_type = mt5.ORDER_TYPE_BUY
        margin_1lot = mt5.order_calc_margin(order_type, symbol, 1.0, entry_price)
        if margin_1lot:
            lots = min(lots, 0.30 * self.equity() / margin_1lot)
        step = info.volume_step or 0.01
        lots = math.floor(lots / step) * step
        return min(max(lots, 0.0), info.volume_max)

    def open_market(self, symbol, direction, risk_amount, stop_dist,
                    sl, tp, comment=""):
        tick = mt5.symbol_info_tick(symbol)
        price = tick.ask if direction == 1 else tick.bid
        lots = self._lots_for_risk(symbol, risk_amount, stop_dist, price)
        info = mt5.symbol_info(symbol)
        if lots < info.volume_min:
            print(f"{symbol}: computed size {lots} below broker minimum "
                  f"{info.volume_min} — skipping (risk would exceed budget).")
            return False
        digits = info.digits
        request = {
            "action": mt5.TRADE_ACTION_DEAL,
            "symbol": symbol,
            "volume": lots,
            "type": mt5.ORDER_TYPE_BUY if direction == 1 else mt5.ORDER_TYPE_SELL,
            "price": price,
            "sl": round(sl, digits), "tp": round(tp, digits),
            "deviation": 20,                       # max slippage in points
            "magic": self.magic,
            "comment": comment[:26],               # MT5 comment length limit
            "type_time": mt5.ORDER_TIME_GTC,
            "type_filling": mt5.ORDER_FILLING_IOC,
        }
        result = mt5.order_send(request)
        ok = result is not None and result.retcode == mt5.TRADE_RETCODE_DONE
        if not ok:
            print(f"order_send({symbol}) failed: "
                  f"{getattr(result, 'retcode', None)} "
                  f"{getattr(result, 'comment', mt5.last_error())}")
        return ok

    def close_position(self, symbol, reason=""):
        pos = self.position(symbol)
        if pos is None:
            return True
        tick = mt5.symbol_info_tick(symbol)
        request = {
            "action": mt5.TRADE_ACTION_DEAL,
            "symbol": symbol,
            "volume": pos["lots"],
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

    def close_all(self, reason=""):
        for pos in self.positions_all():
            self.close_position(pos["symbol"], reason)

    def recent_stop_outs(self, since):
        """Losing closes since `since` — feeds the per-symbol cool-down."""
        deals = mt5.history_deals_get(since, datetime.now(timezone.utc)) or []
        outs = []
        for d in deals:
            if (d.magic == self.magic and d.entry == mt5.DEAL_ENTRY_OUT
                    and d.profit < 0):
                outs.append({"symbol": d.symbol, "profit": d.profit,
                             "time": datetime.fromtimestamp(d.time,
                                                            tz=timezone.utc)})
        return outs

    def shutdown(self):
        mt5.shutdown()


class PaperBroker:
    """Multi-symbol simulated broker fed one bar per symbol at a time.

    Fills SL/TP against each bar's high/low with the same conservative
    stop-first assumption as the backtest, charges the configured
    spread+slippage per side, and assumes USD-quoted symbols (fine for the
    simulator; real quote-currency math happens in MT5Broker).
    """

    def __init__(self, cfg, starting_equity):
        self.cfg = cfg
        self.cost = cfg["cost_pips_per_side"] * cfg["pip"]
        self._equity = starting_equity
        self._pos = {}                       # symbol -> position dict
        self._history = {}                   # symbol -> DataFrame
        self.closed_trades = []

    def connect(self):
        return True

    def feed_bar(self, symbol, bar_time, o, h, l, c):
        row = pd.DataFrame({"open": [o], "high": [h], "low": [l], "close": [c]},
                           index=[bar_time])
        hist = self._history.get(symbol, pd.DataFrame())
        self._history[symbol] = pd.concat([hist, row]).tail(2000)
        p = self._pos.get(symbol)
        if p is None:
            return
        hit_sl = l <= p["sl"] if p["dir"] == 1 else h >= p["sl"]
        hit_tp = h >= p["tp"] if p["dir"] == 1 else l <= p["tp"]
        if hit_sl:                                   # stop first: honest ordering
            self._settle(symbol, p["sl"], "STOP", bar_time)
        elif hit_tp:
            self._settle(symbol, p["tp"], "TARGET", bar_time)

    def _settle(self, symbol, price, reason, t):
        p = self._pos.pop(symbol)
        fill = price - self.cost * p["dir"]
        pnl = p["units"] * (fill - p["entry"]) * p["dir"]
        self._equity += pnl
        self.closed_trades.append({"symbol": symbol,
                                   "entry_time": p["entry_time"], "exit_time": t,
                                   "dir": p["dir"], "entry": p["entry"],
                                   "exit": fill, "pnl": pnl, "reason": reason})

    def equity(self):
        return self._equity

    def get_bars(self, symbol, n=600):
        return self._history.get(symbol, pd.DataFrame()).tail(n)

    def position(self, symbol):
        return self._pos.get(symbol)

    def positions_all(self):
        return [dict(p, symbol=s) for s, p in self._pos.items()]

    def open_market(self, symbol, direction, risk_amount, stop_dist,
                    sl, tp, comment=""):
        last = self._history[symbol].iloc[-1]
        units = risk_amount / stop_dist              # USD-quote assumption
        units = min(units, self.cfg["max_leverage"] * self._equity / last["close"])
        self._pos[symbol] = {"ticket": len(self.closed_trades) + 1,
                             "dir": direction,
                             "entry": last["close"] + self.cost * direction,
                             "units": units, "lots": units / 100_000,
                             "sl": sl, "tp": tp,
                             "entry_time": self._history[symbol].index[-1]}
        return True

    def close_position(self, symbol, reason=""):
        if symbol not in self._pos:
            return True
        last = self._history[symbol].iloc[-1]
        self._settle(symbol, last["close"], reason, self._history[symbol].index[-1])
        return True

    def close_all(self, reason=""):
        for symbol in list(self._pos):
            self.close_position(symbol, reason)

    def recent_stop_outs(self, since):
        return [{"symbol": t["symbol"], "profit": t["pnl"], "time": t["exit_time"]}
                for t in self.closed_trades
                if t["reason"] == "STOP" and pd.Timestamp(t["exit_time"]) >= since]

    def shutdown(self):
        pass
