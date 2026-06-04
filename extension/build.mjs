import { build } from 'esbuild';

const shared = {
  bundle: true,
  target: 'chrome100',
  minify: false,
};

await Promise.all([
  // Popup: IIFE so it works as a plain <script src="popup.js">
  build({
    ...shared,
    entryPoints: ['src/popup.ts'],
    outfile: 'popup.js',
    format: 'iife',
  }),
  // Background service worker: must be ESM
  build({
    ...shared,
    entryPoints: ['src/background.ts'],
    outfile: 'background.js',
    format: 'esm',
  }),
  // Options page: IIFE
  build({
    ...shared,
    entryPoints: ['src/options.ts'],
    outfile: 'options.js',
    format: 'iife',
  }),
]);

console.log('Build complete — load the extension/ directory as an unpacked extension.');
