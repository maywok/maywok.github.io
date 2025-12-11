// Springy neon vines that react to mouse

export class Vine {
  constructor(app, x, y, segments = 18, len = 16) {
    this.app = app;
    this.segments = [];
    this.graphics = new PIXI.Graphics();
    this.graphics.zIndex = 1;
    app.stage.addChild(this.graphics);
    for (let i = 0; i < segments; i++) {
      this.segments.push({
        x: x,
        y: y + i * len,
        vx: 0,
        vy: 0
      });
    }
    this.len = len;
    this.stiffness = 0.12;
    this.damping = 0.86;
    this.target = { x, y };
    this.color = 0x00ffc8;
  }

  setTarget(x, y) { this.target.x = x; this.target.y = y; }

  update(dt) {
    const head = this.segments[0];
    // Spring force toward target
    const dx = this.target.x - head.x;
    const dy = this.target.y - head.y;
    head.vx += dx * this.stiffness * dt * 60;
    head.vy += dy * this.stiffness * dt * 60;
    head.vx *= this.damping;
    head.vy *= this.damping;
    head.x += head.vx;
    head.y += head.vy;

    // Follow chain maintaining length
    for (let i = 1; i < this.segments.length; i++) {
      const prev = this.segments[i - 1];
      const cur = this.segments[i];
      const dx2 = cur.x - prev.x;
      const dy2 = cur.y - prev.y;
      const d = Math.sqrt(dx2 * dx2 + dy2 * dy2) || 0.0001;
      const diff = (d - this.len) / d;
      cur.x -= dx2 * diff * 0.5;
      cur.y -= dy2 * diff * 0.5;
    }

    // Draw
    this.graphics.clear();
    this.graphics.lineStyle(3, this.color, 1);
    this.graphics.moveTo(this.segments[0].x, this.segments[0].y);
    for (let i = 1; i < this.segments.length; i++) {
      const s = this.segments[i];
      this.graphics.lineTo(s.x, s.y);
    }
    // Glow
    this.graphics.lineStyle(14, this.color, 0.12);
    this.graphics.moveTo(this.segments[0].x, this.segments[0].y);
    for (let i = 1; i < this.segments.length; i++) {
      const s = this.segments[i];
      this.graphics.lineTo(s.x, s.y);
    }
  }
}

export function createVines(app, count = 6) {
  const vines = [];
  for (let i = 0; i < count; i++) {
    const x = (app.renderer.width * 0.2) + i * (app.renderer.width * 0.1);
    const y = 40 + i * 6;
    vines.push(new Vine(app, x, y));
  }
  return vines;
}
