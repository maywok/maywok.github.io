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
			background: 0x102a3f, // brighter teal base so canvas isn't pure black
			antialias: true,
		});
		root.appendChild(app.view);

		const ENABLE_FILTER = true; // keep shader on with higher brightness
		const DEBUG_SHAPES = false; // keep demo shapes off
		const { filter, uniforms } = createCRTFilter(app, { intensity: 1.0, brightness: 1.2 });
		const container = new PIXI.Container();
		app.stage.addChild(container);

		const gfx = new PIXI.Graphics();
		// Use the app background color for the fullscreen quad so filter shows clearly
		gfx.beginFill(0x102a3f);
		gfx.drawRect(0, 0, app.renderer.width, app.renderer.height);
		gfx.endFill();
		container.addChild(gfx);
		if (ENABLE_FILTER) {
			container.filters = [filter];
		}

		// Debug: add visible UI to confirm rendering
		const label = new PIXI.Text('', {
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
		if (DEBUG_SHAPES) {
			label.text = 'PIXI running';
			label.x = 24;
			label.y = 24;
			app.stage.addChild(label);
		}

		let circle = null;
		if (DEBUG_SHAPES) {
			circle = new PIXI.Graphics();
			circle.beginFill(0xff0066);
			circle.drawCircle(0, 0, 40);
			circle.endFill();
			circle.x = app.renderer.width - 80;
			circle.y = 80;
			app.stage.addChild(circle);
		}

		// Extra visible rectangle
		if (DEBUG_SHAPES) {
			const rect = new PIXI.Graphics();
			rect.beginFill(0x22ccff, 0.6);
			rect.drawRoundedRect(120, 120, 220, 140, 16);
			rect.endFill();
			app.stage.addChild(rect);
		}

		const player = new Player(app);
		const { container: vinesLayer, vines } = createVines(app, 12);
		// Vines hang from the top; add above background container
		app.stage.addChild(vinesLayer);
		// Add player cube near bottom center
		app.stage.addChild(player.view);

		let time = 0;
		app.ticker.add((dt) => {
			if (ENABLE_FILTER) {
				updateCRTFilter({ uniforms }, app, dt / 60);
			}
			time += dt / 60;
			for (const vine of vines) vine.update(time);
			player.update(dt / 60);
			if (circle) circle.rotation += 0.02;
		});

		window.addEventListener('resize', () => {
			gfx.clear();
			gfx.beginFill(0x102a3f);
			gfx.drawRect(0, 0, app.renderer.width, app.renderer.height);
			gfx.endFill();
			// Rebuild vines layout for new width/height
			app.stage.removeChild(vinesLayer);
			const rebuilt = createVines(app, 12);
			app.stage.addChild(rebuilt.container);
			vines.length = 0; // mutate array in-place to keep reference
			for (const v of rebuilt.vines) vines.push(v);
			player.onResize();
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