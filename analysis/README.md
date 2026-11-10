# Survey analysis

The same analysis written twice, once in Python (`python/analysis.py`) and once in R (`R/analysis.R`), plus `compare.py` to check that they agree. Both read the newest export in `survey-exports/` (see `scripts/survey-export.ts`) and write their results to `output/python/` and `output/r/`. Those folders, like the data, are gitignored.

## Setup (once)

```bash
brew install r uv
uv venv --python 3.12 analysis/.venv && uv pip install --python analysis/.venv/bin/python -r analysis/python/requirements.txt
Rscript analysis/R/install.R
```

## Run

```bash
npx tsx --env-file=.env.local scripts/survey-export.ts      # fresh export (real responses only)
analysis/.venv/bin/python analysis/python/analysis.py
Rscript analysis/R/analysis.R
analysis/.venv/bin/python analysis/compare.py               # ✓ per file, or what differs
```

Options for both scripts: `--data <export folder>` to pick an export, and `--include-test` to keep test rows (`internal-preview`, `simulated`). Until the survey opens, every row is a test row.

## Definitions (both scripts must follow these)

**Who is included**
- Test sources are dropped unless you pass `--include-test`.
- Anyone who finished the 8 job-choice pairs in **under 16 seconds** (about 2 s a pair) is dropped from **every** question, not only the job choice. In the test data these speeders were mostly straight-liners: people who pick the first option on every question. The first options happen to be "Completely satisfied", "Student", "Strongly agree" and "Yes, I manage people". Keeping them invented a fake "juniors are happier" result (p = 0.000003) and a fake manager effect. Responses with no recorded time are kept.

**How answers are scored**
- *Satisfaction*: completely dissatisfied = 1 … completely satisfied = 7. "Satisfied" means fairly satisfied or better (5 or more). "Can't choose" counts as missing.
- *Useful to society*: strongly disagree = 1 … strongly agree = 5. "Can't choose" counts as missing.
- *Experience*: student = 1, recent graduate = 2, 1–4 = 3, 5–9 = 4, 10–19 = 5, 20+ = 6.
- Groups with fewer than 30 people are flagged `small = True`. Read them as anecdotes.

**Q1 · What did people optimise for in the job choice?**
- *AMCE (the effect of each level)*: a linear probability model, `chosen ~ pay + mission + organisation + brand + work`, with standard errors clustered by respondent (CR1). Each estimate is the change, in percentage points, in the chance that a job card gets picked when it has this level instead of the baseline level. The baselines are: pay the same, commercial mission, established company, little-known brand, and an established product.
- *Marginal means*: the share of cards with a given level that were picked (with clustered standard errors). Unlike the AMCE, this doesn't depend on which level is the baseline.
- *Importance*: for each attribute, the largest AMCE minus the smallest, and its share of the total across attributes.

**Q2 · Are people who think their job is good for the world happier in it?**
- Satisfaction is broken down by each answer to "my job is useful to society".
- Spearman's ρ, with a Fisher-z 95% interval.

**Q3 · Are senior people more or less happy?**
- *Seniority as experience*: satisfaction by experience band, Spearman's ρ (the trend), and Kruskal–Wallis (any difference between the bands).
- *Seniority as managing people*: managers vs everyone else, with Mann–Whitney.

All intervals are 95% and normal-based. p-values are two-sided. Each table is written as a CSV, rounded to 8 decimals.

## Reading the results

- **This is a correlation, not a cause.** Q2 can't say whether meaningful work makes people happier or whether happy people rate their work as more meaningful.
- **Q3 is easily confounded.** Experience goes with age, pay, and whether someone manages people. If seniority looks like it matters, check whether pay or managing explains it before reporting it.
- **We run several tests.** With 4 tests here (and more to come), one p of about 0.01 is weak evidence. On the test data, ρ = −0.12, p = 0.011 for experience turned out to be pure noise: it was 0.00 when the same simulation was run with 3,000 rows.
- **The sample is opt-in.** The results describe the people who answered, not all designers.
