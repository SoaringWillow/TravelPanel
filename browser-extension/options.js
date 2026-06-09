// TravelPanel Clipper — options page logic

const $ = id => document.getElementById(id);

function loadSettings() {
  chrome.storage.sync.get({
    appUrl: '',
    openInNewTab: true,
    autoClose: true,
    travelCheck: true,
  }, settings => {
    $('app-url').value        = settings.appUrl;
    $('toggle-new-tab').checked    = settings.openInNewTab;
    $('toggle-auto-close').checked = settings.autoClose;
    $('toggle-travel-check').checked = settings.travelCheck;
  });
}

function saveSettings() {
  const appUrl = $('app-url').value.trim().replace(/\/$/, '');

  // Basic URL validation
  if (appUrl && !appUrl.match(/^https?:\/\/.+/)) {
    $('app-url').style.borderColor = '#EF4444';
    $('app-url').focus();
    return;
  }
  $('app-url').style.borderColor = '';

  const settings = {
    appUrl,
    openInNewTab:  $('toggle-new-tab').checked,
    autoClose:     $('toggle-auto-close').checked,
    travelCheck:   $('toggle-travel-check').checked,
  };

  chrome.storage.sync.set(settings, () => {
    const feedback = $('save-feedback');
    feedback.classList.add('visible');
    setTimeout(() => feedback.classList.remove('visible'), 2200);
  });
}

$('btn-save').addEventListener('click', saveSettings);

$('app-url').addEventListener('keydown', e => {
  if (e.key === 'Enter') saveSettings();
});

loadSettings();
