import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

export function styleRank(svg) {
  return svg.replace(/(\.rank-text\s*\{[^}]*?font:\s*\d+\s+)\d+(?:\.\d+)?px\b/, (_, prefix) => `${prefix}24px`);
}

export function activateStats(readme, stats, languages, updatedAt) {
  for (const [name, svg] of [['stats', stats], ['languages', languages]]) {
    if (!/<svg\b/.test(svg) || !/<\/svg>\s*$/.test(svg) || /Something went wrong|Could not fetch|data-testid=["']error-message/i.test(svg)) {
      throw new Error(`Invalid ${name} card; existing README will not be changed.`);
    }
  }
  if (!/data-testid=["']commits["']/.test(stats) || !stats.includes('Total Commits:')) {
    throw new Error('Expected an all-time commit statistics card.');
  }
  if (!languages.includes('Most Used Languages')) {
    throw new Error('Expected a language statistics card.');
  }

  let result = readme;
  for (const [alt, asset] of [
    ['Alveeria — public GitHub stats, all-time commits', 'assets/github-stats.svg'],
    ['Language usage in Alveeria\'s public repositories', 'assets/github-languages.svg'],
    ['Alveeria — GitHub stats across authorized repositories', 'assets/github-stats.svg'],
    ['Aggregate language usage across authorized repositories', 'assets/github-languages.svg'],
  ]) {
    result = result.replace(new RegExp(`(<img src=")[^"]+("[^>]*alt="${alt}")`), `$1${asset}$2`);
  }
  result = result
    .replace('alt="Alveeria — public GitHub stats, all-time commits"', 'alt="Alveeria — GitHub stats across authorized repositories"')
    .replace('alt="Language usage in Alveeria\'s public repositories"', 'alt="Aggregate language usage across authorized repositories"');

  const marker = /<!-- profile-stats-status:start -->[\s\S]*?<!-- profile-stats-status:end -->/;
  if (!marker.test(result) || !result.includes('src="assets/github-stats.svg"') || !result.includes('src="assets/github-languages.svg"')) {
    throw new Error('README statistics markup has changed; refusing a partial update.');
  }
  const cards = /<!-- profile-stats-cards:start -->[\s\S]*?<!-- profile-stats-cards:end -->/;
  if (cards.test(result)) {
    result = result.replace(cards, `<!-- profile-stats-cards:start -->
<p align="center">
  <img src="assets/github-stats.svg" width="495" alt="Alveeria — GitHub stats across authorized repositories" />
</p>
<p align="center">
  <img src="assets/github-streak.svg" width="495" alt="Alveeria's contribution streak" />
</p>
<p align="center">
  <img src="assets/github-languages.svg" width="495" alt="Aggregate language usage across authorized repositories" />
</p>
<!-- profile-stats-cards:end -->`);
  }
  const stamp = new Date(updatedAt).toISOString().slice(0, 16).replace('T', ' ') + ' UTC';
  return result.replace(marker, `<!-- profile-stats-status:start -->\n<p align="center"><sub>Public + token-accessible private repos · updated ${stamp}<br/>Scheduled every 6 hours · streak follows GitHub calendar (UTC) · language usage ≠ proficiency</sub></p>\n<!-- profile-stats-status:end -->`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [readme, stats, languages, streak] = await Promise.all([
    readFile('README.md', 'utf8'),
    readFile('assets/github-stats.svg', 'utf8'),
    readFile('assets/github-languages.svg', 'utf8'),
    readFile('assets/github-streak.svg', 'utf8'),
  ]);
  if (!streak.includes("Alveeria's contribution streak") || !streak.includes('</svg>')) {
    throw new Error('Expected a valid contribution streak card.');
  }
  const styledStats = styleRank(stats);
  const result = activateStats(readme, styledStats, languages, new Date());
  await writeFile('assets/github-stats.svg', styledStats);
  await writeFile('README.md', result);
  console.log('Validated generated cards and activated local README images.');
}
