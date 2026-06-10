/**
 * TravelPanel App Icon Generator
 *
 * Requires: npm install sharp (or: npx npm install sharp)
 * Run: node scripts/generate-icons.js
 *
 * Reads app-store/icon-source.svg and outputs all required iOS
 * icon sizes to ios/App/App/Assets.xcassets/AppIcon.appiconset/
 */

const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const SOURCE = path.join(__dirname, '../app-store/icon-source.svg');
const DEST = path.join(
  __dirname,
  '../ios/App/App/Assets.xcassets/AppIcon.appiconset'
);

// iOS icon sizes (points × scale)
const SIZES = [
  // iPhone notification
  { size: 40,   name: 'icon-20@2x.png'   },  // 20pt @2x
  { size: 60,   name: 'icon-20@3x.png'   },  // 20pt @3x
  // iPhone settings
  { size: 58,   name: 'icon-29@2x.png'   },  // 29pt @2x
  { size: 87,   name: 'icon-29@3x.png'   },  // 29pt @3x
  // iPhone spotlight
  { size: 80,   name: 'icon-40@2x.png'   },  // 40pt @2x
  { size: 120,  name: 'icon-40@3x.png'   },  // 40pt @3x
  // iPhone app icon
  { size: 120,  name: 'icon-60@2x.png'   },  // 60pt @2x
  { size: 180,  name: 'icon-60@3x.png'   },  // 60pt @3x
  // iPad notification
  { size: 20,   name: 'icon-ipad-20@1x.png'  },
  { size: 40,   name: 'icon-ipad-20@2x.png'  },
  // iPad settings
  { size: 29,   name: 'icon-ipad-29@1x.png'  },
  { size: 58,   name: 'icon-ipad-29@2x.png'  },
  // iPad spotlight
  { size: 40,   name: 'icon-ipad-40@1x.png'  },
  { size: 80,   name: 'icon-ipad-40@2x.png'  },
  // iPad app icon
  { size: 76,   name: 'icon-ipad-76@1x.png'  },
  { size: 152,  name: 'icon-ipad-76@2x.png'  },
  // iPad Pro
  { size: 167,  name: 'icon-ipad-pro-83.5@2x.png' },
  // App Store (no alpha allowed)
  { size: 1024, name: 'AppIcon-512@2x.png', noAlpha: true },
];

async function main() {
  if (!fs.existsSync(SOURCE)) {
    console.error('Source SVG not found:', SOURCE);
    process.exit(1);
  }
  if (!fs.existsSync(DEST)) {
    fs.mkdirSync(DEST, { recursive: true });
  }

  for (const { size, name, noAlpha } of SIZES) {
    const outPath = path.join(DEST, name);
    let pipeline = sharp(SOURCE).resize(size, size);
    if (noAlpha) {
      // App Store icon must not have alpha channel
      pipeline = pipeline.flatten({ background: '#0284c7' });
    }
    await pipeline.png().toFile(outPath);
    console.log(`✓ ${name} (${size}x${size})`);
  }

  // Write updated Contents.json
  const contents = {
    images: [
      // Universal (modern single-icon approach, Xcode 13.2+)
      { filename: 'AppIcon-512@2x.png', idiom: 'universal', platform: 'ios', size: '1024x1024' },
      // iPhone
      { filename: 'icon-20@2x.png',  idiom: 'iphone', scale: '2x', size: '20x20'  },
      { filename: 'icon-20@3x.png',  idiom: 'iphone', scale: '3x', size: '20x20'  },
      { filename: 'icon-29@2x.png',  idiom: 'iphone', scale: '2x', size: '29x29'  },
      { filename: 'icon-29@3x.png',  idiom: 'iphone', scale: '3x', size: '29x29'  },
      { filename: 'icon-40@2x.png',  idiom: 'iphone', scale: '2x', size: '40x40'  },
      { filename: 'icon-40@3x.png',  idiom: 'iphone', scale: '3x', size: '40x40'  },
      { filename: 'icon-60@2x.png',  idiom: 'iphone', scale: '2x', size: '60x60'  },
      { filename: 'icon-60@3x.png',  idiom: 'iphone', scale: '3x', size: '60x60'  },
      // iPad
      { filename: 'icon-ipad-20@1x.png',       idiom: 'ipad', scale: '1x', size: '20x20'   },
      { filename: 'icon-ipad-20@2x.png',       idiom: 'ipad', scale: '2x', size: '20x20'   },
      { filename: 'icon-ipad-29@1x.png',       idiom: 'ipad', scale: '1x', size: '29x29'   },
      { filename: 'icon-ipad-29@2x.png',       idiom: 'ipad', scale: '2x', size: '29x29'   },
      { filename: 'icon-ipad-40@1x.png',       idiom: 'ipad', scale: '1x', size: '40x40'   },
      { filename: 'icon-ipad-40@2x.png',       idiom: 'ipad', scale: '2x', size: '40x40'   },
      { filename: 'icon-ipad-76@1x.png',       idiom: 'ipad', scale: '1x', size: '76x76'   },
      { filename: 'icon-ipad-76@2x.png',       idiom: 'ipad', scale: '2x', size: '76x76'   },
      { filename: 'icon-ipad-pro-83.5@2x.png', idiom: 'ipad', scale: '2x', size: '83.5x83.5' },
    ],
    info: { author: 'xcode', version: 1 },
  };

  fs.writeFileSync(
    path.join(DEST, 'Contents.json'),
    JSON.stringify(contents, null, 2)
  );
  console.log('\n✓ Contents.json updated');
  console.log('\nDone! Run `npx cap sync ios` to apply to the Xcode project.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
