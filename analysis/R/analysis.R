# Survey analysis: the three starter questions, in R.
#
#   Rscript analysis/R/analysis.R [--data DIR] [--include-test]
#
# Mirrors analysis/python/analysis.py step for step. Both follow the
# definitions in analysis/README.md and write the same CSVs (output/r vs
# output/python), so analysis/compare.py can check that they agree.
# Base R plus `sandwich` (clustered standard errors) only.

suppressPackageStartupMessages(library(sandwich))
invisible(Sys.setlocale("LC_CTYPE", "en_US.UTF-8"))  # print en dashes in labels properly

# Rscript sets --file=; fall back to the working directory for interactive use.
script_arg <- sub("^--file=", "", grep("^--file=", commandArgs(FALSE), value = TRUE))
ROOT <- if (length(script_arg)) normalizePath(file.path(dirname(script_arg), "..", "..")) else getwd()
OUT <- file.path(ROOT, "analysis", "output", "r")

# ---- Shared definitions (keep in sync with analysis/python/analysis.py) ----

TEST_SOURCES <- c("internal-preview", "simulated")
MIN_JOB_CHOICE_SECONDS <- 16  # 8 pairs, about 2 s a pair
MIN_GROUP <- 30               # groups smaller than this are flagged "small"

SATISFACTION <- c(  # 1-7; cant-choose is missing
  "completely-dissatisfied" = 1, "very-dissatisfied" = 2, "fairly-dissatisfied" = 3,
  "neither" = 4, "fairly-satisfied" = 5, "very-satisfied" = 6, "completely-satisfied" = 7
)
SATISFIED_AT <- 5  # "fairly satisfied" or better
BENEFIT <- c(  # 1-5; cant-choose is missing
  "strongly-disagree" = 1, "disagree" = 2, "neither" = 3, "agree" = 4, "strongly-agree" = 5
)
EXPERIENCE <- c(
  "student" = 1, "recent-graduate" = 2, "1-4" = 3, "5-9" = 4, "10-19" = 5, "20-plus" = 6
)
# Conjoint levels in display order; the first one listed is the baseline.
ATTRIBUTES <- list(
  pay = c("same", "less-30", "less-15", "more-15", "more-30"),
  mission = c("commercial", "some-good", "for-good"),
  organisation = c("established", "startup", "public", "nonprofit"),
  brand = c("unknown", "industry", "household"),
  work = c("established", "new", "ai")
)
Z <- qnorm(0.975)

# ---- Arguments and loading ---------------------------------------------------

args <- commandArgs(TRUE)
include_test <- "--include-test" %in% args
data_dir <- if ("--data" %in% args) args[which(args == "--data") + 1] else {
  dirs <- sort(list.dirs(file.path(ROOT, "survey-exports"), recursive = FALSE))
  dirs <- dirs[grepl("-exported-", basename(dirs))]
  if (!length(dirs)) stop("No export found in survey-exports/. Run scripts/survey-export.ts first.")
  tail(dirs, 1)
}

read <- function(name) {
  read.csv(file.path(data_dir, name), colClasses = "character", na.strings = "",
           check.names = FALSE, encoding = "UTF-8")
}
responses <- read("responses.csv")
conjoint <- read("conjoint.csv")
codebook <- read("codebook.csv")
responses$job_choice_seconds <- as.numeric(responses$job_choice_seconds)
conjoint$chosen <- as.numeric(conjoint$chosen)
if (!include_test) responses <- responses[!(responses$source %in% TEST_SOURCES), ]
# Speeders are dropped from EVERY question, not just the job choice: someone
# who rushed the 8 pairs probably rushed (or straight-lined) the rest too.
# Untimed responses are kept.
fast <- !is.na(responses$job_choice_seconds) & responses$job_choice_seconds < MIN_JOB_CHOICE_SECONDS
n_fast <- sum(fast)
responses <- responses[!fast, ]
if (!nrow(responses)) stop("No responses left in ", data_dir, " (all test data? try --include-test).")

labels <- function(column) {
  rows <- codebook[codebook$column == column & !is.na(codebook$value), ]
  setNames(rows$value_label, rows$value)
}
label_of <- function(map, level) ifelse(level %in% names(map), map[level], level)

# ---- Helpers -----------------------------------------------------------------

# OLS with respondent-clustered (CR1) standard errors; normal-based CIs.
cluster_ols <- function(formula, data) {
  fit <- lm(formula, data = data)
  se <- sqrt(diag(vcovCL(fit, cluster = data$respondent_id, type = "HC1")))
  list(est = coef(fit), se = se)
}

ci_row <- function(est, se) {
  data.frame(estimate = est, std_error = se, ci_low = est - Z * se, ci_high = est + Z * se,
             p_value = 2 * pnorm(-abs(est / se)))
}

spearman <- function(x, y) {
  ok <- !is.na(x) & !is.na(y)
  x <- x[ok]; y <- y[ok]; n <- length(x)
  t <- suppressWarnings(cor.test(x, y, method = "spearman", exact = FALSE))
  rho <- unname(t$estimate)
  # Fisher-z interval: deterministic, so both languages give the same numbers.
  z <- atanh(rho); se <- 1 / sqrt(n - 3)
  data.frame(n = n, estimate = rho, statistic = NA_real_, p_value = t$p.value,
             ci_low = tanh(z - Z * se), ci_high = tanh(z + Z * se))
}

by_group <- function(df, group, order, label_map) {
  do.call(rbind, lapply(names(order), function(level) {
    s <- df$satisfaction[!is.na(df[[group]]) & df[[group]] == level]
    s <- s[!is.na(s)]
    out <- data.frame(level, label = label_of(label_map, level), n = length(s),
                      mean_satisfaction = if (length(s)) mean(s) else NA_real_,
                      pct_satisfied = if (length(s)) 100 * mean(s >= SATISFIED_AT) else NA_real_,
                      small = length(s) < MIN_GROUP)
    names(out)[1] <- group
    out
  }))
}

# ---- Q1: what did people optimise for in the job choice? ---------------------

keep <- responses$respondent_id
cards <- conjoint[conjoint$respondent_id %in% keep, ]
for (attr in names(ATTRIBUTES)) cards[[attr]] <- factor(cards[[attr]], levels = ATTRIBUTES[[attr]])

# AMCE: one linear probability model with every attribute, baseline = first level.
fit <- cluster_ols(chosen ~ pay + mission + organisation + brand + work, cards)

amce <- list(); mm <- list()
for (attr in names(ATTRIBUTES)) {
  levels <- ATTRIBUTES[[attr]]
  lab <- labels(paste0("conjoint.csv: ", attr))
  for (i in seq_along(levels)) {
    level <- levels[i]
    base <- data.frame(attribute = attr, level = level, label = label_of(lab, level),
                       baseline = i == 1)
    term <- paste0(attr, level)
    amce[[length(amce) + 1]] <- if (i == 1) {
      cbind(base, data.frame(estimate = 0, std_error = NA_real_, ci_low = NA_real_,
                             ci_high = NA_real_, p_value = NA_real_))
    } else cbind(base, ci_row(fit$est[[term]], fit$se[[term]]))
    # Marginal mean: share of cards with this level that were picked.
    sub <- cards[cards[[attr]] == level, ]
    m <- cluster_ols(chosen ~ 1, sub)
    mm[[length(mm) + 1]] <- cbind(base, n_cards = nrow(sub), ci_row(m$est[[1]], m$se[[1]]))
  }
}
amce <- do.call(rbind, amce); mm <- do.call(rbind, mm)
mm$p_value <- NA_real_  # testing against 0 is meaningless for a share

ranges <- tapply(amce$estimate, factor(amce$attribute, levels = names(ATTRIBUTES)),
                 function(e) max(e) - min(e))
imp <- data.frame(attribute = names(ranges), range = as.numeric(ranges))
imp$share <- imp$range / sum(imp$range)
imp <- imp[order(-imp$range), ]
imp$rank <- seq_len(nrow(imp))

# ---- Q2 and Q3 ---------------------------------------------------------------

df <- responses
df$satisfaction <- unname(SATISFACTION[df$career_satisfaction])
df$benefit <- unname(BENEFIT[df$benefit_to_world])
df$exp <- unname(EXPERIENCE[df$experience])
tests <- list()
test_row <- function(question, test, n, estimate, statistic, p_value) {
  data.frame(question, test, n, estimate, statistic, p_value, ci_low = NA_real_, ci_high = NA_real_)
}

# Q2: is satisfaction related to feeling the job is useful to society?
q2_table <- by_group(df, "benefit_to_world", BENEFIT, labels("benefit_to_world"))
tests[[1]] <- cbind(question = "q2", test = "spearman satisfaction ~ benefit_to_world",
                    spearman(df$satisfaction, df$benefit))

# Q3: are more senior people more or less satisfied?
q3_exp <- by_group(df, "experience", EXPERIENCE, labels("experience"))
tests[[2]] <- cbind(question = "q3", test = "spearman satisfaction ~ experience",
                    spearman(df$satisfaction, df$exp))
ok <- !is.na(df$satisfaction) & !is.na(df$experience)
kw <- kruskal.test(df$satisfaction[ok], factor(df$experience[ok]))
tests[[3]] <- test_row("q3", "kruskal-wallis satisfaction by experience", sum(ok), NA_real_,
                       unname(kw$statistic), kw$p.value)

q3_mgr <- by_group(df, "manages_people", c(no = 0, yes = 1), labels("manages_people"))
yes <- na.omit(df$satisfaction[df$manages_people %in% "yes"])
no <- na.omit(df$satisfaction[df$manages_people %in% "no"])
mw <- suppressWarnings(wilcox.test(yes, no, correct = TRUE, exact = FALSE))
tests[[4]] <- test_row("q3", "mann-whitney satisfaction managers vs not", length(yes) + length(no),
                       mean(yes) - mean(no), unname(mw$statistic), mw$p.value)
tests <- do.call(rbind, tests)

# ---- Output --------------------------------------------------------------------

dir.create(OUT, recursive = TRUE, showWarnings = FALSE)
write_out <- function(x, name) {
  num <- vapply(x, is.numeric, logical(1))
  x[num] <- lapply(x[num], function(v) round(v, 8))
  logi <- vapply(x, is.logical, logical(1))
  x[logi] <- lapply(x[logi], function(v) ifelse(v, "True", "False"))  # match pandas
  write.csv(x, file.path(OUT, paste0(name, ".csv")), row.names = FALSE, na = "", fileEncoding = "UTF-8")
}
write_out(amce, "q1_amce"); write_out(mm, "q1_marginal_means"); write_out(imp, "q1_importance")
write_out(q2_table, "q2_satisfaction_by_benefit"); write_out(q3_exp, "q3_satisfaction_by_experience")
write_out(q3_mgr, "q3_satisfaction_by_manager"); write_out(tests, "tests")

short <- function(x) sub(" \\(numeric value.*\\)$", "", x)
cat(sprintf("Data: %s · %d responses analysed%s, %d dropped for finishing the job choice in under %ds\n\n",
            basename(data_dir), nrow(responses), if (include_test) " (including test rows)" else "",
            n_fast, MIN_JOB_CHOICE_SECONDS))
cat(sprintf("Q1 · job choice · %d respondents, %d cards\n",
            length(unique(cards$respondent_id)), nrow(cards)))
cat("Attribute importance (range of AMCEs, percentage points):\n")
for (i in seq_len(nrow(imp))) {
  cat(sprintf("  %d. %-13s %5.1f pp  (%.0f%% of total)\n", imp$rank[i], imp$attribute[i],
              100 * imp$range[i], 100 * imp$share[i]))
}
cat("Effect of each level vs baseline (pp change in chance of being picked):\n")
for (i in which(!amce$baseline)) {
  cat(sprintf("  %-13s %-34s %+6.1f  [%+.1f, %+.1f]\n", amce$attribute[i], short(amce$label[i]),
              100 * amce$estimate[i], 100 * amce$ci_low[i], 100 * amce$ci_high[i]))
}
show <- function(title, x) { cat("\n", title, "\n", sep = ""); print(x[-1], row.names = FALSE, digits = 4) }
show("Q2 · satisfaction by 'my job is useful to society':", q2_table)
show("Q3 · satisfaction by experience:", q3_exp)
show("Q3 · satisfaction by managing people:", q3_mgr)
cat("\nTests:\n"); print(tests, row.names = FALSE, digits = 4)
cat(sprintf("\nCSV results in analysis/output/r/\n"))
