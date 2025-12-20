// Module entry: boots PIXI and uses local placeholders from shaders/player/vines.
// Assumes PIXI is available globally via CDN in index.html.
import { createCRTFilter, updateCRTFilter } from './shaders.js';
import { createPixelateFilter } from './pixelate.js';
import { createParallaxBackground } from './background.js';
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
		// Scene container holds background + world so filters apply to both
		const scene = new PIXI.Container();
		app.stage.addChild(scene);
		// Optional CRT filter (background glow overlay)
		const { filter: crtFilter, uniforms: crtUniforms } = createCRTFilter(app, { intensity: 1.0, brightness: 1.2 });
		// Pixelate filter
		const { filter: pixelFilter, update: updatePixel } = createPixelateFilter(app, { pixelSize: 4 });
		if (ENABLE_PIXELATE && ENABLE_CRT) {
			scene.filters = [pixelFilter, crtFilter];
		} else if (ENABLE_PIXELATE) {
			scene.filters = [pixelFilter];
		} else if (ENABLE_CRT) {
			scene.filters = [crtFilter];
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

		// Parallax background
		const { container: bg, update: updateBg, resize: resizeBg } = createParallaxBackground(app);
		scene.addChild(bg);

		// World visuals
		const world = new PIXI.Container();
		scene.addChild(world);
		const player = new Player(app);
		const { container: vinesLayer, vines } = createVines(app, 12);
		world.addChild(vinesLayer);
		world.addChild(player.view);

		// Simple platform to test landing: centered slab
		const platform = new PIXI.Graphics();
		platform.beginFill(0x00e6ff, 0.18);
		let pw = Math.max(220, Math.floor(app.renderer.width * 0.28));
		let ph = 14;
		let px = Math.floor((app.renderer.width - pw) / 2);
		let py = Math.floor(app.renderer.height * 0.62);
		platform.drawRoundedRect(px, py, pw, ph, 6);
		platform.endFill();
		// core bright edge
		const platformEdge = new PIXI.Graphics();
		platformEdge.lineStyle(3, 0x00e6ff, 0.95);
		platformEdge.moveTo(px + 6, py + ph);
		platformEdge.lineTo(px + pw - 6, py + ph);
		world.addChild(platform);
		world.addChild(platformEdge);

		// Track mouse position in canvas space for vine interactions
		const mouse = { x: app.renderer.width * 0.5, y: app.renderer.height * 0.3, down: false };
		// In-website cursor dot for visual and interaction feedback
		const cursor = new PIXI.Graphics();
		function drawCursor() {
			cursor.clear();
			// Glow
			cursor.beginFill(0x00e6ff, 0.15);
			cursor.drawCircle(0, 0, 10);
			cursor.endFill();
			// Core
			cursor.beginFill(0x00e6ff, 0.95);
			cursor.drawCircle(0, 0, 2.5);
			cursor.endFill();
		}
		drawCursor();
		world.addChild(cursor);
		function updateMouseFromEvent(e) {
			const rect = app.view.getBoundingClientRect();
			const x = e.clientX - rect.left;
			const y = e.clientY - rect.top;
			// Scale to renderer resolution
			mouse.x = x * (app.renderer.width / rect.width);
			mouse.y = y * (app.renderer.height / rect.height);
			cursor.position.set(mouse.x, mouse.y);
		}
		// Use multiple events to ensure immediate cursor updates
		window.addEventListener('pointermove', updateMouseFromEvent);
		window.addEventListener('pointerdown', updateMouseFromEvent);
		window.addEventListener('pointerenter', updateMouseFromEvent);
		window.addEventListener('mousemove', updateMouseFromEvent);
		window.addEventListener('pointerdown', () => { mouse.down = true; cursor.visible = true; });
		window.addEventListener('pointerup', () => { mouse.down = false; });
		window.addEventListener('pointercancel', () => { mouse.down = false; });
		window.addEventListener('blur', () => { mouse.down = false; });
		// Hide cursor dot when leaving canvas bounds
		window.addEventListener('pointerleave', () => { cursor.visible = false; });
		window.addEventListener('pointerenter', () => { cursor.visible = true; });

		let time = 0;
		app.ticker.add((dt) => {
			if (ENABLE_CRT) {
				updateCRTFilter({ uniforms: crtUniforms }, app, dt / 60);
			}
			if (ENABLE_PIXELATE) updatePixel();
			time += dt / 60;
			updateBg(time);
			// Ensure the in-site cursor is 1:1 with stored mouse coordinates every frame
			cursor.position.set(mouse.x, mouse.y);
			for (const vine of vines) vine.update(time, mouse, dt / 60);
			player.update(dt / 60);
			// Simple AABB collision with platform top
			const half = player.size / 2;
			const pLeft = px, pRight = px + pw, pTop = py, pBottom = py + ph;
			const plLeft = player.view.x - half;
			const plRight = player.view.x + half;
			const plTop = player.view.y - half;
			const plBottom = player.view.y + half;
			const overlapX = plRight > pLeft && plLeft < pRight;
			const fallingOnto = player.vy >= 0 && plBottom >= pTop && plTop < pTop;
			if (overlapX && fallingOnto) {
				// Snap on top
				player.view.y = pTop - half;
				player.vy = 0;
				player.grounded = true;
			}
			if (circle) circle.rotation += 0.02;
		});

		window.addEventListener('resize', () => {
			// Rebuild vines layout for new width/height
			resizeBg();
			world.removeChild(vinesLayer);
			const rebuilt = createVines(app, 12);
			world.addChild(rebuilt.container);
			vines.length = 0; // mutate array in-place to keep reference
			for (const v of rebuilt.vines) vines.push(v);
			player.onResize();

			// Rebuild platform for new size
			platform.clear();
			platform.beginFill(0x00e6ff, 0.18);
			const npw = Math.max(220, Math.floor(app.renderer.width * 0.28));
			const nph = 14;
			const npx = Math.floor((app.renderer.width - npw) / 2);
			const npy = Math.floor(app.renderer.height * 0.62);
			platform.drawRoundedRect(npx, npy, npw, nph, 6);
			platform.endFill();
			platformEdge.clear();
			platformEdge.lineStyle(3, 0x00e6ff, 0.95);
			platformEdge.moveTo(npx + 6, npy + nph);
			platformEdge.lineTo(npx + npw - 6, npy + nph);
			// Update collision references
			pw = npw; ph = nph; px = npx; py = npy;
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