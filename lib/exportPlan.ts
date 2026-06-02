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

// ─── Share as text ───────────────────────────────────────────────────────────

export function buildPlanText(plan: TripPlan, boardName: string): string {
  const lines: string[] = [`✈ ${boardName} — ${plan.days.length}-Day Itinerary`, ''];

  for (const day of plan.days) {
    lines.push(`── Day ${day.dayNumber}: ${day.theme} ──`);
    for (const act of day.activities) {
      const time = act.time ? `${act.time}  ` : '';
      lines.push(`• ${time}${act.name}`);
      if (act.description) lines.push(`  ${act.description}`);
      const tips = collectSourcedTips(act);
      for (const t of act.tips ?? []) lines.push(`  💡 ${t}`);
      for (const t of tips)            lines.push(`  📎 ${t}`);
    }
    lines.push('');
  }

  lines.push('Planned with TravelPanel');
  return lines.join('\n');
}

export async function sharePlanAsText(plan: TripPlan, boardName: string): Promise<'shared' | 'copied'> {
  const text = buildPlanText(plan, boardName);

  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share({ title: `${boardName} Itinerary`, text });
      return 'shared';
    } catch {
      // User cancelled or API unavailable — fall through to clipboard
    }
  }

  await navigator.clipboard.writeText(text);
  return 'copied';
}
