// Module entry: boots PIXI and uses local placeholders from shaders/player/vines.
// Assumes PIXI is available globally via CDN in index.html.
import { createCRTFilter, updateCRTFilter } from './shaders.js';
import { createPixelateFilter } from './pixelate.js';
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

		const ENABLE_CRT = true; // keep CRT shader glow on
		const ENABLE_PIXELATE = true; // enable pixelation effect
		const DEBUG_SHAPES = false; // keep demo shapes off
		// World container holds game visuals
		const world = new PIXI.Container();
		app.stage.addChild(world);
		// Optional CRT filter (background glow overlay)
		const { filter: crtFilter, uniforms: crtUniforms } = createCRTFilter(app, { intensity: 1.0, brightness: 1.2 });
		// Pixelate filter
		const { filter: pixelFilter, update: updatePixel } = createPixelateFilter(app, { pixelSize: 4 });
		if (ENABLE_PIXELATE && ENABLE_CRT) {
			world.filters = [pixelFilter, crtFilter];
		} else if (ENABLE_PIXELATE) {
			world.filters = [pixelFilter];
		} else if (ENABLE_CRT) {
			world.filters = [crtFilter];
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
		world.addChild(vinesLayer);
		world.addChild(player.view);

		let time = 0;
		app.ticker.add((dt) => {
			if (ENABLE_CRT) {
				updateCRTFilter({ uniforms: crtUniforms }, app, dt / 60);
			}
			if (ENABLE_PIXELATE) updatePixel();
			time += dt / 60;
			for (const vine of vines) vine.update(time);
			player.update(dt / 60);
			if (circle) circle.rotation += 0.02;
		});

		window.addEventListener('resize', () => {
			// Rebuild vines layout for new width/height
			world.removeChild(vinesLayer);
			const rebuilt = createVines(app, 12);
			world.addChild(rebuilt.container);
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