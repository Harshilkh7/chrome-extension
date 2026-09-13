// background.js (service worker)
importScripts('config.js');

const CONTROL_ALARM = 'permission-control-sync';
const PERMISSION_TYPES = { camera: 'camera', microphone: 'microphone', location: 'location', notifications: 'notifications', clipboard: 'clipboard', automaticDownloads: 'automaticDownloads' };

chrome.runtime.onInstalled.addListener(async () => {
  const existing = await chrome.storage.local.get('monitoringEnabled');
  if (existing.monitoringEnabled === undefined) await chrome.storage.local.set({ monitoringEnabled: true });
  await chrome.alarms.create(CONTROL_ALARM, { delayInMinutes: 0.1, periodInMinutes: 0.5 });
  syncPermissionControls();
});
chrome.runtime.onStartup.addListener(() => syncPermissionControls());
chrome.alarms.onAlarm.addListener((alarm) => { if (alarm.name === CONTROL_ALARM) syncPermissionControls(); });

async function authFetch(url, options = {}, retry = true) {
  const response = await fetch(url, { ...options, credentials: 'include' });
  if (response.status === 401 && retry && !url.endsWith('/auth/refresh')) {
    const refresh = await fetch(`${API_BASE_URL}/auth/refresh`, { method: 'POST', credentials: 'include' });
    if (refresh.ok) return authFetch(url, options, false);
  }
  return response;
}

async function applyPermissionControl(control) {
  const contentType = PERMISSION_TYPES[control.permission];
  if (!contentType) throw new Error(`Unsupported permission: ${control.permission}`);
  const url = new URL(control.service);
  await chrome.contentSettings[contentType].set({ primaryPattern: `${url.origin}/*`, setting: control.state });
}

async function updateTrackedConsent(control) {
  const { consents = [] } = await chrome.storage.local.get('consents');
  const consent = consents.find((item) => item.service === control.service);
  if (!consent) return;
  const response = await authFetch(`${API_BASE_URL}/consent/update/${consent._id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ dataShared: [{ permission: control.permission, granted: control.state === 'allow' }] }),
  });
  if (!response.ok) throw new Error(`Consent update failed: ${response.status}`);
  const result = await response.json();
  const nextConsents = consents.map((item) => item._id === result.consent._id ? result.consent : item);
  await chrome.storage.local.set({ consents: nextConsents });
}

async function syncPermissionControls() {
  try {
    const response = await authFetch(`${API_BASE_URL}/permission-control/pending`);
    if (!response.ok) return;
    const controls = await response.json();
    if (!controls.length) return;
    const appliedIds = [];
    for (const control of controls) {
      try {
        await applyPermissionControl(control);
        await updateTrackedConsent(control);
        appliedIds.push(control._id);
      } catch (error) {
        console.warn('[ExtensPro] Could not apply permission control:', error);
      }
    }
    if (appliedIds.length) {
      await authFetch(`${API_BASE_URL}/permission-control/ack`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: appliedIds }),
      });
    }
  } catch (error) {
    console.warn('[ExtensPro] Permission control sync failed:', error);
  }
}

async function updateBadgeForTab(tabId, url) {
  try {
    if (!url || !url.startsWith('http')) return chrome.action.setBadgeText({ tabId, text: '' });
    const origin = new URL(url).origin;
    const data = await chrome.storage.local.get(`site:${origin}`);
    const perms = data[`site:${origin}`] || {};
    const grantedCount = Object.values(perms).filter((state) => state === 'granted').length;
    await chrome.action.setBadgeText({ tabId, text: grantedCount > 0 ? String(grantedCount) : '' });
    await chrome.action.setBadgeBackgroundColor({ tabId, color: '#4f46e5' });
  } catch {}
}
chrome.tabs.onActivated.addListener(async ({ tabId }) => { const tab = await chrome.tabs.get(tabId).catch(() => null); if (tab) updateBadgeForTab(tabId, tab.url); });
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => { if (changeInfo.status === 'complete') updateBadgeForTab(tabId, tab.url); });
chrome.storage.onChanged.addListener(async (changes, area) => {
  if (area !== 'local') return;
  const changedSiteKey = Object.keys(changes).find((k) => k.startsWith('site:'));
  if (!changedSiteKey) return;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.url && changedSiteKey === `site:${new URL(tab.url).origin}`) updateBadgeForTab(tab.id, tab.url);
});
