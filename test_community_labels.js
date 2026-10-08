// R40: player reports from the game arrive unlabelled; scripts/community-labels.mjs decides
// which labels the Community labels workflow adds. Run: node test_community_labels.js
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { communityLabelsFor, GAME_MARKER } from './scripts/community-labels.mjs';
import { buildNewIssueUrl } from './js/ui/community.js';

const fromGame = (type, title) => {
  const u = new URL(buildNewIssueUrl({ type, title, description: 'x', browser: 'Chrome 1 on Android' }));
  return { title: u.searchParams.get('title'), body: u.searchParams.get('body'), labels: [] };
};

assert.ok(fromGame('bug', 'a').body.includes(GAME_MARKER), 'the game body carries the marker');
assert.deepEqual(communityLabelsFor(fromGame('bug', 'Boss timer')), ['community', 'bug']);
assert.deepEqual(communityLabelsFor(fromGame('feature', 'More seeds')), ['community', 'feature']);
assert.deepEqual(communityLabelsFor({ title: '[Bug] from the issue form', body: '', labels: [{ name: 'bug' }] }), ['community'], 'only missing labels');
assert.deepEqual(communityLabelsFor({ title: '[Feature] idea', labels: [{ name: 'community' }, { name: 'feature' }] }), [], 'already labelled');
assert.deepEqual(communityLabelsFor({ title: 'R40: roadmap item', body: GAME_MARKER, labels: [{ name: 'roadmap' }] }), [], 'roadmap untouched');
assert.deepEqual(communityLabelsFor({ title: 'Some maintainer issue', body: 'notes', labels: [] }), []);
assert.deepEqual(communityLabelsFor({ title: '[Bug] x', pull_request: {} }), [], 'PRs untouched');
assert.deepEqual(communityLabelsFor(null), []);

// The workflow never interpolates issue text into a shell (script injection)
const wf = readFileSync(new URL('./.github/workflows/community-labels.yml', import.meta.url), 'utf8');
assert.ok(!/\$\{\{\s*github\.event\.issue\.(title|body)/.test(wf));
assert.match(wf, /issues: write/);

console.log('Community label tests passed.');
