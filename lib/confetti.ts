// Minimal confetti burst — no dependencies, pure Canvas API.
// Fires once and auto-cleans up after the animation.

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  spin: number;
  size: number;
  color: string;
  alpha: number;
}

const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ffffff', '#818cf8', '#6ee7b7'];

export function fireConfetti(originX?: number, originY?: number): void {
  if (typeof window === 'undefined') return;

  const canvas = document.createElement('canvas');
  canvas.style.cssText = `
    position: fixed; inset: 0; width: 100%; height: 100%;
    pointer-events: none; z-index: 9999;
  `;
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
  document.body.appendChild(canvas);

  const ctx    = canvas.getContext('2d')!;
  const cx     = originX ?? canvas.width  / 2;
  const cy     = originY ?? canvas.height / 3;
  const COUNT  = 80;

  const particles: Particle[] = Array.from({ length: COUNT }, () => {
    const angle = Math.random() * Math.PI * 2;
    const speed = 4 + Math.random() * 8;
    return {
      x:     cx,
      y:     cy,
      vx:    Math.cos(angle) * speed,
      vy:    Math.sin(angle) * speed - 6,
      angle: Math.random() * Math.PI * 2,
      spin:  (Math.random() - 0.5) * 0.3,
      size:  5 + Math.random() * 6,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      alpha: 1,
    };
  });

  let frame = 0;
  const MAX_FRAMES = 90;

  function tick() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (const p of particles) {
      p.x    += p.vx;
      p.y    += p.vy;
      p.vy   += 0.35;          // gravity
      p.vx   *= 0.98;          // air resistance
      p.angle += p.spin;
      p.alpha  = Math.max(0, 1 - frame / MAX_FRAMES);

      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      ctx.restore();
    }

    frame++;
    if (frame < MAX_FRAMES) {
      requestAnimationFrame(tick);
    } else {
      canvas.remove();
    }
  }

  requestAnimationFrame(tick);
}
