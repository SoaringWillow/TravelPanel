#!/bin/bash
# TravelPanel iOS Build Script
# Syncs the Next.js build to Capacitor and opens Xcode for archiving.
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$SCRIPT_DIR/.."

echo "🏗  Building Next.js..."
cd "$ROOT"
npm run build

echo "📱 Syncing Capacitor..."
npx cap sync ios

echo ""
echo "✅ Sync complete. Opening Xcode..."
echo ""
echo "To create a TestFlight build:"
echo "  1. In Xcode: Product → Archive"
echo "  2. Window → Organizer → Distribute App → App Store Connect → Upload"
echo "  3. In App Store Connect: TestFlight → select build → add testers"
echo ""
npx cap open ios
