// content.js
//
// Runs in the isolated world (default), so it has access to chrome.* APIs.
// It listens for postMessage events from injected.js (which runs in the
// page's own MAIN world) and forwards real permission changes to the
// backend — but only while monitoring is turned on in the popup.

const seen = new Set();
let monitoringEnabled = true; // default; refreshed from storage below

const storageGet = (keys) => new Promise((resolve) => chrome.storage.local.get(keys, resolve));
const storageSet = (obj) => new Promise((resolve) => chrome.storage.local.set(obj, resolve));

function announceBridgeReady() {
  if (document.documentElement) {
    document.documentElement.setAttribute('data-extenspro-bridge-ready', '1');
  }
  window.postMessage({ source: 'extenspro-bridge-ready' }, '*');
}

chrome.storage.local.get({ monitoringEnabled: true }, (res) => {
  monitoringEnabled = res.monitoringEnabled;
});

// Keep in sync if the popup toggles monitoring while this page is open.
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && 'monitoringEnabled' in changes) {
    monitoringEnabled = changes.monitoringEnabled.newValue;
  }
});

// Cache the logged-in user's consent list once per page load so we only
// send a request to the backend when something has actually changed.
let cachedConsents = null;
async function loadCachedConsents() {
  const { authToken, consents } = await storageGet(['authToken', 'consents']);
  if (!authToken) return null;
  if (consents) return consents;

  try {
    const res = await fetch(`${API_BASE_URL}/consent/my-consents`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    if (!res.ok) return [];
    const data = await res.json();
    await storageSet({ consents: data });
    return data;
  } catch (err) {
    console.warn('[ExtensPro] Could not load consents:', err);
    return [];
  }
}

window.addEventListener('message', async (event) => {
  if (event.source !== window) return;
  if (event.data?.source !== 'extenspro') return;
  if (!monitoringEnabled) return;

  const { origin, perm, state } = event.data;
  if (state !== 'granted' && state !== 'denied') return; // ignore "prompt"

  const dedupeKey = `${origin}|${perm}|${state}`;
  if (seen.has(dedupeKey)) return;
  seen.add(dedupeKey);

  // Track locally regardless of login, so the popup badge/list can show
  // something even before the user signs in.
  const siteKey = `site:${origin}`;
  const current = (await storageGet([siteKey]))[siteKey] || {};
  current[perm] = state;
  await storageSet({ [siteKey]: current });

  const { authToken } = await storageGet(['authToken']);
  if (!authToken) return; // not logged in — nothing to sync yet

  if (cachedConsents === null) {
    cachedConsents = await loadCachedConsents();
  }

  const granted = state === 'granted';
  const existing = cachedConsents.find((c) => c.service === origin);
  const existingEntry = existing?.dataShared.find((e) => e.permission === perm);

  if (existingEntry && existingEntry.granted === granted) {
    return; // already recorded — nothing changed
  }

  const payload = {
    service: origin,
    dataShared: [{ permission: perm, granted }],
    consentGiven: granted,
  };

  try {
    const url = existing ? `${API_BASE_URL}/consent/update/${existing._id}` : `${API_BASE_URL}/consent/log`;
    const method = existing ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      console.warn('[ExtensPro] Backend rejected update:', await res.text());
      return;
    }

    const result = await res.json();
    const updatedConsent = result.consent;

    cachedConsents = existing
      ? cachedConsents.map((c) => (c._id === existing._id ? updatedConsent : c))
      : [...cachedConsents, updatedConsent];

    await storageSet({ consents: cachedConsents });
  } catch (err) {
    console.warn('[ExtensPro] Network error syncing consent:', err);
  }
});

announceBridgeReady();
