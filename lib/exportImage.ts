import { TripPlan } from './types';

export async function exportPlanAsImage(plan: TripPlan, boardName: string): Promise<Blob> {
  const html2canvas = (await import('html2canvas')).default;

  const W = 1080, H = 1920;
  const el = document.createElement('div');
  el.style.cssText = `
    position:fixed; left:-9999px; top:0;
    width:${W}px; height:${H}px; overflow:hidden;
    background:linear-gradient(160deg,#4338ca 0%,#6d28d9 55%,#7c3aed 100%);
    font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
    color:white; display:flex; flex-direction:column;
    padding:80px 60px 60px; box-sizing:border-box;
  `;

  const daysToShow = plan.days.slice(0, 5);

  el.innerHTML = `
    <div style="font-size:18px;font-weight:600;letter-spacing:3px;text-transform:uppercase;opacity:0.7;margin-bottom:24px;">
      TravelPanel
    </div>
    <div style="font-size:64px;font-weight:800;line-height:1.1;margin-bottom:12px;">
      ${boardName}
    </div>
    <div style="font-size:22px;opacity:0.8;margin-bottom:60px;">
      ${plan.days.length}-day itinerary · ${plan.days.reduce((s, d) => s + d.activities.length, 0)} activities
    </div>
    <div style="flex:1;display:flex;flex-direction:column;gap:24px;overflow:hidden;">
      ${daysToShow.map((day) => `
        <div style="background:rgba(255,255,255,0.12);border-radius:20px;padding:24px 28px;">
          <div style="font-size:14px;font-weight:700;letter-spacing:2px;text-transform:uppercase;opacity:0.7;margin-bottom:12px;">
            Day ${day.dayNumber}
          </div>
          <div style="display:flex;flex-direction:column;gap:8px;">
            ${day.activities.slice(0, 2).map((act) => `
              <div style="display:flex;align-items:flex-start;gap:12px;">
                <div style="width:8px;height:8px;border-radius:50%;background:rgba(255,255,255,0.6);margin-top:7px;flex-shrink:0;"></div>
                <div>
                  <div style="font-size:18px;font-weight:600;">${act.name}</div>
                  ${act.tips?.[0] ? `<div style="font-size:13px;opacity:0.7;margin-top:3px;">${act.tips[0].slice(0, 60)}${act.tips[0].length > 60 ? '…' : ''}</div>` : ''}
                </div>
              </div>
            `).join('')}
            ${day.activities.length > 2 ? `<div style="font-size:13px;opacity:0.5;margin-left:20px;">+${day.activities.length - 2} more</div>` : ''}
          </div>
        </div>
      `).join('')}
    </div>
    <div style="margin-top:40px;padding-top:32px;border-top:1px solid rgba(255,255,255,0.2);display:flex;align-items:center;justify-content:space-between;">
      <div style="font-size:16px;opacity:0.6;">Made with TravelPanel</div>
      <div style="font-size:13px;opacity:0.4;">${new Date().toLocaleDateString('en-US',{month:'long',year:'numeric'})}</div>
    </div>
  `;

  document.body.appendChild(el);
  try {
    const canvas = await html2canvas(el, {
      width: W,
      height: H,
      scale: 1,
      useCORS: true,
      logging: false,
      backgroundColor: null,
    });
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((b) => b ? resolve(b) : reject(new Error('Canvas toBlob failed')), 'image/png');
    });
  } finally {
    document.body.removeChild(el);
  }
}
