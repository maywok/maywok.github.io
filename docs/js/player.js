// Simple inertial player with WASD/arrow controls

export class Player {
  constructor(app) {
    this.app = app;
    this.pos = { x: app.renderer.width / 2, y: app.renderer.height * 0.7 };
    this.vel = { x: 0, y: 0 };
    this.acc = 0.6;
    this.drag = 0.88;
    this.max = 6.0;
    this.radius = 9;
    this.color = 0xe85c5c; // salmon
    this.graphics = new PIXI.Graphics();
    this.graphics.zIndex = 2;
    app.stage.addChild(this.graphics);
    this.keys = new Set();
    window.addEventListener('keydown', (e) => this.keys.add(e.key.toLowerCase()));
    window.addEventListener('keyup', (e) => this.keys.delete(e.key.toLowerCase()));
  }

  update(dt) {
    const step = dt * 60;
    const k = this.keys;
    if (k.has('arrowleft') || k.has('a')) this.vel.x -= this.acc * step;
    if (k.has('arrowright') || k.has('d')) this.vel.x += this.acc * step;
    if (k.has('arrowup') || k.has('w')) this.vel.y -= this.acc * step;
    if (k.has('arrowdown') || k.has('s')) this.vel.y += this.acc * step;

    // Clamp speed
    this.vel.x = Math.max(Math.min(this.vel.x, this.max), -this.max);
    this.vel.y = Math.max(Math.min(this.vel.y, this.max), -this.max);

    // Apply drag
    this.vel.x *= this.drag;
    this.vel.y *= this.drag;

    // Integrate
    this.pos.x += this.vel.x;
    this.pos.y += this.vel.y;

    // Bounds
    const w = this.app.renderer.width;
    const h = this.app.renderer.height;
    this.pos.x = Math.max(this.radius, Math.min(w - this.radius, this.pos.x));
    this.pos.y = Math.max(this.radius, Math.min(h - this.radius, this.pos.y));

    // Draw
    this.graphics.clear();
    // Glow
    this.graphics.beginFill(this.color, 0.1);
    this.graphics.drawCircle(this.pos.x, this.pos.y, this.radius * 3.0);
    this.graphics.endFill();
    // Core
    this.graphics.beginFill(this.color, 1);
    this.graphics.drawCircle(this.pos.x, this.pos.y, this.radius);
    this.graphics.endFill();
  }
}
