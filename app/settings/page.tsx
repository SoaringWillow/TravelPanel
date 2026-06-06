'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Download, Upload, Trash2, Globe2, CheckCircle2, AlertCircle, Info, ChevronRight, Shield, FileText } from 'lucide-react';
import NavBar from '@/components/NavBar';
import { getAllItems, getAllBoards, saveItem, saveBoard } from '@/lib/db';
import { SavedItem, Board } from '@/lib/types';

// ─── Backup format ────────────────────────────────────────────────────────────

interface BackupFile {
  version: 1;
  exportedAt: string;
  app: 'TravelPanel';
  items: SavedItem[];
  boards: Board[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function exportData(): Promise<void> {
  const [items, boards] = await Promise.all([getAllItems(), getAllBoards()]);

  const backup: BackupFile = {
    version: 1,
    exportedAt: new Date().toISOString(),
    app: 'TravelPanel',
    items,
    boards,
  };

  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `travelpanel-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

async function importData(file: File): Promise<{ items: number; boards: number }> {
  const text = await file.text();
  const data: BackupFile = JSON.parse(text);

  if (data.app !== 'TravelPanel' || data.version !== 1) {
    throw new Error('Not a valid TravelPanel backup file.');
  }

  const items  = Array.isArray(data.items)  ? data.items  : [];
  const boards = Array.isArray(data.boards) ? data.boards : [];

  await Promise.all([
    ...items.map((item) => saveItem(item)),
    ...boards.map((board) => saveBoard(board)),
  ]);

  return { items: items.length, boards: boards.length };
}

// ─── Component ────────────────────────────────────────────────────────────────

type ActionState = 'idle' | 'busy' | 'success' | 'error';

export default function SettingsPage() {
  const router = useRouter();
  const [exportState, setExportState]       = useState<ActionState>('idle');
  const [importState, setImportState]       = useState<ActionState>('idle');
  const [importMessage, setImportMessage]   = useState('');
  const [exportMessage, setExportMessage]   = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleExport() {
    setExportState('busy');
    setExportMessage('');
    try {
      await exportData();
      setExportState('success');
      setExportMessage('Backup downloaded.');
    } catch (err) {
      setExportState('error');
      setExportMessage(err instanceof Error ? err.message : 'Export failed.');
    }
  }

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportState('busy');
    setImportMessage('');
    try {
      const { items, boards } = await importData(file);
      setImportState('success');
      setImportMessage(`Imported ${items} clip${items !== 1 ? 's' : ''} and ${boards} board${boards !== 1 ? 's' : ''}.`);
    } catch (err) {
      setImportState('error');
      setImportMessage(err instanceof Error ? err.message : 'Import failed — make sure this is a valid TravelPanel backup.');
    } finally {
      // Reset file input so the same file can be re-imported if needed
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 pt-14 pb-4 sticky top-0 z-10">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage your data and preferences</p>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-5">

        {/* ── About ── */}
        <Section title="About">
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center flex-shrink-0">
              <Globe2 size={20} className="text-white" />
            </div>
            <div>
              <p className="font-semibold text-gray-900 text-sm">TravelPanel</p>
              <p className="text-xs text-gray-500">Travel inspiration clipper · v0.1</p>
            </div>
          </div>
        </Section>

        {/* ── Data Backup ── */}
        <Section title="Data Backup">
          <div className="divide-y divide-gray-100">

            {/* Export */}
            <div className="px-4 py-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-gray-800">Export my data</p>
                  <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                    Download all your clips, boards, and substance as a single JSON file.
                    Keep this as a backup — data is stored only on this device.
                  </p>
                </div>
                <button
                  onClick={handleExport}
                  disabled={exportState === 'busy'}
                  className="flex-shrink-0 flex items-center gap-1.5 bg-indigo-600 text-white text-xs font-semibold px-3 py-2 rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                >
                  <Download size={14} />
                  {exportState === 'busy' ? 'Exporting…' : 'Export'}
                </button>
              </div>
              {exportMessage && (
                <StatusRow state={exportState} message={exportMessage} />
              )}
            </div>

            {/* Import */}
            <div className="px-4 py-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-gray-800">Restore from backup</p>
                  <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                    Import a TravelPanel backup file. Existing clips with the same ID
                    will be overwritten. New clips are added.
                  </p>
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={importState === 'busy'}
                  className="flex-shrink-0 flex items-center gap-1.5 bg-gray-100 text-gray-700 text-xs font-semibold px-3 py-2 rounded-xl hover:bg-gray-200 disabled:opacity-50 transition-colors"
                >
                  <Upload size={14} />
                  {importState === 'busy' ? 'Importing…' : 'Import'}
                </button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleImportFile}
                className="hidden"
                aria-label="Select backup file"
              />
              {importMessage && (
                <StatusRow state={importState} message={importMessage} />
              )}
            </div>

          </div>
        </Section>

        {/* ── Backup notice ── */}
        <div className="flex gap-2.5 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3">
          <Info size={15} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700 leading-relaxed">
            <strong>Your data lives on this device.</strong> If you clear your browser data or switch devices,
            you will lose your clips. Export regularly until cloud sync is available.
          </p>
        </div>

        {/* ── Cloud Sync (coming soon) ── */}
        <Section title="Cloud Sync">
          <div className="px-4 py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-800">Sync across devices</p>
                <p className="text-xs text-gray-500 mt-0.5">Sign in to sync your clips automatically</p>
              </div>
              <span className="text-xs bg-gray-100 text-gray-500 px-2.5 py-1 rounded-full font-medium">
                Coming soon
              </span>
            </div>
          </div>
        </Section>

        {/* ── Privacy ── */}
        <Section title="Privacy">
          <div className="px-4 py-4 space-y-3">
            <Row label="Analytics" value="Opt-in, anonymous usage only" />
            <Row label="AI processing" value="URLs sent to Anthropic Claude for extraction" />
            <Row label="Data storage" value="On-device (IndexedDB) — never uploaded" />
          </div>
        </Section>

        {/* ── Legal ── */}
        <Section title="Legal">
          <div className="divide-y divide-gray-100">
            <button
              type="button"
              onClick={() => router.push('/privacy')}
              className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-gray-50 transition-colors"
            >
              <Shield size={16} className="text-indigo-500 flex-shrink-0" />
              <span className="flex-1 text-sm text-gray-800 font-medium">Privacy Policy</span>
              <ChevronRight size={16} className="text-gray-400" />
            </button>
            <button
              type="button"
              onClick={() => router.push('/terms')}
              className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-gray-50 transition-colors"
            >
              <FileText size={16} className="text-indigo-500 flex-shrink-0" />
              <span className="flex-1 text-sm text-gray-800 font-medium">Terms of Use</span>
              <ChevronRight size={16} className="text-gray-400" />
            </button>
          </div>
        </Section>

      </div>

      <NavBar active="settings" />
    </main>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-1 mb-2">
        {title}
      </p>
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
        {children}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-sm text-gray-600">{label}</span>
      <span className="text-xs text-gray-400 text-right max-w-[55%]">{value}</span>
    </div>
  );
}

function StatusRow({ state, message }: { state: ActionState; message: string }) {
  const isSuccess = state === 'success';
  return (
    <div className={`flex items-center gap-1.5 mt-2 text-xs ${isSuccess ? 'text-green-600' : 'text-red-500'}`}>
      {isSuccess
        ? <CheckCircle2 size={13} />
        : <AlertCircle size={13} />
      }
      {message}
    </div>
  );
}
