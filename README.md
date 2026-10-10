# Hard Problems
This is the home of [hardproblems.com](https://www.hardproblems.com)

## Get started
1. `brew install gitleaks`
2. `yarn install`
3. `yarn dev`

## Helper
Use `yarn lint` to check code for poor formatting

## Secret scanning
`yarn install` points git at `.githooks/`, which adds a pre-commit scan
for credentials using [gitleaks](https://github.com/gitleaks/gitleaks).
Install it with `brew install gitleaks` — the hook blocks the commit if
the binary is missing, rather than passing silently.

This stands in for GitHub's push protection, which is free on public
repositories but billed per committer on private ones.

If it flags something that isn't a secret, put a `gitleaks:allow`
comment on the line, or add the fingerprint it prints to a
`.gitleaksignore` file. To bypass it once: `git commit --no-verify`.
