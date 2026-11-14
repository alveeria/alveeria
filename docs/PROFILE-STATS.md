# Profile statistics setup

The workflow generates the existing rose/dark GitHub Readme Stats cards inside GitHub Actions. After the first successful run, the README automatically switches from the public service to `assets/github-stats.svg` and `assets/github-languages.svg`. The statistics section stacks these with `assets/github-streak.svg`, matching the reference's pink/cyan/yellow palette.

Until then, the public cards stay visible and the README explicitly says private statistics are pending. A missing token or failed generation never silently publishes public-only numbers as private-inclusive statistics.

## One-time activation

1. Create a **dedicated classic GitHub PAT** under <https://github.com/settings/tokens>, with `repo` and `read:user` scopes. Set an expiration date. These are the upstream generator's documented scopes for private statistics; its documented fine-grained setup does not provide private commit totals.
2. **Security:** `repo` is a broad permission, not read-only. Use a separate token only for this workflow, never reuse a deployment token, and revoke/rotate it if it leaks. Don't paste it into chat, code, a URL, or the README. The workflow is pinned to reviewed action revisions, but the generator and its dependencies still execute with this token during card generation. Only run trusted workflow revisions.
3. Open <https://github.com/alveeria/alveeria/settings/secrets/actions/new>. Create the repository secret **`ALVEERIA`** (the name configured in this repository's workflow) and paste the token directly into GitHub's secret field.
4. Open <https://github.com/alveeria/alveeria/actions/workflows/profile-stats.yml>, choose **Run workflow**, and run it on `main`.
5. After success, the workflow commits the three SVG cards and updates the README image paths and UTC timestamp. No private repository names or source files are added to this repository.

The ordinary `GITHUB_TOKEN` writes the cards to this profile repository. The separate PAT only goes to the generation steps, not `actions/checkout`. GitHub masks configured secrets in logs, but avoid debugging that prints tokens or raw API responses.

## What gets counted

- **Commits:** `include_all_commits=true` uses GitHub's commit search for the profile author, across repositories visible to the token. It is not a sum of every commit in every local Git history. GitHub indexing, commit-author attribution, accessible repositories, default-branch/search rules, and deleted repositories can affect totals.
- **Languages:** aggregate repository language usage for the owner's non-fork repositories accessible to the token, including private repositories where supported. It measures code distribution, not proficiency or who wrote every line.
- **Streak:** generated from the authenticated GitHub contribution calendar across the profile's years, not commit search. Total contributions include contribution types beyond commits. Dates use UTC; a zero-contribution current day preserves yesterday's streak until the day ends. GitHub's contribution attribution and private contribution visibility settings apply, so enable **Contribution settings → Private contributions** on your GitHub profile if you want that activity shown. It can differ from all-time commit totals.
- Only aggregate cards are published. Language names/percentages and activity counts from private repositories become public; repository names and source do not.
- A token cannot include repositories it cannot access. Organization restrictions and SSO authorization may further limit access. The card cannot prove complete coverage of all private work.

## Refresh and maintenance

- Schedule: `17 */6 * * *` (00:17, 06:17, 12:17, 18:17 UTC). GitHub may delay scheduled runs; this is not real-time.
- Manual: use **Run workflow** after new activity or token rotation.
- The README shows the last successful generation time. GitHub's image caching may delay display after an update.
- If the token expires or generation fails, the last successful cards remain unchanged. Renew the secret and rerun the workflow.
- Scheduled workflows in public repositories may be disabled after inactivity; re-enable them in Actions if needed.
- Generated cards are only committed after the statistics/language outputs and the generated streak pass validation. Actions are version-pinned; review upstream updates before changing pins.

References: [generator action](https://github.com/readme-tools/github-readme-stats-action), [GitHub Readme Stats](https://github.com/readme-tools/github-readme-stats), [GitHub commit search](https://docs.github.com/en/search-github/searching-on-github/searching-commits).
