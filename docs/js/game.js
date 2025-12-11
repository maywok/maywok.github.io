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

  // CRT filter over the whole stage
  const crt = createCRTFilter(app);
  app.stage.filters = [crt];

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

    // Update CRT uniforms
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
  });
})();
