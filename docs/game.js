import { Player } from './player.js';
import { createVines } from './vines.js';
import { createBlogIcon } from './blogIcon.js';
import { createLinkedinIcon } from './linkedinIcon.js';
import { createReflexIcon } from './reflex/reflexIcon.js';
import { createWalklatroIcon } from './walklatro/walklatroIcon.js';
import { createCrimsonFlowBackground } from './background.js';
import {
	createCRTFisheyeFilter,
	updateCRTFisheyeFilter,
	createCRTScanlinesFilter,
	updateCRTScanlinesFilter,
} from './shaders.js';
import { createPixelateFilter } from './pixelate.js';
import { createAppLauncher } from './appLauncher.js';

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

		const desktopTwoOverlay = document.getElementById('desktop-two-overlay');
		const desktopTwoRoot = document.getElementById('desktop-two-root');
		let desktopTwoApp = null;
		let desktopTwoActive = false;
		const ensureDesktopTwoBackground = () => {
			if (!desktopTwoRoot || desktopTwoApp) return;
			const DESKTOP_TWO_BG = 0xd7bf98;
			desktopTwoApp = new PIXI.Application({
				resizeTo: desktopTwoRoot,
				background: DESKTOP_TWO_BG,
				backgroundColor: DESKTOP_TWO_BG,
				backgroundAlpha: 1,
				antialias: true,
			});
			desktopTwoApp.start?.();
			desktopTwoApp.ticker?.start?.();
			desktopTwoApp.renderer.background.color = DESKTOP_TWO_BG;
			desktopTwoApp.stage.roundPixels = true;
			if (PIXI.settings) {
				PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.NEAREST;
				PIXI.settings.ROUND_PIXELS = true;
			}
			desktopTwoRoot.appendChild(desktopTwoApp.view);
			desktopTwoRoot.style.backgroundColor = '#d7bf98';
			desktopTwoApp.view.style.width = '100%';
			desktopTwoApp.view.style.height = '100%';
			desktopTwoApp.view.style.display = 'block';
			desktopTwoApp.view.style.backgroundColor = '#d7bf98';
			const desktopTwoBaseFill = new PIXI.Sprite(PIXI.Texture.WHITE);
			desktopTwoBaseFill.tint = DESKTOP_TWO_BG;
			desktopTwoBaseFill.position.set(0, 0);
			desktopTwoBaseFill.width = desktopTwoApp.renderer.width;
			desktopTwoBaseFill.height = desktopTwoApp.renderer.height;
			desktopTwoApp.stage.addChild(desktopTwoBaseFill);
			const desktopTwoScene = new PIXI.Container();
			desktopTwoApp.stage.addChild(desktopTwoScene);
			const { container: desktopTwoFlow, update: updateDesktopTwoFlow, resize: resizeDesktopTwoFlow } = createCrimsonFlowBackground(desktopTwoApp, {
				lineColor: 0x0c0707,
				glowColor: 0x6e0f1d,
				bgColor: DESKTOP_TWO_BG,
				glowAlpha: 0.5,
				parallax: 0.06,
				pixelSize: 8,
				density: 4.85,
				speed: 0.75,
			});
			const { filter: desktopTwoFisheyeFilter, uniforms: desktopTwoFisheyeUniforms } = createCRTFisheyeFilter(desktopTwoApp, {
				intensity: 0.0,
				brightness: 0.0,
				scanStrength: 0.0,
				curve: 0.0,
				vignette: 0.0,
			});
			const { filter: desktopTwoScanlinesFilter, uniforms: desktopTwoScanlinesUniforms } = createCRTScanlinesFilter(desktopTwoApp, {
				strength: 0.0,
				speed: 0.25,
				noise: 0.0,
				mask: 0.0,
			});
			desktopTwoFisheyeFilter.padding = 16;
			desktopTwoScene.filters = null;
			desktopTwoScene.addChild(desktopTwoFlow);

			const rightPortal = new PIXI.Container();
			const rightGlowSoft = new PIXI.Graphics();
			const rightGlow = new PIXI.Graphics();
			const rightArrow = new PIXI.Graphics();
			const rightPortalHitZone = new PIXI.Graphics();
			rightPortal.addChild(rightGlowSoft, rightGlow, rightArrow, rightPortalHitZone);
			desktopTwoScene.addChild(rightPortal);
			rightArrow.eventMode = 'static';
			rightArrow.cursor = 'pointer';
			rightArrow.on('pointertap', () => setDesktopTwoActive(false));
			rightPortalHitZone.eventMode = 'static';
			rightPortalHitZone.cursor = 'pointer';
			rightPortalHitZone.on('pointertap', () => setDesktopTwoActive(false));

			let rightPortalWidth = 84;
			let rightPortalProgress = 0;
			let rightPortalShownX = 0;
			let rightPortalHiddenX = 0;
			let rightPortalY = 0;
			const desktopTwoMouse = {
				x: desktopTwoApp.renderer.width * 0.5,
				y: desktopTwoApp.renderer.height * 0.5,
			};
			const updateDesktopTwoMouse = (event) => {
				if (!desktopTwoApp?.view) return;
				const rect = desktopTwoApp.view.getBoundingClientRect();
				if (!rect || rect.width <= 0 || rect.height <= 0) return;
				const x = (event.clientX - rect.left) * (desktopTwoApp.renderer.width / rect.width);
				const y = (event.clientY - rect.top) * (desktopTwoApp.renderer.height / rect.height);
				const cursorHalfW = desktopTwoCursorSprite.width * 0.5;
				const cursorHalfH = desktopTwoCursorSprite.height * 0.5;
				const nextX = Math.max(cursorHalfW, Math.min(desktopTwoApp.renderer.width - cursorHalfW, x));
				const nextY = Math.max(cursorHalfH, Math.min(desktopTwoApp.renderer.height - cursorHalfH, y));
				if (Number.isFinite(nextX)) desktopTwoMouse.x = nextX;
				if (Number.isFinite(nextY)) desktopTwoMouse.y = nextY;
			};
			desktopTwoApp.view.addEventListener('pointermove', updateDesktopTwoMouse);
			desktopTwoApp.view.addEventListener('pointerdown', updateDesktopTwoMouse);
			desktopTwoApp.view.addEventListener('pointerenter', updateDesktopTwoMouse);

			const desktopTwoCursor = new PIXI.Container();
			const desktopTwoCursorSprite = new PIXI.Sprite(cursorTexture);
			desktopTwoCursorSprite.anchor.set(0.5);
			const desktopTwoCursorGlow = new PIXI.Sprite(cursorTexture);
			desktopTwoCursorGlow.anchor.set(0.5);
			desktopTwoCursorGlow.tint = 0xff5aa8;
			desktopTwoCursorGlow.alpha = 0.35;
			desktopTwoCursorGlow.scale.set(1.2);
			desktopTwoCursorGlow.blendMode = PIXI.BLEND_MODES.ADD;
			const firstDesktopTwoCursorFrame = new PIXI.Texture(cursorBase, new PIXI.Rectangle(0, 0, frameW, frameH));
			desktopTwoCursorSprite.texture = firstDesktopTwoCursorFrame;
			desktopTwoCursorGlow.texture = firstDesktopTwoCursorFrame;
			let desktopTwoCursorAnim = null;
			if (USE_ANIMATED_CURSOR && cols > 0 && rows > 0) {
				const frames = [];
				for (let y = 0; y < rows; y++) {
					for (let x = 0; x < cols; x++) {
						if (frames.length >= CURSOR_ANIM_MAX_FRAMES) break;
						frames.push(new PIXI.Texture(cursorBase, new PIXI.Rectangle(x * frameW, y * frameH, frameW, frameH)));
					}
					if (frames.length >= CURSOR_ANIM_MAX_FRAMES) break;
				}
				if (frames.length > 0) {
					desktopTwoCursorAnim = new PIXI.AnimatedSprite(frames);
					desktopTwoCursorAnim.anchor.set(0.5);
					desktopTwoCursorAnim.animationSpeed = 0.22;
					desktopTwoCursorAnim.play();
				}
			}
			if (desktopTwoCursorAnim && desktopTwoCursorAnim.totalFrames > 1) desktopTwoCursor.addChild(desktopTwoCursorGlow, desktopTwoCursorAnim);
			else desktopTwoCursor.addChild(desktopTwoCursorGlow, desktopTwoCursorSprite);
			desktopTwoCursor.eventMode = 'none';
			desktopTwoCursor.scale.set(0.85);
			desktopTwoCursor.zIndex = 300;
			const { filter: desktopTwoCursorPixelate, update: updateDesktopTwoCursorPixelate } = createPixelateFilter(desktopTwoApp, { pixelSize: 2 });
			desktopTwoCursor.filters = [desktopTwoCursorPixelate];
			desktopTwoScene.addChild(desktopTwoCursor);

			const layoutRightPortal = () => {
				rightPortalWidth = Math.max(56, Math.min(110, desktopTwoApp.renderer.width * 0.095));
				const h = desktopTwoApp.renderer.height;
				const portalW = rightPortalWidth;
				const portalH = h;
				rightPortalShownX = desktopTwoApp.renderer.width;
				rightPortalY = 0;
				rightPortalHiddenX = rightPortalShownX + portalW * 0.62;
				rightPortal.position.set(rightPortalHiddenX, rightPortalY);
				rightPortal.scale.set(-1, 1);

				const bulge = portalW * 0.65;
				const midY = portalH * 0.5;
				const curveX = portalW + bulge;
				const edgeX = portalW * 0.55;

				rightGlowSoft.clear();
				rightGlowSoft.beginFill(0x2a0d0d, 0.2);
				rightGlowSoft.moveTo(0, 0);
				rightGlowSoft.lineTo(edgeX, 0);
				rightGlowSoft.quadraticCurveTo(curveX, midY, edgeX, portalH);
				rightGlowSoft.lineTo(0, portalH);
				rightGlowSoft.closePath();
				rightGlowSoft.endFill();

				rightGlow.clear();
				rightGlow.beginFill(0xa5271a, 0.22);
				rightGlow.moveTo(0, 0);
				rightGlow.lineTo(portalW * 0.45, 0);
				rightGlow.quadraticCurveTo(portalW + bulge * 0.35, midY, portalW * 0.45, portalH);
				rightGlow.lineTo(0, portalH);
				rightGlow.closePath();
				rightGlow.endFill();

				const arrowSize = Math.max(16, Math.min(26, desktopTwoApp.renderer.height * 0.038));
				rightArrow.clear();
				drawPixelArrow(rightArrow, arrowSize, 0xf3e0c0);
				rightArrow.position.set(portalW * 0.52, portalH * 0.5);
				rightArrow.hitArea = new PIXI.Circle(0, 0, arrowSize * 1.2);

				rightPortalHitZone.clear();
				rightPortalHitZone.beginFill(0xffffff, 0.001);
				rightPortalHitZone.drawRect(0, 0, portalW * 0.88, portalH);
				rightPortalHitZone.endFill();
			};
			let desktopTwoTime = 0;
			const DESKTOP_TWO_PARALLAX = 9;
			const DESKTOP_TWO_SMOOTHING = 0.08;
			const desktopTwoCameraOffset = { x: 0, y: 0 };
			desktopTwoApp.ticker.add((dt) => {
				desktopTwoTime += dt / 60;
				updateCRTFisheyeFilter({ uniforms: desktopTwoFisheyeUniforms }, desktopTwoApp, dt / 60);
				updateCRTScanlinesFilter({ uniforms: desktopTwoScanlinesUniforms }, desktopTwoApp, dt / 60);
				const nx = (desktopTwoMouse.x / Math.max(1, desktopTwoApp.renderer.width)) * 2 - 1;
				const ny = (desktopTwoMouse.y / Math.max(1, desktopTwoApp.renderer.height)) * 2 - 1;
				const targetX = -nx * DESKTOP_TWO_PARALLAX;
				const targetY = -ny * DESKTOP_TWO_PARALLAX;
				desktopTwoCameraOffset.x += (targetX - desktopTwoCameraOffset.x) * DESKTOP_TWO_SMOOTHING;
				desktopTwoCameraOffset.y += (targetY - desktopTwoCameraOffset.y) * DESKTOP_TWO_SMOOTHING;
				updateDesktopTwoFlow(desktopTwoTime, desktopTwoCameraOffset);
				updateDesktopTwoCursorPixelate();
				desktopTwoCursor.position.set(desktopTwoMouse.x, desktopTwoMouse.y);

				if (!desktopTwoActive) {
					rightPortalProgress += (0 - rightPortalProgress) * 0.2;
					rightGlowSoft.alpha = 0;
					rightGlow.alpha = 0;
					rightArrow.alpha = 0;
					rightPortal.visible = false;
					return;
				}

				const backEdgeWidth = Math.max(1, desktopTwoApp.renderer.width * 0.18);
				const edgeStart = desktopTwoApp.renderer.width - backEdgeWidth;
				const edgeFactor = Math.max(0, Math.min(1, (desktopTwoMouse.x - edgeStart) / backEdgeWidth));
				rightPortalProgress += (edgeFactor - rightPortalProgress) * 0.2;
				rightPortal.position.x = rightPortalHiddenX + (rightPortalShownX - rightPortalHiddenX) * rightPortalProgress;
				rightPortal.position.y = rightPortalY;
				rightGlowSoft.alpha = 0.08 + 0.18 * rightPortalProgress;
				rightGlow.alpha = 0.14 + 0.32 * rightPortalProgress;
				rightArrow.alpha = 0.22 + 0.74 * rightPortalProgress;
				const scale = 0.8 + 0.28 * rightPortalProgress;
				rightArrow.scale.set(scale);
				rightPortal.visible = true;
			});
			const handleDesktopTwoResize = () => {
				desktopTwoBaseFill.width = desktopTwoApp.renderer.width;
				desktopTwoBaseFill.height = desktopTwoApp.renderer.height;
				resizeDesktopTwoFlow();
				layoutRightPortal();
			};
			desktopTwoApp.renderer?.on?.('resize', handleDesktopTwoResize);
			handleDesktopTwoResize();
		};
		const setDesktopTwoActive = (next) => {
			desktopTwoActive = next;
			document.documentElement.classList.toggle('desktop-two-active', next);
			if (desktopTwoOverlay) {
				desktopTwoOverlay.setAttribute('aria-hidden', next ? 'false' : 'true');
			}
			if (next) ensureDesktopTwoBackground();
		};
		window.addEventListener('keydown', (event) => {
			if (event.key === 'Escape' && desktopTwoActive) setDesktopTwoActive(false);
		});

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
			const ambientLayer = new PIXI.Container();
			scene.addChild(ambientLayer);
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
				curve: 0.008,
				vignette: 0.0,
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
			const interaction = app.renderer?.plugins?.interaction || app.renderer?.events;
			const defaultMapPositionToPoint = interaction?.mapPositionToPoint?.bind?.(interaction);
			if (defaultMapPositionToPoint) interaction.mapPositionToPoint = (point, x, y) => {
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
			world.sortableChildren = true;
			scene.addChild(world);
			const player = new Player(app);
			player.setColors(theme.player);
			const ENABLE_VINE_LAMPS = true;
			const ENABLE_VINE_LAMP_LIGHTING = true;
			// TODO: Rework vine visuals (shape, density, and color language) after layout updates are finalized.
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

			const ambientDebris = [];
			const ambientBaseColors = [0x4ab0ff, 0xff4d5a, 0xd2b48c, 0x6dff9a, 0xffffff];
			const mixColors = (a, b, t) => {
				const ar = (a >> 16) & 255;
				const ag = (a >> 8) & 255;
				const ab = a & 255;
				const br = (b >> 16) & 255;
				const bg = (b >> 8) & 255;
				const bb = b & 255;
				const rr = Math.round(ar + (br - ar) * t);
				const rg = Math.round(ag + (bg - ag) * t);
				const rb = Math.round(ab + (bb - ab) * t);
				return (rr << 16) | (rg << 8) | rb;
			};
			const pickAmbientColor = () => {
				if (Math.random() < 0.38) {
					return ambientBaseColors[Math.floor(Math.random() * ambientBaseColors.length)];
				}
				const a = ambientBaseColors[Math.floor(Math.random() * ambientBaseColors.length)];
				let b = ambientBaseColors[Math.floor(Math.random() * ambientBaseColors.length)];
				if (b === a) b = ambientBaseColors[(ambientBaseColors.indexOf(a) + 1) % ambientBaseColors.length];
				return mixColors(a, b, 0.25 + Math.random() * 0.5);
			};
			for (let i = 0; i < 10; i++) {
				const node = new PIXI.Container();
				const glow = new PIXI.Graphics();
				const body = new PIXI.Graphics();
				const edge = new PIXI.Graphics();
				const isDiamond = Math.random() < 0.72;
				const type = isDiamond ? 'diamond' : (Math.random() < 0.5 ? 'triangle' : 'hex');
				const bigDiamond = isDiamond && Math.random() < 0.28;
				const size = bigDiamond ? (12 + Math.random() * 9) : (5 + Math.random() * 5);
				const color = pickAmbientColor();
				glow.beginFill(color, bigDiamond ? 0.11 : 0.08);
				glow.drawCircle(0, 0, size * (bigDiamond ? 1.8 : 1.35));
				glow.endFill();
				body.beginFill(color, 0.5);
				edge.lineStyle(1, color, 0.62);
				if (type === 'diamond') {
					const pts = [
						0, -size,
						size * 0.75, 0,
						0, size,
						-size * 0.75, 0,
					];
					body.drawPolygon(pts);
					edge.drawPolygon(pts);
				} else if (type === 'triangle') {
					const pts = [
						0, -size,
						size * 0.86, size * 0.8,
						-size * 0.86, size * 0.8,
					];
					body.drawPolygon(pts);
					edge.drawPolygon(pts);
				} else {
					const pts = [];
					for (let h = 0; h < 6; h++) {
						const a = (Math.PI / 3) * h - Math.PI / 2;
						pts.push(Math.cos(a) * size, Math.sin(a) * size);
					}
					body.drawPolygon(pts);
					edge.drawPolygon(pts);
				}
				body.endFill();
				node.addChild(glow, body, edge);
				ambientLayer.addChild(node);
				ambientDebris.push({
					panel: node,
					phase: Math.random() * Math.PI * 2,
					driftX: 10 + Math.random() * 22,
					driftY: 8 + Math.random() * 16,
					baseX: 0,
					baseY: 0,
					spin: (Math.random() - 0.5) * 0.2,
					alphaBase: 0.18 + Math.random() * 0.24,
					parallax: 10 + Math.random() * 20,
				});
			}

			const systemCore = new PIXI.Container();
			const coreAura = new PIXI.Graphics();
			const coreRing = new PIXI.Graphics();
			const coreGhost = new PIXI.Sprite(PIXI.Texture.WHITE);
			coreGhost.anchor.set(0.5);
			coreGhost.tint = 0x9bffd6;
			coreGhost.alpha = 0.38;
			coreGhost.visible = false;
			systemCore.addChild(coreAura, coreRing, coreGhost);
			systemCore.zIndex = 8;
			world.addChild(systemCore);


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

			let iconIntroProgress = 0;
			let dragEnabled = false;
			let ringSpin = 0;
			let ringSpinVel = 0;
			const ringDrag = { active: false, lastAngle: 0, lastTime: 0 };
			const ringCandidate = { active: false, startX: 0, startY: 0, lastX: 0, lastY: 0 };
			const ringSlotAngles = [-90, -30, 30, 90, 150, 210];
			const getCoreScreenPos = () => ({
				x: app.renderer.width * 0.5,
				y: app.renderer.height * 0.48,
			});
			const getCoreWorldPos = () => {
				const p = getCoreScreenPos();
				return { x: screenToWorldX(p.x), y: screenToWorldY(p.y) };
			};
			const getRingRadius = () => Math.max(120, Math.min(220, Math.min(app.renderer.width, app.renderer.height) * 0.24));
			const getRingIconSize = () => Math.max(58, Math.min(84, app.renderer.height * 0.108));
			const RING_THROW_BOOST = 1.7;
			const RING_MAX_SPIN_VEL = 10.5;
			const getRingSlotScreenPos = (slotIndex) => {
				const core = getCoreScreenPos();
				const radius = getRingRadius();
				const angle = (ringSlotAngles[slotIndex % ringSlotAngles.length] * Math.PI) / 180 + ringSpin;
				return {
					x: core.x + Math.cos(angle) * radius,
					y: core.y + Math.sin(angle) * radius,
				};
			};
			const getIntroPoseForSlot = (slotIndex) => {
				const core = getCoreScreenPos();
				const target = getRingSlotScreenPos(slotIndex);
				const t = Math.max(0, Math.min(1, iconIntroProgress));
				const eased = 1 - Math.pow(1 - t, 3);
				const size = getRingIconSize() * (0.75 + 0.25 * eased);
				return {
					x: core.x + (target.x - core.x) * eased,
					y: core.y + (target.y - core.y) * eased,
					size,
				};
			};

			const drawSystemCore = (time = 0) => {
				const p = getCoreWorldPos();
				systemCore.position.set(p.x, p.y);
				const pulse = 0.72 + 0.28 * Math.sin(time * 1.6);
				coreAura.clear();
				coreAura.beginFill(0x22f3c8, 0.07 * pulse);
				coreAura.drawCircle(0, 0, screenToWorldSize(96));
				coreAura.endFill();
				coreRing.clear();
				coreRing.lineStyle(2, 0x22f3c8, 0.5);
				coreRing.drawCircle(0, 0, screenToWorldSize(70));
				coreRing.lineStyle(1, 0x9bffd6, 0.32);
				coreRing.drawCircle(0, 0, screenToWorldSize(82));
				coreGhost.width = screenToWorldSize(96);
				coreGhost.height = screenToWorldSize(96);
			};

			const placeAmbientDebris = () => {
				const anchors = [
					{ x: app.renderer.width * 0.14, y: app.renderer.height * 0.2 },
					{ x: app.renderer.width * 0.3, y: app.renderer.height * 0.16 },
					{ x: app.renderer.width * 0.53, y: app.renderer.height * 0.14 },
					{ x: app.renderer.width * 0.78, y: app.renderer.height * 0.2 },
					{ x: app.renderer.width * 0.9, y: app.renderer.height * 0.38 },
					{ x: app.renderer.width * 0.84, y: app.renderer.height * 0.62 },
					{ x: app.renderer.width * 0.67, y: app.renderer.height * 0.78 },
					{ x: app.renderer.width * 0.42, y: app.renderer.height * 0.82 },
					{ x: app.renderer.width * 0.2, y: app.renderer.height * 0.74 },
					{ x: app.renderer.width * 0.08, y: app.renderer.height * 0.5 },
				];
				for (let i = 0; i < ambientDebris.length; i++) {
					const d = ambientDebris[i];
					const a = anchors[i % anchors.length];
					d.baseX = screenToWorldX(a.x);
					d.baseY = screenToWorldY(a.y);
					d.panel.position.set(d.baseX, d.baseY);
				}
			};


			try {
				const ghostUrl = './assets/images/ghostLogo.png';
				await withTimeout(PIXI.Assets.load([ghostUrl]), 3000, 'System core logo');
				coreGhost.texture = PIXI.Texture.from(ghostUrl);
				coreGhost.visible = true;
			} catch (_) {
				coreGhost.visible = false;
			}
			drawSystemCore(0);
			placeAmbientDebris();

			const appLauncher = createAppLauncher(app, world, {
				items: [
					{ label: 'Resume', glyph: 'R', tooltip: 'Open Resume', url: './assets/files/mason-walker-resume.pdf' },
					{ label: 'GitHub', glyph: 'G', tooltip: 'View GitHub', url: 'https://github.com/maywok' },
				],
				screenToWorldX,
				screenToWorldY,
				screenToWorldSize,
				layoutProvider: ({ index }) => {
					const slot = index === 0 ? 5 : 1;
					return getIntroPoseForSlot(slot);
				},
			});
			appLauncher.layout();
			let blogIconSetDragEnabled = null;
			let blogIconGetBody = null;
			let blogIconSetMouseProvider = null;
			let linkedinIconSetDragEnabled = null;
			let linkedinIconGetBody = null;
			let linkedinIconSetMouseProvider = null;
			let reflexIconSetDragEnabled = null;
			let reflexIconGetBody = null;
			let reflexIconSetMouseProvider = null;
			let walklatroIconSetDragEnabled = null;
			let walklatroIconGetBody = null;
			let walklatroIconSetMouseProvider = null;
			let layoutBlogIcon = () => {};
			let layoutLinkedinIcon = () => {};
			let layoutReflexIcon = () => {};
			let layoutWalklatroIcon = () => {};
			const lockToggle = new PIXI.Container();
			const lockBg = new PIXI.Graphics();
			const lockGlow = new PIXI.Graphics();
			const lockIcon = new PIXI.Graphics();
			const lockButtonSize = 52;
			let lockHoverTarget = 0;
			let lockHover = 0;
			let lockAnimTarget = 0;
			let lockAnim = 0;
			let lockNeedsRedraw = true;
			lockToggle.eventMode = 'static';
			lockToggle.cursor = 'pointer';
			const drawLockControl = () => {
				const hover = Math.max(0, Math.min(1, lockHover));
				const unlocked = Math.max(0, Math.min(1, lockAnim));
				const borderAlpha = 0.58 + hover * 0.34;
				const glowAlpha = hover * 0.2;

				lockGlow.clear();
				lockGlow.beginFill(0xffffff, glowAlpha);
				lockGlow.drawRoundedRect(-4, -4, lockButtonSize + 8, lockButtonSize + 8, 14);
				lockGlow.endFill();

				lockBg.clear();
				lockBg.beginFill(0x050d0b, 0.9);
				lockBg.lineStyle(1, 0x22f3c8, borderAlpha);
				lockBg.drawRoundedRect(0, 0, lockButtonSize, lockButtonSize, 12);
				lockBg.endFill();

				lockIcon.clear();
				lockIcon.beginFill(0xffffff, 1);
				lockIcon.drawRoundedRect(15, 23, 22, 17, 4);
				lockIcon.endFill();
				lockIcon.beginFill(0x050d0b, 0.95);
				lockIcon.drawCircle(26, 30, 2.1);
				lockIcon.drawRoundedRect(25.3, 31.4, 1.4, 4.2, 0.8);
				lockIcon.endFill();

				const shackleLeftBaseX = 20 + unlocked * 7;
				const shackleLeftBaseY = 23 - unlocked * 6;
				const shackleRightBaseX = 32;
				const shackleTopY = 16;
				lockIcon.lineStyle({
					width: 3,
					color: 0xffffff,
					alpha: 1,
					cap: PIXI.LINE_CAP.ROUND,
					join: PIXI.LINE_JOIN.ROUND,
				});
				lockIcon.moveTo(shackleLeftBaseX, shackleLeftBaseY);
				lockIcon.lineTo(shackleLeftBaseX, shackleTopY + 1.5);
				lockIcon.quadraticCurveTo(26, 9.5, shackleRightBaseX, shackleTopY + 1.5);
				lockIcon.lineTo(shackleRightBaseX, 23);

				lockToggle.scale.set(1 + hover * 0.04);
				lockToggle.pivot.set((lockButtonSize * lockToggle.scale.x - lockButtonSize) * 0.5, (lockButtonSize * lockToggle.scale.y - lockButtonSize) * 0.5);
				lockNeedsRedraw = false;
			};
			lockToggle.addChild(lockGlow, lockBg, lockIcon);
			lockToggle.zIndex = 150;
			world.addChild(lockToggle);
			const applyDragEnabled = (enabled) => {
				dragEnabled = Boolean(enabled);
				lockAnimTarget = dragEnabled ? 1 : 0;
				appLauncher.setDragEnabled?.(dragEnabled, { preserveMomentum: dragEnabled });
				if (blogIconSetDragEnabled) blogIconSetDragEnabled(dragEnabled, { preserveMomentum: dragEnabled });
				if (linkedinIconSetDragEnabled) linkedinIconSetDragEnabled(dragEnabled, { preserveMomentum: dragEnabled });
				if (reflexIconSetDragEnabled) reflexIconSetDragEnabled(dragEnabled, { preserveMomentum: dragEnabled });
				if (walklatroIconSetDragEnabled) walklatroIconSetDragEnabled(dragEnabled, { preserveMomentum: dragEnabled });
				if (dragEnabled) {
					const core = getCoreWorldPos();
					appLauncher.applyOrbitalImpulse?.(core, ringSpinVel);
					const externalBodies = [
						blogIconGetBody?.(),
						linkedinIconGetBody?.(),
						reflexIconGetBody?.(),
						walklatroIconGetBody?.(),
					].filter(Boolean);
					for (const body of externalBodies) {
						const st = body?.state;
						const c = body?.container;
						if (!st || !c) continue;
						const dx = c.position.x - core.x;
						const dy = c.position.y - core.y;
						st.vx += -dy * ringSpinVel;
						st.vy += dx * ringSpinVel;
						st.angVel += ringSpinVel * 0.35;
					}
					ringDrag.active = false;
					ringCandidate.active = false;
				} else {
					ringDrag.active = false;
					ringCandidate.active = false;
					ringSpinVel = 0;
					ringSpin = 0;
					appLauncher.layout(false);
					layoutBlogIcon(false);
					layoutLinkedinIcon(false);
					layoutReflexIcon(false);
					layoutWalklatroIcon(false);
				}
				lockNeedsRedraw = true;
			};
			const placeLockButton = () => {
				const x = screenToWorldX(app.renderer.width - lockButtonSize - 16);
				const y = screenToWorldY(app.renderer.height - lockButtonSize - 16);
				lockToggle.position.set(x, y);
			};
			lockToggle.on('pointerover', () => {
				lockHoverTarget = 1;
				lockNeedsRedraw = true;
			});
			lockToggle.on('pointerout', () => {
				lockHoverTarget = 0;
				lockNeedsRedraw = true;
			});
			lockToggle.on('pointertap', () => applyDragEnabled(!dragEnabled));
			placeLockButton();
			applyDragEnabled(false);
			let lastMouseWorld = { x: app.renderer.width / 2, y: app.renderer.height / 2 };

			const getSlotPose = (slotIndex) => getIntroPoseForSlot(slotIndex);
			const getSlotX = (slotIndex) => getSlotPose(slotIndex).x;
			const getSlotY = (slotIndex) => getSlotPose(slotIndex).y;
			try {
				const blogIconResult = await withTimeout(createBlogIcon(app, world, {
					url: '/blog',
					screenScale: SCENE_SCALE,
					dockScreenX: () => getSlotX(2),
					dockScreenY: () => getSlotY(2),
					backgroundWidth: screenToWorldSize(getRingIconSize()),
					backgroundHeight: screenToWorldSize(getRingIconSize()),
				}), 6000, 'Blog icon');
				if (blogIconResult?.layout) layoutBlogIcon = blogIconResult.layout;
				if (blogIconResult?.setDragEnabled) {
					blogIconSetDragEnabled = blogIconResult.setDragEnabled;
					blogIconSetDragEnabled(dragEnabled);
				}
				if (blogIconResult?.getBody) blogIconGetBody = blogIconResult.getBody;
				if (blogIconResult?.setMouseProvider) blogIconSetMouseProvider = blogIconResult.setMouseProvider;
			} catch (err) {
				console.warn('Blog icon init failed or timed out:', err);
			}
			try {
				const linkedinIconResult = await withTimeout(createLinkedinIcon(app, world, {
					url: 'https://www.linkedin.com/in/mason--walker/',
					screenScale: SCENE_SCALE,
					dockScreenX: () => getSlotX(0),
					dockScreenY: () => getSlotY(0),
					backgroundWidth: screenToWorldSize(getRingIconSize()),
					backgroundHeight: screenToWorldSize(getRingIconSize()),
				}), 6000, 'LinkedIn icon');
				if (linkedinIconResult?.layout) layoutLinkedinIcon = linkedinIconResult.layout;
				if (linkedinIconResult?.setDragEnabled) {
					linkedinIconSetDragEnabled = linkedinIconResult.setDragEnabled;
					linkedinIconSetDragEnabled(dragEnabled);
				}
				if (linkedinIconResult?.getBody) linkedinIconGetBody = linkedinIconResult.getBody;
				if (linkedinIconResult?.setMouseProvider) linkedinIconSetMouseProvider = linkedinIconResult.setMouseProvider;
			} catch (err) {
				console.warn('LinkedIn icon init failed or timed out:', err);
			}
			try {
				const reflexIconResult = await withTimeout(createReflexIcon(app, world, {
					screenScale: SCENE_SCALE,
					dockScreenX: () => getSlotX(3),
					dockScreenY: () => getSlotY(3),
					backgroundWidth: screenToWorldSize(getRingIconSize()),
					backgroundHeight: screenToWorldSize(getRingIconSize()),
				}), 6000, 'Reflex icon');
				if (reflexIconResult?.layout) layoutReflexIcon = reflexIconResult.layout;
				if (reflexIconResult?.setDragEnabled) {
					reflexIconSetDragEnabled = reflexIconResult.setDragEnabled;
					reflexIconSetDragEnabled(dragEnabled);
				}
				if (reflexIconResult?.getBody) reflexIconGetBody = reflexIconResult.getBody;
				if (reflexIconResult?.setMouseProvider) reflexIconSetMouseProvider = reflexIconResult.setMouseProvider;
			} catch (err) {
				console.warn('Reflex icon init failed or timed out:', err);
			}
			try {
				const walklatroIconResult = await withTimeout(createWalklatroIcon(app, world, {
					screenScale: SCENE_SCALE,
					dockScreenX: () => getSlotX(4),
					dockScreenY: () => getSlotY(4),
					backgroundWidth: screenToWorldSize(getRingIconSize()),
					backgroundHeight: screenToWorldSize(getRingIconSize()),
				}), 6000, 'Walklatro icon');
				if (walklatroIconResult?.layout) layoutWalklatroIcon = walklatroIconResult.layout;
				if (walklatroIconResult?.setDragEnabled) {
					walklatroIconSetDragEnabled = walklatroIconResult.setDragEnabled;
					walklatroIconSetDragEnabled(dragEnabled);
				}
				if (walklatroIconResult?.getBody) walklatroIconGetBody = walklatroIconResult.getBody;
				if (walklatroIconResult?.setMouseProvider) walklatroIconSetMouseProvider = walklatroIconResult.setMouseProvider;
			} catch (err) {
				console.warn('Walklatro icon init failed or timed out:', err);
			}
			if (appLauncher?.setExternalBodiesProvider) {
				appLauncher.setExternalBodiesProvider(() => {
					const bodies = [];
					if (blogIconGetBody) bodies.push(blogIconGetBody());
					if (linkedinIconGetBody) bodies.push(linkedinIconGetBody());
					if (reflexIconGetBody) bodies.push(reflexIconGetBody());
					if (walklatroIconGetBody) bodies.push(walklatroIconGetBody());
					return bodies;
				});
			}
			if (blogIconSetMouseProvider) blogIconSetMouseProvider(() => lastMouseWorld);
			if (linkedinIconSetMouseProvider) linkedinIconSetMouseProvider(() => lastMouseWorld);
			if (reflexIconSetMouseProvider) reflexIconSetMouseProvider(() => lastMouseWorld);
			if (walklatroIconSetMouseProvider) walklatroIconSetMouseProvider(() => lastMouseWorld);

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
		cursorGlow.scale.set(1.2);
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
		cursorContainer.eventMode = 'none';
		cursorContainer.scale.set(0.85);
		cursorContainer.zIndex = 200;
		const { filter: cursorPixelateFilter, update: updateCursorPixelate } = createPixelateFilter(app, { pixelSize: 2 });
		cursorContainer.filters = [cursorPixelateFilter];
		world.addChild(cursorContainer);

			const leftPortal = new PIXI.Container();
			const leftGlowSoft = new PIXI.Graphics();
			const leftGlow = new PIXI.Graphics();
			const leftArrow = new PIXI.Graphics();
			const leftPortalHitZone = new PIXI.Graphics();
			leftPortal.addChild(leftGlowSoft, leftGlow, leftArrow, leftPortalHitZone);
			world.addChild(leftPortal);
		leftArrow.eventMode = 'static';
		leftArrow.cursor = 'pointer';
		leftArrow.on('pointertap', () => setDesktopTwoActive(true));
		leftPortalHitZone.eventMode = 'static';
		leftPortalHitZone.cursor = 'pointer';
		leftPortalHitZone.on('pointertap', () => setDesktopTwoActive(true));
			let leftPortalWidth = 84;
		let leftPortalProgress = 0;
		let leftPortalShownX = 0;
		let leftPortalHiddenX = 0;
		let leftPortalY = 0;
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
				leftPortalShownX = screenToWorldX(0);
				leftPortalY = screenToWorldY(0);
				leftPortalHiddenX = leftPortalShownX - portalW * 0.62;
				leftPortal.position.set(leftPortalHiddenX, leftPortalY);

				const bulge = portalW * 0.65;
				const midY = portalH * 0.5;
				const curveX = portalW + bulge;
				const edgeX = portalW * 0.55;

				leftGlowSoft.clear();
				leftGlowSoft.beginFill(0x2a0d0d, 0.2);
				leftGlowSoft.moveTo(0, 0);
				leftGlowSoft.lineTo(edgeX, 0);
				leftGlowSoft.quadraticCurveTo(curveX, midY, edgeX, portalH);
				leftGlowSoft.lineTo(0, portalH);
				leftGlowSoft.closePath();
				leftGlowSoft.endFill();

				leftGlow.clear();
				leftGlow.beginFill(0xa5271a, 0.22);
				leftGlow.moveTo(0, 0);
				leftGlow.lineTo(portalW * 0.45, 0);
				leftGlow.quadraticCurveTo(portalW + bulge * 0.35, midY, portalW * 0.45, portalH);
				leftGlow.lineTo(0, portalH);
				leftGlow.closePath();
				leftGlow.endFill();

				const arrowSize = screenToWorldSize(Math.max(16, Math.min(26, app.renderer.height * 0.038)));
				leftArrow.clear();
				drawPixelArrow(leftArrow, arrowSize, 0xf3e0c0);
				leftArrow.position.set(portalW * 0.52, portalH * 0.5);
				leftArrow.hitArea = new PIXI.Circle(0, 0, arrowSize * 1.2);

				leftPortalHitZone.clear();
				leftPortalHitZone.beginFill(0xffffff, 0.001);
				leftPortalHitZone.drawRect(0, 0, portalW * 0.88, portalH);
				leftPortalHitZone.endFill();
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
		function toRendererPoint(e) {
			const rect = app.view.getBoundingClientRect();
			if (!rect || rect.width <= 0 || rect.height <= 0) return null;
			const x = (e.clientX - rect.left) * (app.renderer.width / rect.width);
			const y = (e.clientY - rect.top) * (app.renderer.height / rect.height);
			if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
			return { x, y };
		}
		function normalizeAngle(a) {
			let v = a;
			while (v > Math.PI) v -= Math.PI * 2;
			while (v < -Math.PI) v += Math.PI * 2;
			return v;
		}
		window.addEventListener('pointermove', updateMouseFromEvent);
		window.addEventListener('pointerdown', updateMouseFromEvent);
		window.addEventListener('pointerenter', updateMouseFromEvent);
		window.addEventListener('mousemove', updateMouseFromEvent);
		window.addEventListener('pointerdown', (e) => {
			if (dragEnabled) return;
			const p = toRendererPoint(e);
			if (!p) return;
			const c = getCoreScreenPos();
			const dx = p.x - c.x;
			const dy = p.y - c.y;
			const d = Math.hypot(dx, dy);
			const coreControlRadius = Math.max(34, getRingRadius() * 0.36);
			if (d > coreControlRadius) return;
			ringCandidate.active = true;
			ringCandidate.startX = p.x;
			ringCandidate.startY = p.y;
			ringCandidate.lastX = p.x;
			ringCandidate.lastY = p.y;
			ringDrag.lastAngle = Math.atan2(dy, dx);
			ringDrag.lastTime = performance.now ? performance.now() : Date.now();
		});
		window.addEventListener('pointermove', (e) => {
			if (dragEnabled || !ringCandidate.active) return;
			const p = toRendererPoint(e);
			if (!p) return;
			const moveDx = p.x - ringCandidate.startX;
			const moveDy = p.y - ringCandidate.startY;
			if (!ringDrag.active && Math.hypot(moveDx, moveDy) < 7) return;
			ringDrag.active = true;
			ringCandidate.lastX = p.x;
			ringCandidate.lastY = p.y;
			const c = getCoreScreenPos();
			const angle = Math.atan2(p.y - c.y, p.x - c.x);
			const now = performance.now ? performance.now() : Date.now();
			const dtMs = Math.max(1, now - ringDrag.lastTime);
			const delta = normalizeAngle(angle - ringDrag.lastAngle);
			ringSpin += delta;
			ringSpinVel = (delta / (dtMs / 1000)) * RING_THROW_BOOST;
			ringSpinVel = Math.max(-RING_MAX_SPIN_VEL, Math.min(RING_MAX_SPIN_VEL, ringSpinVel));
			ringDrag.lastAngle = angle;
			ringDrag.lastTime = now;
			appLauncher.layout();
			layoutBlogIcon();
			layoutLinkedinIcon();
			layoutReflexIcon();
			layoutWalklatroIcon();
		});
		const stopRingDrag = () => {
			ringDrag.active = false;
			ringCandidate.active = false;
		};
		window.addEventListener('pointerup', stopRingDrag);
		window.addEventListener('pointercancel', stopRingDrag);
		window.addEventListener('blur', stopRingDrag);
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
			const seconds = dt / 60;
			const lockEase = Math.min(1, seconds * 14);
			const prevHover = lockHover;
			const prevAnim = lockAnim;
			lockHover += (lockHoverTarget - lockHover) * lockEase;
			lockAnim += (lockAnimTarget - lockAnim) * lockEase;
			if (Math.abs(lockHover - prevHover) > 0.001 || Math.abs(lockAnim - prevAnim) > 0.001 || lockNeedsRedraw) {
				drawLockControl();
			}
			if (!desktopTwoActive) {
				const edgeWidth = Math.max(1, leftPortalWidth * 1.9);
				const edgeFactor = Math.max(0, Math.min(1, 1 - mouse.x / edgeWidth));
				leftPortalProgress += (edgeFactor - leftPortalProgress) * 0.18;
				leftPortal.position.x = leftPortalHiddenX + (leftPortalShownX - leftPortalHiddenX) * leftPortalProgress;
				leftPortal.position.y = leftPortalY;
					leftGlowSoft.alpha = 0.08 + 0.18 * leftPortalProgress;
					leftGlow.alpha = 0.14 + 0.32 * leftPortalProgress;
					leftArrow.alpha = 0.22 + 0.74 * leftPortalProgress;
					const scale = 0.8 + 0.28 * leftPortalProgress;
				leftArrow.scale.set(scale);
				leftPortal.visible = true;
			} else {
				leftPortalProgress += (0 - leftPortalProgress) * 0.2;
				leftPortal.position.x = leftPortalHiddenX;
				leftPortal.position.y = leftPortalY;
				leftGlowSoft.alpha = 0;
				leftGlow.alpha = 0;
				leftArrow.alpha = 0;
				leftPortal.visible = false;
			}
			time += seconds;
			const introSpeed = 1.25;
			if (iconIntroProgress < 1) {
				iconIntroProgress = Math.min(1, iconIntroProgress + seconds * introSpeed);
			}
			if (!ringDrag.active) {
				ringSpin += ringSpinVel * seconds;
				ringSpinVel *= Math.pow(0.982, dt);
				if (!Number.isFinite(ringSpinVel)) ringSpinVel = 0;
				if (!Number.isFinite(ringSpin)) ringSpin = 0;
				if (Math.abs(ringSpinVel) < 0.001) ringSpinVel = 0;
			}
			if (!dragEnabled && (iconIntroProgress < 1 || ringDrag.active || Math.abs(ringSpinVel) > 0)) {
				appLauncher.layout();
				layoutBlogIcon();
				layoutLinkedinIcon();
				layoutReflexIcon();
				layoutWalklatroIcon();
			}
			drawSystemCore(time);
			const mx = (mouse.x / app.renderer.width) * 2 - 1;
			const my = (mouse.y / app.renderer.height) * 2 - 1;
			for (const d of ambientDebris) {
				if (!d?.panel) continue;
				if (!Number.isFinite(d.baseX) || !Number.isFinite(d.baseY)) continue;
				d.panel.position.x = d.baseX + Math.sin(time * 0.34 + d.phase) * d.driftX - mx * d.parallax;
				d.panel.position.y = d.baseY + Math.cos(time * 0.29 + d.phase * 1.2) * d.driftY - my * (d.parallax * 0.7);
				d.panel.rotation = Math.sin(time * 0.18 + d.phase) * d.spin;
				d.panel.alpha = d.alphaBase + 0.1 * Math.sin(time * 0.42 + d.phase);
			}
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
			lastMouseWorld = mouseWorld;
			appLauncher.update(time, seconds, mouseWorld);
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

			// link platforms
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
			placeAmbientDebris();
			drawSystemCore(time);
			

			// Rebuild vines layout for new width/height
			world.removeChild(vinesLayer);
			const rebuilt = createVines(app, 12, 6, vineOptions);
			world.addChild(rebuilt.container);
			vinesLayer = rebuilt.container;
			vines.length = 0; // mutate array in-place to keep reference
			for (const v of rebuilt.vines) vines.push(v);
			rebuildVineLights();
			player.onResize();

			// Reposition link platforms relative to new size
			appLauncher.layout();
			placeLockButton();
			layoutBlogIcon();
			layoutLinkedinIcon();
			layoutReflexIcon();
			layoutWalklatroIcon();
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