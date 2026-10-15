// Dig feature: Cloud Telemetry & Supabase Live Preset Synchronization.
// Connects to the project's Supabase instance to persist and retrieve tuning presets and telemetry snapshots.
// All calls are non-blocking and fail-safe for offline and air-gapped environments.

const SUPABASE_URL = 'https://hutjfgbjjagqdjjeszqj.supabase.co';
const SUPABASE_KEY = 'sb_publishable_mxWGt9Ul4V2q4Wb0DEmV9Q_UhBH6T-f';

const headers = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
};

// Check if fetch is available in current environment (browser vs test runner)
const safeFetch = typeof fetch === 'function' ? fetch : null;

// Save current tuning configuration as a cloud session preset
export async function syncToCloud(name, tuning = {}, author = 'Architect', description = '') {
  if (!safeFetch) {
    return { ok: false, error: 'Network fetch not available' };
  }
  try {
    const payload = {
      name: String(name || 'Custom Preset').slice(0, 64),
      author: String(author || 'Player').slice(0, 64),
      description: String(description || '').slice(0, 255),
      tuning: typeof tuning === 'object' && tuning !== null ? tuning : {},
      is_preset: false,
      updated_at: new Date().toISOString(),
    };

    const res = await safeFetch(`${SUPABASE_URL}/rest/v1/digger_tuning_sessions`, {
      method: 'POST',
      headers: { ...headers, Prefer: 'return=representation' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      return { ok: false, error: `HTTP ${res.status}: ${res.statusText}` };
    }

    const data = await res.json();
    const session = Array.isArray(data) && data[0] ? data[0] : null;
    return { ok: true, session, id: session ? session.id : null };
  } catch (err) {
    return { ok: false, error: (err && err.message) || 'Network error' };
  }
}

// Fetch available tuning presets from Supabase
export async function fetchCloudPresets(limit = 20) {
  if (!safeFetch) {
    return { ok: false, presets: [] };
  }
  try {
    const url = `${SUPABASE_URL}/rest/v1/digger_tuning_sessions?select=id,name,author,description,tuning,is_preset,created_at&order=created_at.desc&limit=${limit}`;
    const res = await safeFetch(url, { method: 'GET', headers });

    if (!res.ok) {
      return { ok: false, error: `HTTP ${res.status}`, presets: [] };
    }

    const presets = await res.json();
    return { ok: true, presets: Array.isArray(presets) ? presets : [] };
  } catch (err) {
    return { ok: false, error: (err && err.message) || 'Network error', presets: [] };
  }
}

// Record a live performance telemetry snapshot
export async function recordTelemetrySnapshot(snapshot = {}) {
  if (!safeFetch) {
    return { ok: false };
  }
  try {
    const payload = {
      session_id: snapshot.sessionId || null,
      pid: snapshot.pid || null,
      ver: String(snapshot.ver || '1.0.0').slice(0, 16),
      level: Math.round(Number(snapshot.level) || 0),
      dps: Number(snapshot.dps) || 0,
      hits_to_break: Number(snapshot.hitsToBreak) || 0,
      par_time: Number(snapshot.parTime) || 0,
      overrides: typeof snapshot.overrides === 'object' && snapshot.overrides !== null ? snapshot.overrides : {},
    };

    const res = await safeFetch(`${SUPABASE_URL}/rest/v1/digger_tuning_telemetry`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    return { ok: res.ok };
  } catch {
    return { ok: false };
  }
}
