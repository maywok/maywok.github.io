// Module entry: boots PIXI and uses local placeholders from shaders/player/vines.
// Assumes PIXI is available globally via CDN in index.html.
import { createCRTFilter, updateCRTFilter } from './shaders.js';
import { createPixelateFilter } from './pixelate.js';
import { createParallaxBackground } from './background.js';
import { Player } from './player.js';
import { createVines } from './vines.js';

async function boot() {
	try {
		const root = document.getElementById('game-root');
		if (!root) {
			throw new Error('Missing #game-root element');
		}

		// Ensure custom fonts are loaded before PIXI measures text.
		// On GitHub Pages, font loading can race and cause overlapping/incorrect hitboxes.
		if (document.fonts && document.fonts.load) {
			try {
				await document.fonts.load('16px Minecraft');
				// Some browsers need an extra tick for layout to settle.
				await new Promise((r) => requestAnimationFrame(() => r()));
			} catch (_) {
				// If font loading fails, continue with fallback fonts.
			}
		}

		const app = new PIXI.Application({
			// Resize to the fixed root container so we don't accidentally size to the
			// document/window (which can include scrollbars / mobile URL bar quirks).
			resizeTo: root,
			background: 0x102a3f, // brighter teal base so canvas isn't pure black
			antialias: true,
		});
		// Favor a crisp/pixel look for text and sprites
		app.stage.roundPixels = true;
		if (PIXI.settings) {
			PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.NEAREST;
			PIXI.settings.ROUND_PIXELS = true;
		}
		root.appendChild(app.view);
		// Ensure the canvas exactly fills the root in CSS pixels.
		// (PIXI controls the internal resolution; CSS controls layout.)
		app.view.style.width = '100%';
		app.view.style.height = '100%';
		app.view.style.display = 'block';

		const ENABLE_CRT = true; // keep CRT shader glow on
		const ENABLE_PIXELATE = true; // enable pixelation effect
		const ENABLE_DEBUG_HUD = true; // temporary: helps diagnose sizing issues in production
		// Smaller value = higher internal resolution = less pixelated / more readable.
		// Suggested range: 1.0 (very clear) .. 4.0 (chunky). Previous value was 7.
		const PIXELATE_SIZE = 4;
		const DEBUG_SHAPES = false; // keep demo shapes off
		// Scene container holds background + world so filters apply to both
		const scene = new PIXI.Container();
		app.stage.addChild(scene);
		// Optional CRT filter (background glow overlay)
		const { filter: crtFilter, uniforms: crtUniforms } = createCRTFilter(app, { intensity: 1.0, brightness: 1.2 });
		// Pixelate filter
		// Bigger pixelSize => chunkier, more defined pixels.
		const { filter: pixelFilter, update: updatePixel } = createPixelateFilter(app, { pixelSize: PIXELATE_SIZE });
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
			dropShadow: false,
		});
		if (DEBUG_SHAPES) {
			label.text = 'PIXI running';
			label.x = 24;
			label.y = 24;
			app.stage.addChild(label);
		}

		// Debug HUD to confirm sizing on the *deployed* site.
		// Shows: root box, canvas rect, renderer res, DPR.
		const debugHud = new PIXI.Text('', {
			fontFamily: 'Arial',
			fontSize: 12,
			fill: 0xffffff,
			stroke: 0x000000,
			strokeThickness: 3,
		});
		debugHud.alpha = 0.9;
		debugHud.x = 10;
		debugHud.y = 10;
		if (ENABLE_DEBUG_HUD) app.stage.addChild(debugHud);

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

		// In-world clickable link platforms (left-side stack)
		function makeLinkPlatform(labelText, url, options = {}) {
			const { x = 80, y = 200, fontSize = 40, collisionPad = 6 } = options;

			const container = new PIXI.Container();
			container.x = x;
			container.y = y;

			// Plain text only (no border/plate) with glow
			const text = new PIXI.Text(labelText, {
				fontFamily: 'Minecraft, monospace',
				fontSize,
				fill: 0x22f3c8,
				align: 'left',
				letterSpacing: 2,
				dropShadow: false,
			});
			container.addChild(text);

			function redrawHitArea() {
				// Hit area in local space so pointer events work
				const b = text.getLocalBounds();
				const w = Math.ceil(b.width + collisionPad * 2);
				const h = Math.ceil(b.height + collisionPad * 2);
				container.hitArea = new PIXI.Rectangle(b.x - collisionPad, b.y - collisionPad, w, h);
			}
			redrawHitArea();

			// Make it clickable
			container.eventMode = 'static';
			container.cursor = 'pointer';
			container.on('pointertap', () => {
				window.open(url, '_blank', 'noopener');
			});

			// Simple hover pulse
			container.on('pointerover', () => {
				container.scale.set(1.03);
				text.style.fill = 0xeafffb;
				redrawHitArea();
			});
			container.on('pointerout', () => {
				container.scale.set(1.0);
				text.style.fill = 0x22f3c8;
				redrawHitArea();
			});

			container._updatePlatformRect = () => {
				// Collision rect in world space (robust to font swaps/scale)
				const gb = text.getBounds();
				container._platformRect = {
					x: gb.x - collisionPad,
					y: gb.y - collisionPad,
					w: gb.width + collisionPad * 2,
					h: gb.height + collisionPad * 2,
				};
			};
			container._updatePlatformRect();

			return container;
		}

		// Left-side link stack: bigger and more centered vertically.
		const linkPlatforms = [
			makeLinkPlatform('Resume', '/resume.pdf', { x: 64, y: app.renderer.height * 0.34, fontSize: 58 }),
			makeLinkPlatform('GitHub', 'https://github.com/maywok', { x: 64, y: app.renderer.height * 0.48, fontSize: 58 }),
			makeLinkPlatform('LinkedIn', 'https://www.linkedin.com/in/mason--walker/', { x: 64, y: app.renderer.height * 0.62, fontSize: 58 }),
		];
		for (const lp of linkPlatforms) world.addChild(lp);

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
		// Player-vine grab state
		let vineGrab = null; // { vine, pointIndex }
		let grabRequested = false;
		let releaseRequested = false;
		const GRAB_KEY = 'KeyE';
		window.addEventListener('keydown', (e) => {
			if (e.code === GRAB_KEY) grabRequested = true;
			if (e.code === 'Space') releaseRequested = true;
		});
		window.addEventListener('keyup', (e) => {
			if (e.code === 'Space') releaseRequested = true;
		});

		function findNearestVinePoint(px, py, maxDist) {
			let best = null;
			let bestSq = maxDist * maxDist;
			for (const v of vines) {
				const pts = v.getPointsView?.();
				if (!pts) continue;
				for (let i = 1; i < pts.count; i++) {
					const dx = pts.x[i] - px;
					const dy = pts.y[i] - py;
					const dSq = dx * dx + dy * dy;
					if (dSq < bestSq) {
						bestSq = dSq;
						best = { vine: v, pointIndex: i };
					}
				}
			}
			return best;
		}

		app.ticker.add((dt) => {
			if (ENABLE_DEBUG_HUD) {
				const r = root.getBoundingClientRect();
				const c = app.view.getBoundingClientRect();
				const dpr = window.devicePixelRatio || 1;
				debugHud.text =
					`root: ${Math.round(r.width)}x${Math.round(r.height)}\n` +
					`canvas: ${Math.round(c.width)}x${Math.round(c.height)}\n` +
					`renderer: ${app.renderer.width}x${app.renderer.height}\n` +
					`dpr: ${dpr.toFixed(2)}`;
			}
			if (ENABLE_CRT) {
				updateCRTFilter({ uniforms: crtUniforms }, app, dt / 60);
			}
			if (ENABLE_PIXELATE) updatePixel();
			const seconds = dt / 60;
			time += seconds;
			updateBg(time);
			// Ensure the in-site cursor is 1:1 with stored mouse coordinates every frame
			cursor.position.set(mouse.x, mouse.y);
			for (const vine of vines) vine.update(time, mouse, seconds);

			// Grab/release handling
			if (grabRequested) {
				grabRequested = false;
				if (!vineGrab) {
					const near = findNearestVinePoint(player.view.x, player.view.y, 48);
					if (near) {
						vineGrab = near;
						player.grounded = false;
						// cancel vertical velocity so it doesn't fight the constraint too hard
						player.vy *= 0.25;
					}
				} else {
					releaseRequested = true;
				}
			}
			if (releaseRequested) {
				releaseRequested = false;
				if (vineGrab) {
					// Impart a bit of momentum from the vine point's velocity (approx)
					const v = vineGrab.vine;
					const i = vineGrab.pointIndex;
					const pts = v.getPointsView?.();
					if (pts) {
						// approximate point velocity via finite difference on draw positions
						// (vines maintain their own internal velocities; this rough estimate is ok)
						const dx = (pts.x[i] - player.view.x);
						const dy = (pts.y[i] - player.view.y);
						player.vx = dx * 6;
						player.vy = dy * 6;
					}
					vineGrab = null;
				}
			}

			if (!vineGrab) {
				player.update(seconds);
			} else {
				// While grabbed: constrain player to the grabbed vine point
				const v = vineGrab.vine;
				const pts = v.getPointsView?.();
				if (!pts) {
					vineGrab = null;
					player.update(seconds);
				} else {
					const i = vineGrab.pointIndex;
					// Keep the grab index valid if vines were rebuilt
					vineGrab.pointIndex = Math.max(1, Math.min(pts.count - 1, i));
					const gx = pts.x[vineGrab.pointIndex];
					const gy = pts.y[vineGrab.pointIndex];
					// Place player slightly below the point so the cube hangs under the vine
					player.view.x = gx;
					player.view.y = gy + player.size * 0.55;
					player.grounded = false;
				}
			}
			// Simple AABB collision with platform tops (slab + link platforms)
			const half = player.size / 2;
			const plLeft = player.view.x - half;
			const plRight = player.view.x + half;
			const plTop = player.view.y - half;
			const plBottom = player.view.y + half;

			function resolveTopPlatform(pLeft, pTop, pWidth, pHeight) {
				const pRight = pLeft + pWidth;
				const overlapX = plRight > pLeft && plLeft < pRight;
				const fallingOnto = player.vy >= 0 && plBottom >= pTop && plTop < pTop;
				if (overlapX && fallingOnto) {
					player.view.y = pTop - half;
					player.vy = 0;
					player.grounded = true;
					return true;
				}
				return false;
			}

			// slab first
			resolveTopPlatform(px, py, pw, ph);
			// then link platforms
			for (const lp of linkPlatforms) {
				lp._updatePlatformRect?.();
				const r = lp._platformRect;
				if (!r) continue;
				resolveTopPlatform(r.x, r.y, r.w, r.h);
			}
			if (circle) circle.rotation += 0.02;
		});

		function onResize() {
			// In some browsers, layout settles a tick later; force a resize based on the
			// actual root box to avoid 1-frame letterboxing/cropping.
			const rect = root.getBoundingClientRect();
			if (rect.width > 0 && rect.height > 0) {
				app.renderer.resize(Math.round(rect.width), Math.round(rect.height));
			}
			// Keep shader uniforms in sync with new renderer size
			if (ENABLE_PIXELATE) updatePixel();

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

			// Reposition link platforms relative to new size
			if (linkPlatforms[0]) {
				linkPlatforms[0].position.set(70, app.renderer.height * 0.22);
				linkPlatforms[0]._updatePlatformRect?.();
			}
			if (linkPlatforms[1]) {
				linkPlatforms[1].position.set(70, app.renderer.height * 0.36);
				linkPlatforms[1]._updatePlatformRect?.();
			}
			if (linkPlatforms[2]) {
				linkPlatforms[2].position.set(70, app.renderer.height * 0.54);
				linkPlatforms[2]._updatePlatformRect?.();
			}
		}
		window.addEventListener('resize', onResize);
		// Run once after first paint so initial sizing is correct.
		requestAnimationFrame(onResize);
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