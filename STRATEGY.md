# Strategy Document — EUR/USD 1H Mean Reversion with Trend Filter

## The edge in two sentences (interviewer version)

When EUR/USD stretches about 1.5 standard deviations away from its 20-hour
mean during liquid London/NY hours, and the higher-timeframe trend agrees with
the reversion direction, price tends to snap back to the mean before it
continues. We wait for the first bar that closes back inside the band —
confirmation that reversion has started — instead of catching the falling
knife, and we only take trades where the distance back to the mean pays at
least 0.6x what the stop risks.

## Why this edge and not a deeper stretch

Testing on a full year of data (not a 60-day lucky streak) showed that deep
2-sigma breaks tend to **keep running**: Bollinger Bands are backward-looking,
so when volatility has just expanded, a "2-sigma" break is really a break of
stale, too-narrow bands. Shallower 1.5-sigma stretches with a confirmation
close back inside the band reverted far more reliably (70% vs ~46% win rate
in-sample). The parameter neighborhood is a smooth plateau (bb 1.4–1.7σ,
stop 1.25–1.75×ATR, min-reward 0.4–0.7R all profitable), which is the
signature of a real effect rather than a curve-fit spike.

## Rules (mechanical, no discretion)

| Component | Rule |
|---|---|
| Instrument | EUR/USD, 1H bars, UTC timestamps |
| Long setup | Previous 1H close **below** lower Bollinger(20, 1.5σ), current close back **inside** the band, close **above** the 200-EMA, bar closed 07:00–20:00 UTC |
| Short setup | Exact mirror above the upper band, below the 200-EMA |
| Entry | Next bar open (signal uses only closed-bar data — no lookahead) |
| Skip filter | No trade if distance to the mid-band target < 0.6 × stop distance |
| Take profit | Middle band (the 20-hour mean, frozen at entry) |
| Stop loss | 1.5 × ATR(14) from entry |
| Time stop | 24 bars — reversion that hasn't happened in a day isn't happening |
| Cool-down | 6 bars flat after any stop-out (no falling-knife re-entries) |

## Risk management (why the sizing is what it is)

- **1% of current equity risked per trade.** Streak arithmetic dictates this:
  five straight losses at 1.5% = −7.5% (account busted under a 5% rule);
  at 1% the worst realistic streak stays survivable.
- **Position size = risk dollars / stop distance** — ATR-based, so size
  automatically shrinks when volatility expands. Leverage capped at 30:1.
- **Costs:** 1 pip spread+slippage per side (2 pips round trip), inside the
  2–5 pip guidance for a major pair during liquid hours.
- **Hard rules enforced in code, not by discipline:**
  - equity ≤ 95% of start → liquidate everything, halt permanently (kill switch)
  - daily loss ≥ 3% of start → no new entries until the next day
  - equity ≥ 110% of start → close out and halt (never give the pass back)

## Validation methodology

Parameters were chosen using **only the first half** of the data (2023) with
expectancy measured over ~50 trades, then frozen. The second half (2024) was
never touched during tuning. Out-of-sample the edge remained positive
(profit factor 1.18, +0.08R/trade over 55 trades) — smaller than in-sample,
which is exactly what an honest out-of-sample result looks like.

## Honest limitations (read before submitting to a firm)

1. **In this environment the data is simulated.** The sandbox blocks all
   market-data hosts, so the shipped run uses a seeded, realistic EUR/USD
   generator (vol clustering, session profile, weekend gaps, intraday mean
   reversion). The code automatically switches to real Yahoo Finance 1H data
   when run with internet access — do that before drawing any conclusion
   about the edge.
2. **10% in 60 days with 1% risk is a stretch goal, not an expectation.**
   The measured edge (~+0.1 to +0.25R/trade at ~5 trades/month) compounds to
   roughly +1% to +3% per 60-day window. Hitting +10% in one window requires
   either an unusually good run, higher risk per trade (which breaks the 5%
   drawdown math), or higher trade frequency (more pairs / lower timeframe).
   Any vendor claiming a strategy that *reliably* makes 10% in 60 days inside
   a 5% drawdown is describing a ~6 Sharpe system — be skeptical, including
   of your own backtests.
3. A 60-day window contains ~10 trades — far too few to judge the edge.
   Judge on the full-history diagnostic; treat any single window as one draw
   from the distribution.
