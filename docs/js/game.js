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

  // Optional CRT filter (disabled initially for visibility)
  const crt = createCRTFilter(app);
  // app.stage.filters = [crt];

  // Background grid to improve visibility
  const bg = new PIXI.Graphics();
  bg.zIndex = 0;
  bg.beginFill(0x0a0a0a, 1);
  bg.drawRect(0, 0, app.renderer.width, app.renderer.height);
  bg.endFill();
  // Draw neon grid lines
  const spacing = 24;
  bg.lineStyle(1, 0x043a30, 0.55);
  for (let x = 0; x <= app.renderer.width; x += spacing) {
    bg.moveTo(x, 0);
    bg.lineTo(x, app.renderer.height);
  }
  for (let y = 0; y <= app.renderer.height; y += spacing) {
    bg.moveTo(0, y);
    bg.lineTo(app.renderer.width, y);
  }
  app.stage.addChild(bg);

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
    bg.lineStyle(1, 0x043a30, 0.55);
    for (let x = 0; x <= app.renderer.width; x += spacing) {
      bg.moveTo(x, 0);
      bg.lineTo(x, app.renderer.height);
    }
    for (let y = 0; y <= app.renderer.height; y += spacing) {
      bg.moveTo(0, y);
      bg.lineTo(app.renderer.width, y);
    }
  });
})();
