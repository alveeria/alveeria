import test from 'node:test';
import assert from 'node:assert/strict';
import { activateStats, enlargeRank } from './activate-profile-stats.mjs';

const readme = `<img src="https://example.com/api?username=alveeria" height="165em" alt="Alveeria — public GitHub stats, all-time commits"/>
<img src="https://example.com/languages" height="165em" alt="Language usage in Alveeria's public repositories"/>
<!-- profile-stats-status:start -->pending<!-- profile-stats-status:end -->`;
const stats = '<svg><text data-testid="commits">Total Commits:</text><text>53</text></svg>';
const languages = '<svg><text>Most Used Languages</text></svg>';
const time = '2026-11-14T06:17:00Z';

test('enlarges only the rank font without changing its value or other text', () => {
  const svg = '<svg><style>.header {font: 600 18px sans-serif;} .rank-text {font: 800 24px sans-serif; fill: white;}</style><text>C</text></svg>';
  const result = enlargeRank(svg);
  assert.match(result, /\.rank-text \{font: 800 36px/);
  assert.match(result, /\.header \{font: 600 18px/);
  assert.match(result, /<text>C<\/text>/);
  assert.equal(enlargeRank(result), result);
  assert.equal(enlargeRank('<svg></svg>'), '<svg></svg>');
});

test('activates both local images and records the successful update time', () => {
  const result = activateStats(readme, stats, languages, time);
  assert.match(result, /src="assets\/github-stats.svg"/);
  assert.match(result, /src="assets\/github-languages.svg"/);
  assert.match(result, /2026-11-14 06:17 UTC/);
  assert.match(result, /token-accessible private repos/);
  assert.doesNotMatch(result, /pending|example.com/);
});

test('subsequent runs update the timestamp without losing local paths', () => {
  const first = activateStats(readme, stats, languages, time);
  const second = activateStats(first, stats, languages, '2026-11-15T12:17:00Z');
  assert.match(second, /2026-11-15 12:17 UTC/);
  assert.match(second, /src="assets\/github-stats.svg"/);
  assert.doesNotMatch(second, /2026-11-14/);
});

test('rejects HTML and error SVGs, even when returned with HTTP 200', () => {
  for (const bad of ['<html>Error</html>', '<svg>Something went wrong</svg>', '<svg><text data-testid="error-message">Failed</text></svg>']) {
    assert.throws(() => activateStats(readme, bad, languages, time));
    assert.throws(() => activateStats(readme, stats, bad, time));
  }
});

test('requires all-time commits and a language card', () => {
  assert.throws(() => activateStats(readme, stats.replace('Total Commits:', 'Total Commits (2026):'), languages, time));
  assert.throws(() => activateStats(readme, stats, '<svg>Unknown</svg>', time));
});

test('fails safely when README markers or image markup change', () => {
  assert.throws(() => activateStats(readme.replace('profile-stats-status:start', 'removed'), stats, languages, time));
  assert.throws(() => activateStats(readme.replace('Alveeria — public GitHub stats, all-time commits', 'Other image'), stats, languages, time));
});
