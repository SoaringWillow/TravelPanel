const PLATFORMS = [
  { name: 'Instagram',   color: '#E1306C' },
  { name: 'YouTube',     color: '#FF0000' },
  { name: 'Xiaohongshu', color: '#FF2442' },
  { name: 'TikTok',      color: '#010101' },
  { name: 'Douyin',      color: '#010101' },
  { name: 'Bilibili',    color: '#00A1D6' },
  { name: 'Weibo',       color: '#E6162D' },
  { name: 'WeChat',      color: '#07C160' },
  { name: 'Twitter/X',   color: '#1DA1F2' },
  { name: 'Google Maps', color: '#4285F4' },
  { name: 'TripAdvisor', color: '#34E0A1' },
  { name: 'Airbnb',      color: '#FF5A5F' },
  { name: 'Any URL',     color: '#0284c7' },
];

document.addEventListener('DOMContentLoaded', async () => {
  // ── Load saved URL ──
  const { baseUrl = '' } = await chrome.storage.sync.get(['baseUrl']);
  document.getElementById('base-url').value = baseUrl;

  // ── Populate platforms ──
  const grid = document.getElementById('platforms-grid');
  PLATFORMS.forEach(({ name, color }) => {
    const pill = document.createElement('span');
    pill.className = 'platform-pill';
    pill.textContent = name;
    pill.style.color = color;
    pill.style.backgroundColor = color + '18';
    pill.style.borderColor = color + '40';
    grid.appendChild(pill);
  });

  // ── Save ──
  document.getElementById('save-btn').addEventListener('click', async () => {
    const input  = document.getElementById('base-url');
    const status = document.getElementById('status-msg');
    const value  = input.value.trim();

    if (value && !value.startsWith('http')) {
      status.textContent = 'URL must start with https://';
      status.className   = 'status-msg visible error';
      return;
    }

    await chrome.storage.sync.set({ baseUrl: value });

    status.textContent = value ? '✓ Saved' : '✓ Cleared';
    status.className   = 'status-msg visible success';
    setTimeout(() => (status.className = 'status-msg'), 2000);
  });

  // ── Save on Enter ──
  document.getElementById('base-url').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('save-btn').click();
  });
});
