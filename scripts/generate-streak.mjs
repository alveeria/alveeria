import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const dayMs = 86400000;
const dateKey = (date) => new Date(date).toISOString().slice(0, 10);

export function calculateStreak(days, today) {
  const counts = new Map();
  for (const day of days) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day.date) || !Number.isInteger(day.contributionCount) || day.contributionCount < 0) {
      throw new Error('Invalid contribution calendar.');
    }
    if (day.date <= today) counts.set(day.date, day.contributionCount);
  }
  const sorted = [...counts.keys()].sort();
  let total = 0, longest = 0, run = 0, start = null, longestStart = null, longestEnd = null, previous = null;
  for (const date of sorted) {
    const count = counts.get(date);
    total += count;
    if (count > 0) {
      const adjacent = previous && Date.parse(date) - Date.parse(previous) === dayMs;
      run = adjacent ? run + 1 : 1;
      if (!adjacent || run === 1) start = date;
      if (run > longest) { longest = run; longestStart = start; longestEnd = date; }
    } else { run = 0; start = null; }
    previous = date;
  }
  // An unfinished UTC day does not break yesterday's streak.
  let cursor = counts.get(today) > 0 ? today : dateKey(Date.parse(today) - dayMs);
  const currentEnd = cursor;
  let current = 0;
  while ((counts.get(cursor) || 0) > 0) {
    current++;
    cursor = dateKey(Date.parse(cursor) - dayMs);
  }
  return { total, current, longest, first: sorted[0] || today,
    currentStart: current ? dateKey(Date.parse(cursor) + dayMs) : null,
    currentEnd: current ? currentEnd : null, longestStart, longestEnd };
}

const formatDate = (date) => new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(new Date(date));
const range = (start, end) => start ? `${formatDate(start)} – ${formatDate(end)}` : 'No streak yet';

export function renderStreak(value) {
  const number = (n) => n.toLocaleString('en-US');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="495" height="195" viewBox="0 0 495 195" role="img" aria-labelledby="title desc">
<title id="title">Alveeria's contribution streak</title>
<desc id="desc">${value.total} contributions, ${value.current} day current streak, ${value.longest} day longest streak. GitHub contribution calendar, UTC.</desc>
<rect width="495" height="195" fill="#0D1117"/>
<g font-family="Segoe UI, Ubuntu, Arial, sans-serif" text-anchor="middle">
<path d="M165 25V170M330 25V170" stroke="#F75C7E" stroke-opacity=".65"/>
<circle cx="247.5" cy="73" r="39" fill="none" stroke="#F75C7E" stroke-width="4.5"/>
<path d="M248 17c5 8 8 11 6 17-1 5-5 7-9 6-7-2-8-10-3-16-1 5 1 7 3 6 3-2 3-8 3-13Z" fill="#F8D847" stroke="#0D1117" stroke-width="3"/>
<g font-size="28" font-weight="700"><text x="82" y="88" fill="#F75C7E">${number(value.total)}</text><text x="247.5" y="84" fill="#F8D847">${number(value.current)}</text><text x="412" y="88" fill="#F75C7E">${number(value.longest)}</text></g>
<g font-size="13"><text x="82" y="124" fill="#F75C7E">Total Contributions</text><text x="247.5" y="139" fill="#F8D847" font-weight="700">Current Streak</text><text x="412" y="124" fill="#F75C7E">Longest Streak</text></g>
<g font-size="10" fill="#A9FEF7"><text x="82" y="151">${formatDate(value.first)} – Present</text><text x="247.5" y="162">${range(value.currentStart, value.currentEnd)}</text><text x="412" y="151">${range(value.longestStart, value.longestEnd)}</text></g>
</g></svg>\n`;
}

async function generate() {
  const token = process.env.PROFILE_STATS_TOKEN;
  if (!token) throw new Error('Statistics token is missing.');
  async function query(query, variables = {}) {
    const response = await fetch('https://api.github.com/graphql', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables }),
      signal: AbortSignal.timeout(30000),
    });
    if (!response.ok) throw new Error(`GitHub contribution API returned HTTP ${response.status}.`);
    const result = await response.json();
    if (result.errors || !result.data) throw new Error('GitHub contribution query failed; check token access.');
    return result.data;
  }
  const identity = await query('query { viewer { login } user(login: "alveeria") { createdAt } }');
  if (identity.viewer.login.toLowerCase() !== 'alveeria') throw new Error('Expected a token owned by alveeria.');
  const now = new Date();
  const days = [];
  for (let year = new Date(identity.user.createdAt).getUTCFullYear(); year <= now.getUTCFullYear(); year++) {
    const from = `${year}-01-01T00:00:00Z`;
    const to = year === now.getUTCFullYear() ? now.toISOString() : `${year}-12-31T23:59:59Z`;
    const result = await query(`query($from: DateTime!, $to: DateTime!) {
      user(login: "alveeria") { contributionsCollection(from: $from, to: $to) {
        contributionCalendar { weeks { contributionDays { date contributionCount } } }
      } }
    }`, { from, to });
    for (const week of result.user.contributionsCollection.contributionCalendar.weeks) {
      days.push(...week.contributionDays.filter(day => day.date.startsWith(String(year))));
    }
  }
  if (!days.length) throw new Error('GitHub returned an empty contribution calendar.');
  await writeFile('assets/github-streak.svg', renderStreak(calculateStreak(days, dateKey(now))));
  console.log('Generated aggregate contribution streak; no repository names collected.');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await generate();
}
