'use client';

import { useState, useEffect } from 'react';
import NavBar from '@/components/NavBar';
import {
  Download,
  MapPin,
  LayoutGrid,
  Map,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { exportAllData, getDataStats } from '@/lib/exportData';
import { track } from '@/lib/analytics';

interface Stats {
  items: number;
  boards: number;
  trips: number;
}

export default function SettingsPage() {
  const [stats, setStats]         = useState<Stats | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exported, setExported]   = useState(false);
  const [exportError, setExportError] = useState(false);

  useEffect(() => {
    getDataStats().then(setStats).catch(() => setStats({ items: 0, boards: 0, trips: 0 }));
  }, []);

  async function handleExport() {
    setExporting(true);
    setExported(false);
    setExportError(false);
    try {
      await exportAllData();
      setExported(true);
      track('data_exported', stats ?? {});
      setTimeout(() => setExported(false), 4000);
    } catch {
      setExportError(true);
      setTimeout(() => setExportError(false), 4000);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* ── Header ── */}
      <div
        className="bg-gradient-to-br from-indigo-600 to-indigo-500 px-5 pt-14 pb-8 text-white"
        style={{ paddingTop: 'max(3.5rem, env(safe-area-inset-top) + 1rem)' }}
      >
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center">
            <MapPin size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">TravelPanel</h1>
            <p className="text-indigo-200 text-xs">Your travel inspiration, organized</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-5 space-y-5">

        {/* ── Stats ── */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: MapPin,      label: 'Clips',       value: stats?.items   },
            { icon: LayoutGrid,  label: 'Collections', value: stats?.boards  },
            { icon: Map,         label: 'Plans',       value: stats?.trips   },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="bg-white rounded-2xl p-3.5 text-center border border-gray-100">
              <Icon size={18} className="text-indigo-400 mx-auto mb-1.5" />
              <div className="text-2xl font-bold text-gray-900 leading-none">
                {value ?? <span className="text-gray-200 animate-pulse">–</span>}
              </div>
              <div className="text-xs text-gray-400 mt-0.5">{label}</div>
            </div>
          ))}
        </div>

        {/* ── Data & Backup ── */}
        <Section title="Data & Backup">
          <SettingRow
            icon={<Download size={18} className="text-indigo-500" />}
            title="Export all my data"
            description="Download a JSON backup of all clips, boards, and plans."
            action={
              <button
                type="button"
                onClick={handleExport}
                disabled={exporting}
                className={`flex-shrink-0 flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl transition-all ${
                  exported
                    ? 'bg-green-100 text-green-700'
                    : exportError
                    ? 'bg-red-100 text-red-700'
                    : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200 active:scale-95'
                } disabled:opacity-60`}
              >
                {exported ? (
                  <>
                    <CheckCircle2 size={14} /> Saved!
                  </>
                ) : exportError ? (
                  <>
                    <AlertCircle size={14} /> Failed
                  </>
                ) : exporting ? (
                  <span className="animate-pulse">Preparing…</span>
                ) : (
                  <>
                    <Download size={14} /> Export
                  </>
                )}
              </button>
            }
          />
        </Section>

        {/* ── Cloud Sync (coming soon) ── */}
        <Section title="Cloud Sync">
          <div className="px-4 py-3.5 flex items-center gap-3">
            <div className="w-8 h-8 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <span className="text-base">☁️</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-900">Sign in with Google</div>
              <div className="text-xs text-gray-400 mt-0.5">Coming soon — sync across all your devices</div>
            </div>
            <span className="flex-shrink-0 text-xs bg-indigo-50 text-indigo-600 font-semibold px-2 py-0.5 rounded-full">
              Soon
            </span>
          </div>
        </Section>

        {/* ── Capture ── */}
        <Section title="Capture">
          <SettingLinkRow
            icon={<span className="text-base">🧩</span>}
            title="Browser Extension"
            description="Clip from Chrome or Safari with one click."
            href="https://github.com/soaringwillow/travelpanel/tree/main/browser-extension"
          />
          <div className="border-t border-gray-50 mx-4" />
          <SettingRow
            icon={<span className="text-base">📱</span>}
            title="iOS Share Sheet"
            description="Use the native Share button in any app to clip directly to TravelPanel."
          />
        </Section>

        {/* ── About ── */}
        <Section title="About">
          <div className="px-4 py-3 space-y-2">
            {[
              { label: 'Version',  value: '1.0.0' },
              { label: 'Model',    value: 'Claude claude-sonnet-4-6' },
              { label: 'Storage',  value: 'Local (IndexedDB)' },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between text-sm">
                <span className="text-gray-500">{label}</span>
                <span className="text-gray-800 font-medium">{value}</span>
              </div>
            ))}
          </div>
        </Section>

        <p className="text-center text-xs text-gray-300 pb-2">
          Your data never leaves your device until you choose to sync.
        </p>
      </div>

      <NavBar active="settings" />
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-1 mb-2">
        {title}
      </h2>
      <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 divide-y divide-gray-50">
        {children}
      </div>
    </div>
  );
}

function SettingRow({
  icon,
  title,
  description,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="px-4 py-3.5 flex items-center gap-3">
      <div className="w-8 h-8 bg-gray-50 rounded-xl flex items-center justify-center flex-shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-gray-900">{title}</div>
        {description && <div className="text-xs text-gray-400 mt-0.5 leading-snug">{description}</div>}
      </div>
      {action}
    </div>
  );
}

function SettingLinkRow({
  icon,
  title,
  description,
  href,
}: {
  icon: React.ReactNode;
  title: string;
  description?: string;
  href: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="px-4 py-3.5 flex items-center gap-3 hover:bg-gray-50 active:bg-gray-100 transition-colors"
    >
      <div className="w-8 h-8 bg-gray-50 rounded-xl flex items-center justify-center flex-shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-gray-900">{title}</div>
        {description && <div className="text-xs text-gray-400 mt-0.5 leading-snug">{description}</div>}
      </div>
      <ChevronRight size={16} className="text-gray-300 flex-shrink-0" />
    </a>
  );
}
