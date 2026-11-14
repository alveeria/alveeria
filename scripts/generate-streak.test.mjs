import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateStreak, renderStreak } from './generate-streak.mjs';
const day = (date, count) => ({ date, contributionCount: count });

test('counts calendar contributions, longest streak, and today streak', () => {
  const result = calculateStreak([day('2026-11-10', 2), day('2026-11-11', 3), day('2026-11-12', 0), day('2026-11-13', 1), day('2026-11-14', 4)], '2026-11-14');
  assert.equal(result.total, 10);
  assert.equal(result.longest, 2);
  assert.equal(result.current, 2);
  assert.equal(result.currentStart, '2026-11-13');
});

test('today with zero contributions does not break yesterday streak', () => {
  const result = calculateStreak([day('2026-11-12', 1), day('2026-11-13', 2), day('2026-11-14', 0)], '2026-11-14');
  assert.equal(result.current, 2);
  assert.equal(result.currentEnd, '2026-11-13');
});

test('handles year boundaries and duplicate dates without double counting', () => {
  const result = calculateStreak([day('2025-12-31', 1), day('2026-01-01', 2), day('2026-01-01', 2)], '2026-01-01');
  assert.equal(result.total, 3);
  assert.equal(result.current, 2);
});

test('gaps and zero days break a streak; future days are ignored', () => {
  const result = calculateStreak([day('2026-11-10', 5), day('2026-11-12', 4), day('2026-11-13', 0), day('2026-11-15', 99)], '2026-11-14');
  assert.equal(result.longest, 1);
  assert.equal(result.current, 0);
  assert.equal(result.total, 9);
});

test('renders empty calendars safely and rejects invalid counts', () => {
  const result = calculateStreak([], '2026-11-14');
  assert.equal(result.current, 0);
  assert.match(renderStreak(result), /No streak yet/);
  assert.throws(() => calculateStreak([day('2026-11-14', -1)], '2026-11-14'));
  assert.throws(() => calculateStreak([day('<script>', 1)], '2026-11-14'));
});
