import { Player } from './player.js';
import { createVines } from './vines.js';
import { createBlogIcon } from './blogIcon.js';
import { createLinkedinIcon } from './linkedinIcon.js';
import { createReflexIcon } from './reflex/reflexIcon.js';
import { createWalklatroIcon } from './walklatro/walklatroIcon.js';
import { createCrimsonFlowBackground } from './background.js?v=7';
import { BACKGROUND_QUALITY_MODE, createBackgroundQualityManager } from './backgroundQuality.js?v=4';
import {
	createCRTFisheyeFilter,
	updateCRTFisheyeFilter,
	createCRTScanlinesFilter,
	updateCRTScanlinesFilter,
} from './shaders.js';
import { createPixelateFilter } from './pixelate.js';
import { createAppLauncher } from './appLauncher.js';
import { createVineLab } from './vineLab.js';
import {
	initSfx,
	loadSfx,
	playSfx,
	startLoop as startSfxLoop,
	updateLoop as updateSfxLoop,
	stopLoop as stopSfxLoop,
	setSfxVolume,
} from './sfx.js';
import {
	initMusic,
	loadMusic,
	setMusicTrack,
	setMusicPaused,
	setMusicVolume,
} from './music.js';

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

		const BRO_PLACEHOLDER_WORDS = [
			'brochacho',
			'broteinshake',
			'Hy-bro-gen',
			"Bro'dway",
			'brototype',
			'brofile',
			'Bilbro Baggins',
			'Brosidon',
			'bro-cean',
		];
		const pickBroPlaceholderWord = () => {
			if (!BRO_PLACEHOLDER_WORDS.length) return 'brochacho';
			return BRO_PLACEHOLDER_WORDS[Math.floor(Math.random() * BRO_PLACEHOLDER_WORDS.length)];
		};
		let livingRoomActive = false;
		let closeLivingRoomScene = () => {};
		let openLivingRoomScene = () => {};
		let closePortfolioLibraryNow = () => {};
		let openPortfolioLibraryNow = () => {};
		let closeVineLabNow = () => {};
		let openVineLabNow = () => {};
		let updateVineLabNow = () => {};
		let resizeVineLabNow = () => {};
		let vineLabActive = false;
		let returnToTvAreaFromFullscreen = () => {};
		let isFullscreenTvPlaybackActive = () => false;
		let isScreenshotPopoutOpen = () => false;
		const PORTFOLIO_LEFT_TITLE_FONT_FAMILY = 'Minecraft, monospace';
		const PORTFOLIO_RIGHT_INFO_FONT_FAMILY = 'Minecraft, monospace';
		window.addEventListener('keydown', (event) => {
			if (event.key !== 'Escape') return;
			if (isScreenshotPopoutOpen()) return;
			if (vineLabActive) {
				closeVineLabNow();
				return;
			}
			if (isFullscreenTvPlaybackActive()) {
				returnToTvAreaFromFullscreen();
				return;
			}
			if (livingRoomActive) closeLivingRoomScene();
		});
		if (document.fonts && document.fonts.load) {
			try {
				const fontTimeout = new Promise((resolve) => {
					window.setTimeout(resolve, 2200);
				});
				const loadRequestedFonts = Promise.allSettled([
					document.fonts.load('16px "Minecraft"'),
				]);
				const fontsReady = document.fonts.ready || Promise.resolve();
				await Promise.race([
					Promise.allSettled([loadRequestedFonts, fontsReady]),
					fontTimeout,
				]);
				await new Promise((r) => requestAnimationFrame(() => r()));
			} catch (_) {
			}
		}

		const isMobileTouchDevice = () => {
			if (typeof navigator === 'undefined') return false;
			const ua = navigator.userAgent || '';
			const hasTouch = (typeof navigator.maxTouchPoints === 'number' && navigator.maxTouchPoints > 0)
				|| (typeof window !== 'undefined' && 'ontouchstart' in window);
			const mobileUa = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(ua);
			const iPadDesktopUa = /Macintosh/i.test(ua) && hasTouch;
			return hasTouch && (mobileUa || iPadDesktopUa);
		};
		const SHOW_INGAME_CURSOR = !isMobileTouchDevice();

		const backgroundQualityManager = createBackgroundQualityManager({
			requestedMode: BACKGROUND_QUALITY_MODE.AUTO,
		});
		const BACKGROUND_SCENE_QUALITY = {
			[BACKGROUND_QUALITY_MODE.FULL]: {
				ambientDebrisCount: 10,
				cameraParallax: 9,
				scanlineStrengthScale: 1,
				scanlineNoiseScale: 1,
				ambienceUpdateStep: 1,
				ambientDebrisUpdateStep: 1,
			},
			[BACKGROUND_QUALITY_MODE.REDUCED]: {
				ambientDebrisCount: 6,
				cameraParallax: 7.2,
				scanlineStrengthScale: 0.86,
				scanlineNoiseScale: 0.78,
				ambienceUpdateStep: 2,
				ambientDebrisUpdateStep: 2,
			},
		};
		let activeBackgroundQualityMode = backgroundQualityManager.getMode();
		let backgroundSceneQuality = BACKGROUND_SCENE_QUALITY[activeBackgroundQualityMode] || BACKGROUND_SCENE_QUALITY[BACKGROUND_QUALITY_MODE.FULL];

		const app = new PIXI.Application({
				resizeTo: root,
				background: THEMES[loadThemeKey()].appBackground,
				antialias: true,
			});
		if (typeof window !== 'undefined') {
			window.__mwBackgroundQuality = {
				getState: () => backgroundQualityManager.getState(),
				setAuto: () => backgroundQualityManager.setRequestedMode(BACKGROUND_QUALITY_MODE.AUTO, { persistOverride: true, reason: 'debug-set-auto' }),
				setFull: () => backgroundQualityManager.setRequestedMode(BACKGROUND_QUALITY_MODE.FULL, { persistOverride: true, reason: 'debug-set-full' }),
				setReduced: () => backgroundQualityManager.setRequestedMode(BACKGROUND_QUALITY_MODE.REDUCED, { persistOverride: true, reason: 'debug-set-reduced' }),
				startProbe: () => backgroundQualityManager.startRuntimeMonitoring(app.ticker, {
					warmupSeconds: 2.5,
					sampleWindowSeconds: 3.2,
					minimumSamples: 90,
					poorAverageFps: 47,
					poorP95FrameMs: 33,
					requireBothPoorSignals: true,
				}),
			};
		}
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
			app.view.style.cursor = SHOW_INGAME_CURSOR ? 'none' : 'auto';

			const ENABLE_DEBUG_HUD = false;
			const DEBUG_SHAPES = false;
			app.stage.sortableChildren = true;
			const scene = new PIXI.Container();
			scene.sortableChildren = true;
			scene.zIndex = 0;
			app.stage.addChild(scene);
			const uiTopLayer = new PIXI.Container();
			uiTopLayer.sortableChildren = true;
			uiTopLayer.zIndex = 1000;
			app.stage.addChild(uiTopLayer);
			const {
				container: flowBackground,
				update: updateFlowBackground,
				resize: resizeFlowBackground,
				setAmbience: setFlowAmbience,
				setQualityMode: setFlowQualityMode,
			} = createCrimsonFlowBackground(app, {
				lineColor: 0x6f001b,
				glowColor: 0xa00026,
				bgColor: 0x000000,
				glowAlpha: 0.55,
				parallax: 0.06,
				pixelSize: 8,
				density: 4.6,
				speed: 0.75,
				qualityMode: activeBackgroundQualityMode,
			});
			scene.addChild(flowBackground);
			const targetReactiveFxLayer = new PIXI.Container();
			targetReactiveFxLayer.eventMode = 'none';
			const targetReactiveInfluenceLayer = new PIXI.Graphics();
			targetReactiveInfluenceLayer.blendMode = PIXI.BLEND_MODES.ADD;
			const targetReactiveRippleLayer = new PIXI.Graphics();
			targetReactiveRippleLayer.blendMode = PIXI.BLEND_MODES.ADD;
			targetReactiveFxLayer.addChild(targetReactiveInfluenceLayer, targetReactiveRippleLayer);
			targetReactiveFxLayer.visible = false;
			scene.addChild(targetReactiveFxLayer);
			const ambientLayer = new PIXI.Container();
			scene.addChild(ambientLayer);
			const SCENE_SCALE = 1.12;
			let cameraParallax = backgroundSceneQuality.cameraParallax;
			const CAMERA_SMOOTHING = 0.08;
			const cameraOffset = { x: 0, y: 0 };
			let flowAmbienceFrameCounter = 0;
			let ambientDebrisFrameCounter = 0;
			let refreshBackgroundSceneQuality = () => {};

			const applyBackgroundQualityMode = (mode, reason = 'unknown') => {
				const nextMode = mode === BACKGROUND_QUALITY_MODE.REDUCED
					? BACKGROUND_QUALITY_MODE.REDUCED
					: BACKGROUND_QUALITY_MODE.FULL;
				activeBackgroundQualityMode = nextMode;
				backgroundSceneQuality = BACKGROUND_SCENE_QUALITY[nextMode] || BACKGROUND_SCENE_QUALITY[BACKGROUND_QUALITY_MODE.FULL];
				cameraParallax = backgroundSceneQuality.cameraParallax;
				flowAmbienceFrameCounter = 0;
				ambientDebrisFrameCounter = 0;
				setFlowQualityMode?.(nextMode);
				refreshBackgroundSceneQuality();
				console.info('[Background quality]', {
					mode: nextMode,
					reason,
					state: backgroundQualityManager.getState(),
				});
			};
			applyBackgroundQualityMode(activeBackgroundQualityMode, backgroundQualityManager.getReason());
			backgroundQualityManager.onModeChange((event) => {
				applyBackgroundQualityMode(event.mode, event.reason || event.trigger || 'mode-change');
			});
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
			const { filter: crtScanlinesFilter, uniforms: crtScanlinesUniforms } = createCRTScanlinesFilter(app, {
				strength: 0.42,
				speed: 0.25,
				noise: 0.03,
				mask: 0.14,
			});
			scene.filters = [crtScanlinesFilter];
			scene.filterArea = new PIXI.Rectangle(0, 0, app.renderer.width, app.renderer.height);
			window.addEventListener('keydown', (event) => {
				if (event.code !== 'F9') return;
				const filters = scene.filters || [];
				console.log('[F9 CRT]', {
					sceneHasFilters: filters.length > 0,
					sceneFilterCount: filters.length,
					scanlinesAttachedToScene: filters.includes(crtScanlinesFilter),
					scanStrength: crtScanlinesUniforms.u_strength,
					scanNoise: crtScanlinesUniforms.u_noise,
					scanMask: crtScanlinesUniforms.u_mask,
				});
			});
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
			const ENABLE_PLAYER_CUBE = false;
			const player = ENABLE_PLAYER_CUBE ? new Player(app) : null;
			if (player) player.setColors(theme.player);
			const ENABLE_VINE_LAMPS = true;
			const ENABLE_VINE_LAMP_LIGHTING = true;
			// TODO: Rework vine visuals (shape, density, and color language) after layout updates are finalized.
			const vineOptions = {
				lamp: {
					enabled: ENABLE_VINE_LAMPS,
					color: 0xcfe7da,
					glowColor: 0x95c9b2,
					radius: 9,
					glowRadius: 36,
					glowAlpha: 0.28,
					coreAlpha: 0.88,
				},
			};
			let { container: vinesLayer, vines } = createVines(app, 0, 28, vineOptions);
			for (const v of vines) v.setColor(theme.vines.hue);
			world.addChild(vinesLayer);

			const ambientDebris = [];
			const ambientBaseColors = [0x4ab0ff, 0xff4d5a, 0xd2b48c, 0x6dff9a, 0xffffff];
			const hsvToRgbInt = (h, s, v) => {
				const hh = ((h % 1) + 1) % 1;
				const i = Math.floor(hh * 6);
				const f = hh * 6 - i;
				const p = v * (1 - s);
				const q = v * (1 - f * s);
				const t = v * (1 - (1 - f) * s);
				let r = v;
				let g = t;
				let b = p;
				switch (i % 6) {
					case 0: r = v; g = t; b = p; break;
					case 1: r = q; g = v; b = p; break;
					case 2: r = p; g = v; b = t; break;
					case 3: r = p; g = q; b = v; break;
					case 4: r = t; g = p; b = v; break;
					default: r = v; g = p; b = q; break;
				}
				return ((Math.round(r * 255) & 255) << 16) | ((Math.round(g * 255) & 255) << 8) | (Math.round(b * 255) & 255);
			};
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
			const clamp01 = (v) => Math.max(0, Math.min(1, v));
			const FLOW_BASE = {
				lineColor: 0x6f001b,
				glowColor: 0xa00026,
				mistColorA: 0x180f16,
				mistColorB: 0x0d1824,
				mistColorC: 0x22152a,
				sparkStrength: 0.14,
				glowStrength: 0.35,
				speed: 0.75,
				density: 4.6,
				glowAlpha: 0.55,
			};
			const LAMP_BASE = {
				color: 0xcfe7da,
				glowColor: 0x95c9b2,
				glowAlpha: 0.28,
				coreAlpha: 0.88,
			};
			const BASE_MOOD = {
				waveTint: 0xa31d4f,
				waveMix: 0.14,
				lampTint: 0xb8dbc9,
				glowStrength: 0.0,
				contrast: 0.0,
				vignette: 0.01,
				particleColor: 0x37223f,
				waveMotion: 1.0,
				lampBoost: 0.0,
			};
			const MOOD_TRANSITION_SECONDS = 0.34;
			const HOVER_MOOD_DEBOUNCE_MS = 110;
			const MOOD_REENABLE_DELAY_MS = 200;
			const DRAG_MOOD = {
				...BASE_MOOD,
				waveMotion: 0.92,
				waveMix: 0.1,
				vignette: 0.008,
			};
			const TARGET_BACKGROUND_MODE = Object.freeze({
				MENU: 'menu',
				TRANSITION_TO_TARGET: 'transition-to-target',
				TARGET_MINIGAME_UNLOCKED_ACTIVE: 'target-minigame-unlocked-active',
			});
			const TARGET_BACKGROUND_QUALITY = Object.freeze({
				[BACKGROUND_QUALITY_MODE.FULL]: {
					maxRipples: 9,
					maxInfluencers: 5,
					rippleStrokePx: 3.4,
					rippleSpeedPx: 260,
					targetRadiusPx: 132,
					frameStep: 1,
					layerAlpha: 0.82,
				},
				[BACKGROUND_QUALITY_MODE.REDUCED]: {
					maxRipples: 4,
					maxInfluencers: 3,
					rippleStrokePx: 2.4,
					rippleSpeedPx: 220,
					targetRadiusPx: 106,
					frameStep: 2,
					layerAlpha: 0.64,
				},
			});
			const MOOD_MAP = {
				default: BASE_MOOD,
				GitHub: {
					waveTint: 0x5b5768,
					waveMix: 0.12,
					lampTint: 0xba9bc7,
					glowStrength: 0.06,
					contrast: 0.008,
					vignette: 0.03,
					particleColor: 0x4b334f,
					waveMotion: 1.03,
					lampBoost: 0.08,
				},
				LinkedIn: {
					waveTint: 0x2f5ea7,
					waveMix: 0.22,
					lampTint: 0x62bbff,
					glowStrength: 0.12,
					contrast: 0.02,
					vignette: 0.05,
					particleColor: 0x2b4f8b,
					waveMotion: 1.08,
					lampBoost: 0.16,
				},
				Blog: {
					waveTint: 0x4d8c60,
					waveMix: 0.2,
					lampTint: 0x82e79b,
					glowStrength: 0.1,
					contrast: 0.014,
					vignette: 0.045,
					particleColor: 0x3c6c4d,
					waveMotion: 1.06,
					lampBoost: 0.13,
				},
				Reflex: {
					waveTint: 0xd14c8d,
					waveMix: 0.24,
					lampTint: 0xff7f9d,
					glowStrength: 0.18,
					contrast: 0.024,
					vignette: 0.055,
					particleColor: 0x7a2f5d,
					waveMotion: 1.1,
					lampBoost: 0.2,
				},
				Resume: {
					waveTint: 0xc29661,
					waveMix: 0.16,
					lampTint: 0xf2c487,
					glowStrength: 0.1,
					contrast: 0.01,
					vignette: 0.038,
					particleColor: 0x7f6040,
					waveMotion: 1.04,
					lampBoost: 0.11,
				},
				Walklatro: {
					waveTint: 0xc6914b,
					waveMix: 0.17,
					lampTint: 0xf2c46f,
					glowStrength: 0.11,
					contrast: 0.014,
					vignette: 0.04,
					particleColor: 0x8a6137,
					waveMotion: 1.05,
					lampBoost: 0.12,
				},
				Portfolio: {
					waveTint: 0x2e5f85,
					waveMix: 0.2,
					lampTint: 0x83cbff,
					glowStrength: 0.1,
					contrast: 0.018,
					vignette: 0.045,
					particleColor: 0x2f4e6d,
					waveMotion: 1.06,
					lampBoost: 0.13,
				},
				Lab: {
					waveTint: 0x2b8675,
					waveMix: 0.21,
					lampTint: 0x38ffd0,
					glowStrength: 0.11,
					contrast: 0.019,
					vignette: 0.046,
					particleColor: 0x1d6657,
					waveMotion: 1.07,
					lampBoost: 0.14,
				},
			};
			const hoverMoodSources = new Map();
			const pendingMoodSources = new Map();
			let activeMoodEntry = null;
			let moodTarget = { ...BASE_MOOD };
			const moodCurrent = { ...BASE_MOOD };
			let moodHoverEnabled = true;
			let moodLockTarget = null;
			let moodHoverResumeAtMs = 0;
			const getMoodProfile = (key) => MOOD_MAP[key] || MOOD_MAP.default;
			const nowMs = () => (typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now());
			const ICON_SFX = {
				hover: 'hoverIcon',
				click: 'clickIcon',
				exitToMenu: 'exitToMenu',
				exitTab: 'exitTab',
				cartridgeHover: 'hoverCartridge',
				cartridgeSelect: 'selectCartridge',
				enlargeScreenshot: 'enlargeScreenshot',
				returnScreenshot: 'returnScreenshot',
				screenshotScrollA: 'screenshotScrollA',
				screenshotScrollB: 'screenshotScrollB',
				grab: 'grabIcon',
				release: 'releaseIcon',
				spin: 'spinIcon',
				throw: 'throwIcon',
				wallHit: 'iconWallHit',
				breakTarget: 'breakTarget',
				countdown: 'countdown',
			};
			const RING_SPIN_LOOP_KEY = 'ring-spin-loop';
			const SFX_ASSETS = {
				[ICON_SFX.hover]: './assets/audio/sounds/Hover_Icon.mp3',
				[ICON_SFX.click]: './assets/audio/sounds/Click_Icon.mp3',
				[ICON_SFX.exitToMenu]: './assets/audio/sounds/Exit.wav',
				[ICON_SFX.exitTab]: './assets/audio/sounds/Exit_Tab.wav',
				[ICON_SFX.cartridgeHover]: './assets/audio/sounds/Hover_Cartridge.wav',
				[ICON_SFX.cartridgeSelect]: './assets/audio/sounds/Select_Cartridge.wav',
				[ICON_SFX.enlargeScreenshot]: './assets/audio/sounds/Enlarge_Screenshot.wav',
				[ICON_SFX.returnScreenshot]: './assets/audio/sounds/Return_Screenshot.wav',
				[ICON_SFX.screenshotScrollA]: './assets/audio/sounds/Screenshot_Scroll.wav',
				[ICON_SFX.screenshotScrollB]: './assets/audio/sounds/Screenshot_Scroll2.wav',
				[ICON_SFX.grab]: './assets/audio/sounds/Grab_Icon.mp3',
				[ICON_SFX.release]: './assets/audio/sounds/Release_Icon.mp3',
				[ICON_SFX.spin]: './assets/audio/sounds/Spin_Icon.mp3',
				[ICON_SFX.throw]: './assets/audio/sounds/Throw_Icon.mp3',
				[ICON_SFX.wallHit]: './assets/audio/sounds/Icon_Hit_Wall.wav',
				[ICON_SFX.breakTarget]: './assets/audio/sounds/Break_Target.wav',
				[ICON_SFX.countdown]: './assets/audio/sounds/Countdown.wav',
			};
			const MUSIC_TRACKS = {
				menu: 'menu',
				lab: 'lab',
				portfolio: 'portfolio',
				targetTest: 'targetTest',
			};
			const MUSIC_ASSETS = {
				[MUSIC_TRACKS.menu]: { url: './assets/audio/music/Menu.mp3' },
				[MUSIC_TRACKS.lab]: { url: './assets/audio/music/The_Lab.mp3' },
				[MUSIC_TRACKS.portfolio]: { url: './assets/audio/music/Portfolio.mp3' },
				[MUSIC_TRACKS.targetTest]: { url: './assets/audio/music/Target_Test.mp3' },
			};
			const MUSIC_VOLUME_STORAGE_KEY = 'mw_musicVolume';
			const SFX_VOLUME_STORAGE_KEY = 'mw_sfxVolume';
			const readStoredUiVolume = (key, fallback = 1) => {
				try {
					const raw = localStorage.getItem(key);
					if (raw == null || raw === '') return fallback;
					const parsed = Number(raw);
					if (!Number.isFinite(parsed)) return fallback;
					return Math.max(0, Math.min(1, parsed));
				} catch (_) {
					return fallback;
				}
			};
			const writeStoredUiVolume = (key, value) => {
				try {
					localStorage.setItem(key, String(Math.max(0, Math.min(1, value))));
				} catch (_) {}
			};
			let musicUiVolume = readStoredUiVolume(MUSIC_VOLUME_STORAGE_KEY, 1);
			let sfxUiVolume = readStoredUiVolume(SFX_VOLUME_STORAGE_KEY, 1);
			setMusicVolume(musicUiVolume);
			setSfxVolume(sfxUiVolume);
			let sfxLoadWarned = false;
			let musicLoadWarned = false;
			let musicSwitchWarned = false;
			let musicUnlocked = false;
			let activeMusicTrack = null;
			let musicSwitchInFlight = false;
			let pendingMusicTrack = null;
			const sfxLoadPromise = loadSfx(SFX_ASSETS).catch((err) => {
				if (sfxLoadWarned) return;
				sfxLoadWarned = true;
				console.warn('SFX preload failed:', err);
			});
			const musicLoadPromise = loadMusic(MUSIC_ASSETS).catch((err) => {
				if (musicLoadWarned) return;
				musicLoadWarned = true;
				console.warn('Music preload failed:', err);
			});
			const primeSfxContext = () => {
				initSfx().catch(() => {});
				return sfxLoadPromise;
			};
			const primeMusicContext = () => {
				musicUnlocked = true;
				initMusic().catch(() => {});
				return musicLoadPromise;
			};
			const resolveMusicTrack = () => {
				if (vineLabActive) return MUSIC_TRACKS.lab;
				if (livingRoomActive) return MUSIC_TRACKS.portfolio;
				if (basketballMode && dragEnabled) return MUSIC_TRACKS.targetTest;
				return MUSIC_TRACKS.menu;
			};
			const syncMusicTrack = () => {
				if (!musicUnlocked) return;
				const nextTrack = resolveMusicTrack();
				pendingMusicTrack = nextTrack;
				if (pendingMusicTrack === activeMusicTrack) return;
				if (musicSwitchInFlight) return;
				musicSwitchInFlight = true;
				Promise.resolve(musicLoadPromise)
					.then(async () => {
						while (pendingMusicTrack && pendingMusicTrack !== activeMusicTrack) {
							const targetTrack = pendingMusicTrack;
							const ok = await setMusicTrack(targetTrack, { crossfade: 0.75 });
							if (!ok) {
								if (!musicSwitchWarned) {
									musicSwitchWarned = true;
									console.warn('Music switch failed: target track not ready', targetTrack);
								}
								pendingMusicTrack = null;
								break;
							}
							activeMusicTrack = targetTrack;
						}
					})
					.catch((err) => {
						if (musicSwitchWarned) return;
						musicSwitchWarned = true;
						console.warn('Music switch failed:', err);
					})
					.finally(() => {
						musicSwitchInFlight = false;
						if (!musicUnlocked) return;
						if (pendingMusicTrack && pendingMusicTrack !== activeMusicTrack) {
							syncMusicTrack();
						}
					});
			};
			const playSfxSafe = (id, options = {}) => {
				if (!id) return;
				try {
					playSfx(id, options);
				} catch (_) {}
			};
			const playCartridgeHoverSfx = () => {
				playSfxSafe(ICON_SFX.cartridgeHover, {
					volume: 0.34 + Math.random() * 0.12,
					rate: 0.95 + Math.random() * 0.12,
				});
			};
			let activeScreenshotScrollSfx = Math.random() < 0.5 ? ICON_SFX.screenshotScrollA : ICON_SFX.screenshotScrollB;
			const pickScreenshotScrollSfxForCartridge = () => {
				activeScreenshotScrollSfx = Math.random() < 0.5 ? ICON_SFX.screenshotScrollA : ICON_SFX.screenshotScrollB;
				return activeScreenshotScrollSfx;
			};
			const playCartridgeSelectSfx = () => {
				pickScreenshotScrollSfxForCartridge();
				playSfxSafe(ICON_SFX.cartridgeSelect, {
					volume: 0.54 + Math.random() * 0.16,
					rate: 0.93 + Math.random() * 0.14,
				});
			};
			const playEnlargeScreenshotSfx = () => {
				playSfxSafe(ICON_SFX.enlargeScreenshot, {
					volume: 0.46 + Math.random() * 0.14,
					rate: 0.92 + Math.random() * 0.16,
				});
			};
			const playReturnScreenshotSfx = () => {
				playSfxSafe(ICON_SFX.returnScreenshot, {
					volume: 0.4 + Math.random() * 0.16,
					rate: 0.9 + Math.random() * 0.16,
				});
			};
			const playScreenshotScrollSfx = () => {
				playSfxSafe(activeScreenshotScrollSfx, {
					volume: 0.38 + Math.random() * 0.14,
					rate: 0.92 + Math.random() * 0.16,
				});
			};
			const playExitToMenuSfx = () => {
				playSfxSafe(ICON_SFX.exitToMenu, {
					volume: 0.48 + Math.random() * 0.16,
					rate: 0.9 + Math.random() * 0.18,
				});
			};
			const playExitTabSfx = () => {
				playSfxSafe(ICON_SFX.exitTab, {
					volume: 0.36 + Math.random() * 0.14,
					rate: 0.9 + Math.random() * 0.18,
				});
			};
			const startSfxLoopSafe = (id, key, options = {}) => {
				if (!id || !key) return;
				try {
					startSfxLoop(id, key, options);
				} catch (_) {}
			};
			const updateSfxLoopSafe = (key, options = {}) => {
				if (!key) return;
				try {
					updateSfxLoop(key, options);
				} catch (_) {}
			};
			const stopSfxLoopSafe = (key, options = {}) => {
				if (!key) return;
				try {
					stopSfxLoop(key, options);
				} catch (_) {}
			};
			const resolveActiveMood = () => {
				if (moodLockTarget) {
					activeMoodEntry = null;
					moodTarget = { ...moodLockTarget };
					window.moodTarget = {
						key: 'default',
						locked: true,
						...moodTarget,
					};
					return;
				}
				let last = null;
				for (const entry of hoverMoodSources.values()) last = entry;
				activeMoodEntry = last;
				moodTarget = { ...getMoodProfile(last?.key || 'default') };
				window.moodTarget = {
					key: last?.key || 'default',
					locked: false,
					...moodTarget,
				};
			};
			const setMoodHover = (key, hovered, container) => {
				if (!container) return;
				if (container.__hoverBaseZ == null) {
					container.__hoverBaseZ = Number.isFinite(container.zIndex) ? container.zIndex : 0;
				}
				container.zIndex = hovered ? 2200 : container.__hoverBaseZ;
				container.parent?.sortChildren?.();
				const moodKey = getMoodProfile(key) === MOOD_MAP.default && key !== 'default' ? 'default' : key;
				if (hovered) {
					if (!moodHoverEnabled || moodLockTarget) return;
					hoverMoodSources.delete(container);
					pendingMoodSources.set(container, {
						key: moodKey,
						container,
						activateAt: nowMs() + HOVER_MOOD_DEBOUNCE_MS,
					});
				} else {
					pendingMoodSources.delete(container);
					hoverMoodSources.delete(container);
					resolveActiveMood();
				}
			};
			const flushPendingMoodSources = (timeMs) => {
				if (!moodHoverEnabled || moodLockTarget) {
					if (pendingMoodSources.size) pendingMoodSources.clear();
					return;
				}
				let changed = false;
				for (const [container, pending] of pendingMoodSources.entries()) {
					if (timeMs < pending.activateAt) continue;
					pendingMoodSources.delete(container);
					hoverMoodSources.delete(container);
					hoverMoodSources.set(container, { key: pending.key, container });
					changed = true;
				}
				if (changed) resolveActiveMood();
			};
			resolveActiveMood();
			for (let i = 0; i < backgroundSceneQuality.ambientDebrisCount; i++) {
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
			refreshBackgroundSceneQuality = () => {
				const activeDebrisCount = Math.max(0, Math.min(ambientDebris.length, backgroundSceneQuality.ambientDebrisCount));
				for (let i = 0; i < ambientDebris.length; i++) {
					ambientDebris[i].panel.visible = i < activeDebrisCount;
				}
			};
			refreshBackgroundSceneQuality();

			const systemCore = new PIXI.Container();
			const coreDial = new PIXI.Graphics();
			const coreHourHand = new PIXI.Graphics();
			const coreMinuteHand = new PIXI.Graphics();
			const coreSecondHand = new PIXI.Graphics();
			const coreTickMarks = new PIXI.Graphics();
			const coreSecondTrail = new PIXI.Graphics();
			const coreSpinCue = new PIXI.Graphics();
			const coreDialGlow = new PIXI.Graphics();
			const coreNumerals = new PIXI.Container();
			const numeralStyle = {
				fontFamily: 'Minecraft, monospace',
				fontSize: 11,
				fill: 0xffffff,
				align: 'center',
			};
			const coreNum12 = new PIXI.Text('12', numeralStyle);
			const coreNum3 = new PIXI.Text('3', numeralStyle);
			const coreNum6 = new PIXI.Text('6', numeralStyle);
			const coreNum9 = new PIXI.Text('9', numeralStyle);
			coreNum12.anchor.set(0.5);
			coreNum3.anchor.set(0.5);
			coreNum6.anchor.set(0.5);
			coreNum9.anchor.set(0.5);
			coreNumerals.addChild(coreNum12, coreNum3, coreNum6, coreNum9);
			const coreGhost = new PIXI.Sprite(PIXI.Texture.WHITE);
			coreGhost.anchor.set(0.5);
			coreGhost.tint = 0x9bffd6;
			coreGhost.alpha = 0.38;
			coreGhost.visible = false;
			systemCore.addChild(coreDialGlow, coreDial, coreTickMarks, coreNumerals, coreSecondTrail, coreHourHand, coreMinuteHand, coreSecondHand, coreGhost, coreSpinCue);
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

			const lampLightTexture = makeLampLightTexture('#95c9b2');
			const vineLightSprites = [];
			const lampLightRadius = 170;
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
			let launcherWheelItemCount = 4;
			const WHEEL_EXTERNAL_ICON_COUNT = 4;
			const getRingIconCount = () => Math.max(1, launcherWheelItemCount + WHEEL_EXTERNAL_ICON_COUNT);
			const ringStartAngle = -Math.PI * 0.62;
			const CORE_CLOCK_SCALE = 1.56;
			const CORE_BASE_HALF_SIZE = 49;
			const ringDrag = { active: false, lastAngle: 0, lastTime: 0 };
			const ringCandidate = { active: false, startX: 0, startY: 0, lastX: 0, lastY: 0 };
			const getCoreScreenPos = () => ({
				x: app.renderer.width * 0.5,
				y: app.renderer.height * 0.48,
			});
			const getCoreWorldPos = () => {
				const p = getCoreScreenPos();
				return { x: screenToWorldX(p.x), y: screenToWorldY(p.y) };
			};
			const getClockHalfScreenSize = () => CORE_BASE_HALF_SIZE * CORE_CLOCK_SCALE;
			const getRingIconSize = () => Math.max(58, Math.min(84, app.renderer.height * 0.108));
			const getRingRadius = () => {
				const ringCount = getRingIconCount();
				const countBoost = Math.max(0, ringCount - 6) * getRingIconSize() * 0.14;
				const baseRadius = Math.max(132, Math.min(286, Math.min(app.renderer.width, app.renderer.height) * 0.285 + countBoost));
				const clockHalf = getClockHalfScreenSize();
				const iconHalf = getRingIconSize() * 0.5;
				const collisionClearance = clockHalf * 0.64;
				const required = clockHalf + iconHalf + collisionClearance;
				return Math.max(baseRadius, required);
			};
			const getRingSlotRadius = () => getRingRadius();
			const getCoreControlRadius = () => Math.max(44, getRingRadius() * 0.46);
			let coreHoverAmount = 0;
			const RING_THROW_BOOST = 1.7;
			const RING_MAX_SPIN_VEL = 10.5;
			const getRingSlotScreenPos = (slotIndex) => {
				const core = getCoreScreenPos();
				const ringCount = getRingIconCount();
				const step = (Math.PI * 2) / ringCount;
				const slot = ((slotIndex % ringCount) + ringCount) % ringCount;
				const radius = getRingSlotRadius();
				const angle = ringStartAngle + slot * step + ringSpin;
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
				const spinEnergy = Math.min(1, Math.abs(ringSpinVel) * 0.22);
				const activeBoost = Math.max(coreHoverAmount, ringDrag.active ? 1 : 0, spinEnergy);
				const pulse = 0.72 + 0.28 * Math.sin(time * 1.6);
				const dialHalf = screenToWorldSize(CORE_BASE_HALF_SIZE * CORE_CLOCK_SCALE);
				const markerR = dialHalf - screenToWorldSize(8);
				const now = new Date();
				const h = now.getHours() % 12;
				const m = now.getMinutes();
				const s = now.getSeconds();
				const ms = now.getMilliseconds();
				const secTick = Math.min(1, ms / 180);
				const secEase = secTick * secTick * (3 - 2 * secTick);
				const secondUnits = s + secEase;
				const minuteUnits = m + s / 60 + ms / 60000;
				const hourUnits = h + minuteUnits / 60;
				const secondAngle = secondUnits / 60 * Math.PI * 2 - Math.PI * 0.5;
				const minuteAngle = minuteUnits / 60 * Math.PI * 2 - Math.PI * 0.5;
				const hourAngle = hourUnits / 12 * Math.PI * 2 - Math.PI * 0.5;
				const rgbHue = (time * 0.035) % 1;
				const rgbA = hsvToRgbInt(rgbHue, 0.82, 1.0);
				const rgbB = hsvToRgbInt((rgbHue + 0.2) % 1, 0.78, 1.0);
				const rgbC = hsvToRgbInt((rgbHue + 0.52) % 1, 0.86, 1.0);
				const rgbSoft = hsvToRgbInt((rgbHue + 0.07) % 1, 0.45, 0.95);
				const spinCueAlpha = dragEnabled ? 0.12 : (0.28 + activeBoost * 0.36 + 0.08 * Math.sin(time * 3.2));
				const dialGlowPad = screenToWorldSize(9);
				coreDialGlow.clear();
				coreDialGlow.beginFill(0xff5fa8, (0.08 + activeBoost * 0.1) * pulse);
				coreDialGlow.drawRoundedRect(-dialHalf - dialGlowPad, -dialHalf - dialGlowPad, (dialHalf + dialGlowPad) * 2, (dialHalf + dialGlowPad) * 2, screenToWorldSize(10));
				coreDialGlow.endFill();
				coreDialGlow.beginFill(0x71f0ff, (0.05 + activeBoost * 0.07) * pulse);
				coreDialGlow.drawRoundedRect(-dialHalf - dialGlowPad * 1.6, -dialHalf - dialGlowPad * 1.6, (dialHalf + dialGlowPad * 1.6) * 2, (dialHalf + dialGlowPad * 1.6) * 2, screenToWorldSize(12));
				coreDialGlow.endFill();

				coreDial.clear();
				coreDial.beginFill(0x0b1118, (0.9 + 0.06 * pulse));
				coreDial.drawRoundedRect(-dialHalf, -dialHalf, dialHalf * 2, dialHalf * 2, screenToWorldSize(7));
				coreDial.endFill();
				coreDial.lineStyle(3.1, rgbC, 0.66 + activeBoost * 0.3);
				coreDial.drawRoundedRect(-dialHalf + screenToWorldSize(2), -dialHalf + screenToWorldSize(2), (dialHalf - screenToWorldSize(2)) * 2, (dialHalf - screenToWorldSize(2)) * 2, screenToWorldSize(6));
				coreDial.lineStyle(2.1, rgbSoft, 0.5 + activeBoost * 0.24);
				coreDial.drawRoundedRect(-dialHalf + screenToWorldSize(5), -dialHalf + screenToWorldSize(5), (dialHalf - screenToWorldSize(5)) * 2, (dialHalf - screenToWorldSize(5)) * 2, screenToWorldSize(5));

				coreTickMarks.clear();
				for (let i = 0; i < 12; i++) {
					if (i % 3 === 0) continue;
					const a = (Math.PI * 2 * i) / 12 - Math.PI * 0.5;
					const x = Math.cos(a) * markerR;
					const y = Math.sin(a) * markerR;
					coreTickMarks.beginFill(rgbSoft, 0.72);
					coreTickMarks.drawCircle(x, y, screenToWorldSize(1.9));
					coreTickMarks.endFill();
				}
				const numeralR = markerR - screenToWorldSize(9);
				coreNum12.position.set(0, -numeralR);
				coreNum3.position.set(numeralR, 0);
				coreNum6.position.set(0, numeralR);
				coreNum9.position.set(-numeralR, 0);
				coreNum12.tint = rgbC;
				coreNum3.tint = rgbA;
				coreNum6.tint = rgbB;
				coreNum9.tint = rgbSoft;
				coreNum12.alpha = 0.96;
				coreNum3.alpha = 0.96;
				coreNum6.alpha = 0.96;
				coreNum9.alpha = 0.96;

				coreSecondTrail.clear();
				const secTrailR = markerR - screenToWorldSize(4);
				coreSecondTrail.lineStyle(1.4, rgbC, 0.32 + activeBoost * 0.34);
				coreSecondTrail.arc(0, 0, secTrailR, secondAngle - 0.45, secondAngle);

				const hourLen = markerR - screenToWorldSize(18);
				const minuteLen = markerR - screenToWorldSize(9);
				const secondLen = markerR - screenToWorldSize(4);
				const hourX = Math.cos(hourAngle) * hourLen;
				const hourY = Math.sin(hourAngle) * hourLen;
				const minuteX = Math.cos(minuteAngle) * minuteLen;
				const minuteY = Math.sin(minuteAngle) * minuteLen;
				const secondX = Math.cos(secondAngle) * secondLen;
				const secondY = Math.sin(secondAngle) * secondLen;

				coreHourHand.clear();
				coreHourHand.lineStyle({ width: screenToWorldSize(5.2), color: rgbA, alpha: 0.9, cap: PIXI.LINE_CAP.ROUND, join: PIXI.LINE_JOIN.ROUND });
				coreHourHand.moveTo(0, 0);
				coreHourHand.lineTo(hourX, hourY);
				coreHourHand.lineStyle({ width: screenToWorldSize(1.5), color: rgbSoft, alpha: 0.78, cap: PIXI.LINE_CAP.ROUND, join: PIXI.LINE_JOIN.ROUND });
				coreHourHand.moveTo(0, 0);
				coreHourHand.lineTo(hourX * 0.84, hourY * 0.84);

				coreMinuteHand.clear();
				coreMinuteHand.lineStyle({ width: screenToWorldSize(3.8), color: rgbB, alpha: 0.96, cap: PIXI.LINE_CAP.ROUND, join: PIXI.LINE_JOIN.ROUND });
				coreMinuteHand.moveTo(0, 0);
				coreMinuteHand.lineTo(minuteX, minuteY);

				coreSecondHand.clear();
				coreSecondHand.lineStyle({ width: screenToWorldSize(2), color: rgbC, alpha: 0.98, cap: PIXI.LINE_CAP.ROUND, join: PIXI.LINE_JOIN.ROUND });
				coreSecondHand.moveTo(-Math.cos(secondAngle) * screenToWorldSize(10), -Math.sin(secondAngle) * screenToWorldSize(10));
				coreSecondHand.lineTo(secondX, secondY);
				coreSecondHand.beginFill(rgbC, 0.95);
				coreSecondHand.drawCircle(0, 0, screenToWorldSize(3.8));
				coreSecondHand.endFill();
				coreSecondHand.lineStyle(1.2, rgbSoft, 0.7);
				coreSecondHand.drawCircle(0, 0, screenToWorldSize(3.8));
				coreSecondHand.beginFill(rgbA, 0.88);
				coreSecondHand.drawCircle(secondX, secondY, screenToWorldSize(2.8));
				coreSecondHand.endFill();

				coreSpinCue.clear();
				coreGhost.width = screenToWorldSize(34);
				coreGhost.height = screenToWorldSize(34);
				coreGhost.tint = rgbA;
				coreGhost.alpha = 0.76 + activeBoost * 0.18;
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

			const launcherItems = [
					{
						label: 'Resume',
						moodKey: 'Resume',
						glyph: 'R',
						tooltip: 'Open Resume',
						url: './assets/files/mason-walker-resume.pdf',
						panelFill: 0xf6e7c9,
						panelFillAlpha: 0.96,
						panelBorder: 0x9a6f3f,
						panelBorderAlpha: 0.92,
						glyphColor: 0x5a3b22,
						labelColor: 0xfff5dd,
						glowAlpha: 0.1,
						glowHoverAlpha: 0.28,
						ornament: 'resume',
						ornamentColor: 0x9a6f3f,
						paperEmitter: true,
					},
					{
						label: 'GitHub',
						moodKey: 'GitHub',
						glyph: 'G',
						tooltip: 'View GitHub',
						url: 'https://github.com/maywok',
						panelFill: 0x171b20,
						panelFillAlpha: 0.96,
						panelBorder: 0x4d5562,
						panelBorderAlpha: 0.95,
						glyphColor: 0xe4e9f1,
						labelColor: 0xcfd6e1,
						glowAlpha: 0.06,
						glowHoverAlpha: 0.19,
						ornament: 'cat',
						ornamentColor: 0x665881,
					},
					{
						displayName: 'Lab',
						label: 'Lab',
						moodKey: 'Lab',
						glyph: 'L',
						tooltip: 'Open Lab',
						hoverActionText: 'Open Lab',
						onTap: () => {
							openVineLabNow();
						},
						panelFill: 0x0f1f2b,
						panelFillAlpha: 0.96,
						panelBorder: 0x38ffd0,
						accentColor: 0x38ffd0,
						panelBorderAlpha: 0.95,
						glyphColor: 0xe8fffa,
						labelColor: 0xffffff,
						glowAlpha: 0.08,
						glowHoverAlpha: 0.24,
						ornament: 'lab-beaker',
						ornamentColor: 0x38ffd0,
					},
					{
						displayName: 'Portfolio',
						label: 'Portfolio',
						moodKey: 'Portfolio',
						glyph: 'P',
						hoverActionText: 'Open Portfolio',
						tooltip: 'Open Portfolio',
						onTap: () => {
							startPortfolioEntryTransition();
						},
						panelFill: 0x131d2d,
						panelFillAlpha: 0.96,
						panelBorder: 0x6ec6f7,
						accentColor: 0x6ec6f7,
						panelBorderAlpha: 0.96,
						glyphColor: 0xe8f6ff,
						labelColor: 0xcfe9ff,
						glowAlpha: 0.08,
						glowHoverAlpha: 0.24,
						ornament: 'mountains',
						ornamentColor: 0x6ec6f7,
					},
				];
			launcherWheelItemCount = launcherItems.length;
			const appLauncher = createAppLauncher(app, world, {
				items: launcherItems,
				screenToWorldX,
				screenToWorldY,
				screenToWorldSize,
				onHoverChange: ({ hovered, key, container }) => {
					setMoodHover(key, hovered, container);
				},
				layoutProvider: ({ index }) => {
					return getIntroPoseForSlot(index);
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

			const soundToggle = new PIXI.Container();
			const soundBg = new PIXI.Graphics();
			const soundGlow = new PIXI.Graphics();
			const soundIcon = new PIXI.Graphics();
			const soundButtonSize = 52;
			const soundStackGap = 8;
			let soundHoverTarget = 0;
			let soundHover = 0;
			let soundNeedsRedraw = true;
			let soundPanelOpen = false;
			let soundCloseHoverTarget = 0;
			let soundCloseHover = 0;
			let lockScreenX = 0;
			let lockScreenY = 0;
			let soundScreenX = 0;
			let soundScreenY = 0;

			soundToggle.eventMode = 'static';
			soundToggle.cursor = 'pointer';
			const drawSoundControl = () => {
				const hover = Math.max(0, Math.min(1, soundHover));
				soundGlow.clear();
				soundGlow.beginFill(0xffffff, 0.07 + hover * 0.2);
				soundGlow.drawRoundedRect(-4, -4, soundButtonSize + 8, soundButtonSize + 8, 14);
				soundGlow.endFill();

				soundBg.clear();
				soundBg.beginFill(0x050d0b, 0.9);
				soundBg.lineStyle(1, 0x22f3c8, 0.58 + hover * 0.34);
				soundBg.drawRoundedRect(0, 0, soundButtonSize, soundButtonSize, 12);
				soundBg.endFill();

				const cx = soundButtonSize * 0.5;
				const cy = soundButtonSize * 0.5;
				soundIcon.clear();
				soundIcon.beginFill(0xffffff, 1);
				soundIcon.drawPolygon([
					cx - 12, cy - 6,
					cx - 7, cy - 6,
					cx - 2, cy - 11,
					cx - 2, cy + 11,
					cx - 7, cy + 6,
					cx - 12, cy + 6,
				]);
				soundIcon.endFill();
				soundIcon.lineStyle(2.2, 0xffffff, 0.85);
				soundIcon.arc(cx + 1, cy, 5.5, -0.7, 0.7);
				soundIcon.lineStyle(2, 0xffffff, 0.65);
				soundIcon.arc(cx + 1, cy, 9, -0.8, 0.8);

				soundToggle.scale.set(1 + hover * 0.04);
				soundToggle.pivot.set(
					(soundButtonSize * soundToggle.scale.x - soundButtonSize) * 0.5,
					(soundButtonSize * soundToggle.scale.y - soundButtonSize) * 0.5,
				);
				soundNeedsRedraw = false;
			};
			soundToggle.addChild(soundGlow, soundBg, soundIcon);
			soundToggle.zIndex = 151;
			world.addChild(soundToggle);

			const soundPanel = new PIXI.Container();
			const soundPanelGlow = new PIXI.Graphics();
			const soundPanelBg = new PIXI.Graphics();
			const soundPanelChrome = new PIXI.Graphics();
			const soundPanelDragStrip = new PIXI.Graphics();
			const soundPanelOrnament = new PIXI.Graphics();
			const soundPanelTitle = new PIXI.Text('SOUND', {
				fontFamily: 'Minecraft, monospace',
				fontSize: 12,
				fill: 0x22f3c8,
				letterSpacing: 1,
			});
			soundPanelTitle.anchor.set(0, 0);
			const soundCloseBtn = new PIXI.Container();
			const soundCloseBtnBg = new PIXI.Graphics();
			const soundCloseBtnText = new PIXI.Text('X', {
				fontFamily: 'Minecraft, monospace',
				fontSize: 11,
				fill: 0xffffff,
				letterSpacing: 1,
			});
			soundCloseBtnText.anchor.set(0.5, 0.5);
			soundCloseBtn.addChild(soundCloseBtnBg, soundCloseBtnText);
			soundCloseBtn.eventMode = 'static';
			soundCloseBtn.cursor = 'pointer';

			const soundPanelWidth = 248;
			const soundPanelHeight = 144;
			const soundPanelHeaderH = 26;
			const sliderTrackWidth = 142;
			const sliderTrackHeight = 11;
			const sliderLeft = 90;
			const sliderTop = 56;
			const sliderGap = 42;
			const soundSliders = [];
			let activeSoundSlider = null;
			let activeSoundPointerId = null;
			const soundPanelDrag = { active: false, offsetX: 0, offsetY: 0 };
			let soundPanelCustomPosition = false;
 			const soundRendererPoint = new PIXI.Point();
			const soundLocalPoint = new PIXI.Point();

			const bringSoundPanelToFront = () => {
				if (soundPanel.parent) {
					soundPanel.parent.addChild(soundPanel);
				}
			};
			const moveSoundPanel = (worldX, worldY, custom = true) => {
				const minX = screenToWorldX(12);
				const minY = screenToWorldY(12);
				const maxX = screenToWorldX(app.renderer.width - soundPanelWidth - 12);
				const maxY = screenToWorldY(app.renderer.height - soundPanelHeight - 12);
				soundPanel.position.set(
					Math.max(minX, Math.min(maxX, worldX)),
					Math.max(minY, Math.min(maxY, worldY)),
				);
				soundPanelCustomPosition = custom;
			};
			const centerSoundPanel = () => {
				const panelScreenX = (app.renderer.width - soundPanelWidth) * 0.5;
				const panelScreenY = (app.renderer.height - soundPanelHeight) * 0.5;
				moveSoundPanel(screenToWorldX(panelScreenX), screenToWorldY(panelScreenY), false);
			};
			const clampSoundPanelToViewport = () => {
				moveSoundPanel(soundPanel.position.x, soundPanel.position.y, soundPanelCustomPosition);
			};
			const updateActiveSoundSliderFromClient = (clientX, clientY, persist = true) => {
				if (!activeSoundSlider || !soundPanelOpen) return;
				const rect = app.view.getBoundingClientRect();
				if (!rect || rect.width <= 0 || rect.height <= 0) return;
				soundRendererPoint.set(
					(clientX - rect.left) * (app.renderer.width / rect.width),
					(clientY - rect.top) * (app.renderer.height / rect.height),
				);
				soundPanel.toLocal(soundRendererPoint, undefined, soundLocalPoint);
				const nextValue = (soundLocalPoint.x - activeSoundSlider.trackX) / activeSoundSlider.trackW;
				activeSoundSlider.setValue?.(nextValue, persist);
			};

			const formatVolumeLabel = (value) => `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%`;
			const applyMusicUiVolume = (value, persist = true) => {
				musicUiVolume = Math.max(0, Math.min(1, value));
				setMusicVolume(musicUiVolume);
				if (persist) writeStoredUiVolume(MUSIC_VOLUME_STORAGE_KEY, musicUiVolume);
			};
			const applySfxUiVolume = (value, persist = true) => {
				sfxUiVolume = Math.max(0, Math.min(1, value));
				setSfxVolume(sfxUiVolume);
				if (persist) writeStoredUiVolume(SFX_VOLUME_STORAGE_KEY, sfxUiVolume);
			};

			const drawSoundCloseBtn = () => {
				const hover = Math.max(0, Math.min(1, soundCloseHover));
				soundCloseBtnBg.clear();
				soundCloseBtnBg.beginFill(0xff5667, 0.94 + hover * 0.06);
				soundCloseBtnBg.lineStyle(1, 0x000000, 0.6);
				soundCloseBtnBg.drawRoundedRect(0, 0, 28, 22, 5);
				soundCloseBtnBg.endFill();
				soundCloseBtn.scale.set(1 + hover * 0.05);
				soundCloseBtn.pivot.set((28 * soundCloseBtn.scale.x - 28) * 0.5, (22 * soundCloseBtn.scale.y - 22) * 0.5);
				soundCloseBtnText.position.set(14, 11);
			};

			const createSoundSlider = (labelText, rowIndex, initialValue, onChange) => {
				const rowY = sliderTop + rowIndex * sliderGap;
				const label = new PIXI.Text(labelText, {
					fontFamily: 'Minecraft, monospace',
					fontSize: 11,
					fill: 0xc7ebde,
					letterSpacing: 1,
				});
				label.anchor.set(0, 0.5);
				label.position.set(14, rowY);

				const valueText = new PIXI.Text('100%', {
					fontFamily: 'Minecraft, monospace',
					fontSize: 11,
					fill: 0xe5fff8,
					letterSpacing: 1,
				});
				valueText.anchor.set(1, 0.5);
				valueText.position.set(soundPanelWidth - 12, rowY);

				const hit = new PIXI.Graphics();
				const track = new PIXI.Graphics();
				const fillGlow = new PIXI.Graphics();
				const fill = new PIXI.Graphics();
				const knob = new PIXI.Graphics();
				hit.eventMode = 'static';
				hit.cursor = 'pointer';
				track.eventMode = 'static';
				track.cursor = 'pointer';
				fillGlow.eventMode = 'none';
				fill.eventMode = 'none';
				knob.eventMode = 'static';
				knob.cursor = 'pointer';
				label.eventMode = 'none';
				valueText.eventMode = 'none';

				const slider = {
					label,
					valueText,
					hit,
					track,
					fillGlow,
					fill,
					knob,
					rowY,
					trackX: sliderLeft,
					trackY: rowY - sliderTrackHeight * 0.5,
					trackW: sliderTrackWidth,
					trackH: sliderTrackHeight,
					value: Math.max(0, Math.min(1, initialValue)),
					onChange,
				};

				const draw = () => {
					const v = Math.max(0, Math.min(1, slider.value));
					const fillW = slider.trackW * v;
					slider.hit.clear();
					slider.hit.beginFill(0xffffff, 0.001);
					slider.hit.drawRect(slider.trackX - 8, slider.trackY - 8, slider.trackW + 16, slider.trackH + 16);
					slider.hit.endFill();
					slider.track.clear();
					slider.track.beginFill(0x12251f, 0.96);
					slider.track.lineStyle(1.2, 0x67efc9, 0.72);
					slider.track.drawRoundedRect(slider.trackX, slider.trackY, slider.trackW, slider.trackH, 4);
					slider.track.endFill();

					slider.fillGlow.clear();
					slider.fillGlow.beginFill(0x89ffe2, 0.34);
					slider.fillGlow.drawRoundedRect(slider.trackX - 1, slider.trackY - 1, Math.max(4, fillW + 2), slider.trackH + 2, 5);
					slider.fillGlow.endFill();

					slider.fill.clear();
					slider.fill.beginFill(0x8effda, 0.98);
					slider.fill.drawRoundedRect(slider.trackX, slider.trackY, Math.max(3, fillW), slider.trackH, 4);
					slider.fill.endFill();

					const knobX = slider.trackX + fillW;
					slider.knob.clear();
					slider.knob.beginFill(0xffffff, 1);
					slider.knob.lineStyle(1.5, 0x58ffd0, 0.98);
					slider.knob.drawCircle(knobX, slider.rowY, 7.2);
					slider.knob.lineStyle(0.8, 0xffffff, 0.9);
					slider.knob.drawCircle(knobX, slider.rowY, 3.4);
					slider.knob.endFill();

					slider.valueText.text = formatVolumeLabel(v);
				};

				const setValue = (nextValue, persist = true) => {
					slider.value = Math.max(0, Math.min(1, nextValue));
					draw();
					slider.onChange?.(slider.value, persist);
				};

				const setFromEvent = (event, persist = true) => {
					const local = event.getLocalPosition(soundPanel);
					const nextValue = (local.x - slider.trackX) / slider.trackW;
					setValue(nextValue, persist);
				};

				const beginDrag = (event) => {
					event.stopPropagation?.();
					activeSoundSlider = slider;
					const nativeEvent = event?.data?.originalEvent || event?.originalEvent;
					if (nativeEvent && Number.isFinite(nativeEvent.pointerId)) {
						activeSoundPointerId = nativeEvent.pointerId;
						if (typeof app.view.setPointerCapture === 'function') {
							try {
								app.view.setPointerCapture(activeSoundPointerId);
							} catch (_) {
							}
						}
					}
					setFromEvent(event);
				};

				hit.on('pointerdown', beginDrag);
				track.on('pointerdown', beginDrag);
				knob.on('pointerdown', beginDrag);
				slider.setValue = setValue;
				slider.setFromEvent = setFromEvent;
				slider.draw = draw;
				draw();
				soundPanel.addChild(label, hit, track, fillGlow, fill, knob, valueText);
				soundSliders.push(slider);
				return slider;
			};

			const musicSlider = createSoundSlider('MUSIC', 0, musicUiVolume, (value, persist) => {
				applyMusicUiVolume(value, persist);
			});
			const sfxSlider = createSoundSlider('SFX', 1, sfxUiVolume, (value, persist) => {
				applySfxUiVolume(value, persist);
			});

			const layoutSoundPanel = () => {
				if (soundPanelCustomPosition) {
					clampSoundPanelToViewport();
					return;
				}
				centerSoundPanel();
			};

			const drawSoundPanel = () => {
				soundPanelGlow.clear();
				soundPanelGlow.beginFill(0x000000, 0.16);
				soundPanelGlow.drawRect(-4, -4, soundPanelWidth + 8, soundPanelHeight + 8);
				soundPanelGlow.endFill();

				soundPanelBg.clear();
				soundPanelBg.beginFill(0x0b0f13, 0.98);
				soundPanelBg.lineStyle(2, 0x1a1f27, 1);
				soundPanelBg.drawRect(0, 0, soundPanelWidth, soundPanelHeight);
				soundPanelBg.endFill();

				soundPanelChrome.clear();
				soundPanelChrome.beginFill(0x0f141a, 1);
				soundPanelChrome.drawRect(0, 0, soundPanelWidth, soundPanelHeaderH);
				soundPanelChrome.endFill();
				soundPanelChrome.beginFill(0x1c2430, 1);
				soundPanelChrome.drawRect(0, soundPanelHeaderH - 6, soundPanelWidth, 6);
				soundPanelChrome.endFill();

				soundPanelDragStrip.clear();
				soundPanelDragStrip.beginFill(0xffffff, 0.001);
				soundPanelDragStrip.drawRect(0, 0, soundPanelWidth - 36, soundPanelHeaderH);
				soundPanelDragStrip.endFill();

				soundPanelOrnament.clear();

				soundPanelTitle.position.set(10, Math.max(0, soundPanelHeaderH - 6 - soundPanelTitle.height + 1));
				soundCloseBtn.position.set(soundPanelWidth - 34, 3);
				drawSoundCloseBtn();
				for (const slider of soundSliders) slider.draw?.();
			};

			const closeSoundPanel = () => {
				soundPanelOpen = false;
				soundPanel.visible = false;
				soundPanel.eventMode = 'none';
				activeSoundSlider = null;
				soundPanelDrag.active = false;
			};
			const openSoundPanel = () => {
				soundPanelOpen = true;
				soundPanel.visible = true;
				soundPanel.eventMode = 'static';
				soundPanelCustomPosition = false;
				layoutSoundPanel();
				bringSoundPanelToFront();
				drawSoundPanel();
			};
			const toggleSoundPanel = () => {
				if (soundPanelOpen) closeSoundPanel();
				else openSoundPanel();
			};
			const isPointInDisplayObject = (obj, point) => {
				if (!obj || !obj.visible || !point) return false;
				const b = obj.getBounds();
				return point.x >= b.x && point.x <= b.x + b.width && point.y >= b.y && point.y <= b.y + b.height;
			};

			soundPanel.addChild(soundPanelGlow, soundPanelBg, soundPanelChrome, soundPanelDragStrip, soundPanelOrnament, soundPanelTitle, soundCloseBtn);
			for (const slider of soundSliders) {
				soundPanel.addChild(slider.label, slider.hit, slider.track, slider.fillGlow, slider.fill, slider.knob, slider.valueText);
			}
			soundPanel.addChild(soundPanelDragStrip, soundPanelOrnament, soundPanelTitle, soundCloseBtn);
			soundPanel.zIndex = 3300;
			soundPanel.visible = false;
			soundPanel.eventMode = 'none';
			world.addChild(soundPanel);
			drawSoundPanel();
			drawSoundControl();
			soundPanelDragStrip.eventMode = 'static';
			soundPanelDragStrip.cursor = 'move';
			soundPanelDragStrip.on('pointerdown', (event) => {
				if (!soundPanelOpen) return;
				event.stopPropagation();
				bringSoundPanelToFront();
				const pos = event.getLocalPosition(world);
				soundPanelDrag.active = true;
				soundPanelDrag.offsetX = pos.x - soundPanel.position.x;
				soundPanelDrag.offsetY = pos.y - soundPanel.position.y;
			});
			soundCloseBtn.on('pointerdown', (event) => {
				event.stopPropagation();
			});

			soundCloseBtn.on('pointerover', () => { soundCloseHoverTarget = 1; });
			soundCloseBtn.on('pointerout', () => { soundCloseHoverTarget = 0; });
			soundCloseBtn.on('pointertap', () => {
				playExitTabSfx();
				closeSoundPanel();
			});

			soundToggle.on('pointerover', () => {
				soundHoverTarget = 1;
				soundNeedsRedraw = true;
				playSfxSafe(ICON_SFX.hover, { volume: 0.33, rate: 1.02 });
			});
			soundToggle.on('pointerout', () => {
				soundHoverTarget = 0;
				soundNeedsRedraw = true;
			});
			soundToggle.on('pointertap', () => {
				playSfxSafe(ICON_SFX.click, { volume: 0.5, rate: 1.0 });
				toggleSoundPanel();
			});

			if (app?.stage) {
				if (!app.stage.eventMode || app.stage.eventMode === 'none') {
					app.stage.eventMode = 'static';
				}
				if (!app.stage.hitArea) {
					app.stage.hitArea = app.screen;
				}
				app.stage.on('pointermove', (event) => {
					if (soundPanelDrag.active && soundPanelOpen) {
						const pos = event.getLocalPosition(world);
						moveSoundPanel(pos.x - soundPanelDrag.offsetX, pos.y - soundPanelDrag.offsetY, true);
						return;
					}
					if (!activeSoundSlider || !soundPanelOpen) return;
					activeSoundSlider.setFromEvent?.(event);
				});
				const stopSoundSliderDrag = () => {
					if (activeSoundPointerId != null && typeof app.view.releasePointerCapture === 'function') {
						try {
							app.view.releasePointerCapture(activeSoundPointerId);
						} catch (_) {
						}
					}
					activeSoundPointerId = null;
					activeSoundSlider = null;
					soundPanelDrag.active = false;
				};
				app.stage.on('pointerup', stopSoundSliderDrag);
				app.stage.on('pointerupoutside', stopSoundSliderDrag);
				app.view.addEventListener('pointermove', (event) => {
					if (!activeSoundSlider || !soundPanelOpen) return;
					updateActiveSoundSliderFromClient(event.clientX, event.clientY, true);
				});
				app.view.addEventListener('pointerup', stopSoundSliderDrag);
				app.view.addEventListener('pointercancel', stopSoundSliderDrag);
				window.addEventListener('pointerup', stopSoundSliderDrag);
				window.addEventListener('pointercancel', stopSoundSliderDrag);
			}

			const basketballToggle = new PIXI.Container();
			const basketballBg = new PIXI.Graphics();
			const basketballGlow = new PIXI.Graphics();
			const basketballGlyph = new PIXI.Graphics();
			const basketballButtonSize = 46;
			let basketballHoverTarget = 0;
			let basketballHover = 0;
			let basketballMode = false;
			let basketballScore = 0;
			const iconScoreState = new Map();
			const arcadeFeedback = {
				combo: 0,
				lastScoreTime: -999,
				popupTimer: 999,
				popupDuration: 1.05,
				popupBaseScale: 1,
				popupColor: 0xffffff,
				lastPopupColor: null,
				noGoVoided: false,
				cursorWasBlocked: false,
			};
			const arcadePopupPalette = [0xff5f9c, 0x5fffd2, 0x6bd3ff, 0xffc14b, 0xb37aff, 0x7aff6d, 0xff7a5c];
			const pickArcadePopupColor = () => {
				if (!arcadePopupPalette.length) return 0xffffff;
				let color = arcadePopupPalette[Math.floor(Math.random() * arcadePopupPalette.length)];
				if (arcadePopupPalette.length > 1 && color === arcadeFeedback.lastPopupColor) {
					color = arcadePopupPalette[(arcadePopupPalette.indexOf(color) + 1 + Math.floor(Math.random() * (arcadePopupPalette.length - 1))) % arcadePopupPalette.length];
				}
				arcadeFeedback.lastPopupColor = color;
				return color;
			};
			basketballToggle.eventMode = 'none';
			basketballToggle.cursor = 'pointer';
			const drawBasketballToggle = () => {
				const hover = Math.max(0, Math.min(1, basketballHover));
				basketballGlow.clear();
				basketballGlow.beginFill(0x89d6ff, 0.08 + hover * 0.24);
				basketballGlow.drawRoundedRect(-3, -3, basketballButtonSize + 6, basketballButtonSize + 6, 12);
				basketballGlow.endFill();

				basketballBg.clear();
				basketballBg.beginFill(0x081526, 0.86);
				basketballBg.lineStyle(1, 0x89d6ff, 0.5 + hover * 0.35);
				basketballBg.drawRoundedRect(0, 0, basketballButtonSize, basketballButtonSize, 11);
				basketballBg.endFill();

				const cx = basketballButtonSize * 0.5;
				const cy = basketballButtonSize * 0.5;
				const r = basketballButtonSize * 0.29;
				basketballGlyph.clear();
				basketballGlyph.beginFill(0x1a2538, 0.96);
				basketballGlyph.drawCircle(cx, cy, r);
				basketballGlyph.endFill();
				basketballGlyph.lineStyle(1.5, 0x98ddff, 0.95);
				basketballGlyph.drawCircle(cx, cy, r * 0.72);
				basketballGlyph.lineStyle(1.5, 0xffd36f, 0.98);
				basketballGlyph.drawCircle(cx, cy, r * 0.36);
				basketballGlyph.lineStyle(1.3, 0x98ddff, 0.92);
				basketballGlyph.moveTo(cx - r * 1.05, cy);
				basketballGlyph.lineTo(cx + r * 1.05, cy);
				basketballGlyph.moveTo(cx, cy - r * 1.05);
				basketballGlyph.lineTo(cx, cy + r * 1.05);

				basketballToggle.scale.set(1 + hover * 0.04);
				basketballToggle.pivot.set((basketballButtonSize * basketballToggle.scale.x - basketballButtonSize) * 0.5, (basketballButtonSize * basketballToggle.scale.y - basketballButtonSize) * 0.5);
			};
			basketballToggle.addChild(basketballGlow, basketballBg, basketballGlyph);
			basketballToggle.zIndex = 150;
			basketballToggle.visible = false;
			world.addChild(basketballToggle);

			const arcadeLayer = new PIXI.Container();
			arcadeLayer.eventMode = 'none';
			arcadeLayer.zIndex = 140;
			arcadeLayer.visible = false;
			world.addChild(arcadeLayer);
			const arcadeTargetLayer = new PIXI.Graphics();
			const arcadeShardLayer = new PIXI.Graphics();
			const arcadeDividerGlow = new PIXI.Graphics();
			const arcadeSweepControl = new PIXI.Graphics();
			let arcadeSweepHoverTarget = 0;
			let arcadeSweepHover = 0;
			arcadeSweepControl.eventMode = 'none';
			arcadeSweepControl.cursor = 'pointer';
			const arcadeHintText = new PIXI.Text('THROW MODE: HIT TARGETS (1 / 3 / 5)', {
				fontFamily: 'Minecraft, monospace',
				fontSize: 11,
				fill: 0xbde9ff,
				align: 'left',
				letterSpacing: 1,
			});
			arcadeHintText.anchor.set(0, 0);
			arcadeHintText.alpha = 0.82;
			const arcadeScoreText = new PIXI.Text('SCORE 0', {
				fontFamily: 'Minecraft, monospace',
				fontSize: 20,
				fill: 0xffffff,
				stroke: 0x0b1e2b,
				strokeThickness: 5,
				align: 'left',
				letterSpacing: 1,
			});
			arcadeScoreText.anchor.set(0.5, 0);
			arcadeScoreText.alpha = 0.92;
			const arcadePopupText = new PIXI.Text('', {
				fontFamily: 'Minecraft, monospace',
				fontSize: 22,
				fill: 0xffffff,
				stroke: 0x061017,
				strokeThickness: 5,
				align: 'center',
				letterSpacing: 1,
			});
			arcadePopupText.anchor.set(0.5, 0.5);
			arcadePopupText.visible = false;
			const arcadeCountdownText = new PIXI.Text('3', {
				fontFamily: 'Minecraft, monospace',
				fontSize: 132,
				fill: 0xe8faff,
				stroke: 0x07111a,
				strokeThickness: 14,
				dropShadow: true,
				dropShadowColor: 0x04080d,
				dropShadowBlur: 0,
				dropShadowAngle: Math.PI / 3,
				dropShadowDistance: 10,
				align: 'center',
				letterSpacing: 2,
			});
			arcadeCountdownText.anchor.set(0.5, 0.5);
			arcadeCountdownText.visible = false;
			arcadeLayer.addChild(arcadeDividerGlow, arcadeTargetLayer, arcadeShardLayer, arcadeHintText, arcadeScoreText, arcadePopupText, arcadeCountdownText, arcadeSweepControl);

			const arcadeTargetTypes = [
				{ points: 1, radiusPx: 33, ringColor: 0xff86bb, coreColor: 0x2a1223, shardColor: 0xffa6d0, respawnMin: 0.65, respawnMax: 1.25 },
				{ points: 3, radiusPx: 24, ringColor: 0x68ffd9, coreColor: 0x0f2a22, shardColor: 0x90ffe7, respawnMin: 0.85, respawnMax: 1.55 },
				{ points: 5, radiusPx: 15, ringColor: 0xffd56b, coreColor: 0x312206, shardColor: 0xffe7a7, respawnMin: 1.2, respawnMax: 2.1 },
			];
			const arcadeMaxTargetRadiusPx = Math.max(...arcadeTargetTypes.map((targetType) => targetType.radiusPx));
			const arcadeTargets = [];
			const arcadeShards = [];
			let arcadeTargetSeed = 0;
			const ARCADE_DIVIDER_Y_RATIO = 0.2;
			const getArcadeDividerScreenY = () => app.renderer.height * ARCADE_DIVIDER_Y_RATIO;
			const arcadeState = {
				dividerWorldX: 0,
				dividerWorldY: 0,
			};
			const targetBackgroundState = {
				mode: TARGET_BACKGROUND_MODE.MENU,
				mix: 0,
				comboEnergy: 0,
				hitImpulse: 0,
				flowEnergy: 0,
				frameCounter: 0,
			};
			const targetBackgroundRipples = [];
			const targetBackgroundInfluencers = new Array(8).fill(null).map(() => ({
				screenX: 0,
				screenY: 0,
				strength: 0,
				tint: 0xffffff,
			}));
			let targetBackgroundInfluencerCount = 0;
			const targetBackgroundScratchA = { x: 0, y: 0 };
			const getTargetBackgroundQualityProfile = () => (
				TARGET_BACKGROUND_QUALITY[activeBackgroundQualityMode]
				|| TARGET_BACKGROUND_QUALITY[BACKGROUND_QUALITY_MODE.FULL]
			);
			const isTargetGameplayBackgroundActive = () => Boolean(dragEnabled && basketballMode);
			const toScenePointFromScreen = (sx, sy, out = targetBackgroundScratchA) => {
				const cx = app.renderer.width * 0.5;
				const cy = app.renderer.height * 0.5;
				out.x = (sx - cx - cameraOffset.x) / SCENE_SCALE + cx;
				out.y = (sy - cy - cameraOffset.y) / SCENE_SCALE + cy;
				return out;
			};
			const resetTargetReactiveBackground = () => {
				targetBackgroundRipples.length = 0;
				targetBackgroundInfluencerCount = 0;
				targetReactiveInfluenceLayer.clear();
				targetReactiveRippleLayer.clear();
				targetReactiveFxLayer.visible = false;
				targetBackgroundState.mode = TARGET_BACKGROUND_MODE.MENU;
				targetBackgroundState.mix = 0;
				targetBackgroundState.comboEnergy = 0;
				targetBackgroundState.hitImpulse = 0;
				targetBackgroundState.flowEnergy = 0;
			};
			const clearTargetReactiveTransientFx = () => {
				targetBackgroundRipples.length = 0;
				targetBackgroundInfluencerCount = 0;
				targetReactiveInfluenceLayer.clear();
				targetReactiveRippleLayer.clear();
			};
			const updateTargetReactiveBackgroundMode = (dtSeconds) => {
				const dt = Math.max(0, dtSeconds || 0);
				const active = isTargetGameplayBackgroundActive();
				const targetMix = active ? 1 : 0;
				const response = active ? 5.2 : 3.2;
				targetBackgroundState.mix += (targetMix - targetBackgroundState.mix) * Math.min(1, dt * response);

				const comboTarget = active ? clamp01(arcadeFeedback.combo / 7) : 0;
				targetBackgroundState.comboEnergy += (comboTarget - targetBackgroundState.comboEnergy) * Math.min(1, dt * 2.4);
				targetBackgroundState.comboEnergy = Math.max(0, targetBackgroundState.comboEnergy - dt * (active ? 0.14 : 1.2));
				targetBackgroundState.hitImpulse = Math.max(0, targetBackgroundState.hitImpulse - dt * (active ? 1.3 : 3.1));
				const flowTarget = clamp01(targetBackgroundState.comboEnergy * 0.72 + targetBackgroundState.hitImpulse * 0.95);
				targetBackgroundState.flowEnergy += (flowTarget - targetBackgroundState.flowEnergy) * Math.min(1, dt * (active ? 4.4 : 3.2));

				if (active && targetBackgroundState.mix >= 0.985) {
					targetBackgroundState.mode = TARGET_BACKGROUND_MODE.TARGET_MINIGAME_UNLOCKED_ACTIVE;
				} else if (targetBackgroundState.mix <= 0.015) {
					targetBackgroundState.mode = TARGET_BACKGROUND_MODE.MENU;
				} else {
					targetBackgroundState.mode = TARGET_BACKGROUND_MODE.TRANSITION_TO_TARGET;
				}
			};
			const spawnTargetBackgroundRipple = (screenX, screenY, strength = 1, tint = 0x79d8ff) => {
				if (!isTargetGameplayBackgroundActive()) return;
				const profile = getTargetBackgroundQualityProfile();
				if (targetBackgroundRipples.length >= profile.maxRipples) {
					targetBackgroundRipples.shift();
				}
				const mixStrength = clamp01(strength);
				targetBackgroundRipples.push({
					screenX,
					screenY,
					tint,
					age: 0,
					life: 0.54 + mixStrength * 0.32,
					radiusPx: 14 + mixStrength * 18,
					speedPx: profile.rippleSpeedPx * (0.84 + mixStrength * 0.42),
					strokePx: profile.rippleStrokePx * (0.85 + mixStrength * 0.34),
					maxAlpha: 0.22 + mixStrength * 0.34,
				});
				targetBackgroundState.hitImpulse = Math.min(1, targetBackgroundState.hitImpulse + 0.2 + mixStrength * 0.34);
			};
			const renderTargetReactiveBackground = (dtSeconds) => {
				const dt = Math.max(0, dtSeconds || 0);
				const profile = getTargetBackgroundQualityProfile();
				targetBackgroundState.frameCounter = (targetBackgroundState.frameCounter + 1) % Math.max(1, profile.frameStep);
				if (targetBackgroundState.frameCounter !== 0) return;

				const mix = clamp01(targetBackgroundState.mix);
				if (mix <= 0.001 && targetBackgroundRipples.length === 0) {
					targetReactiveFxLayer.visible = false;
					targetReactiveInfluenceLayer.clear();
					targetReactiveRippleLayer.clear();
					return;
				}

				targetReactiveFxLayer.visible = true;
				targetReactiveFxLayer.alpha = clamp01((profile.layerAlpha + targetBackgroundState.flowEnergy * 0.18) * Math.max(mix, targetBackgroundRipples.length > 0 ? 0.18 : 0));
				targetReactiveInfluenceLayer.clear();
				targetReactiveRippleLayer.clear();

				const influencerLimit = Math.min(targetBackgroundInfluencerCount, profile.maxInfluencers);
				for (let i = 0; i < influencerLimit; i++) {
					const inf = targetBackgroundInfluencers[i];
					const influence = clamp01((0.28 + inf.strength * 0.5 + targetBackgroundState.flowEnergy * 0.24) * mix);
					if (influence <= 0.01) continue;
					const targetWorld = toScenePointFromScreen(inf.screenX, inf.screenY, targetBackgroundScratchA);
					const radius = screenToWorldSize(profile.targetRadiusPx * (0.88 + inf.strength * 0.22));
					targetReactiveInfluenceLayer.beginFill(inf.tint, 0.06 * influence);
					targetReactiveInfluenceLayer.drawCircle(targetWorld.x, targetWorld.y, radius);
					targetReactiveInfluenceLayer.endFill();
					targetReactiveInfluenceLayer.beginFill(0xffffff, 0.022 * influence);
					targetReactiveInfluenceLayer.drawCircle(targetWorld.x, targetWorld.y, radius * 0.54);
					targetReactiveInfluenceLayer.endFill();
				}

				for (let i = targetBackgroundRipples.length - 1; i >= 0; i--) {
					const ripple = targetBackgroundRipples[i];
					ripple.age += dt;
					if (ripple.age >= ripple.life) {
						targetBackgroundRipples.splice(i, 1);
						continue;
					}
					const t = clamp01(ripple.age / Math.max(0.0001, ripple.life));
					const eased = 1 - Math.pow(1 - t, 2);
					const alpha = (1 - t) * ripple.maxAlpha * Math.max(mix, 0.2);
					if (alpha <= 0.003) continue;
					const worldPos = toScenePointFromScreen(ripple.screenX, ripple.screenY, targetBackgroundScratchA);
					const radius = screenToWorldSize(ripple.radiusPx + ripple.speedPx * eased);
					targetReactiveRippleLayer.lineStyle(screenToWorldSize(ripple.strokePx * (1 - t * 0.45)), ripple.tint, alpha);
					targetReactiveRippleLayer.drawCircle(worldPos.x, worldPos.y, radius);
					targetReactiveRippleLayer.beginFill(ripple.tint, alpha * 0.14);
					targetReactiveRippleLayer.drawCircle(worldPos.x, worldPos.y, radius * 0.72);
					targetReactiveRippleLayer.endFill();
				}
			};
			const arcadeCountdownSteps = [
				{ label: '3', rate: 1.0, tint: 0xe8faff },
				{ label: '2', rate: 1.0, tint: 0xe8faff },
				{ label: '1', rate: 1.0, tint: 0xe8faff },
				{ label: 'GO', rate: 1.15, tint: 0x93ffd9 },
			];
			const arcadeCountdown = {
				active: false,
				stepIndex: -1,
				stepElapsed: 0,
				stepDuration: 0.74,
			};
			const stopArcadeCountdown = () => {
				arcadeCountdown.active = false;
				arcadeCountdown.stepIndex = -1;
				arcadeCountdown.stepElapsed = 0;
				arcadeCountdownText.visible = false;
			};
			const triggerArcadeCountdownStep = () => {
				arcadeCountdown.stepIndex += 1;
				arcadeCountdown.stepElapsed = 0;
				if (arcadeCountdown.stepIndex >= arcadeCountdownSteps.length) {
					stopArcadeCountdown();
					return;
				}
				const step = arcadeCountdownSteps[arcadeCountdown.stepIndex];
				arcadeCountdownText.text = step.label;
				arcadeCountdownText.tint = step.tint;
				arcadeCountdownText.visible = true;
				playSfxSafe(ICON_SFX.countdown, {
					volume: step.label === 'GO' ? 0.8 : 0.66,
					rate: step.rate,
				});
			};
			const startArcadeCountdown = () => {
				arcadeCountdown.active = true;
				arcadeCountdown.stepIndex = -1;
				arcadeCountdown.stepElapsed = 0;
				triggerArcadeCountdownStep();
			};
			const updateArcadeCountdown = (dtSeconds) => {
				if (!arcadeCountdown.active) return;
				arcadeCountdown.stepElapsed += dtSeconds;
				if (arcadeCountdown.stepElapsed >= arcadeCountdown.stepDuration) {
					triggerArcadeCountdownStep();
				}
			};
			const arcadeRand = (min, max) => min + Math.random() * (max - min);
			const getArcadeTargetTypeIndex = () => {
				const roll = Math.random();
				if (roll < 0.54) return 0;
				if (roll < 0.86) return 1;
				return 2;
			};
			const respawnArcadeTarget = (target, forceTypeIndex = null) => {
				target.typeIndex = Number.isInteger(forceTypeIndex) ? forceTypeIndex : getArcadeTargetTypeIndex();
				const dividerY = getArcadeDividerScreenY();
				const spawnMinY = Math.max(20, app.renderer.height * 0.06);
				const spawnMaxY = Math.max(spawnMinY + 6, dividerY - (arcadeMaxTargetRadiusPx + 12));
				target.screenX = arcadeRand(app.renderer.width * 0.08, app.renderer.width * 0.92);
				target.screenY = arcadeRand(spawnMinY, spawnMaxY);
				target.phase = Math.random() * Math.PI * 2;
				target.phaseVel = arcadeRand(1.3, 2.6);
				target.drawScreenX = target.screenX;
				target.drawScreenY = target.screenY;
				target.alive = true;
				target.respawnTimer = 0;
			};
			const seedArcadeTargets = () => {
				arcadeTargets.length = 0;
				const seedTypes = [0, 0, 1, 1, 2];
				for (let i = 0; i < seedTypes.length; i++) {
					const target = { id: ++arcadeTargetSeed, typeIndex: 0, screenX: 0, screenY: 0, phase: 0, phaseVel: 0, drawScreenX: 0, drawScreenY: 0, alive: true, respawnTimer: 0 };
					respawnArcadeTarget(target, seedTypes[i]);
					arcadeTargets.push(target);
				}
			};
			const spawnArcadeShards = (screenX, screenY, tint, radiusPx) => {
				const shardCount = 8 + Math.floor(Math.random() * 7);
				for (let i = 0; i < shardCount; i++) {
					const angle = arcadeRand(-Math.PI, Math.PI);
					const speed = arcadeRand(140, 360) + radiusPx * 2.6;
					arcadeShards.push({
						x: screenX,
						y: screenY,
						vx: Math.cos(angle) * speed,
						vy: Math.sin(angle) * speed - arcadeRand(40, 130),
						size: arcadeRand(3.2, 7.2),
						rot: Math.random() * Math.PI * 2,
						rotV: arcadeRand(-8.5, 8.5),
						life: arcadeRand(0.4, 0.95),
						age: 0,
						bounces: 0,
						tint,
					});
				}
			};

			const getAllIconBodies = () => {
				const bodies = [];
				const appBodies = appLauncher.getBodies?.() || [];
				for (const body of appBodies) if (body?.container && body?.state) bodies.push(body);
				const externals = [
					blogIconGetBody?.(),
					linkedinIconGetBody?.(),
					reflexIconGetBody?.(),
					walklatroIconGetBody?.(),
				].filter(Boolean);
				for (const body of externals) if (body?.container && body?.state) bodies.push(body);
				return bodies;
			};
			const iconSfxState = new WeakMap();
			let pointerPressedIcon = null;
			const findHoveredIconBody = () => {
				const bodies = getAllIconBodies();
				for (let i = bodies.length - 1; i >= 0; i--) {
					const body = bodies[i];
					if (body?.state?.hovered) return body;
				}
				return null;
			};
			const playThrowBySpeed = (speed) => {
				const throwMin = 170 / SCENE_SCALE;
				const throwMax = 1100 / SCENE_SCALE;
				const mix = clamp01((speed - throwMin) / Math.max(1, throwMax - throwMin));
				if (mix <= 0) return;
				playSfxSafe(ICON_SFX.throw, {
					volume: 0.18 + mix * 0.72,
					rate: 0.88 + mix * 0.46,
				});
			};
			const updateIconSfxMonitor = () => {
				const bodies = getAllIconBodies();
				const now = nowMs();
				const velocityEpsilon = 26 / SCENE_SCALE;
				const wallThreshold = 190 / SCENE_SCALE;
				const wallCooldownMs = 60;
				for (const body of bodies) {
					if (!body?.container || !body?.state) continue;
					const container = body.container;
					const st = body.state;
					const hovered = Boolean(st.hovered);
					const dragLike = Boolean(st.dragging || st.grabbed);
					const vx = Number.isFinite(st.vx) ? st.vx : 0;
					const vy = Number.isFinite(st.vy) ? st.vy : 0;
					let prev = iconSfxState.get(container);
					if (!prev) {
						iconSfxState.set(container, {
							hovered,
							dragLike,
							vx,
							vy,
							lastWallAt: -999,
						});
						continue;
					}

					if (!prev.hovered && hovered) {
						playSfxSafe(ICON_SFX.hover, {
							volume: 0.34 + Math.random() * 0.14,
							rate: 0.96 + Math.random() * 0.08,
						});
					}
					if (!prev.dragLike && dragLike) {
						playSfxSafe(ICON_SFX.grab, {
							volume: 0.5,
							rate: 0.95 + Math.random() * 0.12,
						});
					}
					if (prev.dragLike && !dragLike) {
						const releaseSpeed = Math.hypot(vx, vy);
						playSfxSafe(ICON_SFX.release, {
							volume: 0.38,
							rate: 0.94 + Math.random() * 0.1,
						});
						playThrowBySpeed(releaseSpeed);
					}

					if (!dragLike && !prev.dragLike) {
						const hitX = Math.abs(prev.vx) > velocityEpsilon
							&& Math.abs(vx) > velocityEpsilon
							&& Math.sign(prev.vx) !== Math.sign(vx)
							&& Math.abs(vx - prev.vx) > wallThreshold;
						const hitY = Math.abs(prev.vy) > velocityEpsilon
							&& Math.abs(vy) > velocityEpsilon
							&& Math.sign(prev.vy) !== Math.sign(vy)
							&& Math.abs(vy - prev.vy) > wallThreshold;
						if ((hitX || hitY) && now - prev.lastWallAt > wallCooldownMs) {
							const impact = Math.max(Math.abs(vx - prev.vx), Math.abs(vy - prev.vy));
							const impactMix = clamp01((impact - (180 / SCENE_SCALE)) / (1050 / SCENE_SCALE));
							playSfxSafe(ICON_SFX.wallHit, {
								volume: 0.14 + impactMix * 0.58,
								rate: 0.92 + impactMix * 0.22,
							});
							prev.lastWallAt = now;
						}
					}

					prev.hovered = hovered;
					prev.dragLike = dragLike;
					prev.vx = vx;
					prev.vy = vy;
				}
			};
			const updateArcadeScoreLabel = () => {
				const comboSuffix = arcadeFeedback.combo > 1 ? `  x${arcadeFeedback.combo}` : '';
				arcadeScoreText.text = `SCORE ${basketballScore}${comboSuffix}`;
			};
			const resetArcadeRound = () => {
				basketballScore = 0;
				arcadeFeedback.combo = 0;
				arcadeFeedback.lastScoreTime = -999;
				arcadeFeedback.popupTimer = 999;
				arcadeFeedback.noGoVoided = false;
				arcadeFeedback.cursorWasBlocked = false;
				arcadePopupText.visible = false;
				stopArcadeCountdown();
				iconScoreState.clear();
				arcadeShards.length = 0;
				seedArcadeTargets();
				updateArcadeScoreLabel();
			};
			const triggerArcadePopup = (message, baseScale = 1, color = null) => {
				arcadePopupText.text = message;
				arcadeFeedback.popupBaseScale = baseScale;
				arcadeFeedback.popupColor = color ?? pickArcadePopupColor();
				arcadePopupText.tint = arcadeFeedback.popupColor;
				arcadeFeedback.popupTimer = 0;
				arcadePopupText.visible = true;
			};
			const applyDragEnabled = (enabled) => {
				const wasTargetGameplayActive = Boolean(dragEnabled && basketballMode);
				dragEnabled = Boolean(enabled);
				if (dragEnabled) {
					moodHoverEnabled = false;
					moodHoverResumeAtMs = 0;
					pendingMoodSources.clear();
					hoverMoodSources.clear();
					moodLockTarget = { ...DRAG_MOOD };
					resolveActiveMood();
				} else {
					moodHoverEnabled = false;
					moodHoverResumeAtMs = nowMs() + MOOD_REENABLE_DELAY_MS;
					pendingMoodSources.clear();
					hoverMoodSources.clear();
					moodLockTarget = { ...BASE_MOOD };
					resolveActiveMood();
				}
				lockAnimTarget = dragEnabled ? 1 : 0;
				basketballToggle.visible = dragEnabled;
				basketballToggle.eventMode = dragEnabled ? 'static' : 'none';
				if (!dragEnabled) basketballMode = false;
				arcadeLayer.visible = basketballMode;
				if (!dragEnabled || !basketballMode) {
					clearTargetReactiveTransientFx();
					const exitingTargetViaLock = wasTargetGameplayActive && !dragEnabled;
					if (!exitingTargetViaLock) {
						resetTargetReactiveBackground();
					}
				}
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
					stopSfxLoopSafe(RING_SPIN_LOOP_KEY, { fadeOut: 0.08 });
				} else {
					ringDrag.active = false;
					ringCandidate.active = false;
					ringSpinVel = 0;
					ringSpin = 0;
					stopSfxLoopSafe(RING_SPIN_LOOP_KEY, { fadeOut: 0.08 });
					stopArcadeCountdown();
					resetArcadeRound();
					basketballHoverTarget = 0;
					basketballHover = 0;
					appLauncher.layout(false);
					layoutBlogIcon(false);
					layoutLinkedinIcon(false);
					layoutReflexIcon(false);
					layoutWalklatroIcon(false);
				}
				lockNeedsRedraw = true;
				drawBasketballToggle();
			};
			const placeLockButton = () => {
				lockScreenX = app.renderer.width - lockButtonSize - 16;
				lockScreenY = app.renderer.height - lockButtonSize - 16;
				const x = screenToWorldX(lockScreenX);
				const y = screenToWorldY(lockScreenY);
				lockToggle.position.set(x, y);
				soundScreenX = lockScreenX;
				soundScreenY = lockScreenY - soundButtonSize - soundStackGap;
				soundToggle.position.set(screenToWorldX(soundScreenX), screenToWorldY(soundScreenY));
				layoutSoundPanel();
				const bx = screenToWorldX(app.renderer.width - lockButtonSize - basketballButtonSize - 26);
				const by = screenToWorldY(app.renderer.height - basketballButtonSize - 19);
				basketballToggle.position.set(bx, by);
			};
			lockToggle.on('pointerover', () => {
				lockHoverTarget = 1;
				lockNeedsRedraw = true;
				playSfxSafe(ICON_SFX.hover, { volume: 0.32, rate: 1.0 });
			});
			lockToggle.on('pointerout', () => {
				lockHoverTarget = 0;
				lockNeedsRedraw = true;
			});
			lockToggle.on('pointertap', () => {
				playSfxSafe(ICON_SFX.click, { volume: 0.5, rate: 1.0 });
				applyDragEnabled(!dragEnabled);
			});
			basketballToggle.on('pointerover', () => { basketballHoverTarget = 1; });
			basketballToggle.on('pointerout', () => { basketballHoverTarget = 0; });
			basketballToggle.on('pointertap', () => {
				if (!dragEnabled) return;
				basketballMode = !basketballMode;
				arcadeLayer.visible = basketballMode;
				if (basketballMode) {
					resetArcadeRound();
					startArcadeCountdown();
					arcadeFeedback.cursorWasBlocked = mouse.y <= getArcadeDividerScreenY();
					arcadeFeedback.noGoVoided = arcadeFeedback.cursorWasBlocked;
				} else {
					stopArcadeCountdown();
					arcadePopupText.visible = false;
					clearTargetReactiveTransientFx();
				}
			});
			arcadeSweepControl.on('pointerover', () => { arcadeSweepHoverTarget = 1; });
			arcadeSweepControl.on('pointerout', () => { arcadeSweepHoverTarget = 0; });
			arcadeSweepControl.on('pointertap', () => {
				if (!basketballMode || !dragEnabled) return;
				const bodies = getAllIconBodies();
				const shove = 260 / SCENE_SCALE;
				const step = 34 / SCENE_SCALE;
				let moved = 0;
				for (const body of bodies) {
					const c = body?.container;
					const st = body?.state;
					if (!c || !st) continue;
					if (st.dragging || st.grabbed) continue;
					if (c.position.y >= arcadeState.dividerWorldY - screenToWorldSize(8)) continue;
					c.position.y += step;
					st.vy = Math.max(st.vy ?? 0, shove);
					st.vx = (st.vx ?? 0) * 0.9;
					if (st.free) {
						st.free.x = c.position.x;
						st.free.y = c.position.y;
					}
					moved += 1;
				}
				if (moved > 0) {
					triggerArcadePopup('SWEEP DOWN', 0.86, 0x90dcff);
				}
			});
			placeLockButton();
			applyDragEnabled(false);
			let lastMouseWorld = { x: app.renderer.width / 2, y: app.renderer.height / 2 };

			const getSlotPose = (slotIndex) => getIntroPoseForSlot(slotIndex);
			const getSlotX = (slotIndex) => getSlotPose(slotIndex).x;
			const getSlotY = (slotIndex) => getSlotPose(slotIndex).y;
			const getExternalSlotIndex = (externalOrdinal) => launcherWheelItemCount + externalOrdinal;
			try {
				const blogIconResult = await withTimeout(createBlogIcon(app, world, {
					url: '/blog',
					screenScale: SCENE_SCALE,
					onHoverChange: ({ hovered, key, container }) => setMoodHover(key, hovered, container),
					dockScreenX: () => getSlotX(getExternalSlotIndex(0)),
					dockScreenY: () => getSlotY(getExternalSlotIndex(0)),
					panelFill: 0x2a1b12,
					panelFillAlpha: 0.94,
					panelBorder: 0xffb66d,
					panelBorderAlpha: 0.95,
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
					onHoverChange: ({ hovered, key, container }) => setMoodHover(key, hovered, container),
					dockScreenX: () => getSlotX(getExternalSlotIndex(1)),
					dockScreenY: () => getSlotY(getExternalSlotIndex(1)),
					panelFill: 0x0c1c3a,
					panelFillAlpha: 0.96,
					panelBorder: 0x62bbff,
					panelBorderAlpha: 0.95,
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
					onHoverChange: ({ hovered, key, container }) => setMoodHover(key, hovered, container),
					dockScreenX: () => getSlotX(getExternalSlotIndex(2)),
					dockScreenY: () => getSlotY(getExternalSlotIndex(2)),
					panelFill: 0x2a1119,
					panelFillAlpha: 0.95,
					panelBorder: 0xff7f9d,
					panelBorderAlpha: 0.96,
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
					onHoverChange: ({ hovered, key, container }) => setMoodHover(key, hovered, container),
					dockScreenX: () => getSlotX(getExternalSlotIndex(3)),
					dockScreenY: () => getSlotY(getExternalSlotIndex(3)),
					panelFill: 0x1c1208,
					panelFillAlpha: 0.96,
					panelBorder: 0xf2c46f,
					panelBorderAlpha: 0.95,
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

			if (ENABLE_PLAYER_CUBE) {
				world.addChild(player.view);
			}
		const ENABLE_THEME_TOGGLE = false;
		const toggleBtn = document.createElement('button');
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
			if (player) player.setColors(theme.player);
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
		cursorContainer.zIndex = 5000;
		cursorContainer.visible = SHOW_INGAME_CURSOR;
		uiTopLayer.addChild(cursorContainer);
		const setInGameCursorVisible = (visible) => {
			cursorContainer.visible = SHOW_INGAME_CURSOR && Boolean(visible);
		};

		const transitionWipe = new PIXI.Graphics();
		transitionWipe.eventMode = 'none';
		transitionWipe.zIndex = 4700;
		transitionWipe.visible = false;
		app.stage.addChild(transitionWipe);

		const PORTFOLIO_SEEN_KEY = 'mw_portfolio_seen';
		let showFirstPortfolioHint = (() => {
			try {
				return localStorage.getItem(PORTFOLIO_SEEN_KEY) !== '1';
			} catch (_) {
				return true;
			}
		})();

		const portfolioEntryTransition = {
			active: false,
			phase: 0,
			duration: 0.28,
			surge: 0,
			direction: 1,
			action: null,
			actionTriggered: false,
		};
		const vineLabTransition = {
			active: false,
			phase: 0,
			duration: 0.34,
			direction: 1,
			action: null,
			actionTriggered: false,
		};
		let portfolioSnapTimer = 0;
		const drawTransitionWipe = (phase) => {
			const p = Math.max(0, Math.min(1, phase));
			transitionWipe.clear();
			if (p <= 0.001) {
				transitionWipe.visible = false;
				return;
			}
			const sw = app.renderer.width;
			const sh = app.renderer.height;
			transitionWipe.visible = true;
			const glitchPulse = Math.sin(p * Math.PI);
			transitionWipe.beginFill(0x05070d, 0.0);
			transitionWipe.drawRect(0, 0, sw, sh);
			transitionWipe.endFill();
			const stripeCount = 22;
			for (let i = 0; i < stripeCount; i++) {
				const y = Math.random() * sh;
				const h = 1 + Math.random() * 3;
				const xJitter = (Math.random() - 0.5) * 24 * glitchPulse;
				transitionWipe.beginFill(0xaedfff, 0.0);
				transitionWipe.drawRect(xJitter, y, sw, h);
				transitionWipe.endFill();
			}
			if (glitchPulse > 0.45) {
				for (let i = 0; i < 4; i++) {
					const bandH = Math.max(8, sh * (0.03 + Math.random() * 0.08));
					const by = Math.random() * (sh - bandH);
					const bx = (Math.random() - 0.5) * 18;
					transitionWipe.beginFill(0xffffff, 0.0);
					transitionWipe.drawRect(bx, by, sw, bandH);
					transitionWipe.endFill();
				}
			}
		};
		const startPortfolioExitTransition = () => {
			if (!livingRoomActive || portfolioEntryTransition.active) return;
			playExitToMenuSfx();
			portfolioEntryTransition.active = true;
			portfolioEntryTransition.phase = 0;
			portfolioEntryTransition.duration = 0.3;
			portfolioEntryTransition.surge = 1;
			portfolioEntryTransition.direction = -1;
			portfolioEntryTransition.actionTriggered = false;
			portfolioEntryTransition.action = () => {
				closePortfolioLibraryNow();
			};
			drawTransitionWipe(0.01);
		};
		const startPortfolioEntryTransition = () => {
			if (livingRoomActive || portfolioEntryTransition.active) return;
			terminalTypingHold = true;
			portfolioEntryTransition.active = true;
			portfolioEntryTransition.phase = 0;
			portfolioEntryTransition.duration = 0.28;
			portfolioEntryTransition.surge = 1;
			portfolioEntryTransition.direction = 1;
			portfolioEntryTransition.actionTriggered = false;
			portfolioEntryTransition.action = () => {
				openPortfolioLibraryNow();
				showFirstPortfolioHint = false;
				try {
					localStorage.setItem(PORTFOLIO_SEEN_KEY, '1');
				} catch (_) {
				}
				portfolioSnapTimer = 0.16;
			};
			drawTransitionWipe(0.01);
		};
		const ENABLE_LEFT_PORTAL_SHORTCUT = false;

		const leftPortal = new PIXI.Container();
		const leftGlowSoft = new PIXI.Graphics();
		const leftGlow = new PIXI.Graphics();
		const leftArrow = new PIXI.Graphics();
		const leftPortalHitZone = new PIXI.Graphics();
		const leftPortalLabel = new PIXI.Text('PORTFOLIO ->', {
			fontFamily: 'Minecraft, monospace',
			fontSize: 12,
			fill: 0xf3e0c0,
			align: 'left',
			letterSpacing: 1,
		});
		leftPortalLabel.anchor.set(0, 0.5);
		leftPortalLabel.alpha = 0;
		leftPortalLabel.zIndex = 205;
		const leftPortalHint = new PIXI.Text('Where does it go?', {
			fontFamily: 'Minecraft, monospace',
			fontSize: 10,
			fill: 0xc9b6a0,
			align: 'left',
			letterSpacing: 1,
		});
		leftPortalHint.anchor.set(0, 0.5);
		leftPortalHint.alpha = 0;
		leftPortalHint.zIndex = 205;
		leftPortal.addChild(leftGlowSoft, leftGlow, leftArrow, leftPortalHitZone, leftPortalLabel, leftPortalHint);
		world.addChild(leftPortal);
		let leftPortalHoverTarget = 0;
		let leftPortalHover = 0;
		let leftPortalEdgePrompt = 0;
		let leftPortalHintPrompt = 0;
		let lastPortalInteractionAtMs = nowMs();
		const markPortalInteraction = () => {
			lastPortalInteractionAtMs = nowMs();
		};
		const onPortalHoverIn = () => {
			leftPortalHoverTarget = 1;
			markPortalInteraction();
		};
		const onPortalHoverOut = () => {
			leftPortalHoverTarget = 0;
		};
		leftArrow.eventMode = ENABLE_LEFT_PORTAL_SHORTCUT ? 'static' : 'none';
		leftArrow.cursor = ENABLE_LEFT_PORTAL_SHORTCUT ? 'pointer' : 'default';
		leftArrow.on('pointerover', onPortalHoverIn);
		leftArrow.on('pointerout', onPortalHoverOut);
		leftArrow.on('pointertap', () => {
			if (!ENABLE_LEFT_PORTAL_SHORTCUT) return;
			markPortalInteraction();
			startPortfolioEntryTransition();
		});
		leftPortalHitZone.eventMode = ENABLE_LEFT_PORTAL_SHORTCUT ? 'static' : 'none';
		leftPortalHitZone.cursor = ENABLE_LEFT_PORTAL_SHORTCUT ? 'pointer' : 'default';
		leftPortalHitZone.on('pointerover', onPortalHoverIn);
		leftPortalHitZone.on('pointerout', onPortalHoverOut);
		leftPortalHitZone.on('pointertap', () => {
			if (!ENABLE_LEFT_PORTAL_SHORTCUT) return;
			markPortalInteraction();
			startPortfolioEntryTransition();
		});
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

				leftPortalLabel.style.fontSize = Math.max(10, Math.round(screenToWorldSize(12)));
				leftPortalLabel.position.set(portalW * 0.98, portalH * 0.34);
				leftPortalHint.style.fontSize = Math.max(9, Math.round(screenToWorldSize(10)));
				leftPortalHint.position.set(portalW * 1.02, portalH * 0.48);
		}
		layoutLeftPortal();

		const PORTFOLIO_MEDIA_IMAGE = 'image';
		const PORTFOLIO_MEDIA_GIF = 'gif';
		const PORTFOLIO_MEDIA_VIDEO = 'video';
		const PORTFOLIO_HIGHLIGHT_ACCENT = 'accent';
		const PORTFOLIO_HIGHLIGHT_RAINBOW = 'rainbow';
		const PORTFOLIO_EMPTY_SLIDE = {
			type: PORTFOLIO_MEDIA_IMAGE,
			src: './assets/images/Uh-Oh.png',
			title: 'Empty Slot',
			overview: 'No media has been attached to this slot yet.',
			design: 'Use this slot for future mockups, flow captures, or concept art.',
			technical: 'Attach a slides array to activate the full walkthrough for this project.',
			highlights: [],
			links: [],
		};
		const PORTFOLIO_PROJECTS = [
			{
				id: 'default-home',
				label: 'MAIN PAGE',
				title: 'Main Page',
				summary: 'Thanks for visiting my page! There might be some cool stuff if you poke around a bit :)',
				status: 'ready',
				accent: 0x8eb8ff,
				useDesktopFeed: true,
				stack: ['Portfolio', 'PIXI', 'WebGL'],
				links: [],
				slides: [
					{
						type: PORTFOLIO_MEDIA_IMAGE,
						src: './assets/images/logo.png',
						title: 'masonwalker.tech',
						overview: 'Thanks for visiting my page! There might be some cool stuff if you poke around a bit :)',
						design: '',
						technical: '',
						highlights: [
							{ text: 'bro-link synced', style: PORTFOLIO_HIGHLIGHT_ACCENT },
						],
						links: [],
					},
				],
			},
			{
				id: 'slot-b',
				label: 'LAUNCHER',
				title: 'Tile Manager',
				summary: 'A modular launcher workflow focused on legible states and quick handoff.',
				status: 'ready',
				accent: 0xcf5f8f,
				stack: ['Tauri', 'Rust', 'TypeScript'],
				links: [
					{ label: 'Repository', url: 'https://github.com/maywok/maywok.github.io' },
				],
				slides: [
					{
						type: PORTFOLIO_MEDIA_IMAGE,
						src: './assets/portfolio/launcher/home.png',
						title: 'Home Surface',
						overview: 'This is the main page where you get to choose what system you want to launch.',
						design: 'I was inspired by the clean Frutiger Aero design of many Nintendo frontends such as the Wii and 3DS home menu, my main goal was to have style and substance work together so I focused on making sure the UI hierarchy was clear and the launcher actions were easy to understand at a glance.',
						technical: 'Nothing here yet :)',
						highlights: [
							{ text: 'UI hierarchy', style: PORTFOLIO_HIGHLIGHT_ACCENT },
							{ text: 'TypeScript', style: PORTFOLIO_HIGHLIGHT_ACCENT },
							{ text: 'Rust', style: PORTFOLIO_HIGHLIGHT_RAINBOW },
						],
						links: [
							{ label: 'home.png', url: './assets/portfolio/launcher/home.png' },
						],
					},
					{
						type: PORTFOLIO_MEDIA_IMAGE,
						src: './assets/portfolio/launcher/menu.png',
						title: 'Menu State',
						overview: 'This is the menu that appears after clicking a system, it shows the games detected for that system and allows you to launch them! There is also bonus customization for your games such as custom icons.',
						design: 'Nothing here yet :)',
						technical: 'Nothing here yet :)',
						highlights: [
							{ text: 'Tauri', style: PORTFOLIO_HIGHLIGHT_RAINBOW },
							{ text: 'filesystem scanning', style: PORTFOLIO_HIGHLIGHT_ACCENT },
							{ text: 'registry queries', style: PORTFOLIO_HIGHLIGHT_ACCENT },
						],
						links: [
							{ label: 'menu.png', url: './assets/portfolio/launcher/menu.png' },
						],
					},
					{
						type: PORTFOLIO_MEDIA_IMAGE,
						src: './assets/images/Uh-Oh.png',
						title: 'Uh-Oh Test Slide',
						overview: 'Test for different media sizes',
						design: 'This is a test!',
						technical: 'How are you? Remember to drink water',
						highlights: [
							{ text: 'cross-platform', style: PORTFOLIO_HIGHLIGHT_ACCENT },
							{ text: 'animation system', style: PORTFOLIO_HIGHLIGHT_ACCENT },
						],
						links: [
							{ label: 'Uh-Oh.png', url: './assets/images/Uh-Oh.png' },
						],
					},
				],
			},
			{ id: 'slot-c', label: 'EMPTY', title: 'Empty Slot', summary: 'No project assigned yet.', status: 'empty', accent: 0xd5a063, stack: [], links: [], slides: [PORTFOLIO_EMPTY_SLIDE] },
			{ id: 'slot-d', label: 'EMPTY', title: 'Empty Slot', summary: 'No project assigned yet.', status: 'empty', accent: 0xb58a59, stack: [], links: [], slides: [PORTFOLIO_EMPTY_SLIDE] },
			{ id: 'slot-e', label: 'EMPTY', title: 'Empty Slot', summary: 'No project assigned yet.', status: 'empty', accent: 0x4f80bf, stack: [], links: [], slides: [PORTFOLIO_EMPTY_SLIDE] },
			{ id: 'slot-f', label: 'EMPTY', title: 'Empty Slot', summary: 'No project assigned yet.', status: 'empty', accent: 0x7a659d, stack: [], links: [], slides: [PORTFOLIO_EMPTY_SLIDE] },
		];
		const portfolioProjectsById = new Map(PORTFOLIO_PROJECTS.map((project) => [project.id, project]));
		const VHS_TAPE_LIBRARY = PORTFOLIO_PROJECTS.map((project) => ({
			id: project.id,
			projectId: project.id,
			label: project.label,
			title: project.title,
			status: project.status,
			hasContent: project.status !== 'empty',
			accent: project.accent,
			summary: project.summary,
		}));
		const STATE_DESKTOP_FULLSCREEN = 'STATE_DESKTOP_FULLSCREEN';
		const STATE_LIVING_ROOM_IDLE = 'STATE_LIVING_ROOM_IDLE';
		const STATE_LIVING_ROOM_PLAYING = 'STATE_LIVING_ROOM_PLAYING';
		const VIEW_FULLSCREEN = 'FULLSCREEN';
		const VIEW_TV_AREA = 'TV_AREA';
		const OVERLAY_MODE_LIBRARY = 'library';
		const OVERLAY_MODE_TV = 'tv';
		const CONTENT_DESKTOP = 'DESKTOP';
		const CONTENT_BRO_MEME = 'BRO_MEME';
		const CONTENT_EMPTY = 'EMPTY';
		const CONTENT_SCREENSAVER = 'SCREENSAVER';
		const LIVING_ROOM_TRANSITION_SECONDS = 0.32;
		const livingRoomState = {
			mode: STATE_DESKTOP_FULLSCREEN,
			overlayMode: OVERLAY_MODE_LIBRARY,
			viewMode: VIEW_FULLSCREEN,
			contentMode: CONTENT_DESKTOP,
			fullscreenFromTv: false,
			blend: 0,
			targetBlend: 0,
			hoverIndex: -1,
			activeTapeId: null,
			insertedTapeId: null,
			inserting: null,
			emptyPreviewWord: pickBroPlaceholderWord(),
			playingMix: 0,
			staticBurst: 0,
		};
		// Portfolio scene-only metaball layer; launcher/home flow background is separate.
		const createAmbientBlobTexture = (size = 256) => {
			if (typeof document === 'undefined') return PIXI.Texture.WHITE;
			const canvas = document.createElement('canvas');
			canvas.width = size;
			canvas.height = size;
			const ctx = canvas.getContext('2d');
			if (!ctx) return PIXI.Texture.WHITE;
			const image = ctx.createImageData(size, size);
			const data = image.data;
			const smoothstep = (edge0, edge1, x) => {
				const t = Math.max(0, Math.min(1, (x - edge0) / Math.max(0.0001, edge1 - edge0)));
				return t * t * (3 - 2 * t);
			};
			const hash = (x, y) => {
				const v = Math.sin(x * 127.1 + y * 311.7 + 73.2) * 43758.5453;
				return v - Math.floor(v);
			};
			for (let y = 0; y < size; y++) {
				for (let x = 0; x < size; x++) {
					const nx = ((x + 0.5) / size) * 2 - 1;
					const ny = ((y + 0.5) / size) * 2 - 1;
					const radius = Math.hypot(nx, ny);
					const angle = Math.atan2(ny, nx);
					const edgeRadius = 0.72
						+ Math.sin(angle * 2.9 + 0.7) * 0.06
						+ Math.sin(angle * 5.3 - 1.2) * 0.04
						+ Math.sin(angle * 8.1 + 1.4) * 0.018;
					const edgeMask = 1 - smoothstep(edgeRadius - 0.14, edgeRadius + 0.02, radius);
					const mask = edgeMask * edgeMask;
					if (mask <= 0.001) continue;
					const marblingA = Math.sin(nx * 8.2 + ny * 5.1 + radius * 7.6 + hash(x * 0.56, y * 0.44) * 2.8);
					const marblingB = Math.sin(nx * 12.3 - ny * 9.1 + hash(x * 0.92, y * 0.76) * 3.6);
					const marbling = (marblingA * 0.58 + marblingB * 0.42) * 0.5 + 0.5;
					const cloud = (Math.sin(nx * 4.6 - ny * 3.9 + hash(x * 0.32, y * 0.28) * 4.0) * 0.5 + 0.5);
					const core = 1 - Math.max(0, Math.min(1, radius / Math.max(0.1, edgeRadius)));
					const rim = smoothstep(0.54, 0.98, radius / Math.max(0.16, edgeRadius));
					const tone = Math.max(0, Math.min(1,
						0.56
						+ core * 0.24
						+ marbling * 0.14
						+ cloud * 0.08
						+ rim * (0.07 + marbling * 0.06)
					));
					const alpha = mask * (0.62 + core * 0.24) * (0.88 + marbling * 0.12);
					const idx = (y * size + x) * 4;
					const value = Math.max(0, Math.min(255, Math.round(tone * 255)));
					data[idx] = value;
					data[idx + 1] = value;
					data[idx + 2] = value;
					data[idx + 3] = Math.max(0, Math.min(255, Math.round(alpha * 255)));
				}
			}
			ctx.putImageData(image, 0, 0);
			return PIXI.Texture.from(canvas);
		};
		const livingRoomLayer = new PIXI.Container();
		livingRoomLayer.zIndex = 180;
		livingRoomLayer.sortableChildren = true;
		livingRoomLayer.visible = false;
		livingRoomLayer.eventMode = 'none';
		const roomBg = new PIXI.Container();
		const livingRoomBackdrop = new PIXI.Graphics();
		const livingRoomAmbientLayer = new PIXI.Container();
		const livingRoomWallGlow = new PIXI.Graphics();
		const livingRoomFloor = new PIXI.Graphics();
		const roomVignette = new PIXI.Graphics();
		const livingRoomAmbientBlur = new PIXI.BlurFilter(8, 1);
		const livingRoomAmbientMetaFilter = new PIXI.Filter(undefined, `
			precision mediump float;
			varying vec2 vTextureCoord;
			uniform sampler2D uSampler;
			uniform float u_thresholdLow;
			uniform float u_thresholdHigh;
			uniform float u_alphaBoost;
			uniform float u_bodyContrast;

			void main() {
				vec4 src = texture2D(uSampler, vTextureCoord);
				float shaped = smoothstep(u_thresholdLow, u_thresholdHigh, src.a);
				float body = pow(max(0.0, min(1.0, src.r)), u_bodyContrast);
				float finalAlpha = max(0.0, min(1.0, shaped * u_alphaBoost));
				vec3 color = src.rgb * (0.84 + body * 0.38);
				gl_FragColor = vec4(color, finalAlpha);
			}
		`, {
			u_thresholdLow: 0.21,
			u_thresholdHigh: 0.58,
			u_alphaBoost: 1.08,
			u_bodyContrast: 1.14,
		});
		const livingRoomAmbientFilterArea = new PIXI.Rectangle(0, 0, 1, 1);
		livingRoomAmbientLayer.filters = [livingRoomAmbientBlur, livingRoomAmbientMetaFilter];
		livingRoomAmbientLayer.filterArea = livingRoomAmbientFilterArea;
		livingRoomAmbientLayer.blendMode = PIXI.BLEND_MODES.NORMAL;
		const livingRoomAmbientBlobTexture = createAmbientBlobTexture();
		const livingRoomAmbientBlobs = [
			{ baseX: 0.18, baseY: 0.24, driftX: 0.044, driftY: 0.03, speed: 0.028, scale: 3.12, squish: 0.132, alpha: 0.56, tint: 0x6beaff, phase: 0.4 },
			{ baseX: 0.44, baseY: 0.46, driftX: 0.038, driftY: 0.028, speed: 0.024, scale: 3.44, squish: 0.138, alpha: 0.54, tint: 0x93b3ff, phase: 1.1 },
			{ baseX: 0.72, baseY: 0.22, driftX: 0.04, driftY: 0.03, speed: 0.025, scale: 3.02, squish: 0.126, alpha: 0.52, tint: 0x7de7d2, phase: 2.2 },
			{ baseX: 0.68, baseY: 0.68, driftX: 0.036, driftY: 0.025, speed: 0.022, scale: 3.14, squish: 0.118, alpha: 0.5, tint: 0xff9cd9, phase: 3.1 },
			{ baseX: 0.28, baseY: 0.72, driftX: 0.034, driftY: 0.024, speed: 0.023, scale: 2.86, squish: 0.122, alpha: 0.47, tint: 0xb7ff83, phase: 4.0 },
			{ baseX: 0.52, baseY: 0.28, driftX: 0.032, driftY: 0.022, speed: 0.021, scale: 2.62, squish: 0.114, alpha: 0.44, tint: 0xffb4a3, phase: 4.8 },
		];
		const livingRoomAmbientComputed = new Array(livingRoomAmbientBlobs.length).fill(null).map(() => ({
			x: 0,
			y: 0,
			baseX: 0,
			baseY: 0,
			targetX: 0,
			targetY: 0,
			vx: 0,
			vy: 0,
			merge: 0,
			phase: 0,
			phaseY: 0,
			initialized: false,
		}));
		for (const blob of livingRoomAmbientBlobs) {
			const sprite = new PIXI.Sprite(livingRoomAmbientBlobTexture);
			sprite.anchor.set(0.5);
			sprite.tint = blob.tint;
			sprite.alpha = blob.alpha;
			sprite.blendMode = PIXI.BLEND_MODES.NORMAL;
			sprite.eventMode = 'none';
			blob.sprite = sprite;
			livingRoomAmbientLayer.addChild(sprite);
		}
		roomBg.addChild(livingRoomBackdrop, livingRoomWallGlow, livingRoomAmbientLayer, livingRoomFloor, roomVignette);
		const leftShelf = new PIXI.Graphics();
		const rightShelf = new PIXI.Graphics();
		const vhsTapesLeft = new PIXI.Container();
		const vhsTapesRight = new PIXI.Container();
		const cartridgeListViewport = new PIXI.Container();
		const cartridgeListContent = new PIXI.Container();
		const cartridgeListMask = new PIXI.Graphics();
		const cartridgeScrollUi = new PIXI.Container();
		const cartridgeScrollTrack = new PIXI.Graphics();
		const cartridgeScrollThumb = new PIXI.Graphics();
		cartridgeListViewport.addChild(cartridgeListContent, cartridgeListMask);
		cartridgeListViewport.mask = cartridgeListMask;
		cartridgeScrollUi.addChild(cartridgeScrollTrack, cartridgeScrollThumb);
		const livingRoomTv = new PIXI.Container();
		livingRoomTv.sortableChildren = true;
		const tvBodyShadow = new PIXI.Graphics();
		const tvBody = new PIXI.Graphics();
		const tvBezelRimLight = new PIXI.Graphics();
		const tvBezelRimShade = new PIXI.Graphics();
		const tvGlassReflection = new PIXI.Graphics();
		const livingRoomTvFrame = new PIXI.Graphics();
		const livingRoomTvArt = new PIXI.Sprite(PIXI.Texture.WHITE);
		const tvScreenGroup = new PIXI.Container();
		const tvScreenMask = new PIXI.Graphics();
		const tvContentContainer = new PIXI.Container();
		const tvScreenBaseBg = new PIXI.Graphics();
		const tvMediaFrameGlow = new PIXI.Graphics();
		const tvMediaFrame = new PIXI.Graphics();
		const tvMediaPrevSprite = new PIXI.Sprite(PIXI.Texture.WHITE);
		const tvDesktopContentSprite = new PIXI.Sprite(PIXI.Texture.WHITE);
		const tvSlideDotNav = new PIXI.Container();
		const tvMediaZoomHint = new PIXI.Text('CLICK TO ZOOM', {
			fontFamily: 'Minecraft, monospace',
			fontSize: 8,
			fill: 0x8fd8ff,
			letterSpacing: 0.8,
			align: 'center',
		});
		tvMediaPrevSprite.anchor.set(0.5);
		tvDesktopContentSprite.anchor.set(0.5);
		tvMediaZoomHint.anchor.set(0.5, 0);
		tvMediaZoomHint.alpha = 0.82;
		const tvDesktopTransitionLayer = new PIXI.Container();
		const tvDesktopTransitionSprite = new PIXI.Sprite(PIXI.Texture.WHITE);
		tvDesktopTransitionLayer.addChild(tvDesktopTransitionSprite);
		tvDesktopTransitionLayer.visible = false;
		tvDesktopTransitionLayer.eventMode = 'none';
		const tvBroScreen = new PIXI.Container();
		const tvBroBg = new PIXI.Graphics();
		const tvBroTitle = new PIXI.Text('TERMINAL', {
			fontFamily: PORTFOLIO_RIGHT_INFO_FONT_FAMILY,
			fontSize: 13,
			fill: 0xf5ecdb,
			letterSpacing: 1,
		});
		tvBroTitle.anchor.set(0.5, 0.5);
		const tvBroSub = new PIXI.Text('placeholder playback', {
			fontFamily: PORTFOLIO_RIGHT_INFO_FONT_FAMILY,
			fontSize: 9,
			fill: 0xd4c0a4,
			letterSpacing: 1,
		});
		tvBroSub.anchor.set(0.5, 0.5);
		const tvTerminalMask = new PIXI.Graphics();
		const tvTerminalLines = new PIXI.Container();
		const tvTerminalCursor = new PIXI.Graphics();
		const tvTerminalSlideTitle = new PIXI.Text('SLIDE', {
			fontFamily: PORTFOLIO_RIGHT_INFO_FONT_FAMILY,
			fontSize: 12,
			fill: 0xffe4bc,
			letterSpacing: 1,
		});
		const tvTerminalSlideValue = new PIXI.Text('', {
			fontFamily: PORTFOLIO_RIGHT_INFO_FONT_FAMILY,
			fontSize: 10,
			fill: 0xe9dfcd,
			letterSpacing: 0.6,
			wordWrap: true,
			wordWrapWidth: 160,
			lineHeight: 14,
		});
		const tvTerminalOverviewLabel = new PIXI.Text('OVERVIEW', {
			fontFamily: PORTFOLIO_RIGHT_INFO_FONT_FAMILY,
			fontSize: 9,
			fill: 0x96bfdc,
			letterSpacing: 1,
		});
		const tvTerminalOverviewText = new PIXI.Text('', {
			fontFamily: PORTFOLIO_RIGHT_INFO_FONT_FAMILY,
			fontSize: 9,
			fill: 0xe9dfcd,
			letterSpacing: 0.5,
			wordWrap: true,
			wordWrapWidth: 160,
			lineHeight: 14,
		});
		const tvTerminalDesignLabel = new PIXI.Text('DESIGN', {
			fontFamily: PORTFOLIO_RIGHT_INFO_FONT_FAMILY,
			fontSize: 9,
			fill: 0x96bfdc,
			letterSpacing: 1,
		});
		const tvTerminalDesignText = new PIXI.Text('', {
			fontFamily: PORTFOLIO_RIGHT_INFO_FONT_FAMILY,
			fontSize: 9,
			fill: 0xe9dfcd,
			letterSpacing: 0.5,
			wordWrap: true,
			wordWrapWidth: 160,
			lineHeight: 14,
		});
		const tvTerminalDesignWaveCover = new PIXI.Graphics();
		const tvTerminalDesignWave = new PIXI.Container();
		const tvTerminalDesignWaveMask = new PIXI.Graphics();
		tvTerminalDesignWave.mask = tvTerminalDesignWaveMask;
		tvTerminalDesignWaveMask.renderable = false;
		tvTerminalDesignWave.visible = false;
		const tvTerminalTechLabel = new PIXI.Text('TECHNICAL', {
			fontFamily: PORTFOLIO_RIGHT_INFO_FONT_FAMILY,
			fontSize: 9,
			fill: 0x96bfdc,
			letterSpacing: 1,
		});
		const tvTerminalTechText = new PIXI.Text('', {
			fontFamily: PORTFOLIO_RIGHT_INFO_FONT_FAMILY,
			fontSize: 9,
			fill: 0xe9dfcd,
			letterSpacing: 0.5,
			wordWrap: true,
			wordWrapWidth: 160,
			lineHeight: 14,
		});
		const tvTerminalHighlightsLabel = new PIXI.Text('HIGHLIGHTS', {
			fontFamily: PORTFOLIO_RIGHT_INFO_FONT_FAMILY,
			fontSize: 9,
			fill: 0x96bfdc,
			letterSpacing: 1,
		});
		const tvTerminalHighlights = new PIXI.Container();
		const tvTerminalLinksLabel = new PIXI.Text('LINKS', {
			fontFamily: PORTFOLIO_RIGHT_INFO_FONT_FAMILY,
			fontSize: 9,
			fill: 0x96bfdc,
			letterSpacing: 1,
		});
		const tvTerminalLinks = new PIXI.Container();
		const livingRoomMediaLayout = { x: 0, y: 0, w: 0, h: 0, dotY: 0 };
		const livingRoomTerminalLayout = { x: 0, y: 0, w: 0, h: 0 };
		let tvBroTitleBaseY = 0;
		let tvBroSubBaseY = 0;
		let tvTerminalStartX = 0;
		let tvTerminalStartY = 0;
		let tvTerminalLineHeight = 18;
		let tvTerminalFontSize = 12;
		let tvDesktopRenderTexture = PIXI.RenderTexture.create({
			width: Math.max(1, app.renderer.width),
			height: Math.max(1, app.renderer.height),
		});
		tvDesktopContentSprite.texture = tvDesktopRenderTexture;
		tvDesktopTransitionSprite.texture = tvDesktopRenderTexture;
		tvDesktopTransitionSprite.alpha = 0;
		tvBroScreen.addChild(
			tvBroBg,
			tvTerminalMask,
			tvBroTitle,
			tvTerminalLines,
			tvTerminalCursor,
			tvBroSub,
			tvTerminalSlideTitle,
			tvTerminalSlideValue,
			tvTerminalOverviewLabel,
			tvTerminalOverviewText,
			tvTerminalDesignLabel,
			tvTerminalDesignText,
			tvTerminalDesignWaveCover,
			tvTerminalDesignWaveMask,
			tvTerminalDesignWave,
			tvTerminalTechLabel,
			tvTerminalTechText,
			tvTerminalHighlightsLabel,
			tvTerminalHighlights,
			tvTerminalLinksLabel,
			tvTerminalLinks,
		);
		tvBroScreen.mask = tvTerminalMask;
		tvTerminalLines.visible = false;
		tvTerminalCursor.visible = false;
		const tvEmptyScreen = new PIXI.Container();
		const tvEmptyBg = new PIXI.Graphics();
		const tvEmptySprite = new PIXI.Sprite(PIXI.Texture.WHITE);
		const tvEmptyText = new PIXI.Text('Nothing here yet', {
			fontFamily: PORTFOLIO_RIGHT_INFO_FONT_FAMILY,
			fontSize: 10,
			fill: 0xf4d06d,
			letterSpacing: 1,
			align: 'center',
		});
		tvEmptyText.anchor.set(0.5, 0.5);
		tvEmptyScreen.alpha = 0;
		tvEmptyScreen.addChild(tvEmptyBg, tvEmptySprite, tvEmptyText);
		tvContentContainer.addChild(tvScreenBaseBg, tvMediaFrameGlow, tvMediaFrame, tvMediaPrevSprite, tvDesktopContentSprite, tvSlideDotNav, tvMediaZoomHint, tvBroScreen, tvEmptyScreen);
		const tvScreensaverLayer = new PIXI.Container();
		const tvScreensaverBg = new PIXI.Graphics();
		const tvScreensaverNoise = new PIXI.Graphics();
		tvScreensaverLayer.alpha = 0;
		tvScreensaverLayer.addChild(tvScreensaverBg, tvScreensaverNoise);
		tvContentContainer.addChild(tvScreensaverLayer);
		tvContentContainer.mask = tvScreenMask;
		const tvCrtOverlay = new PIXI.Graphics();
		tvCrtOverlay.mask = tvScreenMask;
		const tvSlotForeground = new PIXI.Graphics();
		const tvScreenHitArea = new PIXI.Graphics();
		tvScreenHitArea.eventMode = 'static';
		tvScreenHitArea.cursor = 'pointer';
		const livingRoomForeground = new PIXI.Graphics();
		const tvEjectBtn = new PIXI.Container();
		const tvEjectBtnBg = new PIXI.Graphics();
		const tvEjectBtnLabel = new PIXI.Text('EJECT', {
			fontFamily: 'Minecraft, monospace',
			fontSize: 9,
			fill: 0xf4e5cc,
			letterSpacing: 1,
		});
		tvEjectBtnLabel.anchor.set(0.5, 0.5);
		tvEjectBtn.addChild(tvEjectBtnBg, tvEjectBtnLabel);
		tvEjectBtn.eventMode = 'static';
		tvEjectBtn.cursor = 'pointer';
		const placard = new PIXI.Container();
		const placardBg = new PIXI.Graphics();
		const placardStand = new PIXI.Graphics();
		const placardLed = new PIXI.Graphics();
		const placardLedLabel = new PIXI.Text('NO TAPE', {
			fontFamily: PORTFOLIO_RIGHT_INFO_FONT_FAMILY,
			fontSize: 8,
			fill: 0xe9dfcf,
			letterSpacing: 1,
		});
		placardLedLabel.anchor.set(0, 0.5);
		const placardTitle = new PIXI.Text('NO TAPE SELECTED', {
			fontFamily: PORTFOLIO_RIGHT_INFO_FONT_FAMILY,
			fontSize: 10,
			fill: 0xf4e5cc,
			letterSpacing: 1,
		});
		const placardStatus = new PIXI.Text('STATUS: IDLE', {
			fontFamily: PORTFOLIO_RIGHT_INFO_FONT_FAMILY,
			fontSize: 8,
			fill: 0xd9c6a8,
			letterSpacing: 1,
		});
		const placardBody = new PIXI.Text('Hover a tape to inspect metadata.', {
			fontFamily: PORTFOLIO_RIGHT_INFO_FONT_FAMILY,
			fontSize: 8,
			fill: 0xbca98d,
			wordWrap: true,
			wordWrapWidth: 170,
			lineHeight: 12,
		});
		placard.addChild(placardStand, placardBg, placardLed, placardLedLabel, placardTitle, placardStatus, placardBody);
		const livingRoomBackBtn = new PIXI.Container();
		const livingRoomBackBg = new PIXI.Graphics();
		const livingRoomBackLabel = new PIXI.Text('BACK', {
			fontFamily: 'Minecraft, monospace',
			fontSize: 10,
			fill: 0xf4e5cc,
			letterSpacing: 1,
		});
		livingRoomBackLabel.anchor.set(0.5, 0.5);
		livingRoomBackBtn.addChild(livingRoomBackBg, livingRoomBackLabel);
		livingRoomBackBtn.eventMode = 'static';
		livingRoomBackBtn.cursor = 'pointer';
		const livingRoomFocusBtn = new PIXI.Container();
		const livingRoomFocusBg = new PIXI.Graphics();
		const livingRoomFocusLabel = new PIXI.Text('FOCUS', {
			fontFamily: 'Minecraft, monospace',
			fontSize: 10,
			fill: 0xf4e5cc,
			letterSpacing: 1,
		});
		livingRoomFocusLabel.anchor.set(0.5, 0.5);
		livingRoomFocusBtn.addChild(livingRoomFocusBg, livingRoomFocusLabel);
		livingRoomFocusBtn.eventMode = 'static';
		livingRoomFocusBtn.cursor = 'pointer';
		const statusColorForTape = (status) => {
			switch ((status || '').toLowerCase()) {
				case 'released': return 0x6dff9a;
				case 'empty': return 0xffc57a;
				default: return 0xffd56b;
			}
		};
		const applyWipSpriteTexture = (sprite, path) => {
			sprite.texture = PIXI.Texture.WHITE;
			sprite.tint = 0xffffff;
			if (!path) return;
			const tex = PIXI.Texture.from(path);
			const useTexture = () => {
				sprite.texture = tex;
				sprite.tint = 0xffffff;
			};
			if (tex?.baseTexture?.valid) {
				useTexture();
				return;
			}
			tex?.baseTexture?.once?.('loaded', useTexture);
		};
		const ensureDesktopTvTexture = () => {
			const targetW = Math.max(1, app.renderer.width);
			const targetH = Math.max(1, app.renderer.height);
			if (tvDesktopRenderTexture.width === targetW && tvDesktopRenderTexture.height === targetH) return;
			tvDesktopRenderTexture.destroy(true);
			tvDesktopRenderTexture = PIXI.RenderTexture.create({ width: targetW, height: targetH });
			tvDesktopContentSprite.texture = tvDesktopRenderTexture;
			tvDesktopTransitionSprite.texture = tvDesktopRenderTexture;
		};
		const refreshDesktopTvTexture = () => {
			ensureDesktopTvTexture();
			const prevVisible = scene.visible;
			scene.visible = true;
			app.renderer.render(scene, { renderTexture: tvDesktopRenderTexture, clear: true });
			scene.visible = prevVisible;
		};
		const fullscreenTvContentLayer = new PIXI.Container();
		fullscreenTvContentLayer.zIndex = 820;
		fullscreenTvContentLayer.visible = false;
		fullscreenTvContentLayer.eventMode = 'static';
		const fullscreenTvContentBg = new PIXI.Graphics();
		const fullscreenTvContentTitle = new PIXI.Text('BRO MEME FEED', {
			fontFamily: 'Minecraft, monospace',
			fontSize: 20,
			fill: 0xf5ecdb,
			letterSpacing: 1,
		});
		fullscreenTvContentTitle.anchor.set(0.5, 0.5);
		const fullscreenTvContentSub = new PIXI.Text('fullscreen playback', {
			fontFamily: 'Minecraft, monospace',
			fontSize: 11,
			fill: 0xd4c0a4,
			letterSpacing: 1,
		});
		fullscreenTvContentSub.anchor.set(0.5, 0.5);
		const fullscreenExitBtn = new PIXI.Container();
		const fullscreenExitBtnBg = new PIXI.Graphics();
		const fullscreenExitBtnLabel = new PIXI.Text('EXIT TO TV', {
			fontFamily: 'Minecraft, monospace',
			fontSize: 10,
			fill: 0xf4e5cc,
			letterSpacing: 1,
		});
		fullscreenExitBtnLabel.anchor.set(0.5, 0.5);
		fullscreenExitBtn.addChild(fullscreenExitBtnBg, fullscreenExitBtnLabel);
		fullscreenExitBtn.eventMode = 'static';
		fullscreenExitBtn.cursor = 'pointer';
		fullscreenTvContentLayer.addChild(fullscreenTvContentBg, fullscreenTvContentTitle, fullscreenTvContentSub, fullscreenExitBtn);
		app.stage.addChild(fullscreenTvContentLayer);
		const mediaPopoutLayer = new PIXI.Container();
		mediaPopoutLayer.zIndex = 9000;
		mediaPopoutLayer.visible = false;
		mediaPopoutLayer.eventMode = 'none';
		const mediaPopoutDim = new PIXI.Graphics();
		const mediaPopoutCard = new PIXI.Container();
		const mediaPopoutShadow = new PIXI.Graphics();
		const mediaPopoutFrame = new PIXI.Graphics();
		const mediaPopoutSprite = new PIXI.Sprite(PIXI.Texture.WHITE);
		mediaPopoutSprite.anchor.set(0.5);
		const mediaPopoutGloss = new PIXI.Graphics();
		const mediaPopoutHint = new PIXI.Text('Click outside or press ESC', {
			fontFamily: 'Minecraft, monospace',
			fontSize: 10,
			fill: 0xb7dfff,
			letterSpacing: 0.8,
		});
		mediaPopoutHint.anchor.set(0.5, 0);
		mediaPopoutCard.addChild(mediaPopoutShadow, mediaPopoutFrame, mediaPopoutSprite, mediaPopoutGloss);
		mediaPopoutLayer.addChild(mediaPopoutDim, mediaPopoutCard, mediaPopoutHint);
		app.stage.addChild(mediaPopoutLayer);
		applyWipSpriteTexture(livingRoomTvArt, '');
		applyWipSpriteTexture(tvEmptySprite, PORTFOLIO_EMPTY_SLIDE.src);
		let terminalFullText = '';
		let terminalTypedIndex = 0;
		let terminalTypeTimer = 0;
		let terminalRenderedSnapshot = '';
		let terminalCursorBlinkTimer = 0;
		let terminalTypingHold = false;
		let terminalSourceKey = '';
		let terminalOverviewFullText = '';
		let terminalOverviewTypedIndex = 0;
		let terminalOverviewTypeTimer = 0;
		let terminalOverviewSourceKey = '';
		let terminalKeywordRules = [];
		let terminalLinkLabelSet = new Set();
		let previewSourceKey = '';
		let previewUsesDesktopFeed = false;
		const cartridgeScrollState = {
			scrollY: 0,
			maxScroll: 0,
			viewportH: 0,
			contentH: 0,
			trackY: 0,
			trackH: 0,
			thumbY: 0,
			thumbH: 0,
			dragging: false,
			dragOffsetY: 0,
		};
		const cartridgeViewportRect = { x: 0, y: 0, w: 0, h: 0 };
		const livingRoomRackRect = { x: 0, y: 0, w: 0, h: 0 };
		const livingRoomTvPanelRect = { x: 0, y: 0, w: 0, h: 0 };
		const livingRoomLayoutFocus = {
			mix: 0,
			targetMix: 0,
			velocity: 0,
			lastAppliedMix: Number.NaN,
		};
		const TERMINAL_TYPE_RATE = 220;
		const TERMINAL_BASE_COLOR = 0xf3f8ff;
		const TERMINAL_BRO_COLOR = 0xffd56b;
		const TERMINAL_LABEL_COLORS = {
			SLIDE: 0xffd56b,
			OVERVIEW: 0x8be7ff,
			DESIGN: 0xff8ec8,
			TECHNICAL: 0xffb08b,
			HIGHLIGHTS: 0x9effcc,
			LINKS: 0x8ad7ff,
		};
		const TERMINAL_LINK_COLOR = 0x7fd9ff;
		const TERMINAL_ACCENT_COLOR = 0xf6d27a;
		const TERMINAL_RAINBOW_FILL = ['#ff5f9c', '#ffd56b', '#6dff9a', '#6ec6f7'];
		const TERMINAL_AERO_WAVE_TEXT = 'Frutiger Aero';
		const TERMINAL_AERO_WAVE_SEA_BLUE = 0x74d3ff;
		const TERMINAL_AERO_WAVE_LIGHT_PURPLE = 0xc9bbff;
		const TERMINAL_AERO_WAVE_AMPLITUDE = 1.35;
		const TERMINAL_AERO_WAVE_SPEED = 1.1;
		const TERMINAL_AERO_WAVE_COLOR_SPEED = 2.15;
		const TERMINAL_AERO_HIDE_COLOR = 0x071322;
		let terminalDesignWaveGlyphs = [];
		const STATIC_TERMINAL_KEYWORDS = [
			{ text: 'Tauri', style: PORTFOLIO_HIGHLIGHT_RAINBOW },
			{ text: 'Rust', style: PORTFOLIO_HIGHLIGHT_RAINBOW },
			{ text: 'TypeScript', style: PORTFOLIO_HIGHLIGHT_ACCENT },
			{ text: 'UI hierarchy', style: PORTFOLIO_HIGHLIGHT_RAINBOW },
			{ text: 'filesystem scanning', style: PORTFOLIO_HIGHLIGHT_ACCENT },
			{ text: 'registry queries', style: PORTFOLIO_HIGHLIGHT_ACCENT },
			{ text: 'Firebase', style: PORTFOLIO_HIGHLIGHT_ACCENT },
			{ text: 'Steam API', style: PORTFOLIO_HIGHLIGHT_ACCENT },
			{ text: 'cross-platform', style: PORTFOLIO_HIGHLIGHT_ACCENT },
			{ text: 'animation system', style: PORTFOLIO_HIGHLIGHT_ACCENT },
		];
		const mediaPopoutState = {
			target: 0,
			progress: 0,
			tiltX: 0,
			tiltY: 0,
			targetTiltX: 0,
			targetTiltY: 0,
			cardX: 0,
			cardY: 0,
			cardW: 0,
			cardH: 0,
			textureKey: '',
		};
		const MEDIA_POPOUT_GLOSS_BASE_ALPHA = 0.05;
		isScreenshotPopoutOpen = () => mediaPopoutState.progress > 0.02 || mediaPopoutState.target > 0;
		const DEFAULT_NEON_ACCENT = 0x6ec6f7;
		const DEFAULT_TERMINAL_TEXT = [
			'MAIN PAGE',
			'the magic happens here',
			'Thanks for visiting my page! There might be some cool stuff if you poke around a bit :)',
		].join('\n');
		const getTapeById = (tapeId) => VHS_TAPE_LIBRARY.find((tape) => tape.id === tapeId) || null;
		const getSelectedTape = () => {
			const selectedId = livingRoomState.insertedTapeId || livingRoomState.activeTapeId;
			return getTapeById(selectedId) || VHS_TAPE_LIBRARY[0] || null;
		};
		const getActiveAccentColor = () => {
			const selectedTape = getSelectedTape();
			return selectedTape?.accent || DEFAULT_NEON_ACCENT;
		};
		const destroyContainerChildren = (container) => {
			const nodes = container.removeChildren();
			for (const node of nodes) {
				node.destroy?.({ children: true });
			}
		};
		const tintColor = (hexColor, factor = 1) => {
			const r = Math.max(0, Math.min(255, Math.round(((hexColor >> 16) & 0xff) * factor)));
			const g = Math.max(0, Math.min(255, Math.round(((hexColor >> 8) & 0xff) * factor)));
			const b = Math.max(0, Math.min(255, Math.round((hexColor & 0xff) * factor)));
			return (r << 16) | (g << 8) | b;
		};
		const revealTerminalTextNow = () => {
			if (terminalTypedIndex < terminalFullText.length) {
				terminalTypedIndex = terminalFullText.length;
				terminalTypeTimer = 0;
				renderTerminalTypedText(true);
			}
			if (terminalOverviewTypedIndex < terminalOverviewFullText.length) {
				terminalOverviewTypedIndex = terminalOverviewFullText.length;
				terminalOverviewTypeTimer = 0;
				tvTerminalOverviewText.text = terminalOverviewFullText;
			}
		};
		const dedupeKeywordRules = (rules) => {
			const seen = new Set();
			const output = [];
			for (const rule of rules) {
				if (!rule?.text) continue;
				const key = rule.text.toLowerCase();
				if (seen.has(key)) continue;
				seen.add(key);
				output.push({
					text: rule.text,
					style: rule.style === PORTFOLIO_HIGHLIGHT_RAINBOW ? PORTFOLIO_HIGHLIGHT_RAINBOW : PORTFOLIO_HIGHLIGHT_ACCENT,
				});
			}
			return output.sort((a, b) => b.text.length - a.text.length);
		};
		const renderTerminalTypedText = (force = false) => {
			const typedText = terminalFullText.slice(0, terminalTypedIndex);
			if (!force && terminalRenderedSnapshot === typedText) return;
			terminalRenderedSnapshot = typedText;
			destroyContainerChildren(tvTerminalLines);
			const measureTerminalWidth = (sampleText) => {
				const text = String(sampleText || '');
				if (!text) return 0;
				// Width estimate avoids depending on TextMetrics in environments where it isn't available.
				return text.length * (tvTerminalFontSize * 0.62 + 0.8);
			};
			const wrapTypedLine = (lineText, maxWidth) => {
				const raw = String(lineText || '');
				if (!raw) return [''];
				if (measureTerminalWidth(raw) <= maxWidth) return [raw];
				const leading = raw.match(/^\s+/)?.[0] || '';
				const words = raw.trim().split(/\s+/).filter(Boolean);
				if (!words.length) return [raw];
				const continuationLeading = (!leading && /:$/.test(words[0])) ? '  ' : leading;
				const linesOut = [];
				let line = leading;
				for (const word of words) {
					const prefix = line.trim().length ? ' ' : '';
					const candidate = `${line}${prefix}${word}`;
					if (measureTerminalWidth(candidate) <= maxWidth || !line.trim().length) {
						line = candidate;
						continue;
					}
					linesOut.push(line);
					line = `${continuationLeading}${word}`;
				}
				if (line) linesOut.push(line);
				return linesOut;
			};
			const rawLines = typedText.length ? typedText.split('\n') : [''];
			const maxTypedLineWidth = Math.max(64, livingRoomTerminalLayout.w - 18);
			const lines = [];
			for (const rawLine of rawLines) {
				lines.push(...wrapTypedLine(rawLine, maxTypedLineWidth));
			}
			let cursorX = tvTerminalStartX;
			let cursorY = tvTerminalStartY;
			const makeKeywordChunks = (input, baseFill) => {
				const text = String(input || '');
				if (!text) return [];
				const chunks = [];
				let cursor = 0;
				while (cursor < text.length) {
					let next = null;
					for (const rule of terminalKeywordRules) {
						const index = text.toLowerCase().indexOf(rule.text.toLowerCase(), cursor);
						if (index === -1) continue;
						if (!next || index < next.index || (index === next.index && rule.text.length > next.rule.text.length)) {
							next = { index, rule };
						}
					}
					if (!next) {
						chunks.push({ text: text.slice(cursor), fill: baseFill });
						break;
					}
					if (next.index > cursor) {
						chunks.push({ text: text.slice(cursor, next.index), fill: baseFill });
					}
					const matchText = text.slice(next.index, next.index + next.rule.text.length);
					chunks.push({
						text: matchText,
						fill: next.rule.style === PORTFOLIO_HIGHLIGHT_RAINBOW ? TERMINAL_RAINBOW_FILL : TERMINAL_ACCENT_COLOR,
					});
					cursor = next.index + next.rule.text.length;
				}
				return chunks;
			};
			for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
				const lineText = lines[lineIndex] || '';
				const line = new PIXI.Container();
				line.position.set(tvTerminalStartX, tvTerminalStartY + lineIndex * tvTerminalLineHeight);
				let lineX = 0;
				const appendChunk = (chunkText, color) => {
					if (!chunkText) return;
					const chunk = new PIXI.Text(chunkText, {
						fontFamily: PORTFOLIO_RIGHT_INFO_FONT_FAMILY,
						fontSize: tvTerminalFontSize,
						fill: color,
						letterSpacing: 0.8,
					});
					chunk.position.set(lineX, 0);
					line.addChild(chunk);
					lineX += chunk.width;
				};
				const trimmedLine = lineText.trim();
				const labelMatch = lineText.match(/^([A-Z ]+):\s*(.*)$/);
				const standaloneLabelColor = TERMINAL_LABEL_COLORS[trimmedLine.toUpperCase()];
				if (!labelMatch && standaloneLabelColor && trimmedLine.length > 0 && !/^>/.test(trimmedLine)) {
					appendChunk(trimmedLine.toUpperCase(), standaloneLabelColor);
				} else if (labelMatch) {
					const rawLabel = (labelMatch[1] || '').trim();
					const body = labelMatch[2] || '';
					appendChunk(`${rawLabel}:`, TERMINAL_LABEL_COLORS[rawLabel] || 0x96bfdc);
					if (body) {
						appendChunk(' ', TERMINAL_BASE_COLOR);
						for (const chunk of makeKeywordChunks(body, TERMINAL_BASE_COLOR)) {
							appendChunk(chunk.text, chunk.fill);
						}
					}
				} else if (/^\s{2,}>\s+/.test(lineText)) {
					appendChunk(lineText, TERMINAL_LINK_COLOR);
				} else if (/^>\s+/.test(lineText)) {
					for (const chunk of makeKeywordChunks(lineText, 0xffe1bb)) {
						appendChunk(chunk.text, chunk.fill);
					}
				} else {
					for (const chunk of makeKeywordChunks(lineText, TERMINAL_BASE_COLOR)) {
						appendChunk(chunk.text, chunk.fill);
					}
				}
				tvTerminalLines.addChild(line);
				cursorX = tvTerminalStartX + lineX;
				cursorY = tvTerminalStartY + lineIndex * tvTerminalLineHeight;
			}
			tvTerminalCursor.clear();
			tvTerminalCursor.beginFill(0xe8f6ff, 0.95);
			tvTerminalCursor.drawRect(0, 0, Math.max(6, Math.round(tvTerminalFontSize * 0.52)), Math.max(10, Math.round(tvTerminalFontSize * 0.98)));
			tvTerminalCursor.endFill();
			tvTerminalCursor.position.set(cursorX + 6, cursorY + Math.max(1, Math.round(tvTerminalFontSize * 0.06)));
		};
		const setTerminalText = (nextText, sourceKey = nextText, { instant = false } = {}) => {
			if (terminalSourceKey === sourceKey && terminalFullText === nextText) return;
			terminalSourceKey = sourceKey;
			terminalFullText = nextText;
			terminalTypeTimer = 0;
			terminalRenderedSnapshot = '';
			terminalTypedIndex = instant ? terminalFullText.length : 0;
			renderTerminalTypedText(true);
		};
		const setTerminalOverviewText = (nextText, sourceKey = nextText, { instant = false } = {}) => {
			if (terminalOverviewSourceKey === sourceKey && terminalOverviewFullText === nextText) return;
			terminalOverviewSourceKey = sourceKey;
			terminalOverviewFullText = String(nextText || '');
			terminalOverviewTypeTimer = 0;
			terminalOverviewTypedIndex = instant ? terminalOverviewFullText.length : 0;
			tvTerminalOverviewText.text = terminalOverviewFullText.slice(0, terminalOverviewTypedIndex);
		};
		const stepTerminalOverviewTyping = (dtSeconds) => {
			if (!tvTerminalOverviewText.visible) return;
			if (terminalOverviewTypedIndex >= terminalOverviewFullText.length) return;
			if (terminalTypingHold) return;
			terminalOverviewTypeTimer += dtSeconds * TERMINAL_TYPE_RATE;
			const charsToAdd = Math.floor(terminalOverviewTypeTimer);
			if (charsToAdd <= 0) return;
			terminalOverviewTypeTimer -= charsToAdd;
			terminalOverviewTypedIndex = Math.min(terminalOverviewFullText.length, terminalOverviewTypedIndex + charsToAdd);
			tvTerminalOverviewText.text = terminalOverviewFullText.slice(0, terminalOverviewTypedIndex);
		};
		const wrapTerminalText = (value, maxChars = 40) => {
			const text = String(value || '').trim();
			if (!text) return [];
			const words = text.split(/\s+/);
			const lines = [];
			let line = '';
			for (const word of words) {
				const candidate = line ? `${line} ${word}` : word;
				if (candidate.length <= maxChars || !line) {
					line = candidate;
					continue;
				}
				lines.push(line);
				line = word;
			}
			if (line) lines.push(line);
			return lines;
		};
		const clearTerminalDesignWave = () => {
			destroyContainerChildren(tvTerminalDesignWave);
			tvTerminalDesignWaveCover.clear();
			tvTerminalDesignWaveCover.visible = false;
			tvTerminalDesignWaveMask.clear();
			terminalDesignWaveGlyphs = [];
			tvTerminalDesignWave.visible = false;
			tvTerminalDesignText.alpha = 1;
		};
		const buildTerminalDesignWave = (sourceText, { fontSize, lineHeight, wrapWidth }) => {
			clearTerminalDesignWave();
			const source = String(sourceText || '');
			const preserveTrailingSpaces = (value) => String(value || '').replace(/ +$/g, (spaces) => '\u00A0'.repeat(spaces.length));
			const phraseLower = TERMINAL_AERO_WAVE_TEXT.toLowerCase();
			const lowerSource = source.toLowerCase();
			const startIndex = lowerSource.indexOf(phraseLower);
			if (startIndex === -1) return source;

			const phraseText = source.slice(startIndex, startIndex + TERMINAL_AERO_WAVE_TEXT.length);
			if (!phraseText.trim().length || !PIXI.TextMetrics?.measureText) return source;

			const glyphStyle = {
				fontFamily: PORTFOLIO_RIGHT_INFO_FONT_FAMILY,
				fontSize,
				fill: 0xffffff,
				letterSpacing: 0.5,
			};
			const measureStyle = new PIXI.TextStyle({
				...glyphStyle,
				wordWrap: true,
				wordWrapWidth: wrapWidth,
				lineHeight,
			});
			tvTerminalDesignWaveCover.beginFill(TERMINAL_AERO_HIDE_COLOR, 1);

			for (let i = 0; i < phraseText.length; i++) {
				const char = phraseText[i];
				if (char === '\n') continue;
				const beforeText = source.slice(0, startIndex + i);
				const withCharText = source.slice(0, startIndex + i + 1);
				const beforeMetrics = PIXI.TextMetrics.measureText(preserveTrailingSpaces(beforeText), measureStyle);
				const withCharMetrics = PIXI.TextMetrics.measureText(preserveTrailingSpaces(withCharText), measureStyle);
				const lineIndex = Math.max(0, withCharMetrics.lines.length - 1);
				const beforeLineIndex = Math.max(0, beforeMetrics.lines.length - 1);
				const x = lineIndex === beforeLineIndex ? (beforeMetrics.lineWidths[beforeLineIndex] || 0) : 0;
				const y = lineIndex * lineHeight;
				if (!char.trim().length) continue;

				const glyph = new PIXI.Text(char, glyphStyle);
				glyph.position.set(x, y);
				tvTerminalDesignWave.addChild(glyph);
				const hidePadX = 1.1;
				const hidePadY = 0.65;
				tvTerminalDesignWaveCover.drawRect(
					x - hidePadX,
					y - hidePadY,
					glyph.width + hidePadX * 2,
					lineHeight + hidePadY * 2,
				);
				terminalDesignWaveGlyphs.push({
					node: glyph,
					baseY: y,
					phase: i * 0.58,
					colorPhase: i * 0.33,
				});
			}
			tvTerminalDesignWaveCover.endFill();

			tvTerminalDesignWave.visible = terminalDesignWaveGlyphs.length > 0;
			if (!tvTerminalDesignWave.visible) return source;
			tvTerminalDesignWaveCover.visible = true;
			tvTerminalDesignText.alpha = 1;

			return source;
		};
		const stepTerminalDesignWave = (pulseTime) => {
			if (!tvTerminalDesignWave.visible || !terminalDesignWaveGlyphs.length) return;
			for (const glyph of terminalDesignWaveGlyphs) {
				const yWave = Math.sin(pulseTime * TERMINAL_AERO_WAVE_SPEED + glyph.phase);
				const colorMix = 0.5 + 0.5 * Math.sin(pulseTime * TERMINAL_AERO_WAVE_COLOR_SPEED + glyph.colorPhase);
				glyph.node.y = glyph.baseY + yWave * TERMINAL_AERO_WAVE_AMPLITUDE;
				glyph.node.tint = mixColors(TERMINAL_AERO_WAVE_SEA_BLUE, TERMINAL_AERO_WAVE_LIGHT_PURPLE, colorMix);
			}
		};
		const sectionToTerminalLines = (label, body, maxChars = 40, { inlineLabel = false } = {}) => {
			const text = String(body || '').trim();
			if (!text) return inlineLabel ? [`${label}: none`] : [label, 'none'];
			const wrapped = wrapTerminalText(text, Math.max(14, maxChars));
			if (!wrapped.length) return inlineLabel ? [`${label}: none`] : [label, 'none'];
			if (inlineLabel) {
				const lines = [`${label}: ${wrapped[0]}`];
				for (let i = 1; i < wrapped.length; i++) {
					lines.push(`  ${wrapped[i]}`);
				}
				return lines;
			}
			return [label, ...wrapped];
		};
		const updateCartridgeScrollUi = () => {
			const maxScroll = Math.max(0, cartridgeScrollState.maxScroll);
			cartridgeScrollState.scrollY = Math.max(0, Math.min(maxScroll, cartridgeScrollState.scrollY));
			cartridgeListContent.position.set(0, -cartridgeScrollState.scrollY);
			const viewportH = Math.max(1, cartridgeScrollState.viewportH);
			const contentH = Math.max(viewportH, cartridgeScrollState.contentH);
			const trackH = Math.max(1, cartridgeScrollState.trackH);
			const thumbH = Math.max(24, trackH * (viewportH / contentH));
			const progress = maxScroll > 0 ? (cartridgeScrollState.scrollY / maxScroll) : 0;
			const thumbY = cartridgeScrollState.trackY + (trackH - thumbH) * progress;
			cartridgeScrollState.thumbY = thumbY;
			cartridgeScrollState.thumbH = thumbH;
			cartridgeScrollThumb.clear();
			cartridgeScrollThumb.beginFill(getActiveAccentColor(), maxScroll > 0 ? 0.9 : 0.35);
			cartridgeScrollThumb.drawRoundedRect(0, thumbY, 8, thumbH, 4);
			cartridgeScrollThumb.endFill();
			cartridgeScrollThumb.visible = maxScroll > 0;
		};
		let livingRoomActiveProjectId = VHS_TAPE_LIBRARY[0]?.projectId || null;
		let livingRoomSlideIndex = 0;
		let livingRoomDotNodes = [];
		let livingRoomActiveVideoSource = null;
		let livingRoomMediaExpanded = false;
		const LIVING_ROOM_MEDIA_SCALE_BASE = 1.05;
		const LIVING_ROOM_MEDIA_SCALE_EXPANDED = 1.18;
		const livingRoomMediaTransition = {
			active: false,
			progress: 1,
			duration: 0.2,
		};
		const getLivingRoomMediaScale = () => (livingRoomMediaExpanded ? LIVING_ROOM_MEDIA_SCALE_EXPANDED : LIVING_ROOM_MEDIA_SCALE_BASE);
		const updateLivingRoomMediaZoomHint = () => {
			const zoomAllowed = !getActiveProject()?.useDesktopFeed;
			const accent = getActiveAccentColor();
			tvMediaZoomHint.visible = zoomAllowed;
			tvMediaZoomHint.text = 'CLICK TO EXPAND';
			tvMediaZoomHint.style.fill = tintColor(accent, 1.25);
			tvDesktopContentSprite.eventMode = zoomAllowed ? 'static' : 'none';
			tvMediaPrevSprite.eventMode = zoomAllowed ? 'static' : 'none';
			tvDesktopContentSprite.cursor = zoomAllowed ? 'zoom-in' : 'default';
			tvMediaPrevSprite.cursor = tvDesktopContentSprite.cursor;
		};
		const toggleLivingRoomMediaZoom = () => {
			openMediaPopout();
		};
		const livingRoomBezelAnim = {
			x: 0,
			y: 0,
			w: 0,
			h: 0,
			targetX: 0,
			targetY: 0,
			targetW: 0,
			targetH: 0,
			accent: DEFAULT_NEON_ACCENT,
			ready: false,
		};
		const drawLivingRoomBezel = () => {
			if (!livingRoomBezelAnim.ready || livingRoomBezelAnim.w <= 0 || livingRoomBezelAnim.h <= 0) return;
			const frameX = livingRoomBezelAnim.x;
			const frameY = livingRoomBezelAnim.y;
			const frameW = livingRoomBezelAnim.w;
			const frameH = livingRoomBezelAnim.h;
			const accent = livingRoomBezelAnim.accent;
			tvMediaFrameGlow.clear();
			tvMediaFrameGlow.beginFill(accent, 0.08);
			tvMediaFrameGlow.drawRoundedRect(frameX - 4, frameY - 4, frameW + 8, frameH + 8, 11);
			tvMediaFrameGlow.endFill();
			tvMediaFrame.clear();
			tvMediaFrame.beginFill(0x0a1624, 0.38);
			tvMediaFrame.lineStyle(2, tintColor(accent, 1.2), 0.82);
			tvMediaFrame.drawRoundedRect(frameX, frameY, frameW, frameH, 9);
			tvMediaFrame.endFill();
			tvMediaFrame.lineStyle(1, tintColor(accent, 0.78), 0.85);
			tvMediaFrame.drawRoundedRect(frameX + 5, frameY + 5, Math.max(4, frameW - 10), Math.max(4, frameH - 10), 7);
		};
		const setLivingRoomBezelTarget = (frameX, frameY, frameW, frameH, accent) => {
			livingRoomBezelAnim.targetX = frameX;
			livingRoomBezelAnim.targetY = frameY;
			livingRoomBezelAnim.targetW = frameW;
			livingRoomBezelAnim.targetH = frameH;
			livingRoomBezelAnim.accent = accent;
			if (!livingRoomBezelAnim.ready) {
				livingRoomBezelAnim.x = frameX;
				livingRoomBezelAnim.y = frameY;
				livingRoomBezelAnim.w = frameW;
				livingRoomBezelAnim.h = frameH;
				livingRoomBezelAnim.ready = true;
				drawLivingRoomBezel();
			}
		};
		const stepLivingRoomBezelAnimation = (dtSeconds) => {
			if (!livingRoomBezelAnim.ready) return;
			const blend = Math.min(1, dtSeconds * 10);
			livingRoomBezelAnim.x += (livingRoomBezelAnim.targetX - livingRoomBezelAnim.x) * blend;
			livingRoomBezelAnim.y += (livingRoomBezelAnim.targetY - livingRoomBezelAnim.y) * blend;
			livingRoomBezelAnim.w += (livingRoomBezelAnim.targetW - livingRoomBezelAnim.w) * blend;
			livingRoomBezelAnim.h += (livingRoomBezelAnim.targetH - livingRoomBezelAnim.h) * blend;
			drawLivingRoomBezel();
		};
		const isVideoSource = (source) => typeof HTMLVideoElement !== 'undefined' && source instanceof HTMLVideoElement;
		const stopLivingRoomVideoSource = (video) => {
			if (!video) return;
			try { video.pause(); } catch (_) {}
		};
		const playLivingRoomVideoSource = (video) => {
			if (!video) return;
			video.loop = true;
			video.muted = true;
			video.playsInline = true;
			video.autoplay = true;
			const playPromise = video.play?.();
			if (playPromise && typeof playPromise.catch === 'function') playPromise.catch(() => {});
		};
		const getProjectForTape = (tape) => {
			if (!tape?.projectId) return PORTFOLIO_PROJECTS[0];
			return portfolioProjectsById.get(tape.projectId) || PORTFOLIO_PROJECTS[0];
		};
		const getSlidesForProject = (project) => (Array.isArray(project?.slides) && project.slides.length
			? project.slides
			: [PORTFOLIO_EMPTY_SLIDE]);
		const LAUNCHER_TAPE_COVER = './assets/images/launcherLogo.png';
		const getTapeCoverForProject = (project) => {
			if (project?.id === 'slot-b' || String(project?.label || '').toUpperCase() === 'LAUNCHER') {
				return LAUNCHER_TAPE_COVER;
			}
			return getSlidesForProject(project)[0]?.src || PORTFOLIO_EMPTY_SLIDE.src;
		};
		const getActiveProject = () => portfolioProjectsById.get(livingRoomActiveProjectId) || PORTFOLIO_PROJECTS[0];
		const getActiveSlide = () => {
			const slides = getSlidesForProject(getActiveProject());
			if (!slides.length) return PORTFOLIO_EMPTY_SLIDE;
			const clampedIndex = ((livingRoomSlideIndex % slides.length) + slides.length) % slides.length;
			return slides[clampedIndex] || PORTFOLIO_EMPTY_SLIDE;
		};
		const getTextureNaturalSize = (texture) => {
			if (!texture) return { width: 1, height: 1 };
			const source = texture.baseTexture?.resource?.source;
			if (isVideoSource(source) && source.videoWidth && source.videoHeight) {
				return { width: source.videoWidth, height: source.videoHeight };
			}
			return {
				width: texture.orig?.width || texture.width || texture.baseTexture?.width || 1,
				height: texture.orig?.height || texture.height || texture.baseTexture?.height || 1,
			};
		};
		const layoutMediaPopoutCard = () => {
			const sw = app.renderer.width;
			const sh = app.renderer.height;
			const accent = getActiveAccentColor();
			const accentStrong = tintColor(accent, 1.24);
			const accentSoft = tintColor(accent, 0.92);
			mediaPopoutDim.clear();
			mediaPopoutDim.beginFill(0x04070d, 0.72 * mediaPopoutState.progress);
			mediaPopoutDim.drawRect(0, 0, sw, sh);
			mediaPopoutDim.endFill();
			const tex = mediaPopoutSprite.texture || PIXI.Texture.WHITE;
			const sourceSize = getTextureNaturalSize(tex);
			const maxW = Math.max(260, Math.round(sw * 0.72));
			const maxH = Math.max(220, Math.round(sh * 0.72));
			const cardPad = 24;
			const fitW = Math.max(140, maxW - cardPad * 2);
			const fitH = Math.max(120, maxH - cardPad * 2);
			const mediaScale = Math.min(fitW / Math.max(1, sourceSize.width), fitH / Math.max(1, sourceSize.height));
			const mediaW = Math.max(120, sourceSize.width * mediaScale);
			const mediaH = Math.max(90, sourceSize.height * mediaScale);
			const cardW = Math.max(220, mediaW + cardPad * 2);
			const cardH = Math.max(170, mediaH + cardPad * 2);
			mediaPopoutState.cardX = sw * 0.5;
			mediaPopoutState.cardY = sh * 0.5;
			mediaPopoutState.cardW = cardW;
			mediaPopoutState.cardH = cardH;
			mediaPopoutCard.position.set(mediaPopoutState.cardX, mediaPopoutState.cardY);
			mediaPopoutShadow.clear();
			mediaPopoutShadow.beginFill(0x000000, 0.36);
			mediaPopoutShadow.drawRoundedRect(-cardW * 0.5 + 10, -cardH * 0.5 + 12, cardW, cardH, 14);
			mediaPopoutShadow.beginFill(accent, 0.08 * mediaPopoutState.progress);
			mediaPopoutShadow.drawRoundedRect(-cardW * 0.5 + 4, -cardH * 0.5 + 5, cardW, cardH, 14);
			mediaPopoutShadow.endFill();
			mediaPopoutFrame.clear();
			mediaPopoutFrame.beginFill(0x0a1422, 0.94);
			mediaPopoutFrame.lineStyle(2, accentStrong, 0.9);
			mediaPopoutFrame.drawRoundedRect(-cardW * 0.5, -cardH * 0.5, cardW, cardH, 12);
			mediaPopoutFrame.endFill();
			mediaPopoutFrame.lineStyle(1, accentSoft, 0.5);
			mediaPopoutFrame.drawRoundedRect(-cardW * 0.5 + 8, -cardH * 0.5 + 8, cardW - 16, cardH - 16, 10);
			mediaPopoutSprite.width = mediaW;
			mediaPopoutSprite.height = mediaH;
			mediaPopoutSprite.position.set(0, 0);
			mediaPopoutGloss.clear();
			const glossW = Math.max(80, cardW * 0.42);
			const glossH = Math.max(26, cardH * 0.22);
			mediaPopoutGloss.beginFill(0xffffff, 0.08);
			mediaPopoutGloss.drawRoundedRect(-cardW * 0.5 + 14, -cardH * 0.5 + 12, glossW, glossH, 10);
			mediaPopoutGloss.endFill();
			mediaPopoutHint.position.set(sw * 0.5, mediaPopoutState.cardY + cardH * 0.5 + 12);
			mediaPopoutHint.style.fill = tintColor(accent, 1.25);
			mediaPopoutHint.alpha = 0.78 * mediaPopoutState.progress;
		};
		const openMediaPopout = () => {
			if (!livingRoomActive || livingRoomState.viewMode !== VIEW_TV_AREA) return;
			const project = getActiveProject();
			if (project?.useDesktopFeed) return;
			const wasClosed = mediaPopoutState.target <= 0.02 && mediaPopoutState.progress <= 0.02;
			const slide = getActiveSlide();
			const texture = PIXI.Texture.from(slide?.src || PORTFOLIO_EMPTY_SLIDE.src);
			if (!texture) return;
			mediaPopoutSprite.texture = texture;
			mediaPopoutState.textureKey = `${project?.id || 'project'}:${livingRoomSlideIndex}:${slide?.src || ''}`;
			mediaPopoutState.target = 1;
			mediaPopoutLayer.visible = true;
			mediaPopoutLayer.eventMode = 'static';
			mediaPopoutState.targetTiltX = 0;
			mediaPopoutState.targetTiltY = 0;
			if (wasClosed) playEnlargeScreenshotSfx();
			layoutMediaPopoutCard();
		};
		const closeMediaPopout = (options = {}) => {
			const playReturnSfx = Boolean(options.playReturnSfx);
			const wasOpen = mediaPopoutState.target > 0.02;
			mediaPopoutState.target = 0;
			mediaPopoutState.targetTiltX = 0;
			mediaPopoutState.targetTiltY = 0;
			if (playReturnSfx && wasOpen) playReturnScreenshotSfx();
		};
		const stepMediaPopout = (dtSeconds) => {
			const blend = Math.min(1, dtSeconds * 10);
			mediaPopoutState.progress += (mediaPopoutState.target - mediaPopoutState.progress) * blend;
			if (mediaPopoutState.progress < 0.002 && mediaPopoutState.target <= 0) {
				mediaPopoutLayer.visible = false;
				mediaPopoutLayer.eventMode = 'none';
				mediaPopoutState.progress = 0;
				return;
			}
			mediaPopoutLayer.visible = true;
			layoutMediaPopoutCard();
			const ease = 1 - Math.pow(1 - Math.max(0, Math.min(1, mediaPopoutState.progress)), 3);
			mediaPopoutState.tiltX = 0;
			mediaPopoutState.tiltY = 0;
			mediaPopoutCard.scale.set(0.94 + ease * 0.06);
			mediaPopoutCard.alpha = ease;
			mediaPopoutCard.position.set(mediaPopoutState.cardX, mediaPopoutState.cardY);
			mediaPopoutCard.skew.set(0, 0);
			mediaPopoutGloss.alpha = MEDIA_POPOUT_GLOSS_BASE_ALPHA * ease;
		};
		const fitLivingRoomMediaSprite = (sprite, texture) => {
			const { x, y, w, h } = livingRoomMediaLayout;
			if (w <= 0 || h <= 0) return;
			const framePad = 0;
			const maxW = Math.max(1, w - framePad * 2);
			const maxH = Math.max(1, h - framePad * 2);
			const size = getTextureNaturalSize(texture);
			const ratio = size.width / Math.max(1, size.height);
			const scale = Math.min(maxW / Math.max(1, size.width), maxH / Math.max(1, size.height)) * getLivingRoomMediaScale();
			sprite.texture = texture;
			sprite.width = Math.max(1, size.width * scale);
			sprite.height = Math.max(1, size.height * scale);
			sprite.position.set(x + w * 0.5, y + h * 0.5);
			if (sprite === tvDesktopContentSprite) {
				const accent = getActiveAccentColor();
				const isWide = ratio > 1.45;
				const isPortrait = ratio < 0.85;
				const bezelPadX = isWide ? 5 : (isPortrait ? 10 : 8);
				const bezelPadY = isWide ? 8 : (isPortrait ? 8 : 9);
				const frameX = sprite.position.x - sprite.width * 0.5 - bezelPadX;
				const frameY = sprite.position.y - sprite.height * 0.5 - bezelPadY;
				const frameW = sprite.width + bezelPadX * 2;
				const frameH = sprite.height + bezelPadY * 2;
				setLivingRoomBezelTarget(frameX, frameY, frameW, frameH, accent);
			}
			if (!texture.baseTexture?.valid) {
				texture.baseTexture?.once?.('loaded', () => fitLivingRoomMediaSprite(sprite, texture));
			}
		};
		const normalizeHighlight = (entry) => {
			if (!entry) return null;
			if (typeof entry === 'string') return { text: entry, style: PORTFOLIO_HIGHLIGHT_ACCENT };
			if (!entry.text) return null;
			return {
				text: entry.text,
				style: entry.style === PORTFOLIO_HIGHLIGHT_RAINBOW ? PORTFOLIO_HIGHLIGHT_RAINBOW : PORTFOLIO_HIGHLIGHT_ACCENT,
			};
		};
		const rebuildLivingRoomTerminalPanel = ({ instant = false } = {}) => {
			const project = getActiveProject();
			const slide = getActiveSlide();
			const approxChars = Math.max(16, Math.floor((livingRoomTerminalLayout.w - 16) / 9.8));
			const linkDefs = [...(slide.links || []), ...(project.links || [])]
				.filter((link) => link?.label && link?.url);
			terminalLinkLabelSet = new Set(linkDefs.map((link) => String(link.label).toLowerCase()));
			terminalKeywordRules = dedupeKeywordRules([
				...STATIC_TERMINAL_KEYWORDS,
				...(slide.highlights || []).map((entry) => normalizeHighlight(entry)).filter(Boolean),
				{ text: 'bro', style: PORTFOLIO_HIGHLIGHT_ACCENT },
			]);
			tvBroTitle.text = 'TERMINAL';
			tvBroSub.visible = false;
			tvTerminalSlideTitle.visible = false;
			tvTerminalSlideValue.visible = false;
			tvTerminalOverviewLabel.visible = false;
			tvTerminalOverviewText.visible = false;
			tvTerminalDesignLabel.visible = false;
			tvTerminalDesignText.visible = false;
			tvTerminalTechLabel.visible = false;
			tvTerminalTechText.visible = false;
			tvTerminalHighlightsLabel.visible = false;
			tvTerminalHighlights.visible = false;
			tvTerminalLinksLabel.visible = false;
			tvTerminalLinks.visible = false;
			tvTerminalDesignWaveCover.visible = false;
			tvTerminalDesignWave.visible = false;
			tvTerminalLines.visible = true;
			destroyContainerChildren(tvTerminalHighlights);
			destroyContainerChildren(tvTerminalLinks);
			clearTerminalDesignWave();

			let nextText = null;
			let nextSourceKey = `${project.id}:${livingRoomSlideIndex}:${livingRoomState.emptyPreviewWord}`;
			const useHomeStructuredMinimal = project.useDesktopFeed && project.id === 'default-home';
			if (project.status === 'empty') {
				nextText = `Nothing here yet ${livingRoomState.emptyPreviewWord}`;
				setTerminalOverviewText('', `${nextSourceKey}:overview-empty`, { instant: true });
			} else if (project.useDesktopFeed && !useHomeStructuredMinimal) {
				nextText = DEFAULT_TERMINAL_TEXT;
				setTerminalOverviewText('', `${nextSourceKey}:overview-home`, { instant: true });
			} else {
				const showExtendedSections = !useHomeStructuredMinimal;
				tvTerminalLines.visible = false;
				tvTerminalCursor.visible = false;
				tvTerminalDesignLabel.visible = showExtendedSections;
				tvTerminalDesignText.visible = showExtendedSections;
				tvTerminalTechLabel.visible = showExtendedSections;
				tvTerminalTechText.visible = showExtendedSections;
				tvTerminalSlideTitle.visible = true;
				tvTerminalSlideValue.visible = true;
				tvTerminalOverviewLabel.visible = true;
				tvTerminalOverviewText.visible = true;
				tvTerminalHighlightsLabel.visible = showExtendedSections;
				tvTerminalHighlights.visible = showExtendedSections;
				tvTerminalLinksLabel.visible = showExtendedSections;
				tvTerminalLinks.visible = showExtendedSections;
				setTerminalText('', `${project.id}:${livingRoomSlideIndex}:structured-clear`, { instant: true });

				const terminalX = tvTerminalStartX;
				let y = tvTerminalStartY;
				const infoWidth = Math.max(90, livingRoomTerminalLayout.w - 4);
				const sectionLabelSize = Math.max(10, tvTerminalFontSize - 1);
				const sectionBodySize = Math.max(11, tvTerminalFontSize);
				const sectionLineHeight = Math.max(16, Math.round(sectionBodySize * 1.55));
				const sectionLabelGap = 14;
				const sectionGap = 14;
				tvTerminalSlideTitle.style.fill = TERMINAL_LABEL_COLORS.SLIDE;
				tvTerminalOverviewLabel.style.fill = TERMINAL_LABEL_COLORS.OVERVIEW;
				tvTerminalDesignLabel.style.fill = TERMINAL_LABEL_COLORS.DESIGN;
				tvTerminalTechLabel.style.fill = TERMINAL_LABEL_COLORS.TECHNICAL;
				tvTerminalHighlightsLabel.style.fill = TERMINAL_LABEL_COLORS.HIGHLIGHTS;
				tvTerminalLinksLabel.style.fill = TERMINAL_LABEL_COLORS.LINKS;
				tvTerminalSlideTitle.style.fontSize = sectionLabelSize;
				tvTerminalOverviewLabel.style.fontSize = sectionLabelSize;
				tvTerminalDesignLabel.style.fontSize = sectionLabelSize;
				tvTerminalTechLabel.style.fontSize = sectionLabelSize;
				tvTerminalSlideValue.style.fontSize = sectionBodySize;
				tvTerminalSlideValue.style.lineHeight = sectionLineHeight;
				tvTerminalSlideValue.style.wordWrapWidth = infoWidth;
				tvTerminalSlideValue.style.fill = useHomeStructuredMinimal ? 0xffffff : 0xe9dfcd;
				tvTerminalOverviewText.style.fontSize = sectionBodySize;
				tvTerminalOverviewText.style.lineHeight = sectionLineHeight;
				tvTerminalOverviewText.style.wordWrapWidth = infoWidth;
				tvTerminalDesignText.style.fontSize = sectionBodySize;
				tvTerminalDesignText.style.lineHeight = sectionLineHeight;
				tvTerminalTechText.style.fontSize = sectionBodySize;
				tvTerminalTechText.style.lineHeight = sectionLineHeight;
				tvTerminalDesignText.style.wordWrapWidth = infoWidth;
				tvTerminalTechText.style.wordWrapWidth = infoWidth;

				tvTerminalSlideTitle.text = 'SLIDE';
				tvTerminalSlideTitle.position.set(terminalX, y);
				y += sectionLabelGap;
				tvTerminalSlideValue.text = useHomeStructuredMinimal
					? String(project.title || slide.title || 'Main Page')
					: String(slide.title || 'Untitled');
				tvTerminalSlideValue.position.set(terminalX, y);
				y += tvTerminalSlideValue.height + sectionGap;

				tvTerminalOverviewLabel.text = 'OVERVIEW';
				tvTerminalOverviewLabel.position.set(terminalX, y);
				y += sectionLabelGap;
				tvTerminalOverviewText.position.set(terminalX, y);
				const overviewBody = useHomeStructuredMinimal
					? (slide.overview || project.summary || 'Thanks for visiting my page!')
					: (slide.overview || project.summary || 'No overview provided.');
				const overviewLineCount = Math.max(1, wrapTerminalText(overviewBody, approxChars).length);
				const overviewReservedHeight = overviewLineCount * sectionLineHeight;
				setTerminalOverviewText(overviewBody, `${project.id}:${livingRoomSlideIndex}:overview`, { instant });
				y += overviewReservedHeight + sectionGap;

				if (showExtendedSections) {
					tvTerminalDesignLabel.position.set(terminalX, y);
					y += sectionLabelGap;
					const designBody = slide.design || 'No design notes provided.';
					tvTerminalDesignText.text = buildTerminalDesignWave(designBody, {
						fontSize: sectionBodySize,
						lineHeight: sectionLineHeight,
						wrapWidth: infoWidth,
					});
					tvTerminalDesignText.position.set(terminalX, y);
					tvTerminalDesignWaveCover.position.set(terminalX, y);
					tvTerminalDesignWave.position.set(terminalX, y);
					tvTerminalDesignWave.visible = tvTerminalDesignText.visible && terminalDesignWaveGlyphs.length > 0;
					tvTerminalDesignWaveMask.clear();
					if (terminalDesignWaveGlyphs.length > 0) {
						const waveMaskPadY = Math.max(1, TERMINAL_AERO_WAVE_AMPLITUDE + 1.1);
						tvTerminalDesignWaveMask.beginFill(0xffffff, 1);
						tvTerminalDesignWaveMask.drawRect(
							terminalX - 1,
							y - waveMaskPadY,
							infoWidth + 2,
							tvTerminalDesignText.height + waveMaskPadY * 2,
						);
						tvTerminalDesignWaveMask.endFill();
					}
					y += tvTerminalDesignText.height + sectionGap;

					tvTerminalTechLabel.position.set(terminalX, y);
					y += sectionLabelGap;
					tvTerminalTechText.text = slide.technical || 'No technical notes provided.';
					tvTerminalTechText.position.set(terminalX, y);
					y += tvTerminalTechText.height + 12;

					let chipX = 0;
					let chipY = 0;
					const highlightText = (slide.highlights || [])
						.map((entry) => normalizeHighlight(entry)?.text)
						.filter(Boolean)
						.join(' / ');
					for (const rawHighlight of (slide.highlights || [])) {
						const highlight = normalizeHighlight(rawHighlight);
						if (!highlight) continue;
						const chip = new PIXI.Container();
						const chipBg = new PIXI.Graphics();
						const chipText = new PIXI.Text(highlight.text, {
							fontFamily: PORTFOLIO_RIGHT_INFO_FONT_FAMILY,
							fontSize: 9,
							fill: highlight.style === PORTFOLIO_HIGHLIGHT_RAINBOW ? TERMINAL_RAINBOW_FILL : TERMINAL_ACCENT_COLOR,
							letterSpacing: 0.5,
						});
						const chipPadX = 7;
						const chipW = Math.ceil(chipText.width + chipPadX * 2);
						const chipH = 16;
						if (chipX > 0 && chipX + chipW > infoWidth) {
							chipX = 0;
							chipY += chipH + 5;
						}
						chipBg.beginFill(0x2e5162, 0.72);
						chipBg.lineStyle(1, highlight.style === PORTFOLIO_HIGHLIGHT_RAINBOW ? 0xff7fc1 : 0x7fc9ff, 0.82);
						chipBg.drawRoundedRect(0, 0, chipW, chipH, 4);
						chipBg.endFill();
						chipText.position.set(chipPadX, 4);
						chip.addChild(chipBg, chipText);
						chip.position.set(chipX, chipY);
						chipX += chipW + 6;
						tvTerminalHighlights.addChild(chip);
					}

					let linkY = 0;
					for (const linkDef of linkDefs) {
						const row = new PIXI.Container();
						const linkText = new PIXI.Text(`> ${linkDef.label}`, {
							fontFamily: PORTFOLIO_RIGHT_INFO_FONT_FAMILY,
							fontSize: 9,
							fill: TERMINAL_LINK_COLOR,
							letterSpacing: 0.5,
						});
						const underline = new PIXI.Graphics();
						underline.lineStyle(1, TERMINAL_LINK_COLOR, 0.72);
						underline.moveTo(0, linkText.height + 1);
						underline.lineTo(linkText.width, linkText.height + 1);
						row.addChild(linkText, underline);
						row.position.set(0, linkY);
						row.eventMode = 'static';
						row.cursor = 'pointer';
						row.on('pointerover', () => {
							linkText.style.fill = 0xffffff;
							underline.tint = 0xffffff;
						});
						row.on('pointerout', () => {
							linkText.style.fill = TERMINAL_LINK_COLOR;
							underline.tint = TERMINAL_LINK_COLOR;
						});
						row.on('pointertap', () => {
							try {
								window.open(linkDef.url, '_blank', 'noopener');
							} catch (_) {}
						});
						tvTerminalLinks.addChild(row);
						linkY += linkText.height + 7;
					}

					const terminalBottom = livingRoomTerminalLayout.y + livingRoomTerminalLayout.h - 6;
					const highlightsBlockHeight = tvTerminalHighlightsLabel.height + 6 + (tvTerminalHighlights.height || (highlightText ? 16 : 0));
					const linksBlockHeight = tvTerminalLinksLabel.height + 6 + (tvTerminalLinks.height || 0);
					const footerGap = 12;
					const footerTotal = highlightsBlockHeight + footerGap + linksBlockHeight;
					const footerStartY = Math.max(y + 10, terminalBottom - footerTotal);

					tvTerminalHighlightsLabel.position.set(terminalX, footerStartY);
					tvTerminalHighlights.position.set(terminalX, footerStartY + tvTerminalHighlightsLabel.height + 6);

					const linksStartY = tvTerminalHighlights.position.y + (tvTerminalHighlights.height || (highlightText ? 16 : 0)) + footerGap;
					tvTerminalLinksLabel.position.set(terminalX, linksStartY);
					tvTerminalLinks.position.set(terminalX, linksStartY + tvTerminalLinksLabel.height + 6);
				}
			}

			if (nextText !== null) {
				setTerminalText(nextText, nextSourceKey, { instant });
			}
		};
		const redrawLivingRoomDots = () => {
			const accent = getActiveAccentColor();
			const activeColor = tintColor(accent, 1.22);
			const inactiveColor = tintColor(accent, 0.5);
			const ringColor = tintColor(accent, 1.45);
			for (let i = 0; i < livingRoomDotNodes.length; i++) {
				const dot = livingRoomDotNodes[i];
				const active = i === livingRoomSlideIndex;
				dot.clear();
				dot.beginFill(active ? activeColor : inactiveColor, active ? 0.96 : (0.45 + dot.__hover * 0.35));
				dot.drawCircle(0, 0, active ? 4.1 : 3.1);
				dot.endFill();
				if (active) {
					dot.lineStyle(1, ringColor, 0.9);
					dot.drawCircle(0, 0, 6);
				}
			}
		};
		const rebuildLivingRoomDots = () => {
			destroyContainerChildren(tvSlideDotNav);
			livingRoomDotNodes = [];
			const slides = getSlidesForProject(getActiveProject());
			const count = slides.length;
			if (!count) return;
			const spacing = 15;
			const totalW = (count - 1) * spacing;
			for (let i = 0; i < count; i++) {
				const dot = new PIXI.Graphics();
				dot.position.set(i * spacing - totalW * 0.5, 0);
				dot.eventMode = 'static';
				dot.cursor = 'pointer';
				dot.__hover = 0;
				dot.on('pointerover', () => {
					dot.__hover = 1;
					redrawLivingRoomDots();
				});
				dot.on('pointerout', () => {
					dot.__hover = 0;
					redrawLivingRoomDots();
				});
				dot.on('pointertap', () => {
					setLivingRoomSlide(i, { instantTerminal: true, userInitiated: true });
				});
				tvSlideDotNav.addChild(dot);
				livingRoomDotNodes.push(dot);
			}
			redrawLivingRoomDots();
		};
		const setLivingRoomSlide = (nextSlideIndex, options = {}) => {
			const force = Boolean(options.force);
			const instantTerminal = Boolean(options.instantTerminal);
			const userInitiated = Boolean(options.userInitiated);
			const activeProject = getActiveProject();
			const slides = getSlidesForProject(activeProject);
			if (!slides.length) return;
			const normalized = ((nextSlideIndex % slides.length) + slides.length) % slides.length;
			if (!force && normalized === livingRoomSlideIndex) {
				if (instantTerminal) revealTerminalTextNow();
				return;
			}
			if (!force && userInitiated) {
				playScreenshotScrollSfx();
				setLivingRoomDetailFocus(true);
			}
			closeMediaPopout();
			if (!force) {
				tvMediaPrevSprite.texture = tvDesktopContentSprite.texture;
				fitLivingRoomMediaSprite(tvMediaPrevSprite, tvMediaPrevSprite.texture);
				tvMediaPrevSprite.visible = true;
				tvMediaPrevSprite.alpha = 1;
			}
			livingRoomMediaExpanded = false;
			updateLivingRoomMediaZoomHint();
			stopLivingRoomVideoSource(livingRoomActiveVideoSource);
			livingRoomSlideIndex = normalized;
			const slide = getActiveSlide();
			previewUsesDesktopFeed = Boolean(activeProject?.useDesktopFeed);
			if (previewUsesDesktopFeed) {
				refreshDesktopTvTexture();
			}
			const texture = previewUsesDesktopFeed
				? tvDesktopRenderTexture
				: PIXI.Texture.from(slide.src || PORTFOLIO_EMPTY_SLIDE.src);
			const source = texture.baseTexture?.resource?.source;
			livingRoomActiveVideoSource = (!previewUsesDesktopFeed && slide.type === PORTFOLIO_MEDIA_VIDEO && isVideoSource(source)) ? source : null;
			playLivingRoomVideoSource(livingRoomActiveVideoSource);
			fitLivingRoomMediaSprite(tvDesktopContentSprite, texture);
			tvDesktopContentSprite.visible = true;
			tvDesktopContentSprite.alpha = force ? 1 : 0;
			livingRoomMediaTransition.active = !force;
			livingRoomMediaTransition.progress = force ? 1 : 0;
			if (force) {
				tvMediaPrevSprite.visible = false;
				tvMediaPrevSprite.alpha = 0;
			}
			rebuildLivingRoomTerminalPanel({ instant: instantTerminal });
			redrawLivingRoomDots();
		};
		const setLivingRoomProjectForTape = (tape, options = {}) => {
			const resetSlide = options.resetSlide !== false;
			const force = Boolean(options.force);
			const instantTerminal = Boolean(options.instantTerminal);
			const nextProject = getProjectForTape(tape);
			const projectChanged = nextProject.id !== livingRoomActiveProjectId;
			if (nextProject.status === 'empty' && (projectChanged || resetSlide)) {
				livingRoomState.emptyPreviewWord = pickBroPlaceholderWord();
			}
			livingRoomActiveProjectId = nextProject.id;
			if (projectChanged || resetSlide) {
				closeMediaPopout();
				livingRoomSlideIndex = 0;
				rebuildLivingRoomDots();
			}
			setLivingRoomSlide(livingRoomSlideIndex, {
				force: force || projectChanged || resetSlide,
				instantTerminal,
			});
		};
		const stepLivingRoomMediaTransition = (dtSeconds) => {
			if (!livingRoomMediaTransition.active) return;
			livingRoomMediaTransition.progress += dtSeconds / Math.max(0.001, livingRoomMediaTransition.duration);
			const t = Math.max(0, Math.min(1, livingRoomMediaTransition.progress));
			const eased = 1 - Math.pow(1 - t, 3);
			tvDesktopContentSprite.alpha = eased;
			tvMediaPrevSprite.alpha = 1 - eased;
			if (t >= 1) {
				livingRoomMediaTransition.active = false;
				tvDesktopContentSprite.alpha = 1;
				tvMediaPrevSprite.alpha = 0;
				tvMediaPrevSprite.visible = false;
			}
		};
		const refreshPlacard = () => {
			const selectedTape = getSelectedTape();
			if (!selectedTape) return;
			setLivingRoomProjectForTape(selectedTape, { resetSlide: false });
			updateCartridgeScrollUi();
		};
		const createTapeNode = (tape, index) => {
			const node = new PIXI.Container();
			const aura = new PIXI.Graphics();
			const shadow = new PIXI.Graphics();
			const body = new PIXI.Graphics();
			const notch = new PIXI.Graphics();
			const shellHighlight = new PIXI.Graphics();
			const shellShadow = new PIXI.Graphics();
			const screws = new PIXI.Graphics();
			const badge = new PIXI.Graphics();
			const badgeSpec = new PIXI.Graphics();
			const art = new PIXI.Sprite(PIXI.Texture.WHITE);
			art.anchor.set(0.5);
			const labelStrip = new PIXI.Graphics();
			const title = new PIXI.Text('EMPTY', {
				fontFamily: PORTFOLIO_LEFT_TITLE_FONT_FAMILY,
				fontSize: 13,
				fill: 0xf2fbff,
				stroke: 0x0a1320,
				strokeThickness: 2,
				letterSpacing: 1,
			});
			title.anchor.set(0.5, 0.5);
			title.text = tape.label;
			applyWipSpriteTexture(art, getTapeCoverForProject(getProjectForTape(tape)));
			art.alpha = 0.6;
			node.addChild(aura, shadow, body, notch, labelStrip, badge, art, badgeSpec, screws, shellHighlight, shellShadow, title);
			node.eventMode = 'static';
			node.cursor = 'pointer';
			node.on('pointerover', () => {
				if (livingRoomState.viewMode !== VIEW_TV_AREA || livingRoomState.inserting || livingRoomState.targetBlend < 1) return;
				if (livingRoomState.hoverIndex !== index) {
					playCartridgeHoverSfx();
				}
				livingRoomState.hoverIndex = index;
			});
			node.on('pointerout', () => {
				if (livingRoomState.hoverIndex === index) livingRoomState.hoverIndex = -1;
			});
			node.on('pointertap', () => {
				if (livingRoomState.inserting || livingRoomState.blend < 0.98) return;
				if (livingRoomState.viewMode !== VIEW_TV_AREA) return;
				playCartridgeSelectSfx();
				playTape(tape.id);
			});
			return {
				tape,
				node,
				aura,
				shadow,
				body,
				notch,
				shellHighlight,
				shellShadow,
				screws,
				badge,
				badgeSpec,
				art,
				labelStrip,
				title,
				side: 'left',
				hoverMix: 0,
				baseX: 0,
				baseY: 0,
			};
		};
		const livingRoomTapes = VHS_TAPE_LIBRARY.map((tape, index) => createTapeNode(tape, index));
		const tapeNodeById = new Map(livingRoomTapes.map((entry) => [entry.tape.id, entry]));
		const playTape = (tapeId) => {
			if (livingRoomState.inserting || livingRoomState.blend < 0.98) return;
			if (livingRoomState.viewMode !== VIEW_TV_AREA) return;
			const tapeEntry = tapeNodeById.get(tapeId);
			if (!tapeEntry) return;
			livingRoomState.hoverIndex = -1;
			livingRoomState.activeTapeId = tapeEntry.tape.id;
			livingRoomState.insertedTapeId = tapeEntry.tape.id;
			livingRoomState.inserting = null;
			livingRoomState.staticBurst = 0.05 + Math.random() * 0.04;
			const selectedProject = getProjectForTape(tapeEntry.tape);
			const isEmptyProject = selectedProject?.status === 'empty';
			livingRoomState.mode = STATE_LIVING_ROOM_PLAYING;
			livingRoomState.contentMode = isEmptyProject ? CONTENT_EMPTY : CONTENT_BRO_MEME;
			livingRoomState.playingMix = isEmptyProject ? 0 : 1;
			setLivingRoomProjectForTape(tapeEntry.tape, { resetSlide: true, force: true, instantTerminal: true });
			setLivingRoomDetailFocus(true);
			layoutLivingRoom();
			refreshPlacard();
		};
		const enterLivingRoom = ({ preserveContent = false } = {}) => {
			closeMediaPopout();
			livingRoomState.overlayMode = OVERLAY_MODE_LIBRARY;
			livingRoomState.viewMode = VIEW_TV_AREA;
			const defaultTapeId = VHS_TAPE_LIBRARY[0]?.id || null;
			if (!preserveContent) {
				livingRoomState.mode = STATE_LIVING_ROOM_PLAYING;
				livingRoomState.contentMode = CONTENT_BRO_MEME;
				livingRoomState.activeTapeId = defaultTapeId;
				livingRoomState.insertedTapeId = defaultTapeId;
				livingRoomState.emptyPreviewWord = pickBroPlaceholderWord();
				livingRoomState.playingMix = 1;
				setLivingRoomDetailFocus(false, { instant: true });
			}
			livingRoomState.inserting = null;
			livingRoomState.hoverIndex = -1;
			livingRoomState.fullscreenFromTv = false;
			livingRoomState.targetBlend = 1;
			livingRoomLayer.visible = true;
			refreshDesktopTvTexture();
			tvDesktopTransitionLayer.visible = true;
			tvDesktopTransitionSprite.alpha = 1;
			tvDesktopContentSprite.alpha = 0;
			setInGameCursorVisible(true);
			cursorContainer.zIndex = 5000;
			uiTopLayer.sortChildren();
			layoutLivingRoom();
			setLivingRoomProjectForTape(getSelectedTape(), { resetSlide: true, force: true });
			refreshPlacard();
		};
		returnToTvAreaFromFullscreen = () => {
			enterLivingRoom({ preserveContent: true });
		};
		isFullscreenTvPlaybackActive = () => livingRoomState.overlayMode === OVERLAY_MODE_TV && livingRoomState.viewMode === VIEW_FULLSCREEN && livingRoomState.fullscreenFromTv;
		const exitLivingRoom = () => {
			closeMediaPopout();
			livingRoomState.hoverIndex = -1;
			livingRoomState.inserting = null;
			setLivingRoomDetailFocus(false, { instant: true });
			livingRoomState.overlayMode = OVERLAY_MODE_LIBRARY;
			livingRoomState.viewMode = VIEW_FULLSCREEN;
			livingRoomState.fullscreenFromTv = false;
			livingRoomState.targetBlend = 0;
			tvDesktopTransitionLayer.visible = true;
			tvDesktopTransitionSprite.alpha = 1;
		};
		tvScreenGroup.addChild(tvContentContainer, tvScreenMask, tvCrtOverlay);
		roomBg.zIndex = 10;
		leftShelf.zIndex = 20;
		rightShelf.zIndex = 21;
		vhsTapesLeft.zIndex = 30;
		vhsTapesRight.zIndex = 31;
		cartridgeListViewport.zIndex = 30;
		cartridgeScrollUi.zIndex = 31;
		livingRoomTv.zIndex = 50;
		tvBodyShadow.zIndex = 10;
		tvBody.zIndex = 20;
		tvBezelRimLight.zIndex = 21;
		tvBezelRimShade.zIndex = 22;
		livingRoomTvFrame.zIndex = 30;
		tvScreenGroup.zIndex = 40;
		tvGlassReflection.zIndex = 45;
		tvSlotForeground.zIndex = 46;
		tvScreenHitArea.zIndex = 47;
		tvEjectBtn.zIndex = 50;
		placard.zIndex = 70;
		tvDesktopTransitionLayer.zIndex = 75;
		livingRoomBackBtn.zIndex = 80;
		livingRoomFocusBtn.zIndex = 80;
		livingRoomForeground.zIndex = 60;
		livingRoomTv.addChild(
			tvBodyShadow,
			tvBody,
			livingRoomTvFrame,
			tvScreenGroup,
			tvGlassReflection,
			tvSlotForeground,
		);
		for (const tape of livingRoomTapes) {
			cartridgeListContent.addChild(tape.node);
		}
		livingRoomLayer.addChild(roomBg, livingRoomForeground, leftShelf, cartridgeListViewport, cartridgeScrollUi, livingRoomTv, tvDesktopTransitionLayer, livingRoomBackBtn, livingRoomFocusBtn);
		app.stage.addChild(livingRoomLayer);
		let livingRoomTvSlotX = 0;
		let livingRoomTvSlotY = 0;
		const livingRoomTvScreenRect = { x: 0, y: 0, w: 0, h: 0, r: 0 };
		const holoPanelLocalRect = { x: 0, y: 0, w: 0, h: 0 };
		let livingRoomTapeW = 108;
		let livingRoomTapeH = 62;
		let livingRoomAmbientTime = Math.random() * 10;
		const stepLivingRoomAmbient = (dtSeconds, reveal, focusMix) => {
			if (reveal <= 0.01) {
				livingRoomAmbientLayer.visible = false;
				return;
			}
			livingRoomAmbientLayer.visible = true;
			const dt = Math.max(1 / 180, Math.min(0.05, Math.max(0, dtSeconds || 0)));
			livingRoomAmbientTime += dt;
			const sw = app.renderer.width;
			const sh = app.renderer.height;
			const isReducedQuality = activeBackgroundQualityMode === BACKGROUND_QUALITY_MODE.REDUCED;
			const activeBlobCount = isReducedQuality ? Math.min(4, livingRoomAmbientBlobs.length) : livingRoomAmbientBlobs.length;
			livingRoomAmbientBlur.blur = isReducedQuality ? 5 : 8;
			livingRoomAmbientBlur.quality = 1;
			livingRoomAmbientMetaFilter.uniforms.u_thresholdLow = isReducedQuality ? 0.25 : 0.21;
			livingRoomAmbientMetaFilter.uniforms.u_thresholdHigh = isReducedQuality ? 0.64 : 0.58;
			livingRoomAmbientMetaFilter.uniforms.u_alphaBoost = isReducedQuality ? 1.0 : 1.08;
			livingRoomAmbientMetaFilter.uniforms.u_bodyContrast = isReducedQuality ? 1.09 : 1.14;
			livingRoomAmbientFilterArea.width = sw;
			livingRoomAmbientFilterArea.height = sh;
			const baseScale = Math.max(sw, sh) / 760;
			const readabilityDampen = 1 - focusMix * 0.08;
			livingRoomAmbientLayer.alpha = (0.42 + reveal * 0.22) * readabilityDampen * (isReducedQuality ? 0.9 : 1);
			const driftScale = isReducedQuality ? 0.84 : 1;
			for (let i = 0; i < livingRoomAmbientBlobs.length; i++) {
				const blob = livingRoomAmbientBlobs[i];
				const sprite = blob.sprite;
				const computed = livingRoomAmbientComputed[i];
				if (!sprite) continue;
				if (i >= activeBlobCount) {
					sprite.visible = false;
					continue;
				}
				sprite.visible = true;
				const phase = livingRoomAmbientTime * blob.speed + blob.phase;
				const phaseY = livingRoomAmbientTime * (blob.speed * 0.86) + blob.phase * 1.31;
				const driftX = (Math.sin(phase) * blob.driftX + Math.sin(phase * 0.39 + blob.phase * 0.5) * blob.driftX * 0.42) * driftScale;
				const driftY = (Math.cos(phaseY) * blob.driftY + Math.cos(phaseY * 0.44 + blob.phase * 0.82) * blob.driftY * 0.38) * driftScale;
				computed.baseX = sw * (blob.baseX + driftX);
				computed.baseY = sh * (blob.baseY + driftY);
				computed.phase = phase;
				computed.phaseY = phaseY;
			}
			const mergeDistance = Math.max(sw, sh) * (isReducedQuality ? 0.24 : 0.28);
			const pullStrength = Math.max(sw, sh) * (isReducedQuality ? 0.016 : 0.022);
			const repelStrength = Math.max(sw, sh) * (isReducedQuality ? 0.004 : 0.0055);
			for (let i = 0; i < activeBlobCount; i++) {
				const computed = livingRoomAmbientComputed[i];
				computed.targetX = computed.baseX;
				computed.targetY = computed.baseY;
				let merge = 0;
				for (let j = 0; j < activeBlobCount; j++) {
					if (i === j) continue;
					const other = livingRoomAmbientComputed[j];
					const dx = other.baseX - computed.baseX;
					const dy = other.baseY - computed.baseY;
					const distance = Math.max(0.001, Math.hypot(dx, dy));
					const influence = Math.max(0, 1 - distance / mergeDistance);
					if (influence <= 0) continue;
					const nx = dx / distance;
					const ny = dy / distance;
					const pull = influence * influence * pullStrength;
					computed.targetX += nx * pull;
					computed.targetY += ny * pull;
					const repelInfluence = Math.max(0, 1 - distance / (mergeDistance * 0.36));
					if (repelInfluence > 0) {
						computed.targetX -= nx * repelInfluence * repelStrength;
						computed.targetY -= ny * repelInfluence * repelStrength;
					}
					merge += influence;
				}
				computed.merge = Math.max(0, Math.min(1, merge * (isReducedQuality ? 0.34 : 0.4)));
			}

			const spring = isReducedQuality ? 0.12 : 0.14;
			const damping = isReducedQuality ? 0.84 : 0.82;
			const velocityDenominator = Math.max(sw, sh) * (isReducedQuality ? 0.0072 : 0.0065);
			for (let i = 0; i < activeBlobCount; i++) {
				const blob = livingRoomAmbientBlobs[i];
				const sprite = blob.sprite;
				const computed = livingRoomAmbientComputed[i];
				if (!sprite || !computed) continue;
				if (!computed.initialized) {
					computed.x = computed.targetX;
					computed.y = computed.targetY;
					computed.vx = 0;
					computed.vy = 0;
					computed.initialized = true;
				}
				computed.vx = (computed.vx + (computed.targetX - computed.x) * spring) * damping;
				computed.vy = (computed.vy + (computed.targetY - computed.y) * spring) * damping;
				computed.x += computed.vx;
				computed.y += computed.vy;
				sprite.x = computed.x;
				sprite.y = computed.y;
				const velocity = Math.hypot(computed.vx, computed.vy);
				const velocityMix = Math.max(0, Math.min(1, velocity / Math.max(0.0001, velocityDenominator)));
				const merge = computed.merge;
				const breath = 1 + Math.sin(computed.phase * 0.38 + blob.phase) * 0.1;
				const wobbleX = 1 + Math.sin(computed.phase * 0.9 + merge * 1.8) * blob.squish;
				const wobbleY = 1 + Math.cos(computed.phaseY * 1.03 + merge * 1.2) * blob.squish;
				const mergeScaleX = 1 + merge * 0.24 + velocityMix * 0.1;
				const mergeScaleY = 1 + merge * 0.14 - velocityMix * 0.06;
				const squishMix = Math.max(0.84, Math.min(1.18, 1 + Math.sin(computed.phase * 0.52 + blob.phase) * 0.08));
				sprite.scale.set(
					baseScale * blob.scale * breath * wobbleX * mergeScaleX * squishMix,
					baseScale * blob.scale * breath * wobbleY * mergeScaleY / squishMix,
				);
				sprite.rotation = Math.sin(computed.phase * 0.21 + blob.phase) * 0.08 + Math.atan2(computed.vy, computed.vx) * velocityMix * 0.08;
				const alpha = blob.alpha
					* (0.88 + Math.sin(computed.phase * 0.26 + blob.phase) * 0.12)
					* (0.92 + merge * 0.28);
				sprite.alpha = Math.max(0.2, Math.min(1, alpha));
			}
		};
		const drawLivingRoomBackdrop = (blend) => {
			const sw = app.renderer.width;
			const sh = app.renderer.height;
			const t = Math.max(0, Math.min(1, blend));
			const eased = 1 - Math.pow(1 - t, 3);

			livingRoomBackdrop.clear();
			livingRoomBackdrop.beginFill(0x05070c, 0.42 * eased);
			livingRoomBackdrop.drawRect(0, 0, sw, sh);
			livingRoomBackdrop.endFill();
		};

		const layoutLivingRoom = ({ instantTerminal = false } = {}) => {
			const sw = app.renderer.width;
			const sh = app.renderer.height;
			const margin = Math.max(20, Math.round(sw * 0.028));
			const navRowH = Math.max(34, Math.min(52, Math.round(sh * 0.06)));
			const navRowY = margin;
			const navRowGap = Math.max(10, Math.round(navRowH * 0.28));
			const layoutTop = margin;
			const focusMixRaw = livingRoomLayoutFocus.mix;
			const focusMix = Math.max(0, Math.min(1, focusMixRaw));
			const browseRackRatio = sw < 980 ? 0.36 : 0.34;
			const focusRackRatio = sw < 980 ? 0.24 : 0.22;
			const rackRatio = browseRackRatio + (focusRackRatio - browseRackRatio) * focusMixRaw;
			const colGap = Math.max(10, Math.round(sw * (0.02 - focusMix * 0.004)));
			const rackW = Math.max(180, Math.min(Math.round(sw * 0.42), Math.round(sw * rackRatio)));
			const panelW = Math.max(320, sw - margin * 2 - colGap - rackW);
			const panelHCap = Math.min(Math.round(sh * 0.84), Math.round(sw * 0.72));
			const panelH = Math.max(300, Math.min(panelHCap, Math.round(sh - margin * 2)));
			const rackX = margin;
			const rackY = layoutTop;
			const panelX = rackX + rackW + colGap;
			const panelY = layoutTop;
			const activeAccent = getActiveAccentColor();
			const shelfBorderColor = tintColor(activeAccent, 0.9);
			const shelfLineColor = tintColor(activeAccent, 1.22);
			livingRoomLayoutFocus.lastAppliedMix = focusMixRaw;

			livingRoomRackRect.x = rackX;
			livingRoomRackRect.y = rackY;
			livingRoomRackRect.w = rackW;
			livingRoomRackRect.h = panelH;
			livingRoomTvPanelRect.x = panelX;
			livingRoomTvPanelRect.y = panelY;
			livingRoomTvPanelRect.w = panelW;
			livingRoomTvPanelRect.h = panelH;

			livingRoomLayer.position.set(0, 0);
			livingRoomLayer.hitArea = new PIXI.Rectangle(0, 0, sw, sh);

			livingRoomWallGlow.clear();
			livingRoomWallGlow.beginFill(0x15111b, 0.36);
			livingRoomWallGlow.drawRect(0, 0, sw, sh);
			livingRoomWallGlow.endFill();
			roomVignette.clear();
			roomVignette.beginFill(0x05050a, 0.08);
			roomVignette.drawRect(0, 0, sw, sh);
			roomVignette.endFill();

			livingRoomFloor.clear();
			livingRoomFloor.beginFill(0x0b121a, 0.35);
			livingRoomFloor.drawRect(0, sh * 0.7, sw, sh * 0.3);
			livingRoomFloor.endFill();

			livingRoomForeground.clear();
			livingRoomForeground.beginFill(0x0d1624, 0.88);
			livingRoomForeground.lineStyle(1.5, 0x6fb8e6, 0.52);
			livingRoomForeground.drawRoundedRect(margin, navRowY, sw - margin * 2, navRowH, 8);
			livingRoomForeground.endFill();
			livingRoomForeground.beginFill(getActiveAccentColor(), 0.18);
			livingRoomForeground.drawRoundedRect(margin + 10, navRowY + navRowH - 3, Math.max(24, sw - margin * 2 - 20), 2, 1);
			livingRoomForeground.endFill();

			leftShelf.clear();
			leftShelf.beginFill(0x0f1720, 0.88);
			leftShelf.lineStyle(2, shelfBorderColor, 0.85);
			leftShelf.drawRoundedRect(rackX, rackY, rackW, panelH, 10);
			leftShelf.endFill();
			leftShelf.lineStyle(1, shelfLineColor, 0.16);
			for (let y = rackY + 22; y < rackY + panelH - 20; y += 14) {
				leftShelf.moveTo(rackX + 10, y);
				leftShelf.lineTo(rackX + rackW - 10, y);
			}

			rightShelf.clear();
			rightShelf.alpha = 0;

			const rackPad = Math.max(8, Math.round(12 - focusMix * 3));
			const scrollbarW = 8;
			const scrollbarGap = 8;
			const viewportX = rackX + rackPad;
			const viewportY = rackY + rackPad;
			const viewportW = rackW - rackPad * 2 - scrollbarW - scrollbarGap;
			const viewportH = panelH - rackPad * 2;
			cartridgeViewportRect.x = viewportX;
			cartridgeViewportRect.y = viewportY;
			cartridgeViewportRect.w = viewportW;
			cartridgeViewportRect.h = viewportH;
			cartridgeListViewport.position.set(viewportX, viewportY);
			cartridgeListMask.clear();
			cartridgeListMask.beginFill(0xffffff, 1);
			cartridgeListMask.drawRoundedRect(0, 0, viewportW, viewportH, 8);
			cartridgeListMask.endFill();
			cartridgeScrollUi.position.set(viewportX + viewportW + scrollbarGap, viewportY);
			cartridgeScrollTrack.clear();
			cartridgeScrollTrack.beginFill(0x0b1926, 0.78);
			cartridgeScrollTrack.drawRoundedRect(0, 0, scrollbarW, viewportH, 4);
			cartridgeScrollTrack.endFill();
			cartridgeScrollState.trackY = 0;
			cartridgeScrollState.trackH = viewportH;

			livingRoomTv.position.set(panelX, panelY);
			tvBodyShadow.clear();
			tvBodyShadow.beginFill(0x000000, 0.28);
			tvBodyShadow.drawRoundedRect(10, 12, panelW, panelH, 12);
			tvBodyShadow.endFill();
			tvBody.clear();
			tvBody.beginFill(0x08131f, 0.92);
			tvBody.lineStyle(2, getActiveAccentColor(), 0.65);
			tvBody.drawRoundedRect(0, 0, panelW, panelH, 12);
			tvBody.endFill();
			livingRoomTvFrame.clear();

			const innerPad = Math.max(14, Math.round(panelW * 0.03));
			const contentX = innerPad;
			const contentY = innerPad;
			const contentW = panelW - innerPad * 2;
			const contentH = panelH - innerPad * 2;
			const paneGap = Math.max(10, Math.round(contentW * 0.02));
			const previewW = Math.round(contentW * 0.56);
			const terminalW = contentW - previewW - paneGap;
			const previewX = contentX;
			const terminalX = previewX + previewW + paneGap;

			holoPanelLocalRect.x = contentX;
			holoPanelLocalRect.y = contentY;
			holoPanelLocalRect.w = contentW;
			holoPanelLocalRect.h = contentH;

			livingRoomTvScreenRect.x = panelX + previewX;
			livingRoomTvScreenRect.y = panelY + contentY;
			livingRoomTvScreenRect.w = previewW;
			livingRoomTvScreenRect.h = contentH;
			livingRoomTvScreenRect.r = 8;

			tvScreenGroup.position.set(0, 0);
			tvScreenMask.clear();
			tvScreenMask.beginFill(0xffffff, 1);
			const screenMaskBleed = 40;
			tvScreenMask.drawRect(
				contentX - screenMaskBleed,
				contentY - screenMaskBleed,
				contentW + screenMaskBleed * 2,
				contentH + screenMaskBleed * 2,
			);
			tvScreenMask.endFill();
			tvScreenHitArea.clear();
			tvScreenHitArea.eventMode = 'none';
			tvScreenHitArea.cursor = 'default';

			tvContentContainer.position.set(0, 0);
			tvScreenBaseBg.clear();

			const mediaTopPad = Math.max(1, Math.round(contentH * 0.005));
			const mediaBottomPad = Math.max(18, Math.round(contentH * 0.05));
			const mediaSidePad = Math.max(6, Math.round(previewW * 0.02));
			livingRoomMediaLayout.x = previewX + mediaSidePad;
			livingRoomMediaLayout.y = contentY + mediaTopPad;
			livingRoomMediaLayout.w = Math.max(1, previewW - mediaSidePad * 2);
			livingRoomMediaLayout.h = Math.max(1, contentH - mediaTopPad - mediaBottomPad);
			livingRoomMediaLayout.dotY = livingRoomMediaLayout.y + livingRoomMediaLayout.h + 14;
			tvScreenBaseBg.clear();
			tvScreenBaseBg.beginFill(0x040912, 0.2);
			tvScreenBaseBg.drawRoundedRect(
				livingRoomMediaLayout.x - 2,
				livingRoomMediaLayout.y - 2,
				livingRoomMediaLayout.w + 4,
				livingRoomMediaLayout.h + 4,
				9,
			);
			tvScreenBaseBg.endFill();
			fitLivingRoomMediaSprite(tvMediaPrevSprite, tvMediaPrevSprite.texture || PIXI.Texture.WHITE);
			fitLivingRoomMediaSprite(tvDesktopContentSprite, tvDesktopContentSprite.texture || PIXI.Texture.WHITE);
			tvSlideDotNav.position.set(previewX + previewW * 0.5, livingRoomMediaLayout.dotY);
			tvMediaZoomHint.position.set(previewX + previewW * 0.5, livingRoomMediaLayout.dotY + 10);
			updateLivingRoomMediaZoomHint();
			tvMediaPrevSprite.visible = livingRoomMediaTransition.active;
			tvMediaPrevSprite.alpha = livingRoomMediaTransition.active ? tvMediaPrevSprite.alpha : 0;

			tvBroBg.clear();
			tvBroBg.beginFill(0x060e18, 0.96);
			tvBroBg.lineStyle(1, getActiveAccentColor(), 0.48);
			tvBroBg.drawRoundedRect(terminalX, contentY, terminalW, contentH, 8);
			tvBroBg.endFill();
			tvTerminalMask.clear();
			tvTerminalMask.beginFill(0xffffff, 1);
			tvTerminalMask.drawRoundedRect(terminalX + 2, contentY + 2, Math.max(8, terminalW - 4), Math.max(8, contentH - 4), 7);
			tvTerminalMask.endFill();
			tvBroTitle.anchor.set(0, 0);
			tvBroTitle.style.fontSize = Math.max(11, Math.round(Math.min(16, terminalW * 0.07)));
			tvBroTitle.style.fill = 0x9fdfff;
			tvBroTitle.text = 'TERMINAL';
			tvBroTitle.position.set(terminalX + 12, contentY + 10);
			tvBroSub.visible = true;
			tvTerminalFontSize = Math.max(11, Math.round(Math.min(15, terminalW * 0.07)));
			tvTerminalLineHeight = Math.max(18, Math.round(tvTerminalFontSize * 1.55));
			tvTerminalStartX = terminalX + 12;
			tvTerminalStartY = contentY + 42;
			livingRoomTerminalLayout.x = terminalX + 12;
			livingRoomTerminalLayout.y = contentY + 40;
			livingRoomTerminalLayout.w = Math.max(70, terminalW - 24);
			livingRoomTerminalLayout.h = Math.max(40, contentH - 54);
			tvBroTitleBaseY = tvBroTitle.y;
			tvBroSubBaseY = tvBroSub.y;
			tvTerminalLines.visible = true;
			tvTerminalCursor.visible = true;
			rebuildLivingRoomTerminalPanel({ instant: instantTerminal });
			renderTerminalTypedText(true);
			redrawLivingRoomDots();

			tvEmptyBg.clear();
			tvEmptyScreen.alpha = 0;
			tvEmptySprite.visible = false;
			tvEmptyText.visible = false;

			tvScreensaverBg.clear();
			tvScreensaverNoise.clear();
			tvScreensaverNoise.beginFill(0xc8e8ff, 0.06);
			const noiseDotCount = Math.max(80, Math.round((contentW * contentH) / 6000));
			for (let i = 0; i < noiseDotCount; i++) {
				const nx = contentX + Math.random() * contentW;
				const ny = contentY + Math.random() * contentH;
				tvScreensaverNoise.drawRect(nx, ny, 1, 1);
			}
			tvScreensaverNoise.endFill();

			tvCrtOverlay.clear();
			tvCrtOverlay.beginFill(0x0e1e2f, 0.14);
			tvCrtOverlay.drawRoundedRect(contentX, contentY, contentW, contentH, 10);
			tvCrtOverlay.endFill();
			tvCrtOverlay.lineStyle(1, 0x8ed3fb, 0.1);
			for (let d = -contentH; d < contentW; d += 16) {
				tvCrtOverlay.moveTo(contentX + Math.max(0, d), contentY + Math.max(0, -d));
				tvCrtOverlay.lineTo(contentX + Math.min(contentW, d + contentH), contentY + Math.min(contentH, contentH - d));
			}

			tvGlassReflection.clear();
			const terminalSlideBandX = terminalX + 8;
			const terminalSlideBandY = tvTerminalStartY - 9;
			const terminalSlideBandW = Math.max(24, terminalW - 16);
			const terminalSlideBandH = Math.max(30, Math.round(tvTerminalLineHeight * 2.25));
			tvGlassReflection.beginFill(0xb0e6ff, 0.12);
			tvGlassReflection.drawRoundedRect(
				terminalSlideBandX,
				terminalSlideBandY,
				terminalSlideBandW,
				terminalSlideBandH,
				6,
			);
			tvGlassReflection.endFill();

			tvSlotForeground.clear();
			tvSlotForeground.beginFill(0x8bd9ff, 0.14);
			tvSlotForeground.drawRoundedRect(terminalSlideBandX, terminalSlideBandY, terminalSlideBandW, 3, 2);
			tvSlotForeground.endFill();

			tvEjectBtn.visible = false;
			tvEjectBtn.eventMode = 'none';
			placard.visible = false;
			livingRoomForeground.clear();

			livingRoomBackBg.clear();
			livingRoomBackBg.beginFill(0x142334, 0.95);
			livingRoomBackBg.lineStyle(2, 0x7ed1ff, 0.82);
			livingRoomBackBg.drawRoundedRect(0, 0, 88, 30, 8);
			livingRoomBackBg.endFill();
			livingRoomBackBtn.position.set(margin + 2, Math.max(6, rackY - 36));
			livingRoomBackLabel.position.set(44, 15);

			livingRoomFocusLabel.text = focusMix >= 0.5 ? 'BROWSE' : 'FOCUS';
			const focusBtnW = Math.max(96, Math.ceil(livingRoomFocusLabel.width + 26));
			livingRoomFocusBg.clear();
			livingRoomFocusBg.beginFill(0x142334, 0.95);
			livingRoomFocusBg.lineStyle(2, focusMix >= 0.5 ? tintColor(activeAccent, 1.22) : 0x7ed1ff, 0.82);
			livingRoomFocusBg.drawRoundedRect(0, 0, focusBtnW, 30, 8);
			livingRoomFocusBg.endFill();
			const focusBtnX = Math.min(sw - margin - focusBtnW - 2, livingRoomBackBtn.x + 96);
			livingRoomFocusBtn.position.set(Math.max(margin + 94, focusBtnX), livingRoomBackBtn.y);
			livingRoomFocusLabel.position.set(focusBtnW * 0.5, 15);

			const tapeWidthFactor = 0.8 - focusMix * 0.12;
			const tapeMinW = Math.max(118, Math.round(160 - focusMix * 40));
			livingRoomTapeW = Math.max(tapeMinW, rackW * tapeWidthFactor);
			livingRoomTapeH = Math.max(Math.round(52 + (1 - focusMix) * 12), livingRoomTapeW * 0.44);
			const tapeSpacing = Math.max(8, Math.round(livingRoomTapeH * (0.12 - focusMix * 0.03)));
			const totalTapeH = livingRoomTapes.length * livingRoomTapeH + (livingRoomTapes.length - 1) * tapeSpacing;
			const tapesTop = 10;
			const rackCenterX = viewportW * 0.5;
			for (let i = 0; i < livingRoomTapes.length; i++) {
				const tape = livingRoomTapes[i];
				tape.baseX = rackCenterX;
				tape.baseY = tapesTop + livingRoomTapeH * 0.5 + i * (livingRoomTapeH + tapeSpacing);
			}
			cartridgeScrollState.viewportH = viewportH;
			cartridgeScrollState.contentH = tapesTop + totalTapeH + 10;
			cartridgeScrollState.maxScroll = Math.max(0, cartridgeScrollState.contentH - viewportH);
			updateCartridgeScrollUi();

			livingRoomTvSlotX = viewportX + rackCenterX;
			livingRoomTvSlotY = panelY + panelH * 0.5;

			tvDesktopTransitionSprite.position.set(0, 0);
			tvDesktopTransitionSprite.width = sw;
			tvDesktopTransitionSprite.height = sh;
			fullscreenTvContentBg.clear();
			fullscreenTvContentBg.beginFill(0x070a13, 1);
			fullscreenTvContentBg.drawRect(0, 0, sw, sh);
			fullscreenTvContentBg.endFill();
			fullscreenTvContentTitle.position.set(sw * 0.5, sh * 0.46);
			fullscreenTvContentSub.position.set(sw * 0.5, sh * 0.58);
			fullscreenExitBtnBg.clear();
			fullscreenExitBtnBg.beginFill(0x2f2432, 0.96);
			fullscreenExitBtnBg.lineStyle(2, 0x8f5a73, 0.9);
			fullscreenExitBtnBg.drawRoundedRect(0, 0, 116, 28, 7);
			fullscreenExitBtnBg.endFill();
			fullscreenExitBtn.position.set(18, 16);
			fullscreenExitBtnLabel.position.set(58, 14);

			drawLivingRoomBackdrop(livingRoomState.blend);
		};
		const setLivingRoomDetailFocus = (enabled, options = {}) => {
			const instant = Boolean(options.instant);
			livingRoomLayoutFocus.targetMix = enabled ? 1 : 0;
			if (!instant) return;
			livingRoomLayoutFocus.mix = livingRoomLayoutFocus.targetMix;
			livingRoomLayoutFocus.velocity = 0;
			livingRoomLayoutFocus.lastAppliedMix = Number.NaN;
			layoutLivingRoom({ instantTerminal: true });
		};
		const stepLivingRoomDetailFocus = (dtSeconds) => {
			const target = livingRoomLayoutFocus.targetMix;
			let mix = livingRoomLayoutFocus.mix;
			let velocity = livingRoomLayoutFocus.velocity;
			const delta = target - mix;
			const settling = Math.abs(delta) < 0.0008 && Math.abs(velocity) < 0.0008;

			if (settling) {
				if (mix !== target) {
					mix = target;
					velocity = 0;
				}
			} else {
				const stiffness = 30;
				const damping = 11;
				const accel = delta * stiffness - velocity * damping;
				velocity += accel * dtSeconds;
				mix += velocity * dtSeconds;
				if (mix < -0.06) {
					mix = -0.06;
					velocity = 0;
				}
				if (mix > 1.06) {
					mix = 1.06;
					velocity = 0;
				}
			}

			livingRoomLayoutFocus.mix = mix;
			livingRoomLayoutFocus.velocity = velocity;
			const lastApplied = livingRoomLayoutFocus.lastAppliedMix;
			const needsStepLayout = !Number.isFinite(lastApplied) || Math.abs(mix - lastApplied) > 0.003;
			const needsFinalLayout = settling && Math.abs(target - lastApplied) > 0.0001;
			if (needsStepLayout || needsFinalLayout) {
				layoutLivingRoom({ instantTerminal: true });
			}
		};
		layoutLivingRoom({ instantTerminal: true });
		openPortfolioLibraryNow = () => {
			if (livingRoomActive) return;
			enterLivingRoom();
		};
		closePortfolioLibraryNow = () => {
			exitLivingRoom();
		};
		openLivingRoomScene = () => {
			startPortfolioEntryTransition();
		};
		closeLivingRoomScene = () => {
			startPortfolioExitTransition();
		};
		const vineLabApp = createVineLab(app, {
			accentColor: 0x38ffd0,
			onExit: () => {
				closeVineLabNow();
			},
		});
		updateVineLabNow = (dtSeconds) => {
			vineLabApp.update(dtSeconds);
		};
		resizeVineLabNow = () => {
			vineLabApp.resize();
		};
		openVineLabNow = () => {
			if (vineLabActive || vineLabTransition.active || livingRoomActive || portfolioEntryTransition.active) return;
			vineLabTransition.active = true;
			vineLabTransition.phase = 0;
			vineLabTransition.duration = 0.34;
			vineLabTransition.direction = 1;
			vineLabTransition.actionTriggered = false;
			vineLabTransition.action = () => {
				vineLabActive = true;
				livingRoomState.targetBlend = 0;
				livingRoomState.blend = 0;
				livingRoomState.viewMode = VIEW_FULLSCREEN;
				livingRoomLayer.visible = false;
				livingRoomLayer.eventMode = 'none';
				fullscreenTvContentLayer.visible = false;
				scene.visible = false;
				vineLabApp.open();
			};
			drawTransitionWipe(0.01);
		};
		closeVineLabNow = () => {
			if ((!vineLabActive && !vineLabTransition.active) || vineLabTransition.active) return;
			playExitToMenuSfx();
			vineLabTransition.active = true;
			vineLabTransition.phase = 0;
			vineLabTransition.duration = 0.3;
			vineLabTransition.direction = -1;
			vineLabTransition.actionTriggered = false;
			vineLabTransition.action = () => {
				if (vineLabActive) {
					vineLabActive = false;
					vineLabApp.close();
				}
				scene.visible = true;
				livingRoomLayer.visible = false;
				livingRoomLayer.eventMode = 'none';
				fullscreenTvContentLayer.visible = false;
			};
			drawTransitionWipe(0.01);
		};
		tvScreenHitArea.on('pointertap', () => {
			if (livingRoomState.viewMode !== VIEW_TV_AREA) return;
			if (livingRoomState.blend < 0.95) return;
			refreshPlacard();
		});
		updateLivingRoomMediaZoomHint();
		tvEjectBtn.on('pointertap', () => {});
		tvEjectBtn.on('pointerover', () => {});
		tvEjectBtn.on('pointerout', () => {});
		fullscreenExitBtn.on('pointertap', () => {
			if (livingRoomState.viewMode !== VIEW_FULLSCREEN) return;
			if (!isFullscreenTvPlaybackActive()) return;
			returnToTvAreaFromFullscreen();
		});
		fullscreenExitBtn.on('pointerover', () => { fullscreenExitBtn.scale.set(1.04); });
		fullscreenExitBtn.on('pointerout', () => { fullscreenExitBtn.scale.set(1); });
		livingRoomBackBtn.on('pointertap', () => {
			if (livingRoomState.overlayMode === OVERLAY_MODE_LIBRARY) {
				closeLivingRoomScene();
				return;
			}
			if (isFullscreenTvPlaybackActive()) {
				returnToTvAreaFromFullscreen();
				return;
			}
			closeLivingRoomScene();
		});
		livingRoomBackBtn.on('pointerover', () => { livingRoomBackBtn.scale.set(1.04); });
		livingRoomBackBtn.on('pointerout', () => { livingRoomBackBtn.scale.set(1); });
		livingRoomFocusBtn.on('pointertap', () => {
			if (livingRoomState.viewMode !== VIEW_TV_AREA) return;
			setLivingRoomDetailFocus(livingRoomLayoutFocus.targetMix < 0.5);
		});
		livingRoomFocusBtn.on('pointerover', () => { livingRoomFocusBtn.scale.set(1.04); });
		livingRoomFocusBtn.on('pointerout', () => { livingRoomFocusBtn.scale.set(1); });
		const setCartridgeScrollFromThumbY = (thumbYLocal) => {
			const maxThumbTravel = Math.max(0, cartridgeScrollState.trackH - cartridgeScrollState.thumbH);
			const clampedThumbY = Math.max(cartridgeScrollState.trackY, Math.min(cartridgeScrollState.trackY + maxThumbTravel, thumbYLocal));
			const progress = maxThumbTravel > 0 ? ((clampedThumbY - cartridgeScrollState.trackY) / maxThumbTravel) : 0;
			cartridgeScrollState.scrollY = progress * cartridgeScrollState.maxScroll;
			updateCartridgeScrollUi();
		};
		cartridgeScrollTrack.eventMode = 'static';
		cartridgeScrollTrack.cursor = 'pointer';
		cartridgeScrollThumb.eventMode = 'static';
		cartridgeScrollThumb.cursor = 'grab';
		cartridgeScrollTrack.on('pointerdown', (event) => {
			if (!livingRoomActive || livingRoomState.viewMode !== VIEW_TV_AREA) return;
			setLivingRoomDetailFocus(false);
			const local = event.data.getLocalPosition(cartridgeScrollUi);
			setCartridgeScrollFromThumbY(local.y - cartridgeScrollState.thumbH * 0.5);
		});
		cartridgeScrollThumb.on('pointerdown', (event) => {
			if (!livingRoomActive || livingRoomState.viewMode !== VIEW_TV_AREA) return;
			setLivingRoomDetailFocus(false);
			event.stopPropagation?.();
			const local = event.data.getLocalPosition(cartridgeScrollUi);
			cartridgeScrollState.dragging = true;
			cartridgeScrollState.dragOffsetY = local.y - cartridgeScrollState.thumbY;
			cartridgeScrollThumb.cursor = 'grabbing';
		});
		livingRoomLayer.on('pointermove', (event) => {
			if (!cartridgeScrollState.dragging) return;
			const local = event.data.getLocalPosition(cartridgeScrollUi);
			setCartridgeScrollFromThumbY(local.y - cartridgeScrollState.dragOffsetY);
		});
		const endCartridgeScrollDrag = () => {
			cartridgeScrollState.dragging = false;
			cartridgeScrollThumb.cursor = 'grab';
		};
		livingRoomLayer.on('pointerup', endCartridgeScrollDrag);
		livingRoomLayer.on('pointerupoutside', endCartridgeScrollDrag);
		window.addEventListener('pointerup', endCartridgeScrollDrag);
		window.addEventListener('pointercancel', endCartridgeScrollDrag);
		app.view.addEventListener('wheel', (event) => {
			if (!livingRoomActive || livingRoomState.viewMode !== VIEW_TV_AREA) return;
			if (mediaPopoutState.progress > 0.02 || mediaPopoutState.target > 0) {
				event.preventDefault();
				return;
			}
			const point = toRendererPoint(event);
			if (!point) return;
			const insideMedia = point.x >= livingRoomTvScreenRect.x
				&& point.x <= (livingRoomTvScreenRect.x + livingRoomTvScreenRect.w)
				&& point.y >= livingRoomTvScreenRect.y
				&& point.y <= (livingRoomTvScreenRect.y + livingRoomTvScreenRect.h);
			if (insideMedia && livingRoomDotNodes.length > 1) {
				event.preventDefault();
				setLivingRoomSlide(livingRoomSlideIndex + (event.deltaY > 0 ? 1 : -1), { instantTerminal: true, userInitiated: true });
				return;
			}
			const insideViewport = point.x >= cartridgeViewportRect.x
				&& point.x <= (cartridgeViewportRect.x + cartridgeViewportRect.w)
				&& point.y >= cartridgeViewportRect.y
				&& point.y <= (cartridgeViewportRect.y + cartridgeViewportRect.h);
			if (!insideViewport) return;
			event.preventDefault();
			setLivingRoomDetailFocus(false);
			cartridgeScrollState.scrollY += event.deltaY;
			updateCartridgeScrollUi();
		}, { passive: false });
		app.view.addEventListener('pointerdown', (event) => {
			if (!livingRoomActive || livingRoomState.viewMode !== VIEW_TV_AREA) return;
			const point = toRendererPoint(event);
			if (!point) return;
			const insideRack = point.x >= livingRoomRackRect.x
				&& point.x <= (livingRoomRackRect.x + livingRoomRackRect.w)
				&& point.y >= livingRoomRackRect.y
				&& point.y <= (livingRoomRackRect.y + livingRoomRackRect.h);
			const insideDetailPanel = point.x >= livingRoomTvPanelRect.x
				&& point.x <= (livingRoomTvPanelRect.x + livingRoomTvPanelRect.w)
				&& point.y >= livingRoomTvPanelRect.y
				&& point.y <= (livingRoomTvPanelRect.y + livingRoomTvPanelRect.h);
			if (insideRack) setLivingRoomDetailFocus(false);
			if (insideDetailPanel) setLivingRoomDetailFocus(true);
			if (mediaPopoutState.progress > 0.02 || mediaPopoutState.target > 0) {
				const halfW = mediaPopoutState.cardW * 0.5;
				const halfH = mediaPopoutState.cardH * 0.5;
				const insideCard = point.x >= (mediaPopoutState.cardX - halfW)
					&& point.x <= (mediaPopoutState.cardX + halfW)
					&& point.y >= (mediaPopoutState.cardY - halfH)
					&& point.y <= (mediaPopoutState.cardY + halfH);
				if (!insideCard) {
					event.preventDefault();
					closeMediaPopout({ playReturnSfx: true });
				}
				return;
			}
			if (getActiveProject()?.useDesktopFeed) return;
			const mediaGlobalX = livingRoomTv.x + livingRoomMediaLayout.x;
			const mediaGlobalY = livingRoomTv.y + livingRoomMediaLayout.y;
			const insideMedia = point.x >= mediaGlobalX
				&& point.x <= (mediaGlobalX + livingRoomMediaLayout.w)
				&& point.y >= mediaGlobalY
				&& point.y <= (mediaGlobalY + livingRoomMediaLayout.h);
			if (!insideMedia) return;
			event.preventDefault();
			openMediaPopout();
		}, { passive: false });
		app.view.addEventListener('pointermove', (event) => {
			if (mediaPopoutState.target <= 0 && mediaPopoutState.progress <= 0.02) return;
			mediaPopoutState.targetTiltX = 0;
			mediaPopoutState.targetTiltY = 0;
		}, { passive: true });
		window.addEventListener('keydown', (event) => {
			if (!livingRoomActive || livingRoomState.viewMode !== VIEW_TV_AREA) return;
			if (event.key === 'Escape' && (mediaPopoutState.progress > 0.02 || mediaPopoutState.target > 0)) {
				event.preventDefault();
				closeMediaPopout({ playReturnSfx: true });
				return;
			}
			if (mediaPopoutState.progress > 0.02 || mediaPopoutState.target > 0) return;
			if (livingRoomDotNodes.length <= 1) return;
			if (event.key === 'ArrowRight') {
				event.preventDefault();
				setLivingRoomSlide(livingRoomSlideIndex + 1, { instantTerminal: true, userInitiated: true });
			}
			if (event.key === 'ArrowLeft') {
				event.preventDefault();
				setLivingRoomSlide(livingRoomSlideIndex - 1, { instantTerminal: true, userInitiated: true });
			}
		});
		const updateLivingRoomScene = (dtSeconds) => {
			const step = dtSeconds / LIVING_ROOM_TRANSITION_SECONDS;
			if (livingRoomState.targetBlend > livingRoomState.blend) {
				livingRoomState.blend = Math.min(livingRoomState.targetBlend, livingRoomState.blend + step);
			} else if (livingRoomState.targetBlend < livingRoomState.blend) {
				livingRoomState.blend = Math.max(livingRoomState.targetBlend, livingRoomState.blend - step);
			}
			if (livingRoomState.blend < 0.001 && livingRoomState.targetBlend <= 0) {
				livingRoomLayer.visible = false;
				livingRoomLayer.eventMode = 'none';
				tvDesktopTransitionLayer.visible = false;
				tvDesktopTransitionSprite.alpha = 0;
				livingRoomState.mode = STATE_DESKTOP_FULLSCREEN;
				livingRoomState.staticBurst = 0;
				livingRoomState.viewMode = VIEW_FULLSCREEN;
				scene.visible = true;
				const showTvFullscreen = livingRoomState.overlayMode === OVERLAY_MODE_TV
					&& livingRoomState.fullscreenFromTv
					&& !getActiveProject()?.useDesktopFeed;
				fullscreenTvContentLayer.visible = showTvFullscreen;
				fullscreenTvContentLayer.eventMode = showTvFullscreen ? 'passive' : 'none';
				livingRoomActive = false;
				return;
			}
			const blend = Math.max(0, Math.min(1, livingRoomState.blend));
			const reveal = 1 - Math.pow(1 - blend, 3);
			stepLivingRoomDetailFocus(dtSeconds);
			const focusMix = Math.max(0, Math.min(1, livingRoomLayoutFocus.mix));
			const desktopProxyMix = 1 - Math.pow(1 - blend, 2.35);
			const shouldRefreshDesktopFeed = previewUsesDesktopFeed && (blend < 1 || livingRoomState.targetBlend < 1 || livingRoomState.viewMode === VIEW_TV_AREA);
			if (shouldRefreshDesktopFeed) {
				refreshDesktopTvTexture();
			}
			if (livingRoomState.viewMode === VIEW_TV_AREA && blend > 0.995) {
				scene.visible = false;
				fullscreenTvContentLayer.visible = false;
			} else if (livingRoomState.viewMode === VIEW_FULLSCREEN && blend < 0.005) {
				scene.visible = true;
				fullscreenTvContentLayer.visible = livingRoomState.overlayMode === OVERLAY_MODE_TV
					&& livingRoomState.fullscreenFromTv
					&& !getActiveProject()?.useDesktopFeed;
			} else {
				scene.visible = true;
				fullscreenTvContentLayer.visible = false;
			}
			livingRoomActive = blend > 0.02;
			const fullscreenUiActive = livingRoomActive && isFullscreenTvPlaybackActive() && blend < 0.02 && !getActiveProject()?.useDesktopFeed;
			fullscreenTvContentLayer.eventMode = fullscreenUiActive ? 'passive' : 'none';
			fullscreenExitBtn.visible = fullscreenUiActive;
			livingRoomLayer.visible = true;
			livingRoomLayer.eventMode = blend > 0.02 ? 'static' : 'none';
			livingRoomLayer.alpha = 1;
			setInGameCursorVisible(true);
			cursorContainer.zIndex = 5000;
			uiTopLayer.sortChildren();
			drawLivingRoomBackdrop(blend);
			stepLivingRoomAmbient(dtSeconds, reveal, focusMix);
			tvDesktopTransitionLayer.visible = blend > 0.001 && blend < 0.999;
			tvDesktopTransitionSprite.position.set(
				livingRoomTvScreenRect.x * desktopProxyMix,
				livingRoomTvScreenRect.y * desktopProxyMix,
			);
			tvDesktopTransitionSprite.width = app.renderer.width + (livingRoomTvScreenRect.w - app.renderer.width) * desktopProxyMix;
			tvDesktopTransitionSprite.height = app.renderer.height + (livingRoomTvScreenRect.h - app.renderer.height) * desktopProxyMix;
			tvDesktopTransitionSprite.alpha = Math.max(0, 1 - Math.max(0, (desktopProxyMix - 0.92) / 0.08));

			livingRoomWallGlow.alpha = 0.04 + reveal * 0.16;
			livingRoomFloor.alpha = 0.24 + reveal * 0.62;
			leftShelf.alpha = (0.24 + reveal * 0.76) * (1 - focusMix * 0.08);
			rightShelf.alpha = 0;
			livingRoomForeground.alpha = 0;
			placard.alpha = 0;
			livingRoomBackBtn.alpha = Math.max(0, (reveal - 0.32) / 0.68);
			livingRoomBackBtn.eventMode = reveal > 0.55 ? 'static' : 'none';
			livingRoomFocusBtn.alpha = livingRoomBackBtn.alpha;
			livingRoomFocusBtn.eventMode = reveal > 0.55 ? 'static' : 'none';
			tvScreenHitArea.alpha = 0;
			tvScreenHitArea.eventMode = 'none';
			tvEjectBtn.alpha = 0;
			tvEjectBtn.eventMode = 'none';
			cartridgeListViewport.alpha = 1 - focusMix * 0.06;
			cartridgeScrollUi.alpha = 1 - focusMix * 0.08;

			const panelReveal = Math.max(0, (reveal - 0.04) / 0.96);
			livingRoomTv.alpha = Math.min(1, panelReveal + focusMix * 0.04);
			livingRoomTv.scale.set(1 + focusMix * 0.008);

			tvDesktopContentSprite.alpha = 1;
			tvBroScreen.alpha = 1;
			tvEmptyScreen.alpha = 0;
			tvSlideDotNav.visible = livingRoomDotNodes.length > 1;
			tvMediaZoomHint.alpha = (mediaPopoutState.progress > 0.02 || mediaPopoutState.target > 0) ? 0 : 0.82;
			stepLivingRoomMediaTransition(dtSeconds);
			stepLivingRoomBezelAnimation(dtSeconds);
			stepMediaPopout(dtSeconds);
			const screensaverTarget = livingRoomState.contentMode === CONTENT_SCREENSAVER ? 1 : 0;
			tvScreensaverLayer.alpha += (screensaverTarget - tvScreensaverLayer.alpha) * Math.min(1, dtSeconds * 6);

			if (tvTerminalLines.visible) {
				if (!terminalTypingHold) {
					terminalTypeTimer += dtSeconds * TERMINAL_TYPE_RATE;
				}
				if (!terminalTypingHold && terminalTypedIndex < terminalFullText.length) {
					const charsToAdd = Math.floor(terminalTypeTimer);
					if (charsToAdd > 0) {
						terminalTypeTimer -= charsToAdd;
						terminalTypedIndex = Math.min(terminalFullText.length, terminalTypedIndex + charsToAdd);
						renderTerminalTypedText();
					}
				}
			}
			stepTerminalOverviewTyping(dtSeconds);
			terminalCursorBlinkTimer = (terminalCursorBlinkTimer + dtSeconds) % 1;
			tvTerminalCursor.visible = tvTerminalLines.visible && terminalCursorBlinkTimer < 0.5;

			const pulseTime = (performance.now ? performance.now() : Date.now()) * 0.003;
			tvBroTitle.y = tvBroTitleBaseY;
			stepTerminalDesignWave(pulseTime);
			const terminalBandTop = Math.max(0, livingRoomTerminalLayout.y - 32);
			const terminalBandHeight = Math.max(24, livingRoomTerminalLayout.h + 40);
			const shimmerY = terminalBandTop + ((pulseTime * 42) % (terminalBandHeight + 26)) - 12;
			tvSlotForeground.clear();
			tvSlotForeground.beginFill(getActiveAccentColor(), 0.12);
			tvSlotForeground.drawRoundedRect(
				Math.max(0, livingRoomTerminalLayout.x - 2),
				shimmerY,
				Math.max(24, livingRoomTerminalLayout.w + 4),
				3,
				2,
			);
			tvSlotForeground.endFill();
			if (tvScreensaverLayer.alpha > 0.001) {
				const wave = 0.5 + 0.5 * Math.sin(pulseTime * 0.7);
				tvScreensaverBg.tint = (Math.floor(90 + wave * 80) << 16) | (Math.floor(30 + wave * 110) << 8) | Math.floor(150 + wave * 80);
				tvScreensaverNoise.alpha = 0.08 + 0.08 * Math.sin(pulseTime * 1.7);
			}
			if (fullscreenTvContentLayer.visible) {
				if (livingRoomState.contentMode === CONTENT_SCREENSAVER) {
					fullscreenTvContentTitle.text = 'CRT SCREENSAVER';
					fullscreenTvContentSub.text = 'NO TAPE / IDLE';
				} else if (livingRoomState.contentMode === CONTENT_EMPTY) {
					fullscreenTvContentTitle.text = 'UH-OH';
					fullscreenTvContentSub.text = `Nothing here yet ${livingRoomState.emptyPreviewWord}`;
				} else {
					fullscreenTvContentTitle.text = 'BRO MEME FEED';
					fullscreenTvContentSub.text = 'fullscreen playback';
				}
				const fullscreenNonDesktop = livingRoomState.contentMode !== CONTENT_DESKTOP;
				fullscreenTvContentBg.alpha = fullscreenNonDesktop ? 1 : 0;
				fullscreenTvContentTitle.alpha = fullscreenNonDesktop ? 1 : 0;
				fullscreenTvContentSub.alpha = fullscreenNonDesktop ? 1 : 0;
				if (livingRoomState.contentMode === CONTENT_SCREENSAVER) {
					const ssWave = 0.5 + 0.5 * Math.sin(pulseTime * 0.6);
					fullscreenTvContentBg.tint = (Math.floor(40 + ssWave * 70) << 16) | (Math.floor(70 + ssWave * 80) << 8) | Math.floor(150 + ssWave * 90);
				} else if (livingRoomState.contentMode === CONTENT_EMPTY) {
					fullscreenTvContentBg.tint = 0x3b2a1d;
				} else {
					fullscreenTvContentBg.tint = 0xffffff;
				}
			}
			livingRoomState.staticBurst = Math.max(0, livingRoomState.staticBurst - dtSeconds);
			const idleStatic = 0.08 + 0.02 * Math.sin((performance.now ? performance.now() : Date.now()) * 0.004);
			const burstStatic = livingRoomState.staticBurst > 0 ? (0.03 + (livingRoomState.staticBurst / 0.3) * 0.06) : 0;
			tvCrtOverlay.alpha = Math.max(idleStatic, burstStatic);

			const interactionsReady = reveal > 0.95 && livingRoomState.viewMode === VIEW_TV_AREA;
			for (let i = 0; i < livingRoomTapes.length; i++) {
				const tape = livingRoomTapes[i];
				const selected = livingRoomState.insertedTapeId && livingRoomState.insertedTapeId === tape.tape.id;
				tape.node.eventMode = interactionsReady ? 'static' : 'none';
				tape.node.cursor = interactionsReady ? 'pointer' : 'default';
				const targetHover = interactionsReady && livingRoomState.hoverIndex === i ? 1 : 0;
				const targetMix = Math.max(targetHover, selected ? 0.7 : 0);
				tape.hoverMix += (targetMix - tape.hoverMix) * Math.min(1, dtSeconds * 12);
				const h = Math.max(0, Math.min(1, tape.hoverMix));
				const pulse = 0.5 + 0.5 * Math.sin(pulseTime * 2.8 + i * 0.7);
				tape.node.position.set(tape.baseX + targetHover * 8, tape.baseY - h * 1.5);
				tape.node.scale.set(1 + h * 0.03);
				const tw = livingRoomTapeW;
				const th = livingRoomTapeH;
				tape.aura.clear();
				if (selected || targetHover > 0) {
					const glowAlpha = selected ? (0.08 + pulse * 0.12) : (0.04 + pulse * 0.07);
					const glowPad = 5 + pulse * 3;
					tape.aura.beginFill(tape.tape.accent || DEFAULT_NEON_ACCENT, glowAlpha);
					tape.aura.drawRoundedRect(-tw * 0.5 - glowPad, -th * 0.5 - glowPad, tw + glowPad * 2, th + glowPad * 2, 12 + pulse * 2);
					tape.aura.endFill();
				}
				tape.shadow.clear();
				tape.shadow.beginFill(0x000000, 0.16 + h * 0.08);
				tape.shadow.drawRoundedRect(-tw * 0.5 + 4, -th * 0.5 + 7, tw, th, 9);
				tape.shadow.endFill();
				tape.body.clear();
				tape.body.beginFill(0x1a2633, 0.98);
				const borderAlpha = selected ? (0.7 + pulse * 0.3) : (targetHover > 0 ? (0.42 + pulse * 0.18) : 0.28);
				tape.body.lineStyle(2, tape.tape.accent || DEFAULT_NEON_ACCENT, borderAlpha);
				tape.body.drawRoundedRect(-tw * 0.5, -th * 0.5, tw, th, 9);
				tape.body.endFill();
				tape.notch.clear();
				tape.notch.beginFill(0x2d3b4a, 0.95);
				tape.notch.drawRoundedRect(-tw * 0.15, -th * 0.5, tw * 0.3, th * 0.14, 4);
				tape.notch.endFill();
				tape.labelStrip.clear();
				tape.labelStrip.beginFill(0x22394b, 0.96);
				tape.labelStrip.lineStyle(1, 0x89d5ff, 0.34);
				tape.labelStrip.drawRoundedRect(-tw * 0.42, -th * 0.06, tw * 0.84, th * 0.38, 4);
				tape.labelStrip.endFill();
				const badgeW = th * 0.44;
				const badgeH = th * 0.44;
				const badgeX = -tw * 0.28;
				const badgeY = -th * 0.02;
				tape.badge.clear();
				tape.badge.beginFill(0x182437, 0.96);
				tape.badge.drawRoundedRect(badgeX - badgeW * 0.5, badgeY - badgeH * 0.5, badgeW, badgeH, 6);
				tape.badge.endFill();
				tape.badge.beginFill(0x35587d, 0.38);
				tape.badge.drawPolygon([
					badgeX - badgeW * 0.44, badgeY - badgeH * 0.4,
					badgeX + badgeW * 0.24, badgeY - badgeH * 0.4,
					badgeX - badgeW * 0.18, badgeY + badgeH * 0.42,
					badgeX - badgeW * 0.44, badgeY + badgeH * 0.42,
				]);
				tape.badge.endFill();
				tape.badge.lineStyle(1.4, tape.tape.accent || DEFAULT_NEON_ACCENT, 0.85);
				tape.badge.drawRoundedRect(badgeX - badgeW * 0.5, badgeY - badgeH * 0.5, badgeW, badgeH, 6);
				tape.badgeSpec.clear();
				tape.badgeSpec.beginFill(0xd8f2ff, 0.18);
				tape.badgeSpec.drawRoundedRect(badgeX - badgeW * 0.32, badgeY - badgeH * 0.34, badgeW * 0.64, badgeH * 0.14, 2);
				tape.badgeSpec.endFill();
				tape.art.position.set(badgeX, badgeY);
				tape.art.width = badgeW * 0.82;
				tape.art.height = badgeH * 0.82;
				tape.art.alpha = 0.78 + focusMix * 0.16;
				tape.screws.clear();
				tape.screws.beginFill(0x7da1bb, 0.92);
				tape.screws.drawCircle(-tw * 0.41, -th * 0.39, 2.1);
				tape.screws.drawCircle(tw * 0.41, -th * 0.39, 2.1);
				tape.screws.drawCircle(-tw * 0.41, th * 0.39, 2.1);
				tape.screws.drawCircle(tw * 0.41, th * 0.39, 2.1);
				tape.screws.endFill();
				tape.shellHighlight.clear();
				tape.shellHighlight.lineStyle(1.5, 0xb5e7ff, 0.65);
				tape.shellHighlight.moveTo(-tw * 0.46, -th * 0.45);
				tape.shellHighlight.lineTo(tw * 0.46, -th * 0.45);
				tape.shellHighlight.moveTo(-tw * 0.46, -th * 0.45);
				tape.shellHighlight.lineTo(-tw * 0.46, th * 0.45);
				tape.shellShadow.clear();
				tape.shellShadow.lineStyle(1.5, 0x081018, 0.75);
				tape.shellShadow.moveTo(-tw * 0.46, th * 0.45);
				tape.shellShadow.lineTo(tw * 0.46, th * 0.45);
				tape.shellShadow.moveTo(tw * 0.46, -th * 0.45);
				tape.shellShadow.lineTo(tw * 0.46, th * 0.45);
				tape.title.position.set(tw * (0.12 - focusMix * 0.06), th * 0.12);
				const compactLabel = tape.tape.label.length > 7 ? `${tape.tape.label.slice(0, 7)}...` : tape.tape.label;
				tape.title.text = focusMix > 0.58 ? compactLabel : tape.tape.label;
				tape.title.alpha = selected ? 1 : (0.94 - focusMix * 0.22);
				tape.title.style.fill = selected ? 0xf0fbff : 0xd0dce8;
				tape.title.style.fontSize = Math.max(10, Math.round(th * (0.28 - focusMix * 0.05)));
				tape.node.alpha = 0.16 + reveal * 0.84;
			}

			refreshPlacard();
		};

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
				markPortalInteraction();
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
		app.view.addEventListener('pointermove', updateMouseFromEvent);
		app.view.addEventListener('pointerdown', updateMouseFromEvent);
		app.view.addEventListener('pointerenter', updateMouseFromEvent);
		window.addEventListener('pointerdown', (e) => {
			if (dragEnabled || livingRoomActive || vineLabActive) return;
			const p = toRendererPoint(e);
			if (!p) return;
			const c = getCoreScreenPos();
			const dx = p.x - c.x;
			const dy = p.y - c.y;
			const d = Math.hypot(dx, dy);
			const coreControlRadius = getCoreControlRadius();
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
			if (dragEnabled || livingRoomActive || vineLabActive || !ringCandidate.active) return;
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
		window.addEventListener('pointerdown', async (e) => {
			mouse.down = true;
			setInGameCursorVisible(true);
			const point = toRendererPoint(e);
			if (soundPanelOpen && point && !isPointInDisplayObject(soundPanel, point) && !isPointInDisplayObject(soundToggle, point)) {
				closeSoundPanel();
			}
			pointerPressedIcon = findHoveredIconBody()?.container || null;
			primeSfxContext();
			primeMusicContext();
			syncMusicTrack();
			try {
				await ensureClickAudio();
				playClickSlice(0.0, 0.5, 0.85);
			} catch (_) {}
		});
		const syncMusicTabFocus = () => {
			const hidden = typeof document !== 'undefined' ? document.hidden : false;
			setMusicPaused(hidden).catch(() => {});
			if (!hidden) syncMusicTrack();
		};
		if (typeof document !== 'undefined') {
			document.addEventListener('visibilitychange', syncMusicTabFocus);
		}
		window.addEventListener('blur', syncMusicTabFocus);
		window.addEventListener('focus', syncMusicTabFocus);
		window.addEventListener('pointerup', async () => {
			mouse.down = false;
			const hoveredIcon = findHoveredIconBody()?.container || null;
			const shouldPlayClick = Boolean(!dragEnabled && pointerPressedIcon && hoveredIcon && pointerPressedIcon === hoveredIcon);
			pointerPressedIcon = null;
			if (shouldPlayClick) {
				playSfxSafe(ICON_SFX.click, {
					volume: 0.62 + Math.random() * 0.16,
					rate: 0.95 + Math.random() * 0.1,
				});
			}
			try {
				await ensureClickAudio();
				playClickSlice(0.5, 1.0, 0.85);
			} catch (_) {}
		});
		window.addEventListener('pointercancel', () => {
			mouse.down = false;
			pointerPressedIcon = null;
		});
		window.addEventListener('blur', () => {
			mouse.down = false;
			pointerPressedIcon = null;
		});
		window.addEventListener('pointerleave', () => { setInGameCursorVisible(false); });
		window.addEventListener('pointerenter', () => { setInGameCursorVisible(true); });

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
			const prevBHover = basketballHover;
			basketballHover += (basketballHoverTarget - basketballHover) * lockEase;
			if (Math.abs(basketballHover - prevBHover) > 0.001) {
				drawBasketballToggle();
			}
			const prevSoundHover = soundHover;
			soundHover += (soundHoverTarget - soundHover) * lockEase;
			if (Math.abs(soundHover - prevSoundHover) > 0.001 || soundNeedsRedraw) {
				drawSoundControl();
			}
			const prevSoundCloseHover = soundCloseHover;
			soundCloseHover += (soundCloseHoverTarget - soundCloseHover) * lockEase;
			if (soundPanelOpen && Math.abs(soundCloseHover - prevSoundCloseHover) > 0.001) {
				drawSoundCloseBtn();
			}
			portfolioEntryTransition.surge = Math.max(0, portfolioEntryTransition.surge - seconds / 0.32);
			let transitionWipePhase = 0;
			let keepLivingRoomJitter = false;
			if (portfolioEntryTransition.active) {
				portfolioEntryTransition.phase += seconds / portfolioEntryTransition.duration;
				const triggerAt = portfolioEntryTransition.direction > 0 ? 0.78 : 0.16;
				if (!portfolioEntryTransition.actionTriggered && portfolioEntryTransition.phase >= triggerAt) {
					portfolioEntryTransition.action?.();
					portfolioEntryTransition.actionTriggered = true;
				}
				transitionWipePhase = Math.max(transitionWipePhase, portfolioEntryTransition.phase);
				if (portfolioEntryTransition.direction > 0 && portfolioEntryTransition.actionTriggered && livingRoomLayer.visible) {
					const jitterScale = Math.max(0, 1 - portfolioEntryTransition.phase);
					livingRoomLayer.position.x = (Math.random() - 0.5) * 6 * jitterScale;
					keepLivingRoomJitter = true;
				}
				if (portfolioEntryTransition.phase >= 1) {
					portfolioEntryTransition.active = false;
					if (!portfolioEntryTransition.actionTriggered) {
						portfolioEntryTransition.action?.();
					}
					portfolioEntryTransition.actionTriggered = false;
					portfolioEntryTransition.action = null;
					if (portfolioEntryTransition.direction > 0) {
						terminalTypingHold = false;
					}
					portfolioEntryTransition.phase = 0;
				}
			}
			if (vineLabTransition.active) {
				vineLabTransition.phase += seconds / vineLabTransition.duration;
				const triggerAt = vineLabTransition.direction > 0 ? 0.56 : 0.22;
				if (!vineLabTransition.actionTriggered && vineLabTransition.phase >= triggerAt) {
					vineLabTransition.action?.();
					vineLabTransition.actionTriggered = true;
				}
				transitionWipePhase = Math.max(transitionWipePhase, vineLabTransition.phase);
				if (vineLabTransition.phase >= 1) {
					vineLabTransition.active = false;
					if (!vineLabTransition.actionTriggered) {
						vineLabTransition.action?.();
					}
					vineLabTransition.actionTriggered = false;
					vineLabTransition.action = null;
					vineLabTransition.phase = 0;
				}
			}
			if (!keepLivingRoomJitter) {
				livingRoomLayer.position.x = 0;
			}
			syncMusicTrack();
			if (transitionWipePhase > 0.001) drawTransitionWipe(transitionWipePhase);
			else if (transitionWipe.visible) drawTransitionWipe(0);
			updateLivingRoomScene(seconds);
			if (vineLabActive) {
				stopSfxLoopSafe(RING_SPIN_LOOP_KEY, { fadeOut: 0.08 });
				scene.visible = false;
				livingRoomLayer.visible = false;
				livingRoomLayer.eventMode = 'none';
				fullscreenTvContentLayer.visible = false;
				setInGameCursorVisible(true);
				cursorContainer.position.set(
					Math.max(0, Math.min(app.renderer.width, mouse.x)),
					Math.max(0, Math.min(app.renderer.height, mouse.y)),
				);
				updateVineLabNow(seconds);
				time += seconds;
				return;
			}
			if (portfolioSnapTimer > 0 && livingRoomActive) {
				portfolioSnapTimer = Math.max(0, portfolioSnapTimer - seconds);
				const t = 1 - (portfolioSnapTimer / 0.16);
				const eased = 1 - Math.pow(1 - Math.max(0, Math.min(1, t)), 3);
				livingRoomLayer.scale.set(0.98 + eased * 0.02);
			} else {
				livingRoomLayer.scale.set(1);
			}
			if (ENABLE_LEFT_PORTAL_SHORTCUT && !livingRoomActive && !vineLabActive) {
				const edgeWidth = Math.max(1, leftPortalWidth * 1.9);
				const edgeFactor = Math.max(0, Math.min(1, 1 - mouse.x / edgeWidth));
				leftPortalProgress += (edgeFactor - leftPortalProgress) * 0.18;
				leftPortalHover += (leftPortalHoverTarget - leftPortalHover) * Math.min(1, seconds * 12);
				const edgePromptTarget = edgeFactor > 0.12 ? Math.min(1, (edgeFactor - 0.12) / 0.52) : 0;
				leftPortalEdgePrompt += (edgePromptTarget - leftPortalEdgePrompt) * Math.min(1, seconds * 9);
				const idleMs = nowMs() - lastPortalInteractionAtMs;
				const hintTarget = (showFirstPortfolioHint && idleMs >= 6000 && !portfolioEntryTransition.active) ? 1 : 0;
				leftPortalHintPrompt += (hintTarget - leftPortalHintPrompt) * Math.min(1, seconds * 4.5);
				const labelStrength = Math.max(leftPortalHover, leftPortalEdgePrompt);
				leftPortal.position.x = leftPortalHiddenX + (leftPortalShownX - leftPortalHiddenX) * leftPortalProgress;
				leftPortal.position.y = leftPortalY;
					leftGlowSoft.alpha = 0.08 + 0.18 * leftPortalProgress;
					leftGlow.alpha = 0.14 + 0.32 * leftPortalProgress;
					leftArrow.alpha = 0.22 + 0.74 * leftPortalProgress;
					const scale = 0.8 + 0.28 * leftPortalProgress;
				leftArrow.scale.set(scale);
				leftPortalLabel.text = leftPortalHover > 0.28 ? 'PORTFOLIO ->' : '<- PORTFOLIO';
				leftPortalLabel.alpha = labelStrength * (0.25 + leftPortalProgress * 0.75);
				leftPortalHint.alpha = leftPortalHintPrompt * (0.3 + leftPortalProgress * 0.7);
				leftPortal.visible = true;
			} else {
				leftPortalProgress += (0 - leftPortalProgress) * 0.2;
				leftPortalHover += (0 - leftPortalHover) * Math.min(1, seconds * 9);
				leftPortalEdgePrompt += (0 - leftPortalEdgePrompt) * Math.min(1, seconds * 8);
				leftPortalHintPrompt += (0 - leftPortalHintPrompt) * Math.min(1, seconds * 6);
				leftPortal.position.x = leftPortalHiddenX;
				leftPortal.position.y = leftPortalY;
				leftGlowSoft.alpha = 0;
				leftGlow.alpha = 0;
				leftArrow.alpha = 0;
				leftPortalLabel.alpha = 0;
				leftPortalHint.alpha = 0;
				leftPortal.visible = false;
			}
			time += seconds;
			const tickNow = nowMs();
			if (!dragEnabled && !moodHoverEnabled && moodHoverResumeAtMs > 0 && tickNow >= moodHoverResumeAtMs) {
				moodHoverEnabled = true;
				moodHoverResumeAtMs = 0;
				moodLockTarget = null;
				resolveActiveMood();
			}
			flushPendingMoodSources(tickNow);
			const moodLerp = 1 - Math.exp(-seconds / MOOD_TRANSITION_SECONDS);
			moodCurrent.waveTint = mixColors(moodCurrent.waveTint, moodTarget.waveTint, moodLerp);
			moodCurrent.lampTint = mixColors(moodCurrent.lampTint, moodTarget.lampTint, moodLerp);
			moodCurrent.particleColor = mixColors(moodCurrent.particleColor, moodTarget.particleColor, moodLerp);
			moodCurrent.waveMix += (moodTarget.waveMix - moodCurrent.waveMix) * moodLerp;
			moodCurrent.glowStrength += (moodTarget.glowStrength - moodCurrent.glowStrength) * moodLerp;
			moodCurrent.contrast += (moodTarget.contrast - moodCurrent.contrast) * moodLerp;
			moodCurrent.vignette += (moodTarget.vignette - moodCurrent.vignette) * moodLerp;
			moodCurrent.waveMotion += (moodTarget.waveMotion - moodCurrent.waveMotion) * moodLerp;
			moodCurrent.lampBoost += (moodTarget.lampBoost - moodCurrent.lampBoost) * moodLerp;
			updateTargetReactiveBackgroundMode(seconds);
			const transitionSurge = portfolioEntryTransition.surge;
			const targetMixRaw = clamp01(targetBackgroundState.mix);
			const targetMix = targetMixRaw * targetMixRaw * (3 - 2 * targetMixRaw);
			const targetPulse = (Math.sin(time * 4.3) * 0.5 + 0.5) * targetMix;
			const targetEnergy = clamp01(targetBackgroundState.flowEnergy);
			const targetLiquidLineColor = mixColors(0x42b8ff, 0x89ffe3, clamp01(0.25 + targetEnergy * 0.65));
			const targetLiquidGlowColor = mixColors(0x6ad8ff, 0xa5fff0, clamp01(0.3 + targetEnergy * 0.62));
			const targetLiquidMistB = mixColors(0x10293f, 0x114156, clamp01(0.38 + targetEnergy * 0.42));
			const targetLiquidMistC = mixColors(0x163045, 0x255d74, clamp01(0.3 + targetEnergy * 0.44));
			const blendedLineColor = mixColors(FLOW_BASE.lineColor, moodCurrent.waveTint, clamp01(moodCurrent.waveMix));
			const blendedGlowColor = mixColors(FLOW_BASE.glowColor, moodCurrent.waveTint, clamp01(moodCurrent.waveMix + 0.1));
			const blendedMistB = mixColors(FLOW_BASE.mistColorB, moodCurrent.waveTint, clamp01(moodCurrent.waveMix * 0.38));
			const blendedMistC = mixColors(FLOW_BASE.mistColorC, moodCurrent.particleColor, 0.5);
			const surgedLineColor = mixColors(blendedLineColor, 0xff5fa8, transitionSurge * 0.24);
			const surgedGlowColor = mixColors(blendedGlowColor, 0xff7fa8, transitionSurge * 0.3);
			const targetLineColor = mixColors(surgedLineColor, targetLiquidLineColor, targetMix * (0.56 + targetPulse * 0.18));
			const targetGlowColor = mixColors(surgedGlowColor, targetLiquidGlowColor, targetMix * (0.6 + targetPulse * 0.22));
			const targetMistB = mixColors(blendedMistB, targetLiquidMistB, targetMix * 0.5);
			const targetMistC = mixColors(blendedMistC, targetLiquidMistC, targetMix * 0.56);
			const targetBoost = targetMix * (0.2 + targetEnergy * 0.72 + targetPulse * 0.18);
			flowAmbienceFrameCounter = (flowAmbienceFrameCounter + 1) % Math.max(1, backgroundSceneQuality.ambienceUpdateStep);
			if (flowAmbienceFrameCounter === 0) {
				setFlowAmbience?.({
					lineColor: targetLineColor,
					glowColor: targetGlowColor,
					mistColorA: FLOW_BASE.mistColorA,
					mistColorB: targetMistB,
					mistColorC: targetMistC,
					sparkStrength: FLOW_BASE.sparkStrength
						+ moodCurrent.glowStrength * 0.1
						+ transitionSurge * 0.08
						+ targetBoost * 0.11,
					glowStrength: FLOW_BASE.glowStrength
						+ moodCurrent.glowStrength * 0.32
						+ transitionSurge * 0.42
						+ targetBoost * 0.58,
					speed: FLOW_BASE.speed * (1
						+ (moodCurrent.waveMotion - 1) * 0.9
						+ transitionSurge * 0.25
						+ targetMix * 0.22
						+ targetEnergy * 0.11),
					density: FLOW_BASE.density * (1
						+ (moodCurrent.waveMotion - 1) * 0.45
						+ transitionSurge * 0.14
						+ targetMix * 0.14
						+ targetEnergy * 0.07),
					glowAlpha: clamp01(FLOW_BASE.glowAlpha
						+ moodCurrent.glowStrength * 0.16
						+ transitionSurge * 0.2
						+ targetBoost * 0.22),
				});
			}
			crtScanlinesUniforms.u_strength = (0.42 + moodCurrent.contrast * 0.45) * backgroundSceneQuality.scanlineStrengthScale;
			crtScanlinesUniforms.u_noise = (0.03 + moodCurrent.glowStrength * 0.01) * backgroundSceneQuality.scanlineNoiseScale;
			window.moodCurrent = {
				key: activeMoodEntry?.key || 'default',
				locked: Boolean(moodLockTarget),
				targetBackgroundMode: targetBackgroundState.mode,
				targetBackgroundMix: targetMixRaw,
				...moodCurrent,
			};
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
			const spinLoopMix = !dragEnabled
				? Math.max(ringDrag.active ? 0.35 : 0, clamp01(Math.abs(ringSpinVel) / Math.max(0.001, RING_MAX_SPIN_VEL)))
				: 0;
			if (spinLoopMix > 0.06) {
				startSfxLoopSafe(ICON_SFX.spin, RING_SPIN_LOOP_KEY, {
					volume: 0.05 + spinLoopMix * 0.26,
					rate: 0.88 + spinLoopMix * 0.36,
					fadeIn: 0.04,
				});
				updateSfxLoopSafe(RING_SPIN_LOOP_KEY, {
					volume: 0.05 + spinLoopMix * 0.26,
					rate: 0.88 + spinLoopMix * 0.36,
				});
			} else {
				stopSfxLoopSafe(RING_SPIN_LOOP_KEY, { fadeOut: 0.12 });
			}
			if (!dragEnabled && (iconIntroProgress < 1 || ringDrag.active || Math.abs(ringSpinVel) > 0)) {
				appLauncher.layout();
				layoutBlogIcon();
				layoutLinkedinIcon();
				layoutReflexIcon();
				layoutWalklatroIcon();
			}
			const coreScreen = getCoreScreenPos();
			const coreDist = Math.hypot(mouse.x - coreScreen.x, mouse.y - coreScreen.y);
			const hoverTarget = (!dragEnabled && coreDist <= getCoreControlRadius()) || ringDrag.active ? 1 : 0;
			coreHoverAmount += (hoverTarget - coreHoverAmount) * Math.min(1, seconds * 12);
			drawSystemCore(time);
			const mx = (mouse.x / app.renderer.width) * 2 - 1;
			const my = (mouse.y / app.renderer.height) * 2 - 1;
			ambientDebrisFrameCounter = (ambientDebrisFrameCounter + 1) % Math.max(1, backgroundSceneQuality.ambientDebrisUpdateStep);
			if (ambientDebrisFrameCounter === 0) {
				for (const d of ambientDebris) {
					if (!d?.panel || !d.panel.visible) continue;
					if (!Number.isFinite(d.baseX) || !Number.isFinite(d.baseY)) continue;
					d.panel.position.x = d.baseX + Math.sin(time * 0.34 + d.phase) * d.driftX - mx * d.parallax;
					d.panel.position.y = d.baseY + Math.cos(time * 0.29 + d.phase * 1.2) * d.driftY - my * (d.parallax * 0.7);
					d.panel.rotation = Math.sin(time * 0.18 + d.phase) * d.spin;
					d.panel.alpha = d.alphaBase + 0.1 * Math.sin(time * 0.42 + d.phase);
				}
			}
			scene.alpha = 1;
			const nx = (mouse.x / app.renderer.width) * 2 - 1;
			const ny = (mouse.y / app.renderer.height) * 2 - 1;
			const targetX = -nx * cameraParallax;
			const targetY = -ny * cameraParallax;
			cameraOffset.x += (targetX - cameraOffset.x) * CAMERA_SMOOTHING;
			cameraOffset.y += (targetY - cameraOffset.y) * CAMERA_SMOOTHING;
				updateFlowBackground(time, cameraOffset);
			const cx = app.renderer.width / 2;
			const cy = app.renderer.height / 2;
			const screenX = Math.max(0, Math.min(app.renderer.width, mouse.x));
			const screenY = Math.max(0, Math.min(app.renderer.height, mouse.y));
			const mouseWorldX = (screenX - cx - cameraOffset.x) / SCENE_SCALE + cx;
			const mouseWorldY = (screenY - cy - cameraOffset.y) / SCENE_SCALE + cy;
			cursorContainer.position.set(screenX, screenY);
			scene.position.set(
				app.renderer.width / 2 + cameraOffset.x,
				app.renderer.height / 2 + cameraOffset.y,
			);
			const mouseWorld = { x: mouseWorldX, y: mouseWorldY, down: mouse.down };
			lastMouseWorld = mouseWorld;
			appLauncher.update(time, seconds, mouseWorld);
			updateIconSfxMonitor();
			if (basketballMode && dragEnabled) {
				targetBackgroundInfluencerCount = 0;
				arcadeLayer.visible = true;
				arcadeSweepControl.visible = true;
				arcadeSweepControl.eventMode = 'static';
				const toWorldFromScreen = (sx, sy) => ({
					x: (sx - cx - cameraOffset.x) / SCENE_SCALE + cx,
					y: (sy - cy - cameraOffset.y) / SCENE_SCALE + cy,
				});
				const toWorldSizeWithCamera = (s) => s / SCENE_SCALE;
				const dividerY = getArcadeDividerScreenY();
				const cursorIsAbove = mouse.y <= dividerY;
				if (!arcadeFeedback.cursorWasBlocked && cursorIsAbove) {
					arcadeFeedback.combo = 0;
					updateArcadeScoreLabel();
					triggerArcadePopup('TOP SIDE BLOCKED', 1.02, 0xff5f88);
				} else if (arcadeFeedback.cursorWasBlocked && !cursorIsAbove) {
					triggerArcadePopup('BOTTOM SIDE ACTIVE', 0.92, 0x8fffb9);
				}
				arcadeFeedback.cursorWasBlocked = cursorIsAbove;
				arcadeFeedback.noGoVoided = cursorIsAbove;
				const dividerNear = Math.max(0, Math.min(1, 1 - Math.abs(mouse.y - dividerY) / 130));
				const dividerLeft = app.renderer.width * 0.04;
				const dividerRight = app.renderer.width * 0.96;
				const dividerCenter = toWorldFromScreen(app.renderer.width * 0.5, dividerY);
				const dividerWidth = toWorldSizeWithCamera(dividerRight - dividerLeft);
				const dividerHeight = toWorldSizeWithCamera(15);
				arcadeState.dividerWorldX = dividerCenter.x;
				arcadeState.dividerWorldY = dividerCenter.y;

				arcadeDividerGlow.clear();
				arcadeDividerGlow.beginFill(arcadeFeedback.noGoVoided ? 0xff5f88 : 0x7fd8ff, dividerNear * (arcadeFeedback.noGoVoided ? 0.62 : 0.48));
				arcadeDividerGlow.drawRoundedRect(
					dividerCenter.x - dividerWidth * 0.5,
					dividerCenter.y - dividerHeight * 0.5,
					dividerWidth,
					dividerHeight,
					dividerHeight * 0.6,
				);
				arcadeDividerGlow.endFill();

				arcadeSweepHover += (arcadeSweepHoverTarget - arcadeSweepHover) * Math.min(1, seconds * 14);
				const sweepAnchorX = app.renderer.width * 0.94;
				const sweepAnchorY = Math.max(28, dividerY - 24);
				const sweepNear = Math.max(0, Math.min(1, 1 - Math.hypot(mouse.x - sweepAnchorX, mouse.y - sweepAnchorY) / 170));
				const sweepBoost = Math.max(arcadeSweepHover, sweepNear * 0.75);
				const sweepPos = toWorldFromScreen(sweepAnchorX, sweepAnchorY);
				const sweepW = toWorldSizeWithCamera(24);
				const sweepH = toWorldSizeWithCamera(16);
				const sway = Math.sin(time * 4.2) * toWorldSizeWithCamera(2.4) * (0.35 + sweepBoost);
				const p0x = sweepPos.x - sweepW * 0.72 + sway;
				const p0y = sweepPos.y - sweepH * 0.55;
				const p1x = sweepPos.x + sweepW * 0.72 + sway;
				const p1y = sweepPos.y - sweepH * 0.55;
				const p2x = sweepPos.x + sway;
				const p2y = sweepPos.y + sweepH * 0.8;
				arcadeSweepControl.clear();
				arcadeSweepControl.beginFill(0x8fdcff, 0.14 + sweepBoost * 0.24);
				arcadeSweepControl.drawPolygon([p0x, p0y, p1x, p1y, p2x, p2y]);
				arcadeSweepControl.endFill();
				arcadeSweepControl.lineStyle(1.5, 0xd8f5ff, 0.45 + sweepBoost * 0.45);
				arcadeSweepControl.drawPolygon([p0x, p0y, p1x, p1y, p2x, p2y]);
				arcadeSweepControl.hitArea = new PIXI.Polygon([p0x, p0y, p1x, p1y, p2x, p2y]);
				updateArcadeCountdown(seconds);
				const countdownActive = arcadeCountdown.active;
				if (countdownActive) {
					const tStep = Math.max(0, Math.min(1, arcadeCountdown.stepElapsed / arcadeCountdown.stepDuration));
					const popT = Math.max(0, Math.min(1, tStep / 0.26));
					const popEase = 1 - Math.pow(1 - popT, 3);
					const stepScale = 1 + (1 - popEase) * 0.58;
					const fadeIn = Math.max(0, Math.min(1, tStep / 0.08));
					const fadeOut = tStep > 0.58 ? Math.max(0, 1 - (tStep - 0.58) / 0.42) : 1;
					const alpha = Math.max(0, Math.min(1, fadeIn * fadeOut));
					const center = toWorldFromScreen(app.renderer.width * 0.5, app.renderer.height * 0.5);
					arcadeCountdownText.visible = true;
					arcadeCountdownText.position.set(center.x, center.y);
					arcadeCountdownText.scale.set(stepScale);
					arcadeCountdownText.alpha = 0.15 + alpha * 0.85;
				} else if (arcadeCountdownText.visible) {
					arcadeCountdownText.visible = false;
				}

				arcadeTargetLayer.clear();
				for (const target of arcadeTargets) {
					const type = arcadeTargetTypes[target.typeIndex] ?? arcadeTargetTypes[0];
					if (!target.alive) {
						target.respawnTimer -= seconds;
						if (target.respawnTimer <= 0) {
							respawnArcadeTarget(target);
						}
						continue;
					}
					target.phase += seconds * target.phaseVel;
					const wobbleX = Math.cos(target.phase * 0.64 + target.id) * type.radiusPx * 0.13;
					const wobbleY = Math.sin(target.phase) * type.radiusPx * 0.16;
					target.drawScreenX = target.screenX + wobbleX;
					target.drawScreenY = target.screenY + wobbleY;
					const center = toWorldFromScreen(target.drawScreenX, target.drawScreenY);
					const radius = toWorldSizeWithCamera(type.radiusPx);
					arcadeTargetLayer.beginFill(type.coreColor, 0.9);
					arcadeTargetLayer.drawCircle(center.x, center.y, radius);
					arcadeTargetLayer.endFill();
					arcadeTargetLayer.lineStyle(toWorldSizeWithCamera(2.6), type.ringColor, 0.95);
					arcadeTargetLayer.drawCircle(center.x, center.y, radius * 0.98);
					arcadeTargetLayer.lineStyle(toWorldSizeWithCamera(2.1), 0xffffff, 0.58);
					arcadeTargetLayer.drawCircle(center.x, center.y, radius * 0.63);
					arcadeTargetLayer.lineStyle(toWorldSizeWithCamera(1.65), type.ringColor, 0.84);
					arcadeTargetLayer.drawCircle(center.x, center.y, radius * 0.34);
					if (targetBackgroundInfluencerCount < targetBackgroundInfluencers.length) {
						const influencer = targetBackgroundInfluencers[targetBackgroundInfluencerCount];
						influencer.screenX = target.drawScreenX;
						influencer.screenY = target.drawScreenY;
						influencer.strength = Math.max(0.2, Math.min(1, type.points / 5));
						influencer.tint = type.ringColor;
						targetBackgroundInfluencerCount += 1;
					}
				}

				arcadeHintText.text = countdownActive
					? 'TARGET TEST STARTING...'
					: (arcadeFeedback.noGoVoided
					? 'TOP SIDE BLOCKED: CURSOR BELOW TO SCORE'
					: 'THROW MODE: HIT TARGETS (1 / 3 / 5)');
				arcadeHintText.position.set(toWorldFromScreen(24, 18).x, toWorldFromScreen(24, 18).y);
				const scorePulse = 1 + Math.min(0.24, arcadeFeedback.combo * 0.035) + Math.sin(time * 5.2) * 0.02;
				const scorePos = toWorldFromScreen(app.renderer.width * 0.5, app.renderer.height - 58);
				arcadeScoreText.position.set(scorePos.x, scorePos.y);
				arcadeScoreText.scale.set(scorePulse);
				arcadeScoreText.tint = arcadeFeedback.noGoVoided ? 0xff8fab : 0xffffff;

				const bodies = getAllIconBodies();
				for (const body of bodies) {
					const key = body.container;
					let st = iconScoreState.get(key);
					if (!st) {
						st = { cooldown: 0 };
						iconScoreState.set(key, st);
					}
					st.cooldown = Math.max(0, st.cooldown - seconds);

					const c = body.container;
					const bodyState = body.state;
					if (!c || !bodyState) continue;

					if (countdownActive || arcadeFeedback.noGoVoided || st.cooldown > 0) continue;
					const bodyRadius = (bodyState.radiusScaled ?? bodyState.radius ?? (24 / SCENE_SCALE)) * (c.scale?.x || 1);
					const speed = Math.hypot(bodyState.vx ?? 0, bodyState.vy ?? 0);
					if (speed < 56 / SCENE_SCALE) continue;

					for (const target of arcadeTargets) {
						if (!target.alive) continue;
						const type = arcadeTargetTypes[target.typeIndex] ?? arcadeTargetTypes[0];
						const targetPos = toWorldFromScreen(target.drawScreenX, target.drawScreenY);
						const targetRadius = toWorldSizeWithCamera(type.radiusPx * 0.82);
						const dx = c.position.x - targetPos.x;
						const dy = c.position.y - targetPos.y;
						if (dx * dx + dy * dy > (bodyRadius + targetRadius) * (bodyRadius + targetRadius)) continue;

						basketballScore += type.points;
						playSfxSafe(ICON_SFX.breakTarget, {
							volume: 0.62 + Math.random() * 0.16,
							rate: 0.96 + Math.random() * 0.09,
						});
						if (type.points >= 5) {
							playSfxSafe(ICON_SFX.breakTarget, {
								volume: 0.24,
								rate: 1.5 + Math.random() * 0.08,
								offset: 0.012,
							});
						}
						const chainWindow = 2.2;
						if (time - arcadeFeedback.lastScoreTime <= chainWindow) arcadeFeedback.combo += 1;
						else arcadeFeedback.combo = 1;
						arcadeFeedback.lastScoreTime = time;
						updateArcadeScoreLabel();
						const phrase = type.points >= 5
							? 'Bullseye!'
							: (arcadeFeedback.combo <= 1
								? 'Nice throw!'
								: (arcadeFeedback.combo === 2 ? 'Great toss!' : (arcadeFeedback.combo === 3 ? 'Long throw!' : 'Heat check!')));
						const popupMsg = arcadeFeedback.combo > 1
							? `${phrase}  x${arcadeFeedback.combo}`
							: `${phrase} +${type.points}`;
						const popupScale = 1.0 + Math.min(0.7, arcadeFeedback.combo * 0.1);
						triggerArcadePopup(popupMsg, popupScale);
						spawnTargetBackgroundRipple(
							target.drawScreenX,
							target.drawScreenY,
							Math.min(1, 0.4 + type.points * 0.12 + arcadeFeedback.combo * 0.04),
							type.ringColor,
						);
						spawnArcadeShards(target.drawScreenX, target.drawScreenY, type.shardColor, type.radiusPx);
						target.alive = false;
						target.respawnTimer = arcadeRand(type.respawnMin, type.respawnMax);
						st.cooldown = 0.28;
						break;
					}
				}

				arcadeShardLayer.clear();
				const shardFloorY = app.renderer.height - 16;
				for (let i = arcadeShards.length - 1; i >= 0; i--) {
					const shard = arcadeShards[i];
					shard.age += seconds;
					if (shard.age >= shard.life) {
						arcadeShards.splice(i, 1);
						continue;
					}
					shard.vy += 1180 * seconds;
					shard.x += shard.vx * seconds;
					shard.y += shard.vy * seconds;
					shard.rot += shard.rotV * seconds;
					if (shard.y >= shardFloorY && shard.bounces < 1) {
						shard.y = shardFloorY;
						shard.vy *= -0.36;
						shard.vx *= 0.82;
						shard.bounces += 1;
					}
					if (shard.y > app.renderer.height + 80) {
						arcadeShards.splice(i, 1);
						continue;
					}
					const lifeT = 1 - shard.age / shard.life;
					const alpha = Math.max(0, Math.min(1, lifeT * 0.94));
					if (alpha <= 0.01) continue;
					const p = toWorldFromScreen(shard.x, shard.y);
					const halfW = toWorldSizeWithCamera(shard.size * (0.46 + lifeT * 0.35));
					const halfH = toWorldSizeWithCamera(shard.size * (0.25 + lifeT * 0.22));
					const cR = Math.cos(shard.rot);
					const sR = Math.sin(shard.rot);
					const ax = p.x + (-halfW) * cR - (-halfH) * sR;
					const ay = p.y + (-halfW) * sR + (-halfH) * cR;
					const bx = p.x + halfW * cR - 0 * sR;
					const by = p.y + halfW * sR + 0 * cR;
					const cx = p.x + (-halfW) * cR - halfH * sR;
					const cy = p.y + (-halfW) * sR + halfH * cR;
					arcadeShardLayer.beginFill(shard.tint, alpha);
					arcadeShardLayer.drawPolygon([ax, ay, bx, by, cx, cy]);
					arcadeShardLayer.endFill();
				}

				if (arcadeFeedback.combo > 0 && time - arcadeFeedback.lastScoreTime > 2.5) {
					arcadeFeedback.combo = 0;
					updateArcadeScoreLabel();
				}

				if (arcadeFeedback.popupTimer < arcadeFeedback.popupDuration) {
					arcadeFeedback.popupTimer += seconds;
					const tPopup = Math.max(0, Math.min(1, arcadeFeedback.popupTimer / arcadeFeedback.popupDuration));
					const out = 1 - tPopup;
					const shake = toWorldSizeWithCamera((3 + Math.min(10, arcadeFeedback.combo * 1.2)) * out);
					const shakeX = Math.sin(time * 54) * shake;
					const shakeY = Math.cos(time * 47) * shake * 0.5;
					arcadePopupText.visible = true;
					arcadePopupText.alpha = 0.22 + out * 0.78;
					arcadePopupText.scale.set(arcadeFeedback.popupBaseScale * (1 + out * 0.14));
					const popupBase = toWorldFromScreen(app.renderer.width * 0.5, app.renderer.height * 0.74);
					arcadePopupText.position.set(popupBase.x + shakeX, popupBase.y + shakeY);
				} else {
					arcadePopupText.visible = false;
				}
			} else {
				targetBackgroundInfluencerCount = 0;
				stopArcadeCountdown();
				arcadeLayer.visible = false;
				arcadePopupText.visible = false;
				arcadeCountdownText.visible = false;
				arcadeTargetLayer.clear();
				arcadeShardLayer.clear();
				arcadeSweepControl.eventMode = 'none';
				arcadeSweepControl.visible = false;
				arcadeSweepHoverTarget = 0;
				arcadeSweepHover = 0;
			}
			renderTargetReactiveBackground(seconds);
			const lampBoostByIndex = new Array(vines.length).fill(0);
			if (activeMoodEntry?.container) {
				const hoverX = activeMoodEntry.container.position.x;
				const hoverY = activeMoodEntry.container.position.y;
				const rankedLamps = [];
				for (let i = 0; i < vines.length; i++) {
					const p = vines[i]?.getLampPosition?.();
					if (!p) continue;
					const dx = p.x - hoverX;
					const dy = p.y - hoverY;
					rankedLamps.push({ i, d2: dx * dx + dy * dy });
				}
				rankedLamps.sort((a, b) => a.d2 - b.d2);
				for (let i = 0; i < Math.min(3, rankedLamps.length); i++) {
					lampBoostByIndex[rankedLamps[i].i] = 1 - i * 0.28;
				}
			}
			for (let i = 0; i < vines.length; i++) {
				const vine = vines[i];
				const lampPos = vine.getLampPosition();
				const surgeLeftInfluence = transitionSurge > 0
					? clamp01(1 - lampPos.x / Math.max(1, screenToWorldX(app.renderer.width * 0.34)))
					: 0;
				const localBoost = lampBoostByIndex[i] * (0.58 + moodCurrent.lampBoost * 1.25)
					+ surgeLeftInfluence * transitionSurge * 0.95;
				const vineHue = mixColors(theme.vines.hue, moodCurrent.lampTint, clamp01(0.12 + moodCurrent.waveMix * 0.45));
				vine.setColor(vineHue);
				if (vine?.lamp?.enabled) {
					const lampTintMix = clamp01(0.22 + moodCurrent.glowStrength * 0.26 + localBoost * 0.36 + transitionSurge * 0.22);
					vine.lamp.color = mixColors(LAMP_BASE.color, moodCurrent.lampTint, lampTintMix);
					vine.lamp.glowColor = mixColors(LAMP_BASE.glowColor, moodCurrent.lampTint, clamp01(lampTintMix + 0.08));
					vine.lamp.glowAlpha = clamp01(0.2 + moodCurrent.glowStrength * 0.12 + localBoost * 0.13);
					vine.lamp.coreAlpha = clamp01(0.82 + localBoost * 0.12);
				}
				vine.update(time, mouseWorld, seconds);
			}
			if (ENABLE_VINE_LAMP_LIGHTING && ENABLE_VINE_LAMPS) {
				for (let i = 0; i < vines.length; i++) {
					const v = vines[i];
					const s = vineLightSprites[i];
					if (!s || !v?.lamp?.enabled) continue;
					const p = v.getLampPosition();
					const surgeLeftInfluence = transitionSurge > 0
						? clamp01(1 - p.x / Math.max(1, screenToWorldX(app.renderer.width * 0.34)))
						: 0;
					const localBoost = lampBoostByIndex[i] * (0.55 + moodCurrent.lampBoost * 1.25)
						+ surgeLeftInfluence * transitionSurge * 0.95;
					const pulse = 0.42 + 0.1 * Math.sin(time * 2.0 + i * 0.5);
					s.position.set(p.x, p.y);
					s.tint = mixColors(LAMP_BASE.glowColor, moodCurrent.lampTint, clamp01(0.24 + moodCurrent.glowStrength * 0.34 + localBoost * 0.42));
					s.alpha = clamp01(0.16 + pulse * 0.22 + moodCurrent.glowStrength * 0.08 + localBoost * 0.18);
					const baseScale = lampLightRadius / (lampLightTexture.width * 0.5);
					s.scale.set(baseScale * (1 + localBoost * 0.1));
				}
			}

			if (ENABLE_PLAYER_CUBE && player) {
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
			}
			if (circle) circle.rotation += 0.02;
		});

		window.setTimeout(() => {
			backgroundQualityManager.startRuntimeMonitoring(app.ticker, {
				warmupSeconds: 2.5,
				sampleWindowSeconds: 3.2,
				minimumSamples: 90,
				poorAverageFps: 47,
				poorP95FrameMs: 33,
				requireBothPoorSignals: true,
			}).then((result) => {
				if (!result) return;
				console.info('[Background quality probe]', result);
			});
		}, 2500);

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
			layoutLivingRoom({ instantTerminal: true });
			scene.filterArea = new PIXI.Rectangle(0, 0, app.renderer.width, app.renderer.height);
			if (portfolioEntryTransition.active || vineLabTransition.active) {
				drawTransitionWipe(Math.max(portfolioEntryTransition.phase, vineLabTransition.phase));
			}
			else drawTransitionWipe(0);
			resizeFlowBackground();
			placeAmbientDebris();
			drawSystemCore(time);
			

			// Rebuild vines layout for new width/height
			world.removeChild(vinesLayer);
			const rebuilt = createVines(app, 0, 28, vineOptions);
			world.addChild(rebuilt.container);
			vinesLayer = rebuilt.container;
			vines.length = 0; // mutate array in-place to keep reference
			for (const v of rebuilt.vines) vines.push(v);
			rebuildVineLights();
			if (ENABLE_PLAYER_CUBE) player.onResize();
			resizeVineLabNow();

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