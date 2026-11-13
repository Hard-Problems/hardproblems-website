"""The four research questions of the 2026 survey, a first pass.

    analysis/.venv/bin/python analysis/python/research_questions.py [--data DIR] [--include-test]

Uses the same loading, test-row and speeder rules as analysis.py. Prints a
summary and writes one small CSV per result to analysis/output/python/rq_*.csv
(aggregates only: counts, shares and estimates, never individual answers), which
is what the shareable report is built from. Python only for now; port to R once
the questions and definitions settle.
"""

from __future__ import annotations

import argparse
from pathlib import Path

import numpy as np
import pandas as pd
import statsmodels.formula.api as smf
from scipy import stats

from analysis import ATTRIBUTES, BENEFIT, OUT, SATISFACTION, SATISFIED_AT, latest_export, load

FIVE_AGREE = {"strongly-disagree": 1, "tend-to-disagree": 2, "neither": 3, "tend-to-agree": 4, "strongly-agree": 5}
FREQ = {"never": 1, "rarely": 2, "sometimes": 3, "most-of-the-time": 4, "always": 5}
BURNOUT = {"never": 1, "rarely": 2, "sometimes": 3, "often": 4, "always": 5}

# Who works on social or environmental problems. There is no direct question,
# so two definitions: narrow = the organisation itself is public sector or a
# nonprofit; broad = that, or they work in a public-good sector.
IMPACT_ORGS = {"public-sector", "nonprofit"}
IMPACT_SECTORS = ["sectors__government", "sectors__nonprofit", "sectors__education", "sectors__health"]
COMMERCIAL_ORGS = {"startup", "scale-up", "big-tech", "enterprise"}
DESIGN_ROLES = {"product-designer", "graphic-designer", "brand-designer", "illustrator", "motion-designer",
                "service-designer", "industrial-designer", "design-researcher", "ux-designer", "ui-designer",
                "design-writer", "design-manager"}

FEELING_LABELS = {"mixed": "Mixed feelings"}
POSITIVE_FEELINGS = {"optimistic", "excited", "confident", "grateful", "fulfilled", "curious", "comfortable"}
MATTERS_LABELS = {"work_life_balance": "Work/life balance", "great_team": "Great team", "great_manager": "Great manager",
                  "career_growth": "Career growth", "creative_freedom": "Creative freedom",
                  "business_impact": "Business impact"}
LEVEL_LABELS = {"for-good": "Directly does good in the world", "some-good": "Some benefit to society",
                "household": "A household-name brand", "industry": "Brand well known in its space",
                "startup": "Early-stage startup", "nonprofit": "Nonprofit or charity", "public": "Public sector",
                "new": "New product development", "ai": "Cutting-edge AI products",
                "less-30": "30% less pay", "less-15": "15% less pay", "more-15": "15% more pay", "more-30": "30% more pay"}

ATTR_LABELS = {"pay": "Pay", "mission": "Mission", "organisation": "Organisation", "brand": "Brand", "work": "The work"}
BASELINE_LABELS = {"pay": "The same pay as now", "mission": "Helps businesses to grow", "organisation": "Established company",
                   "brand": "Little-known brand", "work": "An established product"}

TABLES: dict[str, list[dict]] = {}


def record(table: str, **row):
    TABLES.setdefault(table, []).append(row)


def share(s: pd.Series) -> tuple[float, int]:
    s = s.dropna()
    return (100 * s.mean() if len(s) else float("nan")), len(s)


def pct(s: pd.Series) -> str:
    p, n = share(s)
    return f"{p:.0f}% (n={n})" if n else "—"


def prepare(r: pd.DataFrame) -> pd.DataFrame:
    d = r.copy()
    ticks = [c for c in d.columns if "__" in c]  # multi-select 0/1 columns, read as text
    d[ticks] = d[ticks].apply(pd.to_numeric)
    d["sat"] = d["career_satisfaction"].map(SATISFACTION)
    d["satisfied"] = (d["sat"] >= SATISFIED_AT).where(d["sat"].notna())
    d["purpose"] = d["benefit_to_world"].map(BENEFIT)
    d["pay_fair"] = d["pay"].map(FIVE_AGREE)
    d["skill_n"] = d["skill"].map(FREQ)
    d["enjoy"] = d["passion"].map(FREQ)
    d["burn"] = d["burnout"].map(BURNOUT)
    for c in ["role_security", "still_here_in_5", "ai_usage"]:
        d[c] = pd.to_numeric(d[c])
    other = d["sectors_other"].fillna("").str.contains("clean|climate|energy|environment", case=False)
    sector = d[IMPACT_SECTORS].fillna(0).sum(axis=1).gt(0) | other
    d["impact_narrow"] = d["org_type"].isin(IMPACT_ORGS)
    d["impact_broad"] = d["impact_narrow"] | sector
    d["commercial"] = d["org_type"].isin(COMMERCIAL_ORGS) & ~sector
    d["designer"] = d["role"].isin(DESIGN_ROLES) | d["role"].eq("other")
    return d


def q1(d: pd.DataFrame):
    print("\n## Q1 · How people feel about their work and careers")
    working = d[d["has_job"].ne("no")]
    print(f"Working now: {len(working)} of {len(d)} ({len(d) - len(working)} not working)")
    # Everything in Q1 describes people who are working now; the 16 who are
    # not skip the job questions and would skew the career ones.
    d = working
    ge4 = lambda c: d[c].ge(4).where(d[c].notna())  # noqa: E731
    yes = lambda c: d[c].eq("yes").where(d[c].notna())  # noqa: E731
    rows = [
        ("proud", "Proud of something they shipped this year", yes("proud_of_shipping"), "good"),
        ("useful", "Say their job is useful to society", ge4("purpose"), "good"),
        ("ai", "Use AI daily or more", ge4("ai_usage"), "neutral"),
        ("hoped", "Doing the kind of work they hoped to", yes("work_you_hoped_for"), "good"),
        ("enthusiastic", "Enthusiastic about their job most of the time", ge4("enjoy"), "good"),
        ("recommend", "Would recommend the career to a younger friend", yes("would_recommend"), "good"),
        ("satisfied", "Satisfied in their job", d["satisfied"], "good"),
        ("paid", "Feel paid appropriately", ge4("pay_fair"), "good"),
        ("staying", "Probably or definitely still in the field in 5 years", ge4("still_here_in_5"), "good"),
        ("burnout", "Burnt out often or always", ge4("burn"), "bad"),
        ("secure", "Feel fairly secure or rock solid in their role", ge4("role_security"), "good"),
    ]
    for key, label, v, tone in rows:
        p, n = share(v)
        pd_, nd = share(v[d["designer"]])
        record("rq1_measures", key=key, label=label, pct=p, n=n, designers_pct=pd_, designers_n=nd, tone=tone)
        print(f"  {label:<58} {pct(v)}   designers only: {pct(v[d['designer']])}")
    feel = [c for c in d.columns if c.startswith("feelings__")]
    answered = d[feel].notna().any(axis=1)
    shares = d.loc[answered, feel].fillna(0).mean().sort_values(ascending=False)
    print(f"Career feelings ticked (of {answered.sum()} who answered):")
    for c, v in shares.items():
        k = c.removeprefix("feelings__")
        record("rq1_feelings", feeling=k, label=FEELING_LABELS.get(k, k.capitalize()), pct=100 * v,
               n=int(answered.sum()), tone="positive" if k in POSITIVE_FEELINGS else "negative")
        print(f"  {k:<14} {100 * v:4.0f}%")
    ai = [c for c in d.columns if c.startswith("ai_feelings__")]
    a = d[ai].notna().any(axis=1)
    print(f"AI feelings ticked (of {a.sum()}):", ", ".join(f"{c.removeprefix('ai_feelings__')} {100 * v:.0f}%"
          for c, v in d.loc[a, ai].fillna(0).mean().sort_values(ascending=False).items()))


def q2(d: pd.DataFrame):
    print("\n## Q2 · Purpose vs pay, skill and enjoyment, against satisfaction and wellbeing")
    preds = {"enjoy": "Enthusiastic about my job", "purpose": "My job is useful to society",
             "pay_fair": "I'm paid appropriately", "skill_n": "I'm good at my job"}
    outcomes = {"sat": "Satisfaction", "burn": "Burnout", "still_here_in_5": "Staying in the field"}
    print("Spearman ρ (each on its own):")
    print(f"  {'':<28}" + "".join(f"{v:>22}" for v in outcomes.values()))
    for p, label in preds.items():
        cells = []
        for o, olabel in outcomes.items():
            ok = d[[p, o]].dropna()
            rho, pv = stats.spearmanr(ok[p], ok[o])
            record("rq2_correlations", driver=p, driver_label=label, outcome=o, outcome_label=olabel,
                   rho=rho, p_value=pv, n=len(ok))
            cells.append(f"{rho:+.2f}{'*' if pv < 0.05 else ' '} (n={len(ok)})".rjust(22))
        print(f"  {label:<28}" + "".join(cells))
    print("  * p < 0.05")
    print("Together (standardised OLS, robust SEs): β = SDs of the outcome per SD of the driver, others held fixed")
    for o, olabel in outcomes.items():
        sub = d[[o, *preds]].dropna()
        z = (sub - sub.mean()) / sub.std()
        fit = smf.ols(f"{o} ~ " + " + ".join(preds), data=z).fit(cov_type="HC3")
        print(f"  {olabel} (n={len(sub)}, R²={fit.rsquared:.2f}): " + "; ".join(
            f"{preds[p]} {fit.params[p]:+.2f} [{fit.conf_int().loc[p, 0]:+.2f}, {fit.conf_int().loc[p, 1]:+.2f}]" for p in preds))
    # Without enjoyment, which is close to satisfaction itself.
    rest = ["purpose", "pay_fair", "skill_n"]
    sub = d[["sat", *rest]].dropna()
    z = (sub - sub.mean()) / sub.std()
    fit = smf.ols("sat ~ " + " + ".join(rest), data=z).fit(cov_type="HC3")
    for p in rest:
        lo, hi = fit.conf_int().loc[p]
        record("rq2_model", driver=p, driver_label=preds[p], beta=fit.params[p], ci_low=lo, ci_high=hi,
               n=len(sub), r2=fit.rsquared)
    print(f"  Satisfaction without enjoyment (n={len(sub)}, R²={fit.rsquared:.2f}): " +
          "; ".join(f"{preds[p]} {fit.params[p]:+.2f}" for p in rest))


def compare(d: pd.DataFrame, flag: str, definition: str, label: str):
    a, b = d[d[flag]], d[d["commercial"]]
    print(f"\n{label}: {len(a)} people vs commercial tech: {len(b)}")
    ge4 = lambda x, c: x[c].ge(4).where(x[c].notna())  # noqa: E731
    measures = [
        ("useful", "Say their job is useful to society", lambda x: ge4(x, "purpose"), "purpose"),
        ("satisfied", "Satisfied in their job", lambda x: x["satisfied"], "sat"),
        ("burnout", "Burnt out often or always", lambda x: ge4(x, "burn"), "burn"),
        ("staying", "Still in the field in 5 years", lambda x: ge4(x, "still_here_in_5"), "still_here_in_5"),
        ("hoped", "Doing the work they hoped to", lambda x: x["work_you_hoped_for"].eq("yes").where(x["work_you_hoped_for"].notna()), None),
        ("paid", "Feel paid appropriately", lambda x: ge4(x, "pay_fair"), "pay_fair"),
    ]
    for key, name, f, scale in measures:
        pa, pb = f(a).dropna(), f(b).dropna()
        if scale:
            p = stats.mannwhitneyu(a[scale].dropna(), b[scale].dropna(), alternative="two-sided").pvalue
        else:
            p = stats.fisher_exact([[pa.sum(), len(pa) - pa.sum()], [pb.sum(), len(pb) - pb.sum()]]).pvalue
        record("rq3_compare", definition=definition, measure=key, label=name, impact_pct=100 * pa.mean(),
               commercial_pct=100 * pb.mean(), diff=100 * (pa.mean() - pb.mean()), p_value=p,
               n_impact=len(pa), n_commercial=len(pb))
        print(f"  {name:<40} {100 * pa.mean():4.0f}% vs {100 * pb.mean():4.0f}%   diff {100 * (pa.mean() - pb.mean()):+4.0f} pts  p={p:.2f}")


def q3(d: pd.DataFrame):
    print("\n## Q3 · Social/environmental vs commercial tech")
    compare(d, "impact_narrow", "narrow", "Public sector or nonprofit organisations")
    compare(d, "impact_broad", "broad", "Broad: those, or government/nonprofit/education/health/clean-tech sectors")


def q5(d: pd.DataFrame):
    """Are people in the nonprofit or government sectors happier than everyone else?

    Working people only. The group = works at a public-sector or nonprofit
    organisation, or ticked any of the Education, Government, Health or
    Nonprofit or charity sectors. Everyone else who is working is the
    comparison (not only commercial tech). Unlike Q3's broad group, write-in
    clean-tech sectors are not counted.
    """
    print("\n## Q5 · Nonprofit, government, education and health vs everyone else")
    w = d[d["has_job"].ne("no")].copy()
    w["npgov"] = w["org_type"].isin(IMPACT_ORGS) | w[IMPACT_SECTORS].fillna(0).sum(axis=1).gt(0)
    a, b = w[w["npgov"]], w[~w["npgov"]]
    print(f"Nonprofit or government: {len(a)} · everyone else working: {len(b)}")
    ge4 = lambda x, c: x[c].ge(4).where(x[c].notna())  # noqa: E731
    measures = [
        ("satisfied", "Satisfied in their job", lambda x: x["satisfied"], "sat"),
        ("enthusiastic", "Enthusiastic about their job most of the time", lambda x: ge4(x, "enjoy"), "enjoy"),
        ("burnout", "Burnt out often or always", lambda x: ge4(x, "burn"), "burn"),
        ("staying", "Still in the field in 5 years", lambda x: ge4(x, "still_here_in_5"), "still_here_in_5"),
        ("useful", "Say their job is useful to society", lambda x: ge4(x, "purpose"), "purpose"),
        ("paid", "Feel paid appropriately", lambda x: ge4(x, "pay_fair"), "pay_fair"),
    ]
    for key, name, f, scale in measures:
        pa, pb = f(a).dropna(), f(b).dropna()
        p = stats.mannwhitneyu(a[scale].dropna(), b[scale].dropna(), alternative="two-sided").pvalue
        record("rq5_compare", measure=key, label=name, group_pct=100 * pa.mean(), others_pct=100 * pb.mean(),
               diff=100 * (pa.mean() - pb.mean()), p_value=p, n_group=len(pa), n_others=len(pb))
        print(f"  {name:<48} {100 * pa.mean():4.0f}% vs {100 * pb.mean():4.0f}%   diff {100 * (pa.mean() - pb.mean()):+4.0f} pts  p={p:.2f}")


def job_choice_model(cards: pd.DataFrame):
    return smf.ols("chosen ~ " + " + ".join(f"C({a}, Treatment('{l[0]}'))" for a, l in ATTRIBUTES.items()),
                   data=cards).fit(cov_type="cluster", cov_kwds={"groups": pd.factorize(cards["respondent_id"])[0]})


def level_of(term: str) -> str:
    return term.split("T.")[-1].rstrip("]")


def q4(d: pd.DataFrame, conjoint: pd.DataFrame):
    print("\n## Q4 · Meaningful work vs pay and prestige")
    wm = [c for c in d.columns if c.startswith("what_matters__")]
    ans = d[wm].notna().any(axis=1)
    print(f"'What 2–3 matter most to you?' (of {ans.sum()}):")
    for c, v in d.loc[ans, wm].fillna(0).mean().sort_values(ascending=False).items():
        k = c.removeprefix("what_matters__")
        record("rq4_matters", item=k, label=MATTERS_LABELS.get(k, k.capitalize()), pct=100 * v, n=int(ans.sum()))
        print(f"  {k:<18} {100 * v:4.0f}%")

    cards = conjoint[conjoint["respondent_id"].isin(set(d["respondent_id"]))].copy()
    for attr, levels in ATTRIBUTES.items():
        cards[attr] = pd.Categorical(cards[attr], categories=levels)
    fit = job_choice_model(cards)
    ci = fit.conf_int()
    coef = {level_of(k): v for k, v in fit.params.items() if "T." in k}
    cis = {level_of(k): tuple(ci.loc[k]) for k in fit.params.index if "T." in k}
    attr_of = {lvl: a for a, ls in ATTRIBUTES.items() for lvl in ls}
    pay_pts = {-30: coef["less-30"], -15: coef["less-15"], 0: 0.0, 15: coef["more-15"], 30: coef["more-30"]}
    xs, ys = list(pay_pts), [pay_pts[k] for k in pay_pts]

    def pay_equiv(effect: float) -> float:
        # The pay change with the same pull, read off the piecewise-linear pay
        # curve: a feature worth +x points is worth the pay CUT that costs x.
        target = -effect
        return float(np.interp(target, ys, xs)) if min(ys) <= target <= max(ys) else float("nan")

    print("Job-choice effects (pts) and pay equivalents (the pay change that would cancel each feature):")
    # Every level, attribute by attribute; each attribute's baseline (its first
    # level) is a row with effect 0 so the report can show what each is against.
    for attr, levels in ATTRIBUTES.items():
        for i, lvl in enumerate(levels):
            if i == 0:
                record("rq4_job_choice", attribute=attr, attribute_label=ATTR_LABELS[attr], level=lvl,
                       label=BASELINE_LABELS[attr], effect=0.0, ci_low=float("nan"), ci_high=float("nan"),
                       pay_equiv=float("nan"), baseline=True)
                continue
            pe = pay_equiv(coef[lvl]) if attr != "pay" else float("nan")
            record("rq4_job_choice", attribute=attr, attribute_label=ATTR_LABELS[attr], level=lvl,
                   label=LEVEL_LABELS[lvl], effect=100 * coef[lvl], ci_low=100 * cis[lvl][0],
                   ci_high=100 * cis[lvl][1], pay_equiv=pe, baseline=False)
            print(f"  {attr}:{lvl:<11} {100 * coef[lvl]:+5.1f} pts" + ("" if np.isnan(pe) else f"   ≈ {pe:+.0f}% pay"))

    # Does doing good weigh more for people who already do it? The two groups
    # are different people, so their estimates are independent.
    cards = cards.merge(d[["respondent_id", "impact_broad", "commercial"]], on="respondent_id")
    est = {}
    fits = {}
    for flag, label in [("impact_broad", "Social impact"), ("commercial", "Commercial tech")]:
        sub = cards[cards[flag]]
        f = job_choice_model(sub)
        fits[flag] = (label, f, sub["respondent_id"].nunique())
        k = [x for x in f.params.index if "for-good" in x][0]
        lo, hi = f.conf_int().loc[k]
        est[flag] = (f.params[k], f.bse[k])
        n = sub["respondent_id"].nunique()
        record("rq4_good_by_group", group=label, effect=100 * f.params[k], ci_low=100 * lo, ci_high=100 * hi, n=n)
        print(f"  'Directly does good' for {label} ({n} people): {100 * f.params[k]:+.1f} pts [{100 * lo:+.1f}, {100 * hi:+.1f}]")
    (a, sa), (b, sb) = est["impact_broad"], est["commercial"]
    z = (a - b) / np.hypot(sa, sb)
    print(f"  Difference {100 * (a - b):+.1f} pts, p = {2 * stats.norm.sf(abs(z)):.3f}")
    record("rq4_good_by_group", group="Difference", effect=100 * (a - b),
           ci_low=100 * (a - b - 1.96 * np.hypot(sa, sb)), ci_high=100 * (a - b + 1.96 * np.hypot(sa, sb)),
           n=float("nan"), p_value=2 * stats.norm.sf(abs(z)))

    # Every feature, for each group, plus a test of the gap between them.
    print("Every feature by group (social impact vs commercial tech, pts):")
    terms = {flag: {level_of(k): (f.params[k], f.bse[k], *f.conf_int().loc[k]) for k in f.params.index if "T." in k}
             for flag, (_, f, _) in fits.items()}
    for attr, levels in ATTRIBUTES.items():
        for i, lvl in enumerate(levels):
            if i == 0:
                for flag, (label, _, n) in fits.items():
                    record("rq4_job_choice_by_group", group=label, attribute=attr, attribute_label=ATTR_LABELS[attr],
                           level=lvl, label=BASELINE_LABELS[attr], effect=0.0, ci_low=float("nan"),
                           ci_high=float("nan"), baseline=True, n=n, gap_p=float("nan"))
                continue
            (ea, sa, *_), (eb, sb, *_) = terms["impact_broad"][lvl], terms["commercial"][lvl]
            gap_p = 2 * stats.norm.sf(abs((ea - eb) / np.hypot(sa, sb)))
            for flag, (label, _, n) in fits.items():
                e, _, lo, hi = terms[flag][lvl]
                record("rq4_job_choice_by_group", group=label, attribute=attr, attribute_label=ATTR_LABELS[attr],
                       level=lvl, label=LEVEL_LABELS[lvl], effect=100 * e, ci_low=100 * lo, ci_high=100 * hi,
                       baseline=False, n=n, gap_p=gap_p)
            print(f"  {lvl:<11} {100 * ea:+5.1f} vs {100 * eb:+5.1f}   gap p={gap_p:.2f}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", type=Path)
    ap.add_argument("--include-test", action="store_true")
    args = ap.parse_args()
    data = args.data or latest_export()
    responses, conjoint, _, n_fast = load(data, args.include_test)
    d = prepare(responses)
    print(f"# {data.name} · {len(d)} responses ({n_fast} speeders dropped)")
    q1(d)
    q2(d)
    q3(d)
    q4(d, conjoint)
    q5(d)
    OUT.mkdir(parents=True, exist_ok=True)
    for name, rows in TABLES.items():
        pd.DataFrame(rows).round(4).to_csv(OUT / f"{name}.csv", index=False)
    print(f"\nWrote {', '.join(f'{n}.csv' for n in TABLES)} to {OUT}")


if __name__ == "__main__":
    main()
