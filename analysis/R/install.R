# One-off setup for analysis/R/analysis.R:  Rscript analysis/R/install.R
need <- c("sandwich")
missing <- need[!vapply(need, requireNamespace, logical(1), quietly = TRUE)]
if (length(missing)) install.packages(missing, repos = "https://cloud.r-project.org")
cat("R packages ready:", paste(need, collapse = ", "), "\n")
