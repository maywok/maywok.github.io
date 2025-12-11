// Bootstraps PIXI app, CRT filter, vines, player, and loop
import { createCRTFilter, updateCRTFilter } from './shaders.js';
import { createVines } from './vines.js';
import { Player } from './player.js';

(function boot() {
  const root = document.getElementById('game-root');
  const app = new PIXI.Application({
    resizeTo: root,
    backgroundAlpha: 0,
    antialias: false,
    powerPreference: 'high-performance'
  });
  root.appendChild(app.view);
  app.stage.sortableChildren = true;

  // CRT filter with boosted brightness
  const crt = createCRTFilter(app);
  app.stage.filters = [crt];

  // Background grid to improve visibility
  const bg = new PIXI.Graphics();
  bg.zIndex = 0;
  bg.beginFill(0x0a0a0a, 1);
  bg.drawRect(0, 0, app.renderer.width, app.renderer.height);
  bg.endFill();
  // Draw neon grid lines
  const spacing = 24;
  bg.lineStyle(1, 0x142a46, 0.45);
  for (let x = 0; x <= app.renderer.width; x += spacing) {
    bg.moveTo(x, 0);
    bg.lineTo(x, app.renderer.height);
  }
  for (let y = 0; y <= app.renderer.height; y += spacing) {
    bg.moveTo(0, y);
    bg.lineTo(app.renderer.width, y);
  }
  app.stage.addChild(bg);

  // Parallax ruins layers (silhouette columns and bricks)
  const layers = [];
  const ruinColors = [0x0d1b2a, 0x14213d, 0x1b283f];
  for (let i = 0; i < 3; i++) {
    const g = new PIXI.Graphics();
    g.zIndex = i + 1;
    g.alpha = 0.7 - i * 0.2;
    drawRuins(g, app.renderer.width, app.renderer.height, ruinColors[i]);
    app.stage.addChild(g);
    layers.push({ g, speed: 0.05 + i * 0.02 });
  }

  // Light shafts
  const shafts = new PIXI.Graphics();
  shafts.zIndex = 4;
  drawLightShafts(shafts, app.renderer.width, app.renderer.height);
  app.stage.addChild(shafts);

  // Water reflection band
  const water = new PIXI.Graphics();
  water.zIndex = 5;
  app.stage.addChild(water);

  // Content
  const vines = createVines(app, 7);
  const player = new Player(app);

  // Pointer interaction: move vine targets toward mouse
  const pointer = { x: app.renderer.width / 2, y: 80 };
  app.view.addEventListener('pointermove', (e) => {
    const rect = app.view.getBoundingClientRect();
    pointer.x = e.clientX - rect.left;
    pointer.y = e.clientY - rect.top;
  });

  let last = performance.now();
  app.ticker.add(() => {
    const now = performance.now();
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;

    // Update CRT uniforms (kept in sync even if filter disabled)
    updateCRTFilter(crt, app, dt);

    // Update vines toward a slightly offset target to feel organic
    for (let i = 0; i < vines.length; i++) {
      const offsetX = Math.sin(now * 0.001 + i) * 12;
      const offsetY = Math.cos(now * 0.0012 + i) * 6;
      vines[i].setTarget(pointer.x + offsetX, Math.max(40, pointer.y + offsetY));
      vines[i].update(dt);
    }

    // Update player
    player.update(dt);

    // Parallax subtle vertical motion
    for (const { g, speed } of layers) {
      g.y = Math.sin(now * 0.0005) * 6 * speed;
    }

    // Animate light shafts shimmer
    shafts.alpha = 0.15 + 0.05 * Math.sin(now * 0.0008);

    // Redraw water reflection
    drawWater(water, app.renderer.width, app.renderer.height, now);
  });

  // Handle window resize to keep canvas fitting root
  window.addEventListener('resize', () => {
    // PIXI with resizeTo handles this, but we refresh resolution
    updateCRTFilter(crt, app, 0);
    // Redraw background to the new size
    bg.clear();
    bg.beginFill(0x0a0a0a, 1);
    bg.drawRect(0, 0, app.renderer.width, app.renderer.height);
    bg.endFill();
    const spacing = 24;
    bg.lineStyle(1, 0x142a46, 0.45);
    for (let x = 0; x <= app.renderer.width; x += spacing) {
      bg.moveTo(x, 0);
      bg.lineTo(x, app.renderer.height);
    }
    for (let y = 0; y <= app.renderer.height; y += spacing) {
      bg.moveTo(0, y);
      bg.lineTo(app.renderer.width, y);
    }

    // Redraw ruins and shafts to new size
    for (let i = 0; i < layers.length; i++) {
      const { g } = layers[i];
      g.clear();
      drawRuins(g, app.renderer.width, app.renderer.height, ruinColors[i]);
    }
    shafts.clear();
    drawLightShafts(shafts, app.renderer.width, app.renderer.height);
    drawWater(water, app.renderer.width, app.renderer.height, performance.now());
  });
})();

// Helpers to draw scene mood
function drawRuins(g, w, h, color) {
  g.beginFill(color, 1);
  // Columns
  for (let i = 0; i < 6; i++) {
    const x = 60 + i * (w / 7);
    const colW = 24 + (i % 2) * 8;
    g.drawRect(x, h * 0.25, colW, h * 0.5);
  }
  // Platforms / bricks
  for (let i = 0; i < 12; i++) {
    const bx = 40 + i * (w / 12);
    const by = h * 0.6 + Math.sin(i) * 6;
    const bw = 60;
    const bh = 10;
    g.drawRect(bx, by, bw, bh);
  }
  g.endFill();

  // Hanging ropes
  g.lineStyle(2, 0x2a3b5e, 0.6);
  for (let i = 0; i < 5; i++) {
    const rx = 100 + i * (w / 6);
    g.moveTo(rx, h * 0.2);
    g.lineTo(rx, h * 0.5);
    // Ring
    g.drawCircle(rx, h * 0.5, 6);
  }
}

function drawLightShafts(g, w, h) {
  const colors = [0x6ee0ff, 0x7D5DF7, 0xFF5EF1];
  for (let i = 0; i < 3; i++) {
    const x = (w * 0.2) + i * (w * 0.25);
    const shaftW = 18;
    const grad = new PIXI.Graphics();
  }
  // Simple translucent shafts
  g.beginFill(0x6ee0ff, 0.08);
  g.drawRect(w * 0.25, 0, 18, h * 0.8);
  g.beginFill(0x7D5DF7, 0.06);
  g.drawRect(w * 0.5, 0, 24, h * 0.85);
  g.beginFill(0xFF5EF1, 0.05);
  g.drawRect(w * 0.75, 0, 16, h * 0.75);
  g.endFill();
}

function drawWater(g, w, h, now) {
  g.clear();
  const top = h * 0.78;
  g.beginFill(0x0a1630, 0.6);
  g.drawRect(0, top, w, h - top);
  g.endFill();
  // Ripples
  g.lineStyle(2, 0x1c3a7a, 0.5);
  for (let x = 0; x < w; x += 24) {
    const y = top + 8 + Math.sin(now * 0.002 + x * 0.05) * 4;
    g.moveTo(x, y);
    g.lineTo(x + 18, y);
  }
}
