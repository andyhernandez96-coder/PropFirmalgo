# PropFirmalgo

Systematic EUR/USD 1H mean-reversion algorithm built to be evaluated against
prop firm criteria (10% profit target, 5% max drawdown, 1–2% risk per trade).

## Quick start

```bash
pip install -r requirements.txt
python trading_algorithm.py
```

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
