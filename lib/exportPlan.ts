'use client';

import { TripPlan, Activity } from './types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function collectSourcedTips(activity: Activity): string[] {
  return (activity.sourcedTips ?? []).map((t) => `${t.content} — from your clip: ${t.sourceTitle}`);
}

// ─── PDF export ──────────────────────────────────────────────────────────────

export async function exportPlanToPDF(plan: TripPlan, boardName: string, emoji: string): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });

  const margin = 48;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  const ensureSpace = (needed: number) => {
    if (y + needed > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }
  };

  const writeWrapped = (text: string, size: number, opts: { bold?: boolean; color?: [number, number, number]; indent?: number } = {}) => {
    doc.setFont('helvetica', opts.bold ? 'bold' : 'normal');
    doc.setFontSize(size);
    doc.setTextColor(...(opts.color ?? [31, 41, 55]));
    const indent = opts.indent ?? 0;
    const lines = doc.splitTextToSize(text, contentWidth - indent) as string[];
    for (const line of lines) {
      ensureSpace(size + 4);
      doc.text(line, margin + indent, y);
      y += size + 4;
    }
  };

  // Title
  writeWrapped(`${emoji} ${boardName}`, 20, { bold: true });
  y += 4;
  writeWrapped(`${plan.days.length}-day itinerary · ${plan.totalLocations} locations · ~${plan.estimatedDailyDistance}`, 10, { color: [107, 114, 128] });
  y += 8;

  if (plan.overview) {
    writeWrapped(plan.overview, 11, { color: [55, 65, 81] });
    y += 8;
  }

  // Days
  for (const day of plan.days) {
    y += 6;
    ensureSpace(40);
    writeWrapped(`Day ${day.day} — ${day.theme}`, 14, { bold: true, color: [79, 70, 229] });
    y += 2;

    for (const act of day.activities) {
      ensureSpace(30);
      writeWrapped(`${act.time}  ·  ${act.name}  (${act.duration})`, 11, { bold: true });
      writeWrapped(act.location.name, 10, { color: [107, 114, 128], indent: 12 });

      for (const tip of act.tips) {
        writeWrapped(`• ${tip}`, 9.5, { color: [75, 85, 99], indent: 12 });
      }
      // Sourced wisdom — the cited clips
      for (const sourced of collectSourcedTips(act)) {
        writeWrapped(`★ ${sourced}`, 9.5, { color: [5, 150, 105], indent: 12 });
      }
      y += 4;
    }
  }

  // Trip tips
  if (plan.tips && plan.tips.length > 0) {
    y += 8;
    ensureSpace(30);
    writeWrapped('Trip Tips', 13, { bold: true, color: [180, 83, 9] });
    for (const tip of plan.tips) {
      writeWrapped(`• ${tip}`, 10, { color: [120, 53, 15], indent: 12 });
    }
  }

  doc.save(`${boardName.replace(/[^\w]+/g, '-')}-itinerary.pdf`);
}

// ─── Print-friendly HTML export (window.print() with print CSS) ──────────────

export function printPlan(plan: TripPlan, boardName: string, emoji: string): void {
  const today = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });

  const daysHtml = plan.days.map((day) => `
    <div class="day">
      <h2>Day ${day.day} — ${day.theme}</h2>
      ${day.activities.map((act) => `
        <div class="activity">
          <div class="act-header">
            <span class="time">${act.time}</span>
            <span class="name">${act.name}</span>
            <span class="duration">${act.duration}</span>
          </div>
          <div class="location">📍 ${act.location.address || act.location.name}</div>
          ${act.tips.map((t) => `<div class="tip">• ${t}</div>`).join('')}
          ${(act.sourcedTips ?? []).map((t) => `<div class="sourced">★ ${t.content} — <em>${t.sourceTitle}</em></div>`).join('')}
        </div>
      `).join('')}
    </div>
  `).join('');

  const tipsHtml = plan.tips?.length
    ? `<div class="trip-tips"><h2>Trip Tips</h2>${plan.tips.map((t) => `<p>• ${t}</p>`).join('')}</div>`
    : '';

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${emoji} ${boardName} — Itinerary</title>
  <style>
    @media print { body { margin: 0; } .no-print { display: none !important; } }
    body { font-family: -apple-system, sans-serif; max-width: 720px; margin: 40px auto; padding: 0 20px; color: #1f2937; }
    h1 { font-size: 24px; color: #1f2937; margin-bottom: 4px; }
    .meta { color: #6b7280; font-size: 13px; margin-bottom: 24px; }
    .day { margin-bottom: 28px; page-break-inside: avoid; }
    h2 { font-size: 16px; color: #4f46e5; border-bottom: 1px solid #e5e7eb; padding-bottom: 6px; }
    .activity { margin-bottom: 16px; padding-left: 12px; border-left: 3px solid #e0e7ff; }
    .act-header { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
    .time { font-size: 12px; color: #6b7280; font-weight: 600; min-width: 60px; }
    .name { font-size: 14px; font-weight: 700; color: #1f2937; }
    .duration { font-size: 11px; color: #9ca3af; margin-left: auto; }
    .location { font-size: 12px; color: #6b7280; margin-bottom: 4px; }
    .tip { font-size: 12px; color: #374151; margin-bottom: 2px; padding-left: 8px; }
    .sourced { font-size: 11px; color: #059669; margin-top: 3px; padding-left: 8px; }
    .trip-tips { background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 16px; margin-top: 24px; }
    .trip-tips h2 { color: #92400e; border-color: #fde68a; }
    .trip-tips p { font-size: 12px; color: #78350f; margin: 4px 0; }
    footer { margin-top: 32px; font-size: 11px; color: #9ca3af; text-align: center; border-top: 1px solid #f3f4f6; padding-top: 16px; }
  </style>
</head>
<body>
  <h1>${emoji} ${boardName}</h1>
  <div class="meta">${plan.days.length}-day itinerary · ${plan.totalLocations} locations · ~${plan.estimatedDailyDistance}</div>
  ${plan.overview ? `<p style="font-size:13px;color:#374151;margin-bottom:20px;">${plan.overview}</p>` : ''}
  ${daysHtml}
  ${tipsHtml}
  <footer>Generated by TravelPanel on ${today}</footer>
  <script>window.onload = function() { window.print(); }<\/script>
</body>
</html>`;

  const w = window.open('', '_blank');
  if (w) {
    w.document.write(html);
    w.document.close();
  }
}

// ─── Calendar (.ics) export ──────────────────────────────────────────────────

function icsEscape(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

// Fold long lines to 75 octets per RFC 5545.
function fold(line: string): string {
  if (line.length <= 75) return line;
  const chunks: string[] = [];
  let rest = line;
  chunks.push(rest.slice(0, 75));
  rest = rest.slice(75);
  while (rest.length > 0) {
    chunks.push(' ' + rest.slice(0, 74));
    rest = rest.slice(74);
  }
  return chunks.join('\r\n');
}

// Parse a clock time like "9:00 AM" / "14:30" into {h, m}. Falls back to a
// sensible default per activity index when unparseable.
function parseTime(time: string, fallbackHour: number): { h: number; m: number } {
  const m = time.match(/(\d{1,2})\s*[:.]?\s*(\d{2})?\s*(am|pm)?/i);
  if (!m) return { h: fallbackHour, m: 0 };
  let h = parseInt(m[1], 10);
  const min = m[2] ? parseInt(m[2], 10) : 0;
  const ampm = m[3]?.toLowerCase();
  if (ampm === 'pm' && h < 12) h += 12;
  if (ampm === 'am' && h === 12) h = 0;
  return { h: Math.min(h, 23), m: Math.min(min, 59) };
}

function fmtDate(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}T${p(d.getUTCHours())}${p(d.getUTCMinutes())}00Z`;
}

// Generates an .ics with one event per activity. Day 1 starts tomorrow; each
// day is consecutive. Includes location + Apple/Google Maps geo for deep links.
export function exportPlanToICS(plan: TripPlan, boardName: string): void {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//TravelPanel//Itinerary//EN',
    'CALSCALE:GREGORIAN',
  ];

  const start = new Date();
  start.setDate(start.getDate() + 1);
  start.setHours(0, 0, 0, 0);

  let uidCounter = 0;
  const stamp = fmtDate(new Date());

  plan.days.forEach((day, dayIdx) => {
    day.activities.forEach((act, actIdx) => {
      const evtDate = new Date(start);
      evtDate.setDate(start.getDate() + dayIdx);
      const { h, m } = parseTime(act.time, 9 + actIdx * 2);
      evtDate.setHours(h, m, 0, 0);
      const endDate = new Date(evtDate.getTime() + 90 * 60 * 1000); // default 90 min

      const descParts = [...act.tips, ...collectSourcedTips(act)];
      const loc = act.location;

      lines.push('BEGIN:VEVENT');
      lines.push(fold(`UID:travelpanel-${Date.now()}-${uidCounter++}@travelpanel.app`));
      lines.push(`DTSTAMP:${stamp}`);
      lines.push(`DTSTART:${fmtDate(evtDate)}`);
      lines.push(`DTEND:${fmtDate(endDate)}`);
      lines.push(fold(`SUMMARY:${icsEscape(`Day ${day.day}: ${act.name}`)}`));
      if (loc?.name) lines.push(fold(`LOCATION:${icsEscape(loc.address || loc.name)}`));
      if (Number.isFinite(loc?.lat) && Number.isFinite(loc?.lng)) {
        lines.push(`GEO:${loc.lat};${loc.lng}`);
      }
      if (descParts.length > 0) lines.push(fold(`DESCRIPTION:${icsEscape(descParts.join('\n'))}`));
      lines.push('END:VEVENT');
    });
  });

  lines.push('END:VCALENDAR');

  const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${boardName.replace(/[^\w]+/g, '-')}-itinerary.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
