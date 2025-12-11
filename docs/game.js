// Module entry: boots PIXI and uses local placeholders from shaders/player/vines.
// Assumes PIXI is available globally via CDN in index.html.
import { createCRTFilter, updateCRTFilter } from './shaders.js';
import { Player } from './player.js';
import { createVines } from './vines.js';

function boot() {
	try {
		const root = document.getElementById('game-root');
		if (!root) {
			throw new Error('Missing #game-root element');
		}

		const app = new PIXI.Application({
			resizeTo: window,
			background: 0x000000,
			antialias: true,
		});
		root.appendChild(app.view);

		const ENABLE_FILTER = true; // toggle to quickly validate visuals
		const { filter, uniforms } = createCRTFilter(app, { intensity: 1.0, brightness: 0.9 });
		const container = new PIXI.Container();
		app.stage.addChild(container);

		const gfx = new PIXI.Graphics();
		gfx.beginFill(0x000000);
		gfx.drawRect(0, 0, app.renderer.width, app.renderer.height);
		gfx.endFill();
		container.addChild(gfx);
		if (ENABLE_FILTER) {
			container.filters = [filter];
		}

		// Debug: add visible UI to confirm rendering
		const label = new PIXI.Text('Maywok — PIXI running', {
			fontFamily: 'Arial',
			fontSize: 28,
			fill: 0x00ffcc,
			stroke: 0x003333,
			strokeThickness: 4,
			dropShadow: true,
			dropShadowColor: '#00ffaa',
			dropShadowBlur: 6,
			dropShadowAngle: Math.PI / 6,
			dropShadowDistance: 4,
		});
		label.x = 24;
		label.y = 24;
		app.stage.addChild(label);

		const circle = new PIXI.Graphics();
		circle.beginFill(0xff0066);
		circle.drawCircle(0, 0, 40);
		circle.endFill();
		circle.x = app.renderer.width - 80;
		circle.y = 80;
		app.stage.addChild(circle);

		// Extra visible rectangle
		const rect = new PIXI.Graphics();
		rect.beginFill(0x22ccff, 0.6);
		rect.drawRoundedRect(120, 120, 220, 140, 16);
		rect.endFill();
		app.stage.addChild(rect);

		const player = new Player();
		const vines = createVines(12);

		app.ticker.add((dt) => {
			if (ENABLE_FILTER) {
				updateCRTFilter({ uniforms }, app, dt / 60);
			}
			player.update(dt / 60);
			circle.rotation += 0.02;
		});

		window.addEventListener('resize', () => {
			gfx.clear();
			gfx.beginFill(0x000000);
			gfx.drawRect(0, 0, app.renderer.width, app.renderer.height);
			gfx.endFill();
		});
	} catch (err) {
		console.error('Game boot failed:', err);
		const root = document.getElementById('game-root');
		if (root) {
			const pre = document.createElement('pre');
			pre.textContent = 'Error initializing game:\n' + (err && err.stack ? err.stack : String(err));
			pre.style.color = '#ff6';
			pre.style.padding = '1rem';
			pre.style.background = '#000';
			root.appendChild(pre);
		}
	}
}

boot();