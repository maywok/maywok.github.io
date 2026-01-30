import { Player } from './player.js';
import { createVines } from './vines.js';
import { createBlogIcon } from './blogIcon.js';
import { createCrimsonFlowBackground } from './background.js';
import {
	createCRTFisheyeFilter,
	updateCRTFisheyeFilter,
	createCRTScanlinesFilter,
	updateCRTScanlinesFilter,
} from './shaders.js';
import { createPixelateFilter } from './pixelate.js';
import { createAppLauncher } from './appLauncher.js';
import { createSystemHud } from './systemHud.js';

const THEMES = {
	light: {
		name: 'Light',
		appBackground: 0x000000,
		bg: { bg: 0x000000, dot: 0x000000, stripe: 0x000000, farAlpha: 0.10, midAlpha: 0.12, nearAlpha: 0.14 },
		player: { fill: 0x000000, glow: 0x000000, glowAlpha: 0.0 },
		vines: { hue: 0xffffff },
		crt: { intensity: 0.0, brightness: 1.0, glowColor: 0x000000, scanStrength: 0.25 },
	},
	dark: {
		name: 'Dark',
		appBackground: 0x000000,
		bg: { bg: 0x000000, dot: 0x000000, stripe: 0x000000, farAlpha: 0.10, midAlpha: 0.14, nearAlpha: 0.18 },
		player: { fill: 0xf5e6c8, glow: 0xf5e6c8, glowAlpha: 0.22 },
		vines: { hue: 0xffffff },
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

		const portfolioOverlay = document.getElementById('portfolio-overlay');
		const portfolioVideo = document.getElementById('portfolio-video');
		let portfolioActive = false;
		const setPortfolioActive = (next) => {
			portfolioActive = next;
			document.documentElement.classList.toggle('portfolio-active', next);
			if (portfolioOverlay) {
				portfolioOverlay.setAttribute('aria-hidden', next ? 'false' : 'true');
			}
			if (portfolioVideo) {
				if (next) {
					const p = portfolioVideo.play();
					if (p && typeof p.catch === 'function') p.catch(() => {});
				} else {
					portfolioVideo.pause();
				}
			}
		};

		if (document.fonts && document.fonts.load) {
			try {
				const fontPromise = document.fonts.load('16px Minecraft');
				const fontTimeout = new Promise((resolve) => {
					window.setTimeout(resolve, 1500);
				});
				await Promise.race([fontPromise, fontTimeout]);
				await new Promise((r) => requestAnimationFrame(() => r()));
			} catch (_) {
			}
		}

		const app = new PIXI.Application({
				resizeTo: root,
				background: THEMES[loadThemeKey()].appBackground,
				antialias: true,
			});
		app.start?.();
		app.ticker?.start?.();
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
			const { container: flowBackground, update: updateFlowBackground, resize: resizeFlowBackground } = createCrimsonFlowBackground(app, {
				lineColor: 0x6f001b,
				glowColor: 0xa00026,
				bgColor: 0x000000,
				glowAlpha: 0.55,
				parallax: 0.06,
				pixelSize: 8,
				density: 4.6,
				speed: 0.75,
			});
			scene.addChild(flowBackground);
			const SCENE_SCALE = 1.12;
			const CAMERA_PARALLAX = 9;
			const CAMERA_SMOOTHING = 0.08;
			const cameraOffset = { x: 0, y: 0 };
			const screenToWorldX = (screenX) => {
				const cx = app.renderer.width / 2;
				return (screenX - cx) / SCENE_SCALE + cx;
			};
			const screenToWorldY = (screenY) => {
				const cy = app.renderer.height / 2;
				return (screenY - cy) / SCENE_SCALE + cy;
			};
			const screenToWorldSize = (screenSize) => screenSize / SCENE_SCALE;
			function layoutScene() {
				const cx = app.renderer.width / 2;
				const cy = app.renderer.height / 2;
				scene.pivot.set(cx, cy);
				scene.position.set(cx, cy);
				scene.scale.set(SCENE_SCALE);
			}
			const { filter: crtFisheyeFilter, uniforms: crtFisheyeUniforms } = createCRTFisheyeFilter(app, {
				intensity: 0.08,
				brightness: 0.06,
				scanStrength: 0.85,
				curve: 0.03,
				vignette: 0.28,
			});
			const { filter: crtScanlinesFilter, uniforms: crtScanlinesUniforms } = createCRTScanlinesFilter(app, {
				strength: 0.42,
				speed: 0.25,
				noise: 0.03,
				mask: 0.14,
			});
			crtFisheyeFilter.padding = 16;
			scene.filters = [crtFisheyeFilter, crtScanlinesFilter];

			const inverseFisheye = (nx, ny, curve) => {
				if (!curve || curve <= 0) return { x: nx, y: ny };
				const px = nx * 2 - 1;
				const py = ny * 2 - 1;
				const r2p = px * px + py * py;
				if (r2p <= 1e-6) return { x: nx, y: ny };
				const rp = Math.sqrt(r2p);
				let r = rp;
				for (let i = 0; i < 6; i++) {
					const f = r + curve * r * r * r - rp;
					const df = 1 + 3 * curve * r * r;
					r = r - f / df;
				}
				const scale = (r > 0) ? (r / rp) : 1;
				const ux = (px * scale + 1) * 0.5;
				const uy = (py * scale + 1) * 0.5;
				return { x: ux, y: uy };
			};
			const interaction = app.renderer.plugins.interaction;
			const defaultMapPositionToPoint = interaction.mapPositionToPoint.bind(interaction);
			interaction.mapPositionToPoint = (point, x, y) => {
				const w = app.renderer.width || 0;
				const h = app.renderer.height || 0;
				if (w <= 0 || h <= 0) {
					defaultMapPositionToPoint(point, x, y);
					return;
				}
				const nx = x / w;
				const ny = y / h;
				const { x: ux, y: uy } = inverseFisheye(nx, ny, crtFisheyeUniforms?.u_curve ?? 0);
				const mx = ux * w;
				const my = uy * h;
				if (!Number.isFinite(mx) || !Number.isFinite(my)) {
					defaultMapPositionToPoint(point, x, y);
					return;
				}
				point.x = Math.max(0, Math.min(w, mx));
				point.y = Math.max(0, Math.min(h, my));
			};
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

			const lightLayer = new PIXI.Container();
			lightLayer.blendMode = PIXI.BLEND_MODES.ADD;
			scene.addChild(lightLayer);
			const world = new PIXI.Container();
			scene.addChild(world);
			const systemHud = createSystemHud(app, {
				city: 'SEATTLE, WA',
				weather: 'CLEAR 72°F',
				topOffset: 22,
				parent: scene,
			});
			const player = new Player(app);
			player.setColors(theme.player);
			const ENABLE_VINE_LAMPS = true;
			const ENABLE_VINE_LAMP_LIGHTING = true;
			const vineOptions = {
				lamp: {
					enabled: ENABLE_VINE_LAMPS,
					color: 0x9bff6a,
					glowColor: 0x37ff7a,
					radius: 7,
					glowRadius: 28,
					glowAlpha: 0.4,
					coreAlpha: 0.96,
				},
			};
			let { container: vinesLayer, vines } = createVines(app, 12, 6, vineOptions);
			for (const v of vines) v.setColor(theme.vines.hue);
			world.addChild(vinesLayer);

			function makeLampLightTexture(color = '#2f7bff') {
				const size = 256;
				const canvas = document.createElement('canvas');
				canvas.width = size;
				canvas.height = size;
				const ctx = canvas.getContext('2d');
				if (!ctx) return PIXI.Texture.WHITE;
				const cx = size / 2;
				const cy = size / 2;
				const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, size * 0.5);
				grad.addColorStop(0, 'rgba(255,255,255,0.95)');
				grad.addColorStop(0.25, `rgba(${parseInt(color.slice(1, 3), 16)},${parseInt(color.slice(3, 5), 16)},${parseInt(color.slice(5, 7), 16)},0.65)`);
				grad.addColorStop(0.6, `rgba(${parseInt(color.slice(1, 3), 16)},${parseInt(color.slice(3, 5), 16)},${parseInt(color.slice(5, 7), 16)},0.15)`);
				grad.addColorStop(1, 'rgba(0,0,0,0)');
				ctx.fillStyle = grad;
				ctx.fillRect(0, 0, size, size);
				return PIXI.Texture.from(canvas);
			}

			const lampLightTexture = makeLampLightTexture('#37ff7a');
			const vineLightSprites = [];
			const lampLightRadius = 140;
			function rebuildVineLights() {
				lightLayer.removeChildren();
				vineLightSprites.length = 0;
				if (!ENABLE_VINE_LAMP_LIGHTING || !ENABLE_VINE_LAMPS) return;
				for (let i = 0; i < vines.length; i++) {
					const sprite = new PIXI.Sprite(lampLightTexture);
					sprite.anchor.set(0.5);
					sprite.alpha = 0.55;
					const scale = lampLightRadius / (lampLightTexture.width * 0.5);
					sprite.scale.set(scale);
					lightLayer.addChild(sprite);
					vineLightSprites.push(sprite);
				}
			}
			rebuildVineLights();

			const appLauncher = createAppLauncher(app, world, {
				items: [
					{ label: 'Resume', glyph: 'R', tooltip: 'Open Resume', url: './assets/files/mason-walker-resume.pdf' },
					{ label: 'GitHub', glyph: 'G', tooltip: 'View GitHub', url: 'https://github.com/maywok' },
					{ label: 'LinkedIn', glyph: 'L', tooltip: 'Open LinkedIn', url: 'https://www.linkedin.com/in/mason--walker/' },
				],
				screenToWorldX,
				screenToWorldY,
				screenToWorldSize,
			});
			appLauncher.layout();

			const getLauncherDockX = () => {
				const leftX = 110;
				const spacing = Math.max(86, Math.min(140, app.renderer.height * 0.18));
				return leftX + spacing;
			};
			const getLauncherDockY = () => {
				const centerY = app.renderer.height * 0.52;
				const spacing = Math.max(86, Math.min(140, app.renderer.height * 0.18));
				const startY = centerY - spacing;
				return startY;
			};
			const getLauncherIconSize = () => Math.max(48, Math.min(74, app.renderer.height * 0.1));
			const withTimeout = (promise, ms, label) => {
				let timeoutId;
				const timeout = new Promise((_, reject) => {
					timeoutId = window.setTimeout(() => {
						reject(new Error(`${label} timed out after ${ms}ms`));
					}, ms);
				});
				return Promise.race([promise, timeout]).finally(() => {
					window.clearTimeout(timeoutId);
				});
			};
			let layoutBlogIcon = () => {};
			try {
				const blogIconResult = await withTimeout(createBlogIcon(app, world, {
					url: '/blog',
					screenScale: SCENE_SCALE,
					dockScreenX: getLauncherDockX,
					dockScreenY: getLauncherDockY,
					backgroundWidth: screenToWorldSize(getLauncherIconSize()),
					backgroundHeight: screenToWorldSize(getLauncherIconSize()),
				}), 6000, 'Blog icon');
				if (blogIconResult?.layout) layoutBlogIcon = blogIconResult.layout;
			} catch (err) {
				console.warn('Blog icon init failed or timed out:', err);
			}

			world.addChild(player.view);
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
		let wpw = screenToWorldSize(pw);
		let wph = screenToWorldSize(ph);
		let wpx = screenToWorldX(px);
		let wpy = screenToWorldY(py);
		platform.drawRoundedRect(wpx, wpy, wpw, wph, 6);
		platform.endFill();
		const platformEdge = new PIXI.Graphics();
		platformEdge.lineStyle(3, 0x00e6ff, 0.95);
		platformEdge.moveTo(wpx + 6, wpy + wph);
		platformEdge.lineTo(wpx + wpw - 6, wpy + wph);
		world.addChild(platform);
		world.addChild(platformEdge);

		const mouse = {
			x: app.renderer.width * 0.5,
			y: app.renderer.height * 0.3,
			down: false,
		};
		const cursorTextureUrl = './assets/spritesheet/cursor.png';
		try {
			await withTimeout(PIXI.Assets.load([cursorTextureUrl]), 2500, 'Cursor texture');
		} catch (err) {
			console.warn('Cursor texture load failed or timed out:', err);
		}
		const cursorTexture = PIXI.Texture.from(cursorTextureUrl);
		const cursorBase = cursorTexture.baseTexture;
		const cursor = new PIXI.Sprite(cursorTexture);
		cursor.anchor.set(0.5);
		const cursorGlow = new PIXI.Sprite(cursorTexture);
		cursorGlow.anchor.set(0.5);
		cursorGlow.tint = 0xff5aa8;
		cursorGlow.alpha = 0.35;
		cursorGlow.scale.set(1.35);
		cursorGlow.blendMode = PIXI.BLEND_MODES.ADD;
		const USE_ANIMATED_CURSOR = true;
		const CURSOR_ANIM_MAX_FRAMES = 240;
		let cursorAnim = null;
		const fallbackFrame = 32;
		const frameW = Math.max(1, Math.min(fallbackFrame, Math.round(cursorTexture.height) || fallbackFrame));
		const frameH = Math.max(1, Math.min(fallbackFrame, Math.round(cursorTexture.height) || fallbackFrame));
		const cols = Math.floor(cursorBase.width / frameW);
		const rows = Math.floor(cursorBase.height / frameH);
		const firstFrameTexture = new PIXI.Texture(cursorBase, new PIXI.Rectangle(0, 0, frameW, frameH));
		cursor.texture = firstFrameTexture;
		cursorGlow.texture = firstFrameTexture;
		if (USE_ANIMATED_CURSOR && cols > 0 && rows > 0) {
			const frames = [];
			for (let y = 0; y < rows; y++) {
				for (let x = 0; x < cols; x++) {
					if (frames.length >= CURSOR_ANIM_MAX_FRAMES) break;
					frames.push(new PIXI.Texture(
						cursorBase,
						new PIXI.Rectangle(x * frameW, y * frameH, frameW, frameH),
					));
				}
				if (frames.length >= CURSOR_ANIM_MAX_FRAMES) break;
			}
			if (frames.length > 0) {
				cursorAnim = new PIXI.AnimatedSprite(frames);
				cursorAnim.anchor.set(0.5);
				cursorAnim.animationSpeed = 0.22;
				cursorAnim.play();
			}
		}
		const cursorContainer = new PIXI.Container();
		if (cursorAnim && cursorAnim.totalFrames > 1) cursorContainer.addChild(cursorGlow, cursorAnim);
		else cursorContainer.addChild(cursorGlow, cursor);
		const { filter: cursorPixelateFilter, update: updateCursorPixelate } = createPixelateFilter(app, { pixelSize: 2 });
		cursorContainer.filters = [cursorPixelateFilter];
		world.addChild(cursorContainer);

			const leftPortal = new PIXI.Container();
			const leftGlowSoft = new PIXI.Graphics();
			const leftGlow = new PIXI.Graphics();
			const leftArrow = new PIXI.Graphics();
			leftPortal.addChild(leftGlowSoft, leftGlow, leftArrow);
			world.addChild(leftPortal);
		leftArrow.eventMode = 'static';
		leftArrow.cursor = 'pointer';
		leftArrow.on('pointertap', () => setPortfolioActive(true));
			let leftPortalWidth = 84;
		let leftPortalProgress = 0;
			function drawPixelArrow(graphics, size, fillColor) {
				const px = Math.max(1, Math.round(size / 6));
				const grid = [
					[0, 0, 1, 0, 0],
					[0, 1, 1, 0, 0],
					[1, 1, 1, 1, 1],
					[0, 1, 1, 0, 0],
					[0, 0, 1, 0, 0],
				];
				graphics.beginFill(fillColor, 0.95);
				for (let y = 0; y < grid.length; y++) {
					for (let x = 0; x < grid[y].length; x++) {
						if (grid[y][x]) graphics.drawRect(x * px, y * px, px, px);
					}
				}
				graphics.endFill();
				const w = grid[0].length * px;
				const h = grid.length * px;
				graphics.pivot.set(w / 2, h / 2);
			}
		function layoutLeftPortal() {
				leftPortalWidth = Math.max(56, Math.min(110, app.renderer.width * 0.095));
				const h = app.renderer.height;
				const portalW = screenToWorldSize(leftPortalWidth);
				const portalH = screenToWorldSize(h);
				leftPortal.position.set(screenToWorldX(0), screenToWorldY(0));

				const bulge = portalW * 0.65;
				const midY = portalH * 0.5;
				const curveX = portalW + bulge;
				const edgeX = portalW * 0.55;

				leftGlowSoft.clear();
				leftGlowSoft.beginFill(0x9bff6a, 0.06);
				leftGlowSoft.moveTo(0, 0);
				leftGlowSoft.lineTo(edgeX, 0);
				leftGlowSoft.quadraticCurveTo(curveX, midY, edgeX, portalH);
				leftGlowSoft.lineTo(0, portalH);
				leftGlowSoft.closePath();
				leftGlowSoft.endFill();

				leftGlow.clear();
				leftGlow.beginFill(0x9bff6a, 0.12);
				leftGlow.moveTo(0, 0);
				leftGlow.lineTo(portalW * 0.45, 0);
				leftGlow.quadraticCurveTo(portalW + bulge * 0.35, midY, portalW * 0.45, portalH);
				leftGlow.lineTo(0, portalH);
				leftGlow.closePath();
				leftGlow.endFill();

				const arrowSize = screenToWorldSize(Math.max(12, Math.min(22, app.renderer.height * 0.03)));
				leftArrow.clear();
				drawPixelArrow(leftArrow, arrowSize, 0xb6ff74);
				leftArrow.position.set(portalW * 0.52, portalH * 0.5);
				leftArrow.hitArea = new PIXI.Circle(0, 0, arrowSize * 0.7);
		}
		layoutLeftPortal();

		const ENABLE_CLICK_AUDIO = false;
		const CLICK_AUDIO_URL = './assets/audio/clickdown.wav';
		let clickAudioCtx = null;
		let clickBuffer = null;
		let clickLoadPromise = null;
		async function ensureClickAudio() {
			if (!ENABLE_CLICK_AUDIO) return null;
			if (!clickAudioCtx) {
				const Ctx = window.AudioContext || window.webkitAudioContext;
				if (!Ctx) return null;
				clickAudioCtx = new Ctx();
			}
			if (clickAudioCtx.state === 'suspended') {
				try { await clickAudioCtx.resume(); } catch (_) {}
			}
			if (clickBuffer) return clickBuffer;
			if (!clickLoadPromise) {
				clickLoadPromise = (async () => {
					const res = await fetch(CLICK_AUDIO_URL);
					const arr = await res.arrayBuffer();
					clickBuffer = await clickAudioCtx.decodeAudioData(arr);
					return clickBuffer;
				})();
			}
			return clickLoadPromise;
		}
		function playClickSlice(startRatio, endRatio, volume = 0.8) {
			if (!clickAudioCtx || !clickBuffer) return;
			const start = clickBuffer.duration * startRatio;
			const duration = Math.max(0.01, clickBuffer.duration * (endRatio - startRatio));
			const source = clickAudioCtx.createBufferSource();
			const gain = clickAudioCtx.createGain();
			source.buffer = clickBuffer;
			gain.gain.value = volume;
			source.connect(gain).connect(clickAudioCtx.destination);
			source.start(0, start, duration);
		}
		function updateMouseFromEvent(e) {
			const rect = app.view.getBoundingClientRect();
			if (!rect || rect.width <= 0 || rect.height <= 0) return;
			const x = e.clientX - rect.left;
			const y = e.clientY - rect.top;
			const w = app.renderer.width;
			const h = app.renderer.height;
			if (w <= 0 || h <= 0) return;
			const scaledX = x * (w / rect.width);
			const scaledY = y * (h / rect.height);
			const cursorHalfW = cursor.width * 0.5;
			const cursorHalfH = cursor.height * 0.5;
			const nextX = Math.max(cursorHalfW, Math.min(w - cursorHalfW, scaledX));
			const nextY = Math.max(cursorHalfH, Math.min(h - cursorHalfH, scaledY));
			if (Number.isFinite(nextX) && Number.isFinite(nextY)) {
				mouse.x = nextX;
				mouse.y = nextY;
			}
		}
		window.addEventListener('pointermove', updateMouseFromEvent);
		window.addEventListener('pointerdown', updateMouseFromEvent);
		window.addEventListener('pointerenter', updateMouseFromEvent);
		window.addEventListener('mousemove', updateMouseFromEvent);
		window.addEventListener('pointerdown', async () => {
			mouse.down = true;
			cursorContainer.visible = true;
			try {
				await ensureClickAudio();
				playClickSlice(0.0, 0.5, 0.85);
			} catch (_) {}
		});
		window.addEventListener('pointerup', async () => {
			mouse.down = false;
			try {
				await ensureClickAudio();
				playClickSlice(0.5, 1.0, 0.85);
			} catch (_) {}
		});
		window.addEventListener('pointercancel', () => { mouse.down = false; });
		window.addEventListener('blur', () => { mouse.down = false; });
		window.addEventListener('pointerleave', () => { cursorContainer.visible = false; });
		window.addEventListener('pointerenter', () => { cursorContainer.visible = true; });

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

		function invertFisheyeUV(uv, curve, iterations = 5) {
			if (!curve || curve <= 0) return uv;
			let px = uv.x * 2 - 1;
			let py = uv.y * 2 - 1;
			const tx = px;
			const ty = py;
			for (let i = 0; i < iterations; i++) {
				const r2 = px * px + py * py;
				const k = 1 + curve * r2;
				px = tx / k;
				py = ty / k;
			}
			return { x: (px + 1) * 0.5, y: (py + 1) * 0.5 };
		}

		app.ticker.add((dt) => {
			if (!Number.isFinite(mouse.x) || !Number.isFinite(mouse.y)) {
				mouse.x = app.renderer.width * 0.5;
				mouse.y = app.renderer.height * 0.5;
			}
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
			updateCRTScanlinesFilter({ uniforms: crtScanlinesUniforms }, app, dt / 60);
			updateCursorPixelate();
			appLauncher.update(time);
			systemHud.update(time);
			if (!portfolioActive) {
				const edgeWidth = Math.max(1, leftPortalWidth);
				const edgeFactor = Math.max(0, Math.min(1, 1 - mouse.x / edgeWidth));
				leftPortalProgress += (edgeFactor - leftPortalProgress) * 0.18;
					leftGlowSoft.alpha = 0.02 + 0.12 * leftPortalProgress;
					leftGlow.alpha = 0.03 + 0.16 * leftPortalProgress;
					leftArrow.alpha = 0.04 + 0.5 * leftPortalProgress;
					const scale = 0.68 + 0.14 * leftPortalProgress;
				leftArrow.scale.set(scale);
				leftPortal.visible = true;
			} else {
				leftPortalProgress += (0 - leftPortalProgress) * 0.2;
				leftGlowSoft.alpha = 0;
				leftGlow.alpha = 0;
				leftArrow.alpha = 0;
				leftPortal.visible = false;
			}
			const seconds = dt / 60;
			time += seconds;
			scene.alpha = 1;
			const nx = (mouse.x / app.renderer.width) * 2 - 1;
			const ny = (mouse.y / app.renderer.height) * 2 - 1;
			const targetX = -nx * CAMERA_PARALLAX;
			const targetY = -ny * CAMERA_PARALLAX;
			cameraOffset.x += (targetX - cameraOffset.x) * CAMERA_SMOOTHING;
			cameraOffset.y += (targetY - cameraOffset.y) * CAMERA_SMOOTHING;
				updateFlowBackground(time, cameraOffset);
			const cx = app.renderer.width / 2;
			const cy = app.renderer.height / 2;
			const uv = { x: mouse.x / app.renderer.width, y: mouse.y / app.renderer.height };
			let undistortedUV = invertFisheyeUV(uv, crtFisheyeUniforms?.u_curve ?? 0);
			if (!Number.isFinite(undistortedUV.x) || !Number.isFinite(undistortedUV.y)) {
				undistortedUV = { x: uv.x, y: uv.y };
			}
			undistortedUV.x = Math.max(0, Math.min(1, undistortedUV.x));
			undistortedUV.y = Math.max(0, Math.min(1, undistortedUV.y));
			const screenX = undistortedUV.x * app.renderer.width;
			const screenY = undistortedUV.y * app.renderer.height;
			const mouseWorldX = (screenX - cx - cameraOffset.x) / SCENE_SCALE + cx;
			const mouseWorldY = (screenY - cy - cameraOffset.y) / SCENE_SCALE + cy;
			cursorContainer.position.set(mouseWorldX, mouseWorldY);
			scene.position.set(
				app.renderer.width / 2 + cameraOffset.x,
				app.renderer.height / 2 + cameraOffset.y,
			);
			const mouseWorld = { x: mouseWorldX, y: mouseWorldY, down: mouse.down };
			for (const vine of vines) vine.update(time, mouseWorld, seconds);
			if (ENABLE_VINE_LAMP_LIGHTING && ENABLE_VINE_LAMPS) {
				for (let i = 0; i < vines.length; i++) {
					const v = vines[i];
					const s = vineLightSprites[i];
					if (!s || !v?.lamp?.enabled) continue;
					const p = v.getLampPosition();
					s.position.set(p.x, p.y);
					s.alpha = 0.45 + 0.1 * Math.sin(time * 2.0 + i * 0.5);
				}
			}

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
			resolveTopPlatform(wpx, wpy, wpw, wph);
			// then link platforms
			for (const lp of appLauncher.platforms) {
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
			layoutScene();
			layoutLeftPortal();
			resizeFlowBackground();
			

			// Rebuild vines layout for new width/height
			world.removeChild(vinesLayer);
			const rebuilt = createVines(app, 12, 6, vineOptions);
			world.addChild(rebuilt.container);
			vinesLayer = rebuilt.container;
			vines.length = 0; // mutate array in-place to keep reference
			for (const v of rebuilt.vines) vines.push(v);
			rebuildVineLights();
			player.onResize();

			// Rebuild platform for new size
			platform.clear();
			platform.beginFill(0x00e6ff, 0.18);
			const npw = Math.max(220, Math.floor(app.renderer.width * 0.28));
			const nph = 14;
			const npx = Math.floor((app.renderer.width - npw) / 2);
			const npy = Math.floor(app.renderer.height * 0.62);
			wpw = screenToWorldSize(npw);
			wph = screenToWorldSize(nph);
			wpx = screenToWorldX(npx);
			wpy = screenToWorldY(npy);
			platform.drawRoundedRect(wpx, wpy, wpw, wph, 6);
			platform.endFill();
			platformEdge.clear();
			platformEdge.lineStyle(3, 0x00e6ff, 0.95);
			platformEdge.moveTo(wpx + 6, wpy + wph);
			platformEdge.lineTo(wpx + wpw - 6, wpy + wph);
			// Update collision references
			pw = npw; ph = nph; px = npx; py = npy;

			// Reposition link platforms relative to new size
			appLauncher.layout();
			systemHud.layout();
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

if (document.documentElement.classList.contains('startup-ready')) {
	boot();
} else {
	window.addEventListener('mw-start', () => boot(), { once: true });
}