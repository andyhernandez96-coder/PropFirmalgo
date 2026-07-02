"""
AI STRATEGY ANALYST — Claude studies the trading record and proposes testable
hypotheses; the walk-forward lab decides whether any of them are adopted.

Division of labor (deliberate):
  * Claude = the analyst. It reads the trade logs, the current parameters, and
    past experiment results, and proposes hypotheses ("losses cluster in the
    17:00-20:00 window — trim the session", "stops are getting clipped —
    widen to 1.75 ATR").
  * walk_forward.py = the judge. Every hypothesis is tested on rolling
    out-of-sample folds; only majority-of-folds winners get adopted.
  Claude never changes live parameters directly — proposals that fail
  validation die in the lab. This is what keeps "AI improves the strategy"
  from becoming "AI overfits the strategy".

Requires an Anthropic API key:  export ANTHROPIC_API_KEY=sk-ant-...
Run weekly (or after every ~20 live trades):
    python research/ai_analyst.py            # propose + validate + report
    python research/ai_analyst.py --dry-run  # show the prompt, no API call
"""

import argparse
import glob
import json
import os
import sys

import pandas as pd

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, REPO_ROOT)

from trading_algorithm import CONFIG                              # noqa: E402
from research.walk_forward import (PARAM_BOUNDS, clamp_params,    # noqa: E402
                                   evaluate_candidates)

RESEARCH_DIR = os.path.join(REPO_ROOT, "research")
REPORT_PATH = os.path.join(RESEARCH_DIR, "ai_report.md")

# Structured output schema — forces Claude to answer in exactly the shape the
# lab can consume, no free-text parsing.
HYPOTHESES_SCHEMA = {
    "type": "object",
    "properties": {
        "diagnosis": {
            "type": "string",
            "description": "2-4 sentence diagnosis of the strategy's current "
                           "weaknesses based on the evidence provided."},
        "hypotheses": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "name": {"type": "string"},
                    "rationale": {"type": "string"},
                    "param_overrides": {
                        "type": "object",
                        "properties": {k: {"type": "number"}
                                       for k in PARAM_BOUNDS},
                        "additionalProperties": False},
                },
                "required": ["name", "rationale", "param_overrides"],
                "additionalProperties": False},
        },
    },
    "required": ["diagnosis", "hypotheses"],
    "additionalProperties": False,
}

SYSTEM_PROMPT = """\
You are a quantitative trading analyst reviewing a mean-reversion FX strategy
that must pass prop firm evaluations (10% profit target, 5% max drawdown,
1% risk per trade). Your job is to diagnose weaknesses from the evidence and
propose 2-4 SMALL, testable parameter hypotheses.

Rules you must respect:
- Only propose changes to the whitelisted parameters, within their bounds.
- Prefer one-parameter changes; never change more than two at once.
- Every hypothesis needs a rationale grounded in the evidence provided
  (e.g. exit-reason distribution, time-of-day of losses) — not generic advice.
- If the evidence is too thin to justify changes, say so in the diagnosis and
  return an empty hypotheses list. That is a valid, good answer.
- Your proposals will be validated on rolling out-of-sample folds; they are
  suggestions to test, not decisions."""


def gather_evidence():
    """Everything the analyst is allowed to see, as a compact text bundle."""
    parts = [f"CURRENT PARAMETERS:\n{json.dumps(strategy_params(), indent=2)}",
             f"PARAMETER BOUNDS:\n{json.dumps(PARAM_BOUNDS, indent=2)}"]

    trade_files = sorted(glob.glob(os.path.join(REPO_ROOT, "output", "trades_*.csv")))
    for tf in trade_files[-2:]:
        df = pd.read_csv(tf)
        if not len(df):
            continue
        df["hour"] = pd.to_datetime(df["entry_time"]).dt.hour
        by_reason = df.groupby("exit_reason")["pnl"].agg(["count", "sum", "mean"])
        by_hour = df.groupby("hour")["pnl"].sum()
        parts.append(f"TRADE LOG {os.path.basename(tf)} ({len(df)} trades):\n"
                     f"P&L by exit reason:\n{by_reason.to_string()}\n"
                     f"P&L by entry hour (UTC):\n{by_hour.to_string()}\n"
                     f"Last 15 trades:\n{df.tail(15).to_string(index=False)}")

    live_log = os.path.join(REPO_ROOT, "output", "live_signals.csv")
    if os.path.exists(live_log):
        df = pd.read_csv(live_log)
        parts.append(f"LIVE SIGNALS ({len(df)}):\n{df.tail(20).to_string(index=False)}")

    exp = os.path.join(RESEARCH_DIR, "experiments.csv")
    if os.path.exists(exp):
        df = pd.read_csv(exp)
        recent = df.tail(60)[["candidate", "fold", "test_n", "test_wr",
                              "test_pf", "test_sum_r"]]
        parts.append("PAST EXPERIMENTS (out-of-sample results — do not "
                     f"re-propose losers):\n{recent.to_string(index=False)}")
    return "\n\n".join(parts)


def strategy_params():
    return {k: CONFIG[k] for k in PARAM_BOUNDS if k in CONFIG}


def ask_claude(evidence):
    import anthropic
    client = anthropic.Anthropic()
    response = client.messages.create(
        model="claude-opus-4-8",
        max_tokens=16000,
        thinking={"type": "adaptive"},
        system=SYSTEM_PROMPT,
        output_config={"format": {"type": "json_schema",
                                  "schema": HYPOTHESES_SCHEMA}},
        messages=[{"role": "user", "content":
                   f"Here is the strategy's current evidence bundle:\n\n{evidence}"
                   f"\n\nDiagnose and propose hypotheses."}],
    )
    if response.stop_reason == "refusal":
        raise RuntimeError("Claude declined the request (refusal stop reason).")
    text = next(b.text for b in response.content if b.type == "text")
    return json.loads(text)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true",
                    help="print the evidence bundle and exit (no API call)")
    args = ap.parse_args()

    evidence = gather_evidence()
    if args.dry_run:
        print(SYSTEM_PROMPT + "\n\n" + evidence)
        return

    if not os.environ.get("ANTHROPIC_API_KEY"):
        sys.exit("Set ANTHROPIC_API_KEY first (https://console.anthropic.com). "
                 "Use --dry-run to preview what would be sent.")

    print("Asking Claude for a diagnosis and hypotheses...")
    result = ask_claude(evidence)
    print(f"\nDIAGNOSIS:\n{result['diagnosis']}\n")

    candidates = {"baseline": {}}
    accepted, notes = [], []
    for h in result["hypotheses"]:
        clean, rejected = clamp_params(h["param_overrides"])
        if rejected:
            notes.append(f"- '{h['name']}': rejected fields {rejected}")
        if clean:
            candidates[h["name"]] = clean
            accepted.append(h)
            print(f"HYPOTHESIS '{h['name']}': {clean}\n  why: {h['rationale']}")

    lines = ["# AI Analyst Report", "",
             f"## Diagnosis", result["diagnosis"], ""]
    if len(candidates) > 1:
        print("\nValidating hypotheses on rolling out-of-sample folds...")
        summary = evaluate_candidates(candidates)
        lines += ["## Hypotheses tested"]
        lines += [f"- **{h['name']}** — {h['rationale']}\n  overrides: "
                  f"`{json.dumps(h['param_overrides'])}`" for h in accepted]
        lines += ["", "## Walk-forward verdict (out-of-sample)",
                  "```", summary.to_string(index=False), "```"]
    else:
        print("No testable hypotheses proposed — evidence too thin, or all "
              "proposals were out of bounds. That's a legitimate outcome.")
        lines += ["## Hypotheses", "None proposed — evidence insufficient."]
    if notes:
        lines += ["", "## Rejected fields"] + notes

    os.makedirs(RESEARCH_DIR, exist_ok=True)
    with open(REPORT_PATH, "w") as f:
        f.write("\n".join(lines) + "\n")
    print(f"\nReport written to {REPORT_PATH}")


if __name__ == "__main__":
    main()
