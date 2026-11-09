"""Survey analysis: the three starter questions, in Python.

    analysis/.venv/bin/python analysis/python/analysis.py [--data DIR] [--include-test]

Mirrors analysis/R/analysis.R line for line. Both follow the definitions in
analysis/README.md and write the same CSVs (output/python vs output/r), so
analysis/compare.py can check that they agree.
"""

from __future__ import annotations

import argparse
import math
from pathlib import Path

import numpy as np
import pandas as pd
import statsmodels.api as sm
from scipy import stats

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "analysis" / "output" / "python"

# ---- Shared definitions (keep in sync with analysis/R/analysis.R) ----------

TEST_SOURCES = {"internal-preview", "simulated"}
MIN_JOB_CHOICE_SECONDS = 16  # 8 pairs, about 2 s a pair
MIN_GROUP = 30  # groups smaller than this are flagged "small"

SATISFACTION = {  # 1-7; cant-choose is missing
    "completely-dissatisfied": 1, "very-dissatisfied": 2, "fairly-dissatisfied": 3,
    "neither": 4, "fairly-satisfied": 5, "very-satisfied": 6, "completely-satisfied": 7,
}
SATISFIED_AT = 5  # "fairly satisfied" or better
BENEFIT = {  # 1-5; cant-choose is missing
    "strongly-disagree": 1, "disagree": 2, "neither": 3, "agree": 4, "strongly-agree": 5,
}
EXPERIENCE = {
    "student": 1, "recent-graduate": 2, "1-4": 3, "5-9": 4, "10-19": 5, "20-plus": 6,
}
# Conjoint levels in display order; the first one listed is the baseline.
ATTRIBUTES = {
    "pay": ["same", "less-30", "less-15", "more-15", "more-30"],
    "mission": ["commercial", "some-good", "for-good"],
    "organisation": ["established", "startup", "public", "nonprofit"],
    "brand": ["unknown", "industry", "household"],
    "work": ["established", "new", "ai"],
}
Z = stats.norm.ppf(0.975)


# ---- Loading -----------------------------------------------------------------

def latest_export() -> Path:
    dirs = sorted(p for p in (ROOT / "survey-exports").glob("*-exported-*") if p.is_dir())
    if not dirs:
        raise SystemExit("No export found in survey-exports/. Run scripts/survey-export.ts first.")
    return dirs[-1]


def labels(codebook: pd.DataFrame, column: str) -> dict[str, str]:
    rows = codebook[(codebook["column"] == column) & codebook["value"].notna()]
    return dict(zip(rows["value"].astype(str), rows["value_label"]))


def load(data: Path, include_test: bool):
    responses = pd.read_csv(data / "responses.csv", dtype=str, keep_default_na=False, na_values=[""])
    conjoint = pd.read_csv(data / "conjoint.csv", dtype={"respondent_id": str})
    codebook = pd.read_csv(data / "codebook.csv", dtype=str)
    responses["job_choice_seconds"] = pd.to_numeric(responses["job_choice_seconds"])
    if not include_test:
        responses = responses[~responses["source"].isin(TEST_SOURCES)]
    # Speeders are dropped from EVERY question, not just the job choice: someone
    # who rushed the 8 pairs probably rushed (or straight-lined) the rest too.
    # Untimed responses are kept.
    fast = responses["job_choice_seconds"] < MIN_JOB_CHOICE_SECONDS
    return responses[~fast], conjoint, codebook, int(fast.sum())


# ---- Helpers -----------------------------------------------------------------

def cluster_ols(y: np.ndarray, X: np.ndarray, groups: np.ndarray):
    """OLS with respondent-clustered (CR1) standard errors; normal-based CIs."""
    fit = sm.OLS(y, X).fit(cov_type="cluster", cov_kwds={"groups": groups})
    return fit.params, fit.bse


def ci_row(est: float, se: float) -> dict:
    zval = est / se if se > 0 else math.nan
    return {
        "estimate": est, "std_error": se,
        "ci_low": est - Z * se, "ci_high": est + Z * se,
        "p_value": 2 * stats.norm.sf(abs(zval)) if se > 0 else math.nan,
    }


def spearman(x: pd.Series, y: pd.Series) -> dict:
    ok = x.notna() & y.notna()
    x, y = x[ok], y[ok]
    n = len(x)
    rho, p = stats.spearmanr(x, y)
    # Fisher-z interval: deterministic, so both languages give the same numbers.
    z, se = math.atanh(rho), 1 / math.sqrt(n - 3)
    return {"n": n, "estimate": rho, "statistic": math.nan, "p_value": p,
            "ci_low": math.tanh(z - Z * se), "ci_high": math.tanh(z + Z * se)}


def by_group(df: pd.DataFrame, group: str, order: dict, label_map: dict) -> pd.DataFrame:
    rows = []
    for level in order:
        s = df.loc[df[group] == level, "satisfaction"].dropna()
        rows.append({
            group: level, "label": label_map.get(level, level), "n": len(s),
            "mean_satisfaction": s.mean() if len(s) else math.nan,
            "pct_satisfied": 100 * (s >= SATISFIED_AT).mean() if len(s) else math.nan,
            "small": len(s) < MIN_GROUP,
        })
    return pd.DataFrame(rows)


# ---- Q1: what did people optimise for in the job choice? ---------------------

def q1(responses: pd.DataFrame, conjoint: pd.DataFrame, codebook: pd.DataFrame):
    keep = set(responses["respondent_id"])
    cards = conjoint[conjoint["respondent_id"].isin(keep)].reset_index(drop=True)
    groups = pd.factorize(cards["respondent_id"])[0]
    y = cards["chosen"].to_numpy(float)

    # AMCE: one linear probability model with every attribute, baseline = first level.
    names, cols = ["(Intercept)"], [np.ones(len(cards))]
    for attr, levels in ATTRIBUTES.items():
        for level in levels[1:]:
            names.append(f"{attr}:{level}")
            cols.append((cards[attr] == level).to_numpy(float))
    params, bse = cluster_ols(y, np.column_stack(cols), groups)
    coef = dict(zip(names, zip(params, bse)))

    amce, mm = [], []
    for attr, levels in ATTRIBUTES.items():
        lab = labels(codebook, f"conjoint.csv: {attr}")
        for i, level in enumerate(levels):
            base = {"attribute": attr, "level": level, "label": lab.get(level, level),
                    "baseline": i == 0}
            if i == 0:
                amce.append({**base, "estimate": 0.0, "std_error": math.nan, "ci_low": math.nan,
                             "ci_high": math.nan, "p_value": math.nan})
            else:
                amce.append({**base, **ci_row(*coef[f"{attr}:{level}"])})
            # Marginal mean: share of cards with this level that were picked.
            sub = cards[attr] == level
            p, se = cluster_ols(y[sub], np.ones((sub.sum(), 1)), groups[sub])
            mm.append({**base, "n_cards": int(sub.sum()), **ci_row(p[0], se[0])})
    amce, mm = pd.DataFrame(amce), pd.DataFrame(mm)
    mm["p_value"] = math.nan  # testing against 0 is meaningless for a share

    imp = (amce.groupby("attribute", sort=False)["estimate"]
           .agg(lambda e: e.max() - e.min()).rename("range").reset_index())
    imp["share"] = imp["range"] / imp["range"].sum()
    imp = imp.sort_values("range", ascending=False).reset_index(drop=True)
    imp["rank"] = np.arange(1, len(imp) + 1)

    info = {"respondents": cards["respondent_id"].nunique(), "cards": len(cards)}
    return amce, mm, imp, info


# ---- Q2 and Q3 ---------------------------------------------------------------

def happiness(responses: pd.DataFrame, codebook: pd.DataFrame):
    df = responses.assign(
        satisfaction=responses["career_satisfaction"].map(SATISFACTION),
        benefit=responses["benefit_to_world"].map(BENEFIT),
        exp=responses["experience"].map(EXPERIENCE),
    )
    tests = []

    # Q2: is satisfaction related to feeling the job is useful to society?
    q2_table = by_group(df, "benefit_to_world", BENEFIT, labels(codebook, "benefit_to_world"))
    tests.append({"question": "q2", "test": "spearman satisfaction ~ benefit_to_world",
                  **spearman(df["satisfaction"], df["benefit"])})

    # Q3: are more senior people more or less satisfied?
    q3_exp = by_group(df, "experience", EXPERIENCE, labels(codebook, "experience"))
    tests.append({"question": "q3", "test": "spearman satisfaction ~ experience",
                  **spearman(df["satisfaction"], df["exp"])})
    groups = [g["satisfaction"].dropna() for _, g in df.groupby("experience")]
    groups = [g for g in groups if len(g)]
    h, p = stats.kruskal(*groups)
    tests.append({"question": "q3", "test": "kruskal-wallis satisfaction by experience",
                  "n": sum(map(len, groups)), "estimate": math.nan, "statistic": h,
                  "p_value": p, "ci_low": math.nan, "ci_high": math.nan})

    mgr = {"no": 0, "yes": 1}
    q3_mgr = by_group(df, "manages_people", mgr, labels(codebook, "manages_people"))
    yes = df.loc[df["manages_people"] == "yes", "satisfaction"].dropna()
    no = df.loc[df["manages_people"] == "no", "satisfaction"].dropna()
    u, p = stats.mannwhitneyu(yes, no, alternative="two-sided", use_continuity=True,
                              method="asymptotic")
    tests.append({"question": "q3", "test": "mann-whitney satisfaction managers vs not",
                  "n": len(yes) + len(no), "estimate": yes.mean() - no.mean(),
                  "statistic": u, "p_value": p, "ci_low": math.nan, "ci_high": math.nan})

    return q2_table, q3_exp, q3_mgr, pd.DataFrame(tests)


# ---- Main ----------------------------------------------------------------------

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", type=Path, help="export folder (default: newest in survey-exports/)")
    ap.add_argument("--include-test", action="store_true", help="keep test rows (internal-preview, simulated)")
    args = ap.parse_args()

    data = args.data or latest_export()
    responses, conjoint, codebook, n_fast = load(data, args.include_test)
    if responses.empty:
        raise SystemExit(f"No responses left in {data} (all test data? try --include-test).")

    amce, mm, imp, info = q1(responses, conjoint, codebook)
    q2_table, q3_exp, q3_mgr, tests = happiness(responses, codebook)

    OUT.mkdir(parents=True, exist_ok=True)
    for name, df in {"q1_amce": amce, "q1_marginal_means": mm, "q1_importance": imp,
                     "q2_satisfaction_by_benefit": q2_table, "q3_satisfaction_by_experience": q3_exp,
                     "q3_satisfaction_by_manager": q3_mgr, "tests": tests}.items():
        df.round(8).to_csv(OUT / f"{name}.csv", index=False)

    pd.set_option("display.width", 140)
    print(f"Data: {data.name} · {len(responses)} responses analysed"
          f"{' (including test rows)' if args.include_test else ''}, "
          f"{n_fast} dropped for finishing the job choice in under {MIN_JOB_CHOICE_SECONDS}s\n")
    print(f"Q1 · job choice · {info['respondents']} respondents, {info['cards']} cards")
    print("Attribute importance (range of AMCEs, percentage points):")
    for r in imp.itertuples():
        print(f"  {r.rank}. {r.attribute:<13} {100 * r.range:5.1f} pp  ({100 * r.share:.0f}% of total)")
    print("Effect of each level vs baseline (pp change in chance of being picked):")
    for r in amce[~amce["baseline"]].itertuples():
        print(f"  {r.attribute:<13} {r.label.split(' (numeric value')[0]:<34} {100 * r.estimate:+6.1f}  "
              f"[{100 * r.ci_low:+.1f}, {100 * r.ci_high:+.1f}]")
    print("\nQ2 · satisfaction by 'my job is useful to society':")
    print(q2_table.drop(columns="benefit_to_world").round(2).to_string(index=False))
    print("\nQ3 · satisfaction by experience:")
    print(q3_exp.drop(columns="experience").round(2).to_string(index=False))
    print("\nQ3 · satisfaction by managing people:")
    print(q3_mgr.drop(columns="manages_people").round(2).to_string(index=False))
    print("\nTests:")
    print(tests.round(4).to_string(index=False))
    print(f"\nCSV results in {OUT.relative_to(ROOT)}/")


if __name__ == "__main__":
    main()
