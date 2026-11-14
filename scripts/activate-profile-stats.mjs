import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

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
  const stamp = new Date(updatedAt).toISOString().slice(0, 16).replace('T', ' ') + ' UTC';
  return result.replace(marker, `<!-- profile-stats-status:start -->\n<p align="center"><sub>Public + token-accessible private repos · updated ${stamp}<br/>Scheduled every 6 hours · language usage ≠ proficiency</sub></p>\n<!-- profile-stats-status:end -->`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [readme, stats, languages] = await Promise.all([
    readFile('README.md', 'utf8'),
    readFile('assets/github-stats.svg', 'utf8'),
    readFile('assets/github-languages.svg', 'utf8'),
  ]);
  const result = activateStats(readme, stats, languages, new Date());
  await writeFile('README.md', result);
  console.log('Validated generated cards and activated local README images.');
}
