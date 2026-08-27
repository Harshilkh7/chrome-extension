document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('login-form');
  const loginSection = document.getElementById('login-section');
  const statusSection = document.getElementById('status-section');
  const logoutBtn = document.getElementById('logout-btn');
  const monitorBtn = document.getElementById('monitor-btn');
  const monitoringText = document.getElementById('monitoring-text');
  const siteStatus = document.getElementById('site-status');
  const dashboardBtn = document.getElementById('dashboard-btn');
  const registerLink = document.getElementById('register-link');
  const toast = document.getElementById('toast');

  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2000);
  }

  function enterMonitoringUI() {
    loginSection.style.display = 'none';
    statusSection.style.display = 'flex';
    logoutBtn.style.display = 'inline-block';
  }

  function enterLoginUI() {
    statusSection.style.display = 'none';
    loginSection.style.display = 'flex';
    logoutBtn.style.display = 'none';
  }

  function renderMonitoringState(enabled) {
    monitorBtn.textContent = enabled ? 'Turn Off Monitoring' : 'Turn On Monitoring';
    monitorBtn.className = enabled ? 'on' : 'off';
    monitoringText.textContent = enabled ? 'Monitoring is on' : 'Monitoring is off';
  }

  async function renderCurrentSiteStatus() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.url || !tab.url.startsWith('http')) {
      siteStatus.textContent = '';
      return;
    }
    const origin = new URL(tab.url).origin;
    const data = await chrome.storage.local.get(`site:${origin}`);
    const perms = data[`site:${origin}`] || {};
    const granted = Object.entries(perms).filter(([, s]) => s === 'granted').map(([p]) => p);
    siteStatus.textContent = granted.length
      ? `${origin}: ${granted.join(', ')}`
      : `${origin}: no permissions tracked yet`;
  }

  // --- Auth state on load ---
  chrome.storage.local.get(['authToken', 'monitoringEnabled'], ({ authToken, monitoringEnabled }) => {
    renderMonitoringState(monitoringEnabled !== false);
    if (authToken) {
      enterMonitoringUI();
      renderCurrentSiteStatus();
    }
  });

  // --- Login ---
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();

    if (!email || !password) {
      showToast('Enter your email and password');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();

      if (response.ok && data.token) {
        await chrome.storage.local.set({ authToken: data.token, consents: null });
        showToast(`Welcome, ${data.user.username}`);
        enterMonitoringUI();
        renderCurrentSiteStatus();
      } else {
        showToast(data.error || 'Login failed');
      }
    } catch (err) {
      console.error('Login error:', err);
      showToast('Could not reach the server');
    }

    loginForm.reset();
  });

  // --- Logout ---
  logoutBtn.addEventListener('click', async () => {
    await chrome.storage.local.remove(['authToken', 'consents']);
    showToast('Logged out');
    enterLoginUI();
  });

  // --- Monitoring toggle ---
  monitorBtn.addEventListener('click', async () => {
    const { monitoringEnabled } = await chrome.storage.local.get('monitoringEnabled');
    const next = !(monitoringEnabled !== false);
    await chrome.storage.local.set({ monitoringEnabled: next });
    renderMonitoringState(next);
    showToast(next ? 'Monitoring turned on' : 'Monitoring turned off');
  });

  // --- Links ---
  registerLink.addEventListener('click', () => {
    chrome.tabs.create({ url: `${DASHBOARD_URL}/register` });
  });

  dashboardBtn.addEventListener('click', () => {
    chrome.tabs.create({ url: `${DASHBOARD_URL}/dashboard` });
  });
});
