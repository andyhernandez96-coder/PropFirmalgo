"""
WALK-FORWARD LAB — the disciplined half of "AI studies and improves strategies".

Why this exists: tweaking parameters on one backtest is how people curve-fit.
This lab re-tests candidate parameters on ROLLING windows: pick on the train
slice, judge ONLY on the untouched test slice that follows it, repeat across
history. A change is recommended only if it beats the current config
out-of-sample in the MAJORITY of folds — one lucky fold doesn't count.

Usage:
    python research/walk_forward.py                     # grid around current params
    python research/walk_forward.py --hypotheses h.json # test AI-analyst proposals

Outputs (in ./research/):
    experiments.csv          — every (fold, candidate, train/test result) row
    recommended_params.json  — written ONLY when a candidate wins; the live
                               trader picks this up automatically on next start
"""

import argparse
import itertools
import json
import os
import sys

import pandas as pd

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, REPO_ROOT)

from trading_algorithm import (CONFIG, add_indicators, add_signals,   # noqa: E402
                               load_data, run_backtest)

RESEARCH_DIR = os.path.join(REPO_ROOT, "research")

# The ONLY parameters research may touch, with hard sanity bounds. Anything
# outside these ranges is rejected no matter who proposed it (grid or AI).
PARAM_BOUNDS = {
    "bb_period":       (10, 40),
    "bb_std":          (1.0, 2.5),
    "stop_atr_mult":   (1.0, 3.0),
    "min_rr":          (0.0, 1.5),
    "time_stop_bars":  (6, 72),
    "cooldown_bars":   (0, 24),
    "session_start_utc": (0, 23),
    "session_end_utc": (1, 24),
}

DEFAULT_GRID = {              # a modest neighborhood — not a data-mining sweep
    "bb_std":        [1.4, 1.5, 1.6],
    "stop_atr_mult": [1.25, 1.5, 1.75],
    "min_rr":        [0.4, 0.6],
}


def clamp_params(overrides):
    """Validate a proposal against the whitelist; returns (clean, rejected)."""
    clean, rejected = {}, {}
    for k, v in overrides.items():
        if k not in PARAM_BOUNDS:
            rejected[k] = f"not a tunable parameter"
            continue
        lo, hi = PARAM_BOUNDS[k]
        if not isinstance(v, (int, float)) or not (lo <= v <= hi):
            rejected[k] = f"outside sane bounds [{lo}, {hi}]"
            continue
        clean[k] = v
    return clean, rejected


def raw_edge(df, cfg):
    """Expectancy over a slice with account halts disabled — measures the edge
    itself, not one equity path's luck."""
    diag = dict(cfg); diag["max_drawdown"] = 9.9; diag["profit_target"] = 9.9
    feat = add_signals(add_indicators(df, cfg), cfg)
    feat = feat[feat.index >= df.index[0] + pd.Timedelta(days=45)]  # warm-up
    res = run_backtest(feat, diag, label="")
    tr = res["trades"]
    if len(tr) == 0:
        return {"n": 0, "wr": 0.0, "pf": 0.0, "sum_r": 0.0}
    risk = cfg["starting_capital"] * cfg["risk_per_trade"]
    wins = tr.pnl[tr.pnl > 0].sum()
    losses = abs(tr.pnl[tr.pnl <= 0].sum())
    return {"n": len(tr),
            "wr": float((tr.pnl > 0).mean()),
            "pf": float(wins / losses) if losses else float("inf"),
            "sum_r": float(tr.pnl.sum() / risk)}


def make_folds(df, train_days=180, test_days=60):
    """Rolling (train, test) windows stepping forward by test_days."""
    folds = []
    start = df.index[0]
    while True:
        tr_end = start + pd.Timedelta(days=train_days)
        te_end = tr_end + pd.Timedelta(days=test_days)
        if te_end > df.index[-1]:
            break
        folds.append((df[(df.index >= start) & (df.index < tr_end)],
                      df[(df.index >= tr_end - pd.Timedelta(days=45)) &  # warm-up overlap
                         (df.index < te_end)]))
        start = start + pd.Timedelta(days=test_days)
    return folds


def evaluate_candidates(candidates, min_trades=15):
    """Run every named candidate through every fold; decide by OOS majority.

    candidates: dict name -> param_overrides ({} = current config baseline)
    """
    df, source = load_data(CONFIG)
    print(f"Data: {source} ({len(df):,} bars)")
    folds = make_folds(df)
    print(f"Folds: {len(folds)} (train 180d / test 60d, rolling)")

    rows = []
    for name, overrides in candidates.items():
        cfg = dict(CONFIG); cfg.update(overrides)
        for i, (train, test) in enumerate(folds):
            tr = raw_edge(train, cfg)
            te = raw_edge(test, cfg)
            rows.append({"candidate": name, "fold": i, **{f"train_{k}": v for k, v in tr.items()},
                         **{f"test_{k}": v for k, v in te.items()},
                         "params": json.dumps(overrides)})
    log = pd.DataFrame(rows)
    os.makedirs(RESEARCH_DIR, exist_ok=True)
    log_path = os.path.join(RESEARCH_DIR, "experiments.csv")
    log.to_csv(log_path, mode="a", index=False,
               header=not os.path.exists(log_path))

    # ---- verdict: candidate must beat baseline OOS in the majority of folds
    base = log[log.candidate == "baseline"].set_index("fold")
    summary = []
    for name in candidates:
        cand = log[log.candidate == name].set_index("fold")
        oos = cand["test_sum_r"]
        beats = int((cand["test_sum_r"] > base["test_sum_r"]).sum())
        enough = bool((cand["train_n"] >= min_trades).all())
        summary.append({"candidate": name, "folds": len(oos),
                        "oos_sum_r_total": round(float(oos.sum()), 2),
                        "oos_median_r": round(float(oos.median()), 2),
                        "beats_baseline_folds": beats,
                        "enough_trades": enough})
    summary = pd.DataFrame(summary).sort_values("oos_sum_r_total",
                                                ascending=False)
    print("\n=== WALK-FORWARD SUMMARY (judged on out-of-sample folds only) ===")
    print(summary.to_string(index=False))

    # ---- adoption gate ------------------------------------------------------
    n_folds = len(folds)
    winners = summary[(summary.candidate != "baseline") &
                      (summary.enough_trades) &
                      (summary.beats_baseline_folds > n_folds / 2) &
                      (summary.oos_median_r > 0)]
    rec_path = os.path.join(RESEARCH_DIR, "recommended_params.json")
    if len(winners):
        best = winners.iloc[0]["candidate"]
        params = candidates[best]
        with open(rec_path, "w") as f:
            json.dump({"source": best, "params": params,
                       "evidence": winners.iloc[0].to_dict()}, f, indent=2)
        print(f"\nADOPTED: '{best}' {params} -> {rec_path}")
        print("The live trader applies this automatically on next start.")
    else:
        print("\nNo candidate beat the current config out-of-sample in a "
              "majority of folds — keeping current parameters. (This is the "
              "correct outcome most of the time; edges are rare.)")
    return summary


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--hypotheses", help="JSON file of AI-analyst hypotheses: "
                    '[{"name": ..., "param_overrides": {...}}, ...]')
    args = ap.parse_args()

    candidates = {"baseline": {}}
    if args.hypotheses:
        with open(args.hypotheses) as f:
            for h in json.load(f):
                clean, rejected = clamp_params(h.get("param_overrides", {}))
                if rejected:
                    print(f"[{h.get('name')}] rejected fields: {rejected}")
                if clean:
                    candidates[h["name"]] = clean
    else:
        keys = list(DEFAULT_GRID)
        for combo in itertools.product(*DEFAULT_GRID.values()):
            overrides = dict(zip(keys, combo))
            if all(abs(overrides[k] - CONFIG[k]) < 1e-9 for k in keys):
                continue                      # that's the baseline itself
            name = "grid_" + "_".join(f"{k}={v}" for k, v in overrides.items())
            candidates[name] = overrides

    evaluate_candidates(candidates)


if __name__ == "__main__":
    main()
