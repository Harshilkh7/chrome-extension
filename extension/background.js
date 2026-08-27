// background.js (service worker)
//
// Deliberately small: all real permission detection happens in
// injected.js/content.js, which run in page context and see real API
// calls. This file just sets sensible defaults and keeps the toolbar
// badge showing how many permissions are tracked for the active tab.

importScripts('config.js');

chrome.runtime.onInstalled.addListener(async () => {
  const existing = await chrome.storage.local.get('monitoringEnabled');
  if (existing.monitoringEnabled === undefined) {
    await chrome.storage.local.set({ monitoringEnabled: true });
  }
});

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

// Let content scripts nudge the badge to refresh immediately after they
// record a new permission, instead of waiting for the next navigation.
chrome.storage.onChanged.addListener(async (changes, area) => {
  if (area !== 'local') return;
  const changedSiteKey = Object.keys(changes).find((k) => k.startsWith('site:'));
  if (!changedSiteKey) return;

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.url && changedSiteKey === `site:${new URL(tab.url).origin}`) {
    updateBadgeForTab(tab.id, tab.url);
  }
});
