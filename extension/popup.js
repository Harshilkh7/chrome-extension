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
    if (!tab?.url || !tab.url.startsWith('http')) return;
    const origin = new URL(tab.url).origin;
    const data = await chrome.storage.local.get(`site:${origin}`);
    const perms = data[`site:${origin}`] || {};
    const granted = Object.entries(perms).filter(([, s]) => s === 'granted').map(([p]) => p);
    siteStatus.textContent = granted.length ? `${origin}: ${granted.join(', ')}` : `${origin}: no permissions tracked yet`;
  }

  async function checkAuth() {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/me`, { credentials: 'include' });
      if (response.ok) {
        enterMonitoringUI();
        renderCurrentSiteStatus();
        return true;
      }
      if (response.status === 401) {
        const refresh = await fetch(`${API_BASE_URL}/auth/refresh`, { method: 'POST', credentials: 'include' });
        if (refresh.ok) {
          enterMonitoringUI();
          renderCurrentSiteStatus();
          return true;
        }
      }
    } catch (error) {
      console.warn('Auth check failed:', error);
    }
    enterLoginUI();
    return false;
  }

  chrome.storage.local.get(['monitoringEnabled'], ({ monitoringEnabled }) => {
    renderMonitoringState(monitoringEnabled !== false);
  });
  checkAuth();

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();
    if (!email || !password) return showToast('Enter your email and password');

    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (response.ok) {
        await chrome.storage.local.set({ consents: null });
        showToast(`Welcome, ${data.user.username}`);
        enterMonitoringUI();
        renderCurrentSiteStatus();
      } else showToast(data.error || 'Login failed');
    } catch (err) {
      console.error('Login error:', err);
      showToast('Could not reach the server');
    }
    loginForm.reset();
  });

  logoutBtn.addEventListener('click', async () => {
    try {
      await fetch(`${API_BASE_URL}/auth/logout`, { method: 'POST', credentials: 'include' });
    } catch (error) {
      console.warn('Logout request failed:', error);
    }
    await chrome.storage.local.remove(['consents']);
    showToast('Logged out');
    enterLoginUI();
  });

  monitorBtn.addEventListener('click', async () => {
    const { monitoringEnabled } = await chrome.storage.local.get('monitoringEnabled');
    const next = !(monitoringEnabled !== false);
    await chrome.storage.local.set({ monitoringEnabled: next });
    renderMonitoringState(next);
    showToast(next ? 'Monitoring turned on' : 'Monitoring turned off');
  });

  registerLink.addEventListener('click', () => chrome.tabs.create({ url: `${DASHBOARD_URL}/register` }));
  dashboardBtn.addEventListener('click', () => chrome.tabs.create({ url: `${DASHBOARD_URL}/dashboard` }));
});
