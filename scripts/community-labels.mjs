// Labels for a player-filed issue (R40). GitHub ignores the `labels=` part of a pre-filled
// "new issue" link when the person filing it isn't a collaborator, so reports sent from the
// in-game Community tab arrive unlabelled and the tab (which lists `community` issues) can't see
// them. .github/workflows/community-labels.yml runs this on every new or edited issue.
// Only reads the title and body to classify; nothing in them is ever executed.

export const GAME_MARKER = '_Sent from the in-game Community tab._';

// Labels to add to an issue, [] when it isn't a community submission or is already labelled
export function communityLabelsFor(issue) {
  if (!issue || issue.pull_request) return [];
  const labels = (issue.labels || []).map(l => String(typeof l === 'string' ? l : l?.name ?? '').toLowerCase());
  if (labels.includes('roadmap')) return [];
  const title = String(issue.title ?? '').trim();
  const body = String(issue.body ?? '');
  const isBug = /^\[bug\]/i.test(title);
  const isFeature = /^\[feature\]/i.test(title);
  if (!isBug && !isFeature && !body.includes(GAME_MARKER)) return [];
  const want = ['community', isBug ? 'bug' : 'feature'];
  return want.filter(l => !labels.includes(l));
}
