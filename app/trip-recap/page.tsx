'use client';

import { useEffect, useRef, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Share2, Download, ArrowLeft } from 'lucide-react';
import { RecapData, RECAP_STORAGE_KEY } from '@/lib/generateRecap';
import SafeImage from '@/components/SafeImage';

type ExportFormat = 'stories' | 'square';

export default function TripRecapPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const boardId = searchParams.get('boardId') ?? '';
  const cardRef = useRef<HTMLDivElement>(null);

  const [recap, setRecap] = useState<RecapData | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!boardId) return;
    const raw = localStorage.getItem(RECAP_STORAGE_KEY(boardId));
    if (raw) setRecap(JSON.parse(raw) as RecapData);
  }, [boardId]);

  useEffect(() => {
    if (!recap?.shareUrl) return;
    import('qrcode').then(({ default: QRCode }) => {
      QRCode.toDataURL(recap.shareUrl, { width: 120, margin: 1, color: { dark: '#312e81', light: '#f5f3ff' } })
        .then(setQrDataUrl)
        .catch(() => {});
    });
  }, [recap?.shareUrl]);

  async function handleExport(format: ExportFormat) {
    if (!cardRef.current || exporting) return;
    setExporting(true);
    try {
      const { default: html2canvas } = await import('html2canvas');
      const w = format === 'stories' ? 1080 : 1080;
      const h = format === 'stories' ? 1920 : 1080;
      const canvas = await html2canvas(cardRef.current, {
        width: w,
        height: h,
        scale: 2,
        useCORS: true,
        backgroundColor: null,
      });
      const blob = await new Promise<Blob>((resolve) =>
        canvas.toBlob((b) => resolve(b!), 'image/png')
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${recap?.boardName ?? 'trip'}-recap-${format}.png`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  async function handleShare() {
    if (!cardRef.current) return;
    setExporting(true);
    try {
      const { default: html2canvas } = await import('html2canvas');
      const canvas = await html2canvas(cardRef.current, { scale: 2, useCORS: true, backgroundColor: null });
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        try {
          await navigator.share({ files: [new File([blob], 'trip-recap.png', { type: 'image/png' })] });
        } catch {
          // User cancelled
        }
      }, 'image/png');
    } finally {
      setExporting(false);
    }
  }

  if (!recap) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-50 gap-4">
        <p className="text-gray-500 text-sm">Recap not found.</p>
        <button onClick={() => router.back()} className="text-indigo-600 text-sm font-medium">Go back</button>
      </div>
    );
  }

  const gradients = [
    'from-indigo-600 via-purple-600 to-pink-500',
    'from-sky-500 via-indigo-600 to-violet-700',
    'from-emerald-500 via-teal-600 to-indigo-700',
    'from-orange-500 via-pink-500 to-purple-600',
  ];
  const gradient = gradients[recap.boardName.charCodeAt(0) % gradients.length];

  return (
    <div className="flex flex-col h-screen bg-gray-100 overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200" style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}>
        <button onClick={() => router.back()} className="flex items-center gap-1 text-gray-500 text-sm">
          <ArrowLeft size={16} />Back
        </button>
        <h2 className="font-bold text-gray-800 text-sm">Trip Recap</h2>
        <div className="flex items-center gap-2">
          {typeof navigator !== 'undefined' && 'share' in navigator && (
            <button
              onClick={handleShare}
              disabled={exporting}
              className="flex items-center gap-1 text-xs font-semibold text-indigo-600 px-3 py-1.5 border border-indigo-200 rounded-full"
            >
              <Share2 size={13} />Share
            </button>
          )}
          <button
            onClick={() => handleExport('stories')}
            disabled={exporting}
            className="flex items-center gap-1 text-xs font-semibold text-white bg-indigo-600 px-3 py-1.5 rounded-full"
          >
            <Download size={13} />{exporting ? '…' : 'Save'}
          </button>
        </div>
      </div>

      {/* Scrollable preview area */}
      <div className="flex-1 overflow-y-auto flex flex-col items-center px-4 py-6 gap-4">

        {/* Card — this is what gets screenshotted */}
        <div
          ref={cardRef}
          className={`w-full max-w-sm bg-gradient-to-br ${gradient} rounded-3xl overflow-hidden shadow-2xl`}
          style={{ aspectRatio: '9/16', minHeight: 480 }}
        >
          {/* Top section — hero */}
          <div className="flex flex-col items-center justify-center px-6 pt-10 pb-6 text-center">
            <div className="text-6xl mb-3">{recap.boardEmoji}</div>
            <h1 className="text-2xl font-black text-white leading-tight">{recap.boardName}</h1>
            <p className="text-white/80 text-sm mt-1 font-medium">
              {recap.locationCount} places · {recap.days} day{recap.days !== 1 ? 's' : ''}
            </p>
          </div>

          {/* Photo grid */}
          {recap.thumbnails.length > 0 && (
            <div className="px-4 pb-4">
              <div className="grid grid-cols-3 gap-1.5 rounded-2xl overflow-hidden">
                {recap.thumbnails.slice(0, 6).map((url, i) => (
                  <div key={i} className="aspect-square bg-white/10 overflow-hidden">
                    <SafeImage src={url} alt="" className="w-full h-full object-cover" loading="eager" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pull quotes */}
          {recap.pullQuotes.length > 0 && (
            <div className="px-4 pb-4 space-y-2">
              {recap.pullQuotes.map((q, i) => (
                <div key={i} className="bg-white/15 backdrop-blur-sm rounded-2xl px-3 py-2.5">
                  <p className="text-white text-xs leading-relaxed">"{q.content}"</p>
                  <p className="text-white/60 text-[10px] mt-1 font-medium">— {q.source}</p>
                </div>
              ))}
            </div>
          )}

          {/* Footer */}
          <div className="mt-auto px-4 pb-6 pt-2 flex items-end justify-between">
            <div>
              <p className="text-white/50 text-[10px] font-medium uppercase tracking-widest">Planned with</p>
              <p className="text-white font-black text-sm">TravelPanel ✈️</p>
            </div>
            {qrDataUrl && (
              <div className="bg-white rounded-xl p-1.5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrDataUrl} alt="QR code" width={52} height={52} />
              </div>
            )}
          </div>
        </div>

        {/* Export format buttons */}
        <div className="flex gap-3 w-full max-w-sm">
          <button
            onClick={() => handleExport('stories')}
            disabled={exporting}
            className="flex-1 flex flex-col items-center gap-1 border-2 border-indigo-200 bg-white rounded-2xl py-3 text-xs font-semibold text-indigo-700 hover:bg-indigo-50 transition-colors disabled:opacity-50"
          >
            <span className="text-lg">📱</span>
            Stories (9:16)
          </button>
          <button
            onClick={() => handleExport('square')}
            disabled={exporting}
            className="flex-1 flex flex-col items-center gap-1 border-2 border-indigo-200 bg-white rounded-2xl py-3 text-xs font-semibold text-indigo-700 hover:bg-indigo-50 transition-colors disabled:opacity-50"
          >
            <span className="text-lg">⬛</span>
            Square (1:1)
          </button>
        </div>
      </div>
    </div>
  );
}
