import { Player } from './player.js';
import { createVines } from './vines.js';
import { createBlogIcon } from './blogIcon.js';
import { createCRTFisheyeFilter, updateCRTFisheyeFilter } from './shaders.js';

const THEMES = {
	light: {
		name: 'Light',
		appBackground: 0x000000,
		bg: { bg: 0x000000, dot: 0x000000, stripe: 0x000000, farAlpha: 0.10, midAlpha: 0.12, nearAlpha: 0.14 },
		player: { fill: 0x000000, glow: 0x000000, glowAlpha: 0.0 },
		vines: { hue: 0xff5a6e },
		crt: { intensity: 0.0, brightness: 1.0, glowColor: 0x000000, scanStrength: 0.25 },
	},
	dark: {
		name: 'Dark',
		appBackground: 0x000000,
		bg: { bg: 0x000000, dot: 0x000000, stripe: 0x000000, farAlpha: 0.10, midAlpha: 0.14, nearAlpha: 0.18 },
		player: { fill: 0xf5e6c8, glow: 0xf5e6c8, glowAlpha: 0.22 },
		vines: { hue: 0xff5a6e },
		crt: { intensity: 1.0, brightness: 1.2, glowColor: 0x00ff99, scanStrength: 1.0 },
	},
};

function loadThemeKey() {
	try {
		const t = localStorage.getItem('mw_theme');
		return (t === 'light' || t === 'dark') ? t : 'dark';
	} catch (_) {
		return 'dark';
	}
}

function saveThemeKey(key) {
	try { localStorage.setItem('mw_theme', key); } catch (_) {}
}

async function boot() {
	try {
		const root = document.getElementById('game-root');
		if (!root) {
			throw new Error('Missing #game-root element');
		}

		if (document.fonts && document.fonts.load) {
			try {
				await document.fonts.load('16px Minecraft');
				await new Promise((r) => requestAnimationFrame(() => r()));
			} catch (_) {
			}
		}

		const app = new PIXI.Application({
			resizeTo: root,
			background: THEMES[loadThemeKey()].appBackground,
			antialias: true,
		});
		app.stage.roundPixels = true;
		if (PIXI.settings) {
			PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.NEAREST;
			PIXI.settings.ROUND_PIXELS = true;
		}
		root.appendChild(app.view);
		app.view.style.width = '100%';
		app.view.style.height = '100%';
		app.view.style.display = 'block';

		const ENABLE_DEBUG_HUD = false;
		const DEBUG_SHAPES = false;
		const scene = new PIXI.Container();
		app.stage.addChild(scene);
		const { filter: crtFisheyeFilter, uniforms: crtFisheyeUniforms } = createCRTFisheyeFilter(app, {
			intensity: 0.08,
			brightness: 0.06,
			scanStrength: 0.85,
			curve: 0.08,
			vignette: 0.28,
		});
		scene.filters = [crtFisheyeFilter];
		let themeKey = loadThemeKey();
		let theme = THEMES[themeKey];

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

		if (DEBUG_SHAPES) {
			const rect = new PIXI.Graphics();
			rect.beginFill(0x22ccff, 0.6);
			rect.drawRoundedRect(120, 120, 220, 140, 16);
			rect.endFill();
			app.stage.addChild(rect);
		}

		const world = new PIXI.Container();
		scene.addChild(world);
		const player = new Player(app);
		player.setColors(theme.player);
		const { container: vinesLayer, vines } = createVines(app, 12);
		for (const v of vines) v.setColor(theme.vines.hue);
		world.addChild(vinesLayer);

		const { layout: layoutBlogIcon } = await createBlogIcon(app, world, {
			url: '/blog',
		});

		function makeLinkPlatform(labelText, url, options = {}) {
			const { x = 80, y = 200, fontSize = 40, collisionPad = 6 } = options;

			const container = new PIXI.Container();
			container.x = x;
			container.y = y;

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
				const b = text.getLocalBounds();
				const w = Math.ceil(b.width + collisionPad * 2);
				const h = Math.ceil(b.height + collisionPad * 2);
				container.hitArea = new PIXI.Rectangle(b.x - collisionPad, b.y - collisionPad, w, h);
			}
			redrawHitArea();

			container.eventMode = 'static';
			container.cursor = 'pointer';
			container.on('pointertap', () => {
				window.open(url, '_blank', 'noopener');
			});

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

		const linkPlatforms = [
			makeLinkPlatform('Resume', './assets/files/mason-walker-resume.pdf', { x: 64, y: 0, fontSize: 58 }),
			makeLinkPlatform('GitHub', 'https://github.com/maywok', { x: 64, y: 0, fontSize: 58 }),
			makeLinkPlatform('LinkedIn', 'https://www.linkedin.com/in/mason--walker/', { x: 64, y: 0, fontSize: 58 }),
		];
		for (const lp of linkPlatforms) world.addChild(lp);

		function layoutLinkPlatforms() {
			const leftX = 64;
			const centerY = app.renderer.height * 0.5;
			const spacing = Math.max(74, Math.min(120, app.renderer.height * 0.14));
			const startY = centerY - spacing;
			if (linkPlatforms[0]) {
				linkPlatforms[0].position.set(leftX, startY);
				linkPlatforms[0]._updatePlatformRect?.();
			}
			if (linkPlatforms[1]) {
				linkPlatforms[1].position.set(leftX, startY + spacing);
				linkPlatforms[1]._updatePlatformRect?.();
			}
			if (linkPlatforms[2]) {
				linkPlatforms[2].position.set(leftX, startY + spacing * 2);
				linkPlatforms[2]._updatePlatformRect?.();
			}
		}
		layoutLinkPlatforms();

		world.addChild(player.view);

		const toggleBtn = document.createElement('button');
		const ENABLE_THEME_TOGGLE = false;
		if (ENABLE_THEME_TOGGLE) {
			toggleBtn.type = 'button';
			toggleBtn.textContent = themeKey === 'dark' ? 'Dark' : 'Light';
			toggleBtn.title = 'Toggle theme (T)';
			Object.assign(toggleBtn.style, {
				position: 'fixed',
				top: '16px',
				right: '16px',
				zIndex: 9999,
				pointerEvents: 'auto',
				padding: '8px 10px',
				borderRadius: '10px',
				border: '1px solid rgba(255,255,255,0.18)',
				background: 'rgba(0,0,0,0.35)',
				color: 'rgba(255,255,255,0.92)',
				fontFamily: 'Minecraft, ui-monospace, Menlo, monospace',
				fontSize: '12px',
				cursor: 'pointer',
			});
			document.body.appendChild(toggleBtn);
		}

		function applyTheme(nextKey) {
			themeKey = nextKey;
			theme = THEMES[themeKey];
			app.renderer.background.color = theme.appBackground;
			player.setColors(theme.player);
			for (const v of vines) v.setColor(theme.vines.hue);
			if (ENABLE_THEME_TOGGLE) {
				toggleBtn.textContent = themeKey === 'dark' ? 'Dark' : 'Light';
			}
			saveThemeKey(themeKey);
		}

		function toggleTheme() {
			applyTheme(themeKey === 'dark' ? 'light' : 'dark');
		}
		if (ENABLE_THEME_TOGGLE) {
			toggleBtn.addEventListener('click', toggleTheme);
			window.addEventListener('keydown', (e) => {
				if (e.code === 'KeyT') toggleTheme();
			});
		}

		const platform = new PIXI.Graphics();
		platform.beginFill(0x00e6ff, 0.18);
		let pw = Math.max(220, Math.floor(app.renderer.width * 0.28));
		let ph = 14;
		let px = Math.floor((app.renderer.width - pw) / 2);
		let py = Math.floor(app.renderer.height * 0.62);
		platform.drawRoundedRect(px, py, pw, ph, 6);
		platform.endFill();
		const platformEdge = new PIXI.Graphics();
		platformEdge.lineStyle(3, 0x00e6ff, 0.95);
		platformEdge.moveTo(px + 6, py + ph);
		platformEdge.lineTo(px + pw - 6, py + ph);
		world.addChild(platform);
		world.addChild(platformEdge);

		const mouse = { x: app.renderer.width * 0.5, y: app.renderer.height * 0.3, down: false };
		const cursorTextureUrl = './assets/spritesheet/cursor.png';
		await PIXI.Assets.load(cursorTextureUrl);
		const cursor = new PIXI.Sprite(PIXI.Texture.from(cursorTextureUrl));
		cursor.anchor.set(0.5);
		world.addChild(cursor);
		function updateMouseFromEvent(e) {
			const rect = app.view.getBoundingClientRect();
			const x = e.clientX - rect.left;
			const y = e.clientY - rect.top;
			mouse.x = x * (app.renderer.width / rect.width);
			mouse.y = y * (app.renderer.height / rect.height);
			cursor.position.set(mouse.x, mouse.y);
		}
		window.addEventListener('pointermove', updateMouseFromEvent);
		window.addEventListener('pointerdown', updateMouseFromEvent);
		window.addEventListener('pointerenter', updateMouseFromEvent);
		window.addEventListener('mousemove', updateMouseFromEvent);
		window.addEventListener('pointerdown', () => { mouse.down = true; cursor.visible = true; });
		window.addEventListener('pointerup', () => { mouse.down = false; });
		window.addEventListener('pointercancel', () => { mouse.down = false; });
		window.addEventListener('blur', () => { mouse.down = false; });
		window.addEventListener('pointerleave', () => { cursor.visible = false; });
		window.addEventListener('pointerenter', () => { cursor.visible = true; });

		let time = 0;
		let vineGrab = null;
		let grabRequested = false;
		let releaseRequested = false;
		const GRAB_KEY = 'KeyE';
		const SWING_ACCEL = 9.5;
		const SWING_DAMP = 0.995;
		const SWING_GRAVITY = 18.0;
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
			updateCRTFisheyeFilter({ uniforms: crtFisheyeUniforms }, app, dt / 60);
			const seconds = dt / 60;
			time += seconds;
			cursor.position.set(mouse.x, mouse.y);
			for (const vine of vines) vine.update(time, mouse, seconds);

			if (grabRequested) {
				grabRequested = false;
				if (!vineGrab) {
					const near = findNearestVinePoint(player.view.x, player.view.y, 48);
					if (near) {
						const pts = near.vine.getPointsView?.();
						if (pts) {
							const gx = pts.x[near.pointIndex];
							const gy = pts.y[near.pointIndex];
							const ox = player.view.x - gx;
							const oy = (player.view.y - (gy + player.size * 0.55));
							const ropeLen = Math.max(18, Math.hypot(ox, oy));
							vineGrab = {
								vine: near.vine,
								pointIndex: near.pointIndex,
								ropeLen,
								angle: Math.atan2(ox, oy),
								angVel: 0,
							};
						} else {
							vineGrab = near;
						}
						player.grounded = false;
						player.vy *= 0.25;
						player.vx *= 0.25;
					}
				} else {
					releaseRequested = true;
				}
			}
			if (releaseRequested) {
				releaseRequested = false;
				if (vineGrab) {
					const v = vineGrab.vine;
					const i = vineGrab.pointIndex;
					const pts = v.getPointsView?.();
					if (pts) {
						if (typeof vineGrab.ropeLen === 'number' && typeof vineGrab.angVel === 'number' && typeof vineGrab.angle === 'number') {
							const gx = pts.x[i];
							const gy = pts.y[i];
							const L = vineGrab.ropeLen;
							const a = vineGrab.angle;
							const w = vineGrab.angVel;
							const tx = Math.cos(a);
							const ty = -Math.sin(a);
							player.vx = tx * (w * L);
							player.vy = ty * (w * L);
							player.view.x = gx + Math.sin(a) * L;
							player.view.y = gy + Math.cos(a) * L + player.size * 0.55;
						} else {
							const dx = (pts.x[i] - player.view.x);
							const dy = (pts.y[i] - player.view.y);
							player.vx = dx * 6;
							player.vy = dy * 6;
						}
					}
					vineGrab = null;
				}
			}

			if (!vineGrab) {
				player.update(seconds);
			} else {
				// While grabbed: pendulum swing around the grabbed vine point.
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

					// Input (A/D or arrows) pumps swing.
					let input = 0;
					if (player.keys?.has('KeyA') || player.keys?.has('ArrowLeft')) input -= 1;
					if (player.keys?.has('KeyD') || player.keys?.has('ArrowRight')) input += 1;

					// Ensure swing state exists.
					if (typeof vineGrab.ropeLen !== 'number') vineGrab.ropeLen = Math.max(28, player.size * 2.0);
					if (typeof vineGrab.angle !== 'number') vineGrab.angle = 0;
					if (typeof vineGrab.angVel !== 'number') vineGrab.angVel = 0;
					const L = vineGrab.ropeLen;

					// Simple pendulum dynamics: a'' = -g/L * sin(a) + input
					// Using constants tuned for "game feel" rather than real-world units.
					const a = vineGrab.angle;
					let w = vineGrab.angVel;
					const accel = (-SWING_GRAVITY * Math.sin(a)) + (input * SWING_ACCEL);
					w += accel * seconds;
					w *= Math.pow(SWING_DAMP, dt);
					vineGrab.angle = a + w * seconds;
					vineGrab.angVel = w;

					// Place player at the end of the rope.
					player.view.x = gx + Math.sin(vineGrab.angle) * L;
					player.view.y = gy + Math.cos(vineGrab.angle) * L + player.size * 0.55;
					player.grounded = false;
					// While swinging, keep the player's freefall velocities synced to swing
					// so when you release it feels smooth.
					player.vx = Math.cos(vineGrab.angle) * (vineGrab.angVel * L);
					player.vy = -Math.sin(vineGrab.angle) * (vineGrab.angVel * L);
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
			

			// Rebuild vines layout for new width/height
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
			layoutLinkPlatforms();
			layoutBlogIcon();
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