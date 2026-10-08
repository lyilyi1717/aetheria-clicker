// Community requests posted in the game without GitHub (supabase/community.sql) go to GitHub
// once other players like them: .github/workflows/community-promote.yml runs promote() every
// 6 hours with the Supabase service key (a repository secret, never in the game).
//   * open requests with >= APPROVE_LIKES likes become a GitHub issue labelled `community` +
//     `bug`/`feature`, then the row is marked posted with its issue number;
//   * posted requests keep collecting likes in the game; the issue body's "In-game likes" line
//     is kept up to date so the queue (AGENTS.md › Community queue) can count them.
// Player text is data: it only ever lands in an issue body/title through the REST API.

import { APPROVE_LIKES } from '../js/ui/communityVotes.js';
import { GAME_MARKER } from './community-labels.mjs';

export const LIKES_RE = /In-game likes: \*\*\d+\*\* <!-- in-game-likes -->/;
export const likesLine = (n) => `In-game likes: **${Math.max(0, Math.floor(Number(n) || 0))}** <!-- in-game-likes -->`;

// No @-mentions or #-references pinging people or issues from player text
const defang = (s) => String(s ?? '').replace(/@/g, '@​').replace(/#(\d)/g, '#​$1');

export function issueFromRequest(row) {
  const bug = row.kind === 'bug';
  const title = `${bug ? '[Bug]' : '[Feature]'} ${defang(String(row.title ?? '').replace(/\s+/g, ' ').trim()).slice(0, 120)}`;
  const body = [
    bug ? '### What happened?' : '### Your idea',
    defang(String(row.body ?? '').trim().slice(0, 2000)) || '_No description given._',
    '',
    '### Game version',
    `v${defang(String(row.game_version || '?').replace(/^v/, '')).slice(0, 20)}`,
    ...(bug ? ['', '### Browser and device', defang(row.browser || 'Unknown').slice(0, 80)] : []),
    '',
    likesLine(row.likes),
    '',
    `${GAME_MARKER} Posted with a game account (request ${Number(row.id)}), voted in the game.`
  ].join('\n');
  return { title, body, labels: ['community', bug ? 'bug' : 'feature'] };
}

/** The issue body with its in-game likes line set to n (added at the end if missing). */
export function withLikes(body, n) {
  const s = String(body ?? '');
  return LIKES_RE.test(s) ? s.replace(LIKES_RE, likesLine(n)) : `${s}\n\n${likesLine(n)}`;
}

// --- run (GitHub Action) ---------------------------------------------------------------------
// New Supabase secret keys (sb_secret_...) go in `apikey` only; a legacy service_role key is a
// JWT and is sent as the bearer token too.
export function dbHeaders(key) {
  const h = { apikey: key, 'Content-Type': 'application/json', Prefer: 'return=minimal' };
  if (!String(key).startsWith('sb_')) h.Authorization = `Bearer ${key}`;
  return h;
}
async function db(url, key, path, { method = 'GET', body } = {}) {
  const res = await fetch(`${url}/rest/v1/${path}`, {
    method,
    headers: dbHeaders(key),
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  if (!res.ok) throw new Error(`Supabase ${method} ${path.split('?')[0]}: ${res.status} ${await res.text()}`);
  return method === 'GET' ? res.json() : null;
}

/** github/context/core come from actions/github-script. */
export async function promote({ github, context, core, url, key }) {
  if (!url || !key) { core.warning('SUPABASE_URL / SUPABASE_SERVICE_KEY not set; nothing to do.'); return; }
  const cols = 'id,kind,title,body,game_version,browser,likes,status,github_issue,synced_likes';
  // Requests that reached the bar, plus posted ones whose issue failed to open last time
  const ready = await db(url, key, `community_requests?select=${cols}&hidden=is.false&github_issue=is.null&likes=gte.${APPROVE_LIKES}&order=likes.desc&limit=20`);
  for (const row of ready) {
    // Claim it first so a crash can never post the same request twice
    await db(url, key, `community_requests?id=eq.${row.id}&github_issue=is.null`, { method: 'PATCH', body: { status: 'posted' } });
    const issue = issueFromRequest(row);
    const { data } = await github.rest.issues.create({ ...context.repo, ...issue });
    await db(url, key, `community_requests?id=eq.${row.id}`, { method: 'PATCH', body: { github_issue: data.number, synced_likes: row.likes } });
    core.info(`request ${row.id} → #${data.number} (${row.likes} likes)`);
  }
  // Keep the in-game likes on posted issues current
  const posted = await db(url, key, `community_requests?select=id,likes,synced_likes,github_issue&status=eq.posted&github_issue=not.is.null&limit=200`);
  for (const row of posted) {
    if (row.likes === row.synced_likes) continue;
    const { data } = await github.rest.issues.get({ ...context.repo, issue_number: row.github_issue });
    await github.rest.issues.update({ ...context.repo, issue_number: row.github_issue, body: withLikes(data.body, row.likes) });
    await db(url, key, `community_requests?id=eq.${row.id}`, { method: 'PATCH', body: { synced_likes: row.likes } });
    core.info(`#${row.github_issue}: in-game likes ${row.synced_likes} → ${row.likes}`);
  }
}
