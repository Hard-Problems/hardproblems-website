"""Personas, roles and career stage: five more questions about the 2026 survey.

    analysis/.venv/bin/python analysis/python/careers.py [--data DIR] [--include-test] [--k K]

1. What kinds of personas are emerging?             -> rq6_personas*.csv
2. Which role is happiest, and which most strained? -> rq7_roles.csv
3. Is seniority correlated with happiness?          -> rq8_seniority*.csv
4. Does seniority change what people want?          -> rq9_*.csv
5. What do people at every career stage share?      -> rq10_common.csv

Same loading, test-row and speeder rules as analysis.py, and the same derived
columns as research_questions.py. Writes aggregates only (counts, shares,
estimates) to analysis/output/python/, never individual answers. Python only.

Personas are k-means clusters (scipy, many random starts) of working people on
eight standardised answers. They describe this sample; they are a lens, not a
finding with a p-value. The script prints silhouette and stability for k = 3..6
so the choice of k can be checked.
"""

from __future__ import annotations

import argparse
from pathlib import Path

import numpy as np
import pandas as pd
from scipy import stats
from scipy.cluster.vq import kmeans2
from scipy.spatial.distance import cdist

from analysis import ATTRIBUTES, OUT, latest_export, load
from research_questions import (LEVEL_LABELS, MATTERS_LABELS, POSITIVE_FEELINGS, job_choice_model, level_of,
                                prepare)

TABLES: dict[str, list[dict]] = {}


def record(table: str, **row):
    TABLES.setdefault(table, []).append(row)


# Career stage. Students, recent graduates and 1–4 years are combined because
# each alone is a handful of people.
BAND = {"student": "early", "recent-graduate": "early", "1-4": "early", "5-9": "5-9", "10-19": "10-19", "20-plus": "20+"}
BAND_ORDER = ["early", "5-9", "10-19", "20+"]
BAND_LABELS = {"early": "Under 5 years", "5-9": "5–9 years", "10-19": "10–19 years", "20+": "20+ years"}
EXP_RANK = {"student": 1, "recent-graduate": 2, "1-4": 3, "5-9": 4, "10-19": 5, "20-plus": 6}

# Role groups, so each is big enough to say something about.
ROLE_GROUP = {
    "product-designer": "product-designer", "ux-designer": "ux-ui", "ui-designer": "ux-ui",
    "design-researcher": "researcher", "service-designer": "service-designer", "product-manager": "pm",
    "founder": "founder", "design-manager": "design-manager", "design-writer": "writer",
    "graphic-designer": "visual", "brand-designer": "visual", "illustrator": "visual", "motion-designer": "visual",
    "industrial-designer": "visual", "other": "other",
}
ROLE_LABELS = {
    "product-designer": "Digital product designers", "ux-ui": "UX and UI designers", "researcher": "User researchers",
    "service-designer": "Service designers", "pm": "Product managers", "founder": "Founders",
    "design-manager": "Design managers", "writer": "Content designers and writers",
    "visual": "Graphic, brand and industrial designers", "other": "Other roles",
}

# Happiness and strain, as in the report's question 1 (working people).
MEASURES = [
    ("satisfied", "Satisfied in their job", "sat", "good"),
    ("enthusiastic", "Enthusiastic about their job most of the time", "enjoy", "good"),
    ("useful", "Say their job is useful to society", "purpose", "good"),
    ("paid", "Feel paid appropriately", "pay_fair", "good"),
    ("secure", "Feel secure in their role", "role_security", "good"),
    ("staying", "Expect to stay in the field 5 more years", "still_here_in_5", "good"),
    ("burnout", "Burnt out often or always", "burn", "bad"),
]
STRAIN_FEELINGS = ["exhausted", "anxious", "frustrated", "undervalued", "disillusioned"]


def flags(d: pd.DataFrame) -> pd.DataFrame:
    """0/1 versions of each measure (NaN when unanswered)."""
    f = pd.DataFrame(index=d.index)
    f["satisfied"] = d["satisfied"].astype(float)
    for key, _, col, _ in MEASURES[1:]:
        f[key] = d[col].ge(4).where(d[col].notna()).astype(float)
    feel = [f"feelings__{x}" for x in STRAIN_FEELINGS]
    answered = d[[c for c in d.columns if c.startswith("feelings__")]].notna().any(axis=1)
    f["strain_feelings"] = d[feel].fillna(0).sum(axis=1).where(answered)
    return f


def summarise(d: pd.DataFrame, f: pd.DataFrame, table: str, group_col: str, labels: dict, order: list, **extra):
    for g in order:
        idx = d.index[d[group_col] == g]
        if not len(idx):
            continue
        row = {"group": g, "label": labels.get(g, g), "n": len(idx), "small": len(idx) < 30}
        for key, *_ in MEASURES:
            v = f.loc[idx, key].dropna()
            row[f"{key}_pct"] = 100 * v.mean() if len(v) else np.nan
        row["strain_feelings_mean"] = f.loc[idx, "strain_feelings"].mean()
        record(table, **row, **extra)


# ---------------------------------------------------------------- personas

PERSONA_VARS = {"sat": "Satisfaction", "enjoy": "Enthusiasm", "purpose": "Useful to society", "pay_fair": "Fair pay",
                "role_security": "Security", "still_here_in_5": "Staying in the field", "burn": "Burnout",
                "ai_usage": "AI use"}


def kmeans(z: np.ndarray, k: int, starts: int = 60, seed: int = 0):
    best = None
    rng = np.random.default_rng(seed)
    for _ in range(starts):
        cent, lab = kmeans2(z, k, minit="++", seed=int(rng.integers(1 << 31)))
        if len(np.unique(lab)) < k:
            continue
        inertia = ((z - cent[lab]) ** 2).sum()
        if best is None or inertia < best[0]:
            best = (inertia, cent, lab)
    return best[1], best[2]


def silhouette(z: np.ndarray, lab: np.ndarray) -> float:
    dist = cdist(z, z)
    s = []
    for i in range(len(z)):
        own = lab == lab[i]
        if own.sum() < 2:
            s.append(0.0)
            continue
        a = dist[i, own].sum() / (own.sum() - 1)
        b = min(dist[i, lab == j].mean() for j in np.unique(lab) if j != lab[i])
        s.append((b - a) / max(a, b))
    return float(np.mean(s))


def adjusted_rand(a: np.ndarray, b: np.ndarray) -> float:
    ct = pd.crosstab(a, b).to_numpy()
    comb = lambda x: x * (x - 1) / 2  # noqa: E731
    sum_ij = comb(ct).sum()
    sa, sb = comb(ct.sum(1)).sum(), comb(ct.sum(0)).sum()
    exp = sa * sb / comb(ct.sum())
    return float((sum_ij - exp) / ((sa + sb) / 2 - exp))


def personas(d: pd.DataFrame, f: pd.DataFrame, k: int | None):
    print("\n## Personas (k-means on working people)")
    w = d[d["has_job"].ne("no")]
    x = w[list(PERSONA_VARS)].dropna()
    z = ((x - x.mean()) / x.std()).to_numpy()
    print(f"Clustered {len(x)} working people with every one of: {', '.join(PERSONA_VARS.values())}")
    choice = {}
    for kk in range(3, 7):
        cent, lab = kmeans(z, kk)
        # Stability: refit on 20 random 80% subsamples, compare labels on the overlap.
        rng = np.random.default_rng(kk)
        aris = []
        for _ in range(20):
            sub = rng.choice(len(z), int(0.8 * len(z)), replace=False)
            c2, _ = kmeans(z[sub], kk, starts=15, seed=int(rng.integers(1 << 31)))
            lab2 = cdist(z, c2).argmin(1)
            aris.append(adjusted_rand(lab, lab2))
        sil = silhouette(z, lab)
        sizes = sorted(np.bincount(lab), reverse=True)
        choice[kk] = (cent, lab)
        record("rq6_persona_k", k=kk, silhouette=sil, stability=float(np.mean(aris)), smallest=int(min(sizes)))
        print(f"  k={kk}: silhouette {sil:.3f}, stability (mean ARI) {np.mean(aris):.2f}, sizes {sizes}")
    k = k or 4
    cent, lab = choice[k]
    w = w.loc[x.index].assign(persona=lab)
    fw = f.loc[x.index]
    print(f"Using k={k}. Profiles (mean z-score per answer; + is higher than average):")
    feel = [c for c in d.columns if c.startswith("feelings__")]
    wm = [c for c in d.columns if c.startswith("what_matters__")]
    for p in range(k):
        g = w[w["persona"] == p]
        prof = {v: float(cent[p][i]) for i, v in enumerate(PERSONA_VARS)}
        row = {"persona": p, "n": len(g), "pct": 100 * len(g) / len(w)}
        for key, *_ in MEASURES:
            row[f"{key}_pct"] = 100 * fw.loc[g.index, key].mean()
        row["ai_daily_pct"] = 100 * g["ai_usage"].ge(4).mean()
        row.update({f"z_{v}": prof[v] for v in PERSONA_VARS})
        row["impact_pct"] = 100 * g["impact_broad"].mean()
        row["manages_pct"] = 100 * g["manages_people"].eq("yes").mean()
        row["early_pct"] = 100 * g["band"].eq("early").mean()
        row["senior_pct"] = 100 * g["band"].isin(["10-19", "20+"]).mean()
        row["designer_pct"] = 100 * g["designer"].mean()
        roles = g["role_group"].value_counts(normalize=True).head(3)
        row["top_roles"] = "; ".join(f"{ROLE_LABELS[r]} {100 * s:.0f}%" for r, s in roles.items())
        fs = g[feel].fillna(0).mean().sort_values(ascending=False).head(4)
        row["top_feelings"] = "; ".join(f"{c.removeprefix('feelings__')} {100 * s:.0f}%" for c, s in fs.items())
        ms = g[wm].fillna(0).mean().sort_values(ascending=False).head(3)
        row["top_matters"] = "; ".join(f"{MATTERS_LABELS.get(c.removeprefix('what_matters__'), c.removeprefix('what_matters__').capitalize())} {100 * s:.0f}%"
                                       for c, s in ms.items())
        record("rq6_personas", **row)
        print(f"  [{p}] n={len(g)} ({row['pct']:.0f}%): " + ", ".join(f"{PERSONA_VARS[v]} {prof[v]:+.1f}" for v in PERSONA_VARS))
        print(f"      satisfied {row['satisfied_pct']:.0f}%, enthusiastic {row['enthusiastic_pct']:.0f}%, burnt out {row['burnout_pct']:.0f}%, "
              f"secure {row['secure_pct']:.0f}%, staying {row['staying_pct']:.0f}%, paid {row['paid_pct']:.0f}%, useful {row['useful_pct']:.0f}%, AI daily {row['ai_daily_pct']:.0f}%")
        print(f"      impact {row['impact_pct']:.0f}%, manage {row['manages_pct']:.0f}%, <5y {row['early_pct']:.0f}%, 10y+ {row['senior_pct']:.0f}%")
        print(f"      roles: {row['top_roles']} | feelings: {row['top_feelings']} | matters: {row['top_matters']}")
    # Write persona membership to a private file for picking illustrative quotes;
    # it stays in analysis/output, which is not shared.
    w[["respondent_id", "persona"]].to_csv(OUT / "private_persona_members.csv", index=False)
    return w


# ---------------------------------------------------------------- roles

def roles(d: pd.DataFrame, f: pd.DataFrame):
    print("\n## Roles (working people)")
    w = d[d["has_job"].ne("no")]
    order = [g for g in ROLE_LABELS if (w["role_group"] == g).any()]
    summarise(w, f, "rq7_roles", "role_group", ROLE_LABELS, order)
    for key, _, col, _ in MEASURES:
        groups = [w.loc[w["role_group"] == g, col].dropna() for g in order if (w["role_group"] == g).sum() >= 15]
        h, p = stats.kruskal(*groups)
        record("rq_careers_tests", question="roles", test=f"kruskal-wallis {key} by role group (groups of 15+)", statistic=h, p_value=p)
    # Is the difference just founders?
    rest = [g for g in order if (w["role_group"] == g).sum() >= 15 and g != "founder"]
    for key, _, col, _ in MEASURES:
        h, p = stats.kruskal(*[w.loc[w["role_group"] == g, col].dropna() for g in rest])
        record("rq_careers_tests", question="roles", test=f"kruskal-wallis {key} by role group, founders left out", statistic=h, p_value=p)
        fo, ot = w.loc[w["role_group"] == "founder", col].dropna(), w.loc[w["role_group"] != "founder", col].dropna()
        u, p = stats.mannwhitneyu(fo, ot, alternative="two-sided")
        record("rq_careers_tests", question="roles", test=f"mann-whitney {key}, founders vs everyone else", statistic=u, p_value=p)
    for r in TABLES["rq7_roles"]:
        print(f"  {r['label']:<42} n={r['n']:>3}  sat {r['satisfied_pct']:3.0f}%  enth {r['enthusiastic_pct']:3.0f}%  "
              f"burn {r['burnout_pct']:3.0f}%  secure {r['secure_pct']:3.0f}%  stay {r['staying_pct']:3.0f}%  paid {r['paid_pct']:3.0f}%  "
              f"strain feelings {r['strain_feelings_mean']:.2f}")
    for t in TABLES["rq_careers_tests"]:
        if t["question"] == "roles":
            print(f"  {t['test']}: p = {t['p_value']:.3f}")


# ---------------------------------------------------------------- seniority

def seniority(d: pd.DataFrame, f: pd.DataFrame):
    print("\n## Seniority and happiness (working people)")
    w = d[d["has_job"].ne("no")]
    summarise(w, f, "rq8_seniority", "band", BAND_LABELS, BAND_ORDER)
    for r in TABLES["rq8_seniority"]:
        print(f"  {r['label']:<14} n={r['n']:>3}  sat {r['satisfied_pct']:3.0f}%  enth {r['enthusiastic_pct']:3.0f}%  burn {r['burnout_pct']:3.0f}%  "
              f"secure {r['secure_pct']:3.0f}%  stay {r['staying_pct']:3.0f}%  paid {r['paid_pct']:3.0f}%  useful {r['useful_pct']:3.0f}%")
    rank = w["experience"].map(EXP_RANK)
    for key, label, col, tone in MEASURES:
        ok = pd.concat([rank, w[col]], axis=1).dropna()
        rho, p = stats.spearmanr(ok.iloc[:, 0], ok.iloc[:, 1])
        record("rq8_seniority_corr", measure=key, label=label, rho=rho, p_value=p, n=len(ok), tone=tone)
        print(f"  ρ(experience, {key:<12}) = {rho:+.2f}  p = {p:.3f}  (n={len(ok)})")


# ---------------------------------------------------------------- wants

def wants(d: pd.DataFrame, conjoint: pd.DataFrame):
    print("\n## What people want, by career stage (everyone)")
    wm = [c for c in d.columns if c.startswith("what_matters__")]
    ans = d[wm].notna().any(axis=1) & d["band"].notna()
    a = d[ans]
    rank = a["experience"].map(EXP_RANK)
    for c in wm:
        k = c.removeprefix("what_matters__")
        v = a[c].fillna(0)
        tab = pd.crosstab(a["band"], v)
        chi_p = stats.chi2_contingency(tab)[1] if tab.shape[1] == 2 else np.nan
        rho, p = stats.spearmanr(rank, v)
        row = {"item": k, "label": MATTERS_LABELS.get(k, k.capitalize()), "trend_rho": rho, "trend_p": p, "chi2_p": chi_p}
        for b in BAND_ORDER:
            g = a[a["band"] == b]
            row[f"pct_{b}"] = 100 * g[c].fillna(0).mean()
            row[f"n_{b}"] = len(g)
        row["pct_all"] = 100 * v.mean()
        record("rq9_matters_by_band", **row)
        print(f"  {k:<18} " + "  ".join(f"{BAND_LABELS[b][:5]} {row[f'pct_{b}']:3.0f}%" for b in BAND_ORDER) +
              f"   trend ρ {rho:+.2f} p={p:.3f}")

    # Job choices: under 10 years vs 10+ (two halves big enough to estimate).
    print("Job choices, under 10 years vs 10 or more:")
    cards = conjoint[conjoint["respondent_id"].isin(set(d["respondent_id"]))].copy()
    for attr, levels in ATTRIBUTES.items():
        cards[attr] = pd.Categorical(cards[attr], categories=levels)
    cards = cards.merge(d[["respondent_id", "band"]], on="respondent_id")
    cards["stage"] = np.where(cards["band"].isin(["early", "5-9"]), "under10", "over10")
    cards = cards[cards["band"].notna()]
    fits = {}
    for s, label in [("under10", "Under 10 years"), ("over10", "10 years or more")]:
        sub = cards[cards["stage"] == s]
        fit = job_choice_model(sub)
        fits[s] = (label, fit, sub["respondent_id"].nunique())
    terms = {s: {level_of(k): (f.params[k], f.bse[k], *f.conf_int().loc[k]) for k in f.params.index if "T." in k}
             for s, (_, f, _) in fits.items()}
    for attr, levels in ATTRIBUTES.items():
        for lvl in levels[1:]:
            (ea, sa, *_), (eb, sb, *_) = terms["under10"][lvl], terms["over10"][lvl]
            gap_p = 2 * stats.norm.sf(abs((ea - eb) / np.hypot(sa, sb)))
            for s, (label, _, n) in fits.items():
                e, _, lo, hi = terms[s][lvl]
                record("rq9_jobchoice_by_stage", stage=label, attribute=attr, level=lvl, label=LEVEL_LABELS[lvl],
                       effect=100 * e, ci_low=100 * lo, ci_high=100 * hi, n=n, gap_p=gap_p)
            print(f"  {lvl:<11} {100 * ea:+5.1f} vs {100 * eb:+5.1f}   gap p={gap_p:.2f}")
    for s, (label, _, n) in fits.items():
        print(f"  {label}: {n} people")


# ---------------------------------------------------------------- common ground

def common(d: pd.DataFrame, f: pd.DataFrame):
    """What every career stage shares: answers whose share barely moves across bands."""
    print("\n## Common ground across career stages")
    w = d[d["has_job"].ne("no")]
    items = []
    yes = lambda df, c: df[c].eq("yes").where(df[c].notna()).astype(float)  # noqa: E731
    for key, label, *_ in MEASURES:
        items.append(("measure", key, label, w, f.loc[w.index, key]))
    items.append(("measure", "proud", "Proud of something they shipped this year", w, yes(w, "proud_of_shipping")))
    items.append(("measure", "hoped", "Doing the kind of work they hoped to", w, yes(w, "work_you_hoped_for")))
    items.append(("measure", "recommend", "Would recommend the career to a younger friend", w, yes(w, "would_recommend")))
    items.append(("measure", "ai_daily", "Use AI daily or more", w, w["ai_usage"].ge(4).where(w["ai_usage"].notna()).astype(float)))
    feel = [c for c in d.columns if c.startswith("feelings__")]
    fa = w[feel].notna().any(axis=1)
    for c in feel:
        k = c.removeprefix("feelings__")
        items.append(("feeling", k, k.capitalize() if k != "mixed" else "Mixed feelings", w[fa], w.loc[fa, c].fillna(0)))
    wm = [c for c in d.columns if c.startswith("what_matters__")]
    ma = d[wm].notna().any(axis=1)
    for c in wm:
        k = c.removeprefix("what_matters__")
        items.append(("matters", k, MATTERS_LABELS.get(k, k.capitalize()), d[ma], d.loc[ma, c].fillna(0)))
    for cat, key, label, frame, v in items:
        bands = frame["band"]
        ok = pd.concat([bands, v], axis=1).dropna()
        ok.columns = ["band", "v"]
        shares = {b: 100 * ok.loc[ok["band"] == b, "v"].mean() for b in BAND_ORDER}
        tab = pd.crosstab(ok["band"], ok["v"])
        p = stats.chi2_contingency(tab)[1] if tab.shape == (4, 2) else np.nan
        row = {"category": cat, "item": key, "label": label, "pct_all": 100 * ok["v"].mean(),
               "min_pct": min(shares.values()), "max_pct": max(shares.values()),
               "range": max(shares.values()) - min(shares.values()), "p_value": p,
               "positive": key in POSITIVE_FEELINGS if cat == "feeling" else np.nan}
        row.update({f"pct_{b}": shares[b] for b in BAND_ORDER})
        record("rq10_common", **row)
    rows = sorted(TABLES["rq10_common"], key=lambda r: r["range"])
    print("Most similar across stages (smallest gap between highest and lowest band):")
    for r in rows[:14]:
        print(f"  {r['category']:<8} {r['label']:<48} all {r['pct_all']:3.0f}%  bands {r['min_pct']:3.0f}–{r['max_pct']:3.0f}%  p={r['p_value']:.2f}")
    print("Most different:")
    for r in rows[-8:]:
        print(f"  {r['category']:<8} {r['label']:<48} all {r['pct_all']:3.0f}%  bands {r['min_pct']:3.0f}–{r['max_pct']:3.0f}%  p={r['p_value']:.2f}  "
              + " ".join(f"{b} {r[f'pct_{b}']:.0f}" for b in BAND_ORDER))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", type=Path)
    ap.add_argument("--include-test", action="store_true")
    ap.add_argument("--k", type=int, help="number of personas (default 4)")
    args = ap.parse_args()
    data = args.data or latest_export()
    responses, conjoint, _, n_fast = load(data, args.include_test)
    d = prepare(responses)
    d["band"] = d["experience"].map(BAND)
    d["role_group"] = d["role"].map(ROLE_GROUP)
    f = flags(d)
    print(f"# {data.name} · {len(d)} responses ({n_fast} speeders dropped)")
    OUT.mkdir(parents=True, exist_ok=True)
    personas(d, f, args.k)
    roles(d, f)
    seniority(d, f)
    wants(d, conjoint)
    common(d, f)
    for name, rows in TABLES.items():
        pd.DataFrame(rows).round(4).to_csv(OUT / f"{name}.csv", index=False)
    print(f"\nWrote {', '.join(f'{n}.csv' for n in TABLES)} to {OUT}")


if __name__ == "__main__":
    main()
