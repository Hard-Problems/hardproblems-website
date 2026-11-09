"""Check that the Python and R analyses agree.

    analysis/.venv/bin/python analysis/compare.py [--tolerance 1e-6]

Run both analyses first. Compares every CSV in output/python with its
twin in output/r: same rows, same columns, same text, and numbers within
the tolerance. Exits 1 if anything differs.
"""

import argparse
import sys
from pathlib import Path

import numpy as np
import pandas as pd

OUT = Path(__file__).resolve().parent / "output"

ap = argparse.ArgumentParser()
ap.add_argument("--tolerance", type=float, default=1e-6)
tol = ap.parse_args().tolerance

files = sorted(p.name for p in (OUT / "python").glob("*.csv"))
if not files:
    sys.exit("No Python output. Run analysis/python/analysis.py first.")

failures = 0
for name in files:
    py = pd.read_csv(OUT / "python" / name)
    r_path = OUT / "r" / name
    if not r_path.exists():
        print(f"✗ {name}: missing from output/r (run analysis/R/analysis.R)")
        failures += 1
        continue
    r = pd.read_csv(r_path)
    problems = []
    if list(py.columns) != list(r.columns):
        problems.append(f"columns differ: {list(py.columns)} vs {list(r.columns)}")
    elif py.shape != r.shape:
        problems.append(f"shape differs: {py.shape} vs {r.shape}")
    else:
        worst = 0.0
        for col in py.columns:
            a, b = py[col], r[col]
            if pd.api.types.is_numeric_dtype(a) and pd.api.types.is_numeric_dtype(b):
                both_nan = a.isna() & b.isna()
                if (a.isna() != b.isna()).any():
                    problems.append(f"{col}: blank in one but not the other")
                    continue
                diff = np.abs(a[~both_nan].to_numpy(float) - b[~both_nan].to_numpy(float))
                d = float(diff.max()) if len(diff) else 0.0
                worst = max(worst, d)
                if d > tol:
                    problems.append(f"{col}: max difference {d:.3g}")
            elif not a.astype(str).equals(b.astype(str)):
                problems.append(f"{col}: text differs")
    if problems:
        failures += 1
        print(f"✗ {name}: " + "; ".join(problems))
    else:
        print(f"✓ {name}: {len(py)} rows match (largest numeric difference {worst:.1e})")

print("\nPython and R agree." if not failures else f"\n{failures} file(s) differ.")
sys.exit(1 if failures else 0)
