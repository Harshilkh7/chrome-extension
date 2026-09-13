// content.js
const seen = new Set();
let monitoringEnabled = true;
const storageGet = (keys) => new Promise((resolve) => chrome.storage.local.get(keys, resolve));
const storageSet = (obj) => new Promise((resolve) => chrome.storage.local.set(obj, resolve));

function authFetch(url, options = {}, retry = true) {
  return fetch(url, { ...options, credentials: 'include' }).then(async (res) => {
    if (res.status === 401 && retry) {
      const refresh = await fetch(`${API_BASE_URL}/auth/refresh`, { method: 'POST', credentials: 'include' });
      if (refresh.ok) return authFetch(url, options, false);
    }
    return res;
  });
}

function announceBridgeReady() {
  if (document.documentElement) document.documentElement.setAttribute('data-extenspro-bridge-ready', '1');
  window.postMessage({ source: 'extenspro-bridge-ready' }, '*');
}
chrome.storage.local.get({ monitoringEnabled: true }, (res) => { monitoringEnabled = res.monitoringEnabled; });
chrome.storage.onChanged.addListener((changes, area) => { if (area === 'local' && 'monitoringEnabled' in changes) monitoringEnabled = changes.monitoringEnabled.newValue; });

let cachedConsents = null;
async function loadCachedConsents() {
  const { consents } = await storageGet(['consents']);
  if (consents) return consents;
  try {
    const res = await authFetch(`${API_BASE_URL}/consent/my-consents`);
    if (!res.ok) return null;
    const data = await res.json();
    await storageSet({ consents: data });
    return data;
  } catch (err) {
    console.warn('[ExtensPro] Could not load consents:', err);
    return null;
  }
}

window.addEventListener('message', async (event) => {
  if (event.source !== window || event.data?.source !== 'extenspro' || !monitoringEnabled) return;
  const { origin, perm, state } = event.data;
  if (state !== 'granted' && state !== 'denied') return;
  const dedupeKey = `${origin}|${perm}|${state}`;
  if (seen.has(dedupeKey)) return;
  seen.add(dedupeKey);

  const siteKey = `site:${origin}`;
  const current = (await storageGet([siteKey]))[siteKey] || {};
  current[perm] = state;
  await storageSet({ [siteKey]: current });

  if (cachedConsents === null) cachedConsents = await loadCachedConsents();
  if (cachedConsents === null) return;

  const granted = state === 'granted';
  const existing = cachedConsents.find((c) => c.service === origin);
  const existingEntry = existing?.dataShared.find((e) => e.permission === perm);
  if (existingEntry && existingEntry.granted === granted) return;

  const payload = { service: origin, dataShared: [{ permission: perm, granted }], consentGiven: granted };
  try {
    const url = existing ? `${API_BASE_URL}/consent/update/${existing._id}` : `${API_BASE_URL}/consent/log`;
    const method = existing ? 'PUT' : 'POST';
    const res = await authFetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (!res.ok) return console.warn('[ExtensPro] Backend rejected update:', await res.text());
    const result = await res.json();
    const updatedConsent = result.consent;
    cachedConsents = existing ? cachedConsents.map((c) => c._id === existing._id ? updatedConsent : c) : [...cachedConsents, updatedConsent];
    await storageSet({ consents: cachedConsents });
  } catch (err) { console.warn('[ExtensPro] Network error syncing consent:', err); }
});
announceBridgeReady();
