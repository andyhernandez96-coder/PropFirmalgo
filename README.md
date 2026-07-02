# PropFirmalgo

Systematic EUR/USD 1H mean-reversion algorithm built to be evaluated against
prop firm criteria (10% profit target, 5% max drawdown, 1–2% risk per trade) —
plus a live MT5 signal/autotrade engine and an AI-driven research loop.

## Quick start (backtest)

```bash
pip install -r requirements.txt
python trading_algorithm.py
```

## Live trading (signals + autotrade on MetaTrader 5)

Runs on the Windows PC/VPS where your prop firm's MT5 terminal lives.
The live trader imports the *same* signal functions as the backtest, so live
behavior cannot drift from what was tested.

```bash
# 1. one-time setup
copy config.example.json config.json     # fill in MT5 + Telegram credentials
pip install -r requirements.txt

# 2. dry-run the full loop on simulated bars first (works on any OS)
python live/live_trader.py --paper --steps 5000

# 3. signals-only: Telegram alert per setup, you click the trade
python live/live_trader.py --mode signals --loop

# 4. full autotrade (check your firm's EA/automation rules first!)
python live/live_trader.py --mode auto --loop
```

For unattended running, use Windows Task Scheduler to call
`python live/live_trader.py --mode signals --once` at minute :01 of every hour,
or run `--loop` inside a service. The prop-firm guard (5% kill switch, 3%
daily stop, +10% target lock) executes before any trading logic every cycle
and persists across restarts via `live_state.json`.

### Multi-symbol portfolio

Trade several majors at once via `"mt5_symbols": ["EURUSD", "GBPUSD", "USDJPY"]`
in config.json. Two portfolio guards keep diversification from becoming
concentration: total open risk is capped (`max_portfolio_risk`, default 2%),
and only one position per USD-exposure direction is allowed
(`max_same_usd_exposure`) — EURUSD long + GBPUSD long is the same macro bet,
so the second one is skipped and logged.

### News blackout filter

No entries within ±45 minutes of high-impact scheduled releases (NFP, CPI,
FOMC...) for either of the pair's currencies — spreads around news blow out
far past the backtest's cost assumptions, and prop firms flag news-spike P&L.
The calendar comes from ForexFactory's free weekly feed, cached to disk; if
it's unreachable the filter fails open with a loud warning. Exits and the
kill switch are never blocked. Configure via `news_filter_enabled` /
`news_blackout_minutes`.

### Watchdog (dead-man's switch)

The kill switch protects you from bad trades; the watchdog protects you from
a dead process. `live_trader.py` writes `output/heartbeat.json` every cycle;
`live/watchdog.py` runs as a *separate* scheduled task (every 15 min) and
Telegram-alerts you when the heartbeat goes stale during market hours, when
equity drops >1% between checks, or when a halt state is reported:

```bash
python live/watchdog.py        # schedule independently of the trader
```

## AI research loop (study + improve the strategy)

```bash
# The lab: rolling walk-forward re-optimization with out-of-sample gates.
# Adopts a change ONLY if it beats the current config out-of-sample in a
# majority of folds; winners land in research/recommended_params.json and
# the live trader applies them on next start.
python research/walk_forward.py

# The analyst: Claude reads trade logs + experiment history, diagnoses
# weaknesses, proposes hypotheses — which the lab then validates.
export ANTHROPIC_API_KEY=sk-ant-...
python research/ai_analyst.py            # weekly, or after ~20 live trades
python research/ai_analyst.py --dry-run  # preview the evidence bundle, no API call
```

Claude never changes live parameters directly — every proposal must survive
out-of-sample validation first.

The script fetches real 1H EUR/USD data from Yahoo Finance when internet is
available; otherwise it falls back to a seeded, realistic simulator and labels
every report accordingly. Outputs land in `./output/`:

- `equity_curve_in_sample.png` / `equity_curve_out_of_sample.png`
- `trades_in_sample.csv` / `trades_out_of_sample.csv` — full trade logs
- `prop_firm_report.txt` — the pass/fail scoreboard

## What's in here

| File | Purpose |
|---|---|
| `trading_algorithm.py` | Complete pipeline: data → indicators → signals → risk-managed backtest → prop firm report |
| `live/live_trader.py` | Hourly live loop: MT5 data → signal → Telegram alert and/or MT5 order, prop-firm guard first |
| `live/mt5_client.py` | Multi-symbol MetaTrader 5 wrapper + PaperBroker for dry-runs on any OS |
| `live/news_filter.py` | High-impact news blackout (ForexFactory calendar, cached, fails open) |
| `live/watchdog.py` | Dead-man's switch: alerts if the trader's heartbeat goes stale |
| `live/telegram_alerts.py` | Signal notifications to your phone |
| `research/walk_forward.py` | Rolling out-of-sample re-optimization; the adoption gate for all changes |
| `research/ai_analyst.py` | Claude-powered diagnosis + hypothesis generation, validated by the lab |
| `STRATEGY.md` | One-page plain-English explanation of the edge, the rules, and the honest limitations |
| `output/` | Latest backtest artifacts (regenerated on every run) |

## The strategy in one paragraph

Wait for EUR/USD to stretch ~1.5σ from its 20-hour mean during London/NY
hours, in the direction opposite the 200-EMA trend; enter on the first bar
that closes back inside the band; target the mean, stop at 1.5×ATR, time-stop
after 24 bars. Risk 1% of equity per trade with ATR-based sizing. A hard-coded
kill switch liquidates and halts at −5% from starting balance; a 3% daily loss
stops new entries for the day; +10% locks the account and stops trading.

See `STRATEGY.md` for the validation methodology (in-sample 2023 tuning,
untouched 2024 out-of-sample) and the honest limitations before submitting
anything to a real evaluation.
