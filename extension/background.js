// background.js (service worker)
//
// The service worker applies permission decisions made in the dashboard
// through Chrome's contentSettings API. The dashboard writes the desired
// state to the backend; this worker polls for pending controls and applies
// them locally in Chrome.

importScripts('config.js');

const CONTROL_ALARM = 'permission-control-sync';
const PERMISSION_TYPES = {
  camera: 'camera',
  microphone: 'microphone',
  location: 'location',
  notifications: 'notifications',
  clipboard: 'clipboard',
  automaticDownloads: 'automaticDownloads',
};

chrome.runtime.onInstalled.addListener(async () => {
  const existing = await chrome.storage.local.get('monitoringEnabled');
  if (existing.monitoringEnabled === undefined) {
    await chrome.storage.local.set({ monitoringEnabled: true });
  }

  await chrome.alarms.create(CONTROL_ALARM, {
    delayInMinutes: 0.1,
    periodInMinutes: 0.5,
  });

  syncPermissionControls();
});

chrome.runtime.onStartup.addListener(() => {
  syncPermissionControls();
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === CONTROL_ALARM) {
    syncPermissionControls();
  }
});

async function getAuthToken() {
  const { authToken } = await chrome.storage.local.get('authToken');
  return authToken || null;
}

async function applyPermissionControl(control) {
  const contentType = PERMISSION_TYPES[control.permission];
  if (!contentType) throw new Error(`Unsupported permission: ${control.permission}`);

  const url = new URL(control.service);
  const primaryPattern = `${url.origin}/*`;

  await chrome.contentSettings[contentType].set({
    primaryPattern,
    setting: control.state,
  });
}

async function updateTrackedConsent(control, token) {
  const { consents = [] } = await chrome.storage.local.get('consents');
  const consent = consents.find((item) => item.service === control.service);

  if (!consent) return;

  const updatedPermissions = (consent.dataShared || []).map((entry) =>
    entry.permission === control.permission
      ? { ...entry, granted: control.state === 'allow' }
      : entry
  );

  const response = await fetch(`${API_BASE_URL}/consent/update/${consent._id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      dataShared: [
        {
          permission: control.permission,
          granted: control.state === 'allow',
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Consent update failed: ${response.status}`);
  }

  const result = await response.json();
  const updatedConsent = result.consent;
  const nextConsents = consents.map((item) =>
    item._id === updatedConsent._id ? updatedConsent : item
  );
  await chrome.storage.local.set({ consents: nextConsents });
}

async function syncPermissionControls() {
  const token = await getAuthToken();
  if (!token) return;

  try {
    const response = await fetch(`${API_BASE_URL}/permission-control/pending`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) return;

    const controls = await response.json();
    if (!controls.length) return;

    const appliedIds = [];

    for (const control of controls) {
      try {
        await applyPermissionControl(control);
        await updateTrackedConsent(control, token);
        appliedIds.push(control._id);
      } catch (error) {
        console.warn('[ExtensPro] Could not apply permission control:', error);
      }
    }

    if (appliedIds.length) {
      await fetch(`${API_BASE_URL}/permission-control/ack`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ids: appliedIds }),
      });
    }
  } catch (error) {
    console.warn('[ExtensPro] Permission control sync failed:', error);
  }
}

async function updateBadgeForTab(tabId, url) {
  try {
    if (!url || !url.startsWith('http')) {
      await chrome.action.setBadgeText({ tabId, text: '' });
      return;
    }
    const origin = new URL(url).origin;
    const siteKey = `site:${origin}`;
    const data = await chrome.storage.local.get(siteKey);
    const perms = data[siteKey] || {};
    const grantedCount = Object.values(perms).filter((state) => state === 'granted').length;

    await chrome.action.setBadgeText({ tabId, text: grantedCount > 0 ? String(grantedCount) : '' });
    await chrome.action.setBadgeBackgroundColor({ tabId, color: '#4f46e5' });
  } catch {
    // Not a real page (chrome://, extension page, etc.) — ignore.
  }
}

chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  const tab = await chrome.tabs.get(tabId).catch(() => null);
  if (tab) updateBadgeForTab(tabId, tab.url);
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    updateBadgeForTab(tabId, tab.url);
  }
});

chrome.storage.onChanged.addListener(async (changes, area) => {
  if (area !== 'local') return;
  const changedSiteKey = Object.keys(changes).find((k) => k.startsWith('site:'));
  if (!changedSiteKey) return;

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.url && changedSiteKey === `site:${new URL(tab.url).origin}`) {
    updateBadgeForTab(tab.id, tab.url);
  }
});
