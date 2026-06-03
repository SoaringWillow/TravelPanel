// Blocking inline script — prevents FOUT (flash of wrong theme) on first paint.
// Runs before React hydration by injecting directly into <head>.
export function ThemeScript() {
  const script = `
(function(){
  try {
    var t = localStorage.getItem('travelpanel_theme') || 'system';
    var dark = t === 'dark' || (t === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (dark) document.documentElement.classList.add('dark');
  } catch(e) {}
})();
`.trim();

  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
