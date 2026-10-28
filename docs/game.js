import { Player } from './core/player.js';
import { createVines } from './core/vines.js';
import { createBlogIcon } from './ui/blogIcon.js';
import { createLinkedinIcon } from './ui/linkedinIcon.js';
import { createReflexIcon } from './reflex/reflexIcon.js';
import { createWalklatroIcon } from './walklatro/walklatroIcon.js';
import { createCrimsonFlowBackground } from './rendering/background.js?v=7';
import { BACKGROUND_QUALITY_MODE, createBackgroundQualityManager } from './config/backgroundQuality.js?v=4';
import {
	createCRTFisheyeFilter,
	updateCRTFisheyeFilter,
	createCRTScanlinesFilter,
	updateCRTScanlinesFilter,
} from './rendering/shaders.js';
import { createPixelateFilter } from './rendering/pixelate.js';
import { createAppLauncher } from './ui/appLauncher.js';
import { createSoundPanelUI } from './ui/soundPanel.js';
import { createArcadeModeToggles } from './ui/arcadeModeToggles.js?v=102';
import { createArcadeSweepControl } from './ui/arcadeSweepControl.js';
import { createArcadeCountdownUi } from './ui/arcadeCountdownUi.js';
import { createArcadePopupUi } from './ui/arcadePopupUi.js';
import { createArcadeOverlayUi } from './ui/arcadeOverlayUi.js';
import { createVineLab } from './core/vineLab.js';
import { createMoodRuntime } from './core/moodRuntime.js';
import { createIconSfxMonitor } from './core/iconSfxMonitor.js';
import { createArcadeTargetsRuntime } from './core/arcadeTargetsRuntime.js';
import { createTargetReactiveBackgroundRuntime } from './core/targetReactiveBackground.js';
import { createPortfolioTransitionController } from './core/portfolioTransitionController.js';
import { createLivingRoomMediaUiController } from './core/livingRoomMediaUiController.js';
import { createLivingRoomMediaPopoutController } from './core/livingRoomMediaPopoutController.js';
import { createLivingRoomLayoutController } from './core/livingRoomLayoutController.js';
import { rebuildLivingRoomTerminalPanelView } from './core/livingRoomTerminalPanelBuilder.js';
import { createLivingRoomAmbientController } from './core/livingRoomAmbientRuntime.js';
import { createLivingRoomTapeDisplayController } from './core/livingRoomTapeDisplayRuntime.js';
import { createLivingRoomDisplayEffectsController } from './core/livingRoomDisplayEffectsRuntime.js';
import { createLivingRoomSceneRuntime } from './core/livingRoomSceneRuntime.js';
import { bindLivingRoomInteractionBindings } from './core/livingRoomInteractionBindings.js';
import { createLivingRoomTerminalTypingController } from './core/livingRoomTerminalTypingController.js';
import { createLivingRoomTapeNode } from './core/livingRoomTapeNodeFactory.js';
import { redrawLivingRoomDotsView, rebuildLivingRoomDotsView } from './core/livingRoomDotNavigation.js';
import { createLivingRoomFlowController } from './core/livingRoomFlowController.js';
import { setupInputAudioBindings } from './core/inputAudioBindings.js';
import { stepLauncherArcadeFrame, stepMoodReactiveBackgroundFrame } from './core/mainTickerRuntime.js';
import { drawSystemCoreClock } from './core/systemCoreRenderer.js';
import { drawLockControlVisual } from './core/lockControlRenderer.js';
import { applyDragEnabledMode } from './core/dragModeController.js';
import { layoutLeftPortalUi } from './core/leftPortalLayout.js';
import { createTennisModeController } from './core/tennisModeController.js';
import { TENNIS_PHASE, TENNIS_WIN_SCORE, createInitialTennisState, createTennisModeOrchestrator } from './core/tennisModeOrchestrator.js?v=102';
import { updateTennisModeFrame } from './core/tennisModeRuntime.js';
import { THEMES, loadThemeKey, saveThemeKey } from './config/themeManager.js';
import { createLauncherItems } from './config/launcherItems.js';
import { createAudioController } from './audio/gameAudioController.js';
import {
	PORTFOLIO_MEDIA_IMAGE,
	PORTFOLIO_MEDIA_GIF,
	PORTFOLIO_MEDIA_VIDEO,
	PORTFOLIO_HIGHLIGHT_ACCENT,
	PORTFOLIO_HIGHLIGHT_RAINBOW,
	PORTFOLIO_EMPTY_SLIDE,
	PORTFOLIO_PROJECTS,
	portfolioProjectsById,
	VHS_TAPE_LIBRARY,
} from './config/portfolioData.js';
import { createLivingRoomAmbientBlobConfigs } from './config/livingRoomAmbientConfig.js';
import {
	DEFAULT_TERMINAL_TEXT,
	TERMINAL_RAINBOW_FILL,
	createStaticTerminalKeywords,
} from './config/livingRoomTerminalConfig.js';
import { createAmbientBlobTexture } from './rendering/livingRoomAmbientBlob.js';
import {
	BASE_MOOD,
	DRAG_MOOD,
	MOOD_MAP,
	MOOD_TRANSITION_SECONDS,
	HOVER_MOOD_DEBOUNCE_MS,
	MOOD_REENABLE_DELAY_MS,
	getMoodProfile,
} from './config/moodConfig.js';

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
			const nowMs = () => (typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now());
			const {
				state: moodState,
				resolveActiveMood,
				setMoodHover,
				flushPendingMoodSources,
				clearMoodSources,
			} = createMoodRuntime({
				baseMood: BASE_MOOD,
				moodMap: MOOD_MAP,
				getMoodProfile,
				hoverMoodDebounceMs: HOVER_MOOD_DEBOUNCE_MS,
				nowMs,
			});
			const moodCurrent = moodState.moodCurrent;
			const {
				ICON_SFX,
				RING_SPIN_LOOP_KEY,
				getMusicUiVolume,
				getSfxUiVolume,
				primeSfxContext,
				primeMusicContext,
				syncMusicTrack,
				setMusicPausedSafe,
				applyMusicUiVolume,
				applySfxUiVolume,
				playSfxSafe,
				playCartridgeHoverSfx,
				playCartridgeSelectSfx,
				playEnlargeScreenshotSfx,
				playReturnScreenshotSfx,
				playScreenshotScrollSfx,
				playExitToMenuSfx,
				playExitTabSfx,
				startSfxLoopSafe,
				updateSfxLoopSafe,
				stopSfxLoopSafe,
			} = createAudioController({
				getSceneState: () => ({
					vineLabActive,
					livingRoomActive,
					tennisMode,
					basketballMode,
					dragEnabled,
				}),
			});
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
			let ringSpinInput = null;
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
				drawSystemCoreClock({
					PIXI,
					getCoreWorldPos,
					systemCore,
					ringSpinVel,
					coreHoverAmount,
					ringSpinInput,
					screenToWorldSize,
					CORE_BASE_HALF_SIZE,
					CORE_CLOCK_SCALE,
					hsvToRgbInt,
					coreDialGlow,
					coreDial,
					coreTickMarks,
					coreNum12,
					coreNum3,
					coreNum6,
					coreNum9,
					coreSecondTrail,
					coreHourHand,
					coreMinuteHand,
					coreSecondHand,
					coreSpinCue,
					coreGhost,
				}, { time });
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

			const launcherItems = createLauncherItems({
				onOpenLab: () => {
					openVineLabNow();
				},
				onOpenPortfolio: () => {
					startPortfolioEntryTransition();
				},
			});
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
				const lockControlResult = drawLockControlVisual({
					PIXI,
					lockHover,
					lockAnim,
					lockGlow,
					lockBg,
					lockIcon,
					lockButtonSize,
					lockToggle,
				});
				lockNeedsRedraw = lockControlResult.lockNeedsRedraw;
			};
			lockToggle.addChild(lockGlow, lockBg, lockIcon);
			lockToggle.zIndex = 150;
			world.addChild(lockToggle);

			let lockScreenX = 0;
			let lockScreenY = 0;
			const soundPanelUi = createSoundPanelUI({
				app,
				world,
				screenToWorldX,
				screenToWorldY,
				getMusicUiVolume,
				getSfxUiVolume,
				applyMusicUiVolume,
				applySfxUiVolume,
				playSfxSafe,
				playExitTabSfx,
				ICON_SFX,
			});

			const arcadeModeToggles = createArcadeModeToggles({ PIXI, world });
			const { basketballToggle, tennisToggle } = arcadeModeToggles;
			let basketballMode = false;
			let tennisMode = false;
			const arcadeFeedback = {
				noGoVoided: false,
				cursorWasBlocked: false,
			};

			const arcadeLayer = new PIXI.Container();
			arcadeLayer.eventMode = 'none';
			arcadeLayer.zIndex = 140;
			arcadeLayer.visible = false;
			world.addChild(arcadeLayer);
			const tennisLayer = new PIXI.Container();
			tennisLayer.eventMode = 'none';
			tennisLayer.zIndex = 141;
			tennisLayer.visible = false;
			world.addChild(tennisLayer);
			const tennisCourt = new PIXI.Graphics();
			const tennisNet = new PIXI.Graphics();
			const tennisHud = new PIXI.Container();
			const tennisScoreText = new PIXI.Text('0 - 0', {
				fontFamily: 'Minecraft, monospace',
				fontSize: 20,
				fill: 0xffffff,
				stroke: 0x0b1e2b,
				strokeThickness: 5,
				align: 'center',
				letterSpacing: 1,
			});
			tennisScoreText.anchor.set(0.5, 0);
			const tennisStatusText = new PIXI.Text('CHOOSE YOUR CHARACTER', {
				fontFamily: 'Minecraft, monospace',
				fontSize: 12,
				fill: 0xbde9ff,
				align: 'center',
				letterSpacing: 1,
			});
			tennisStatusText.anchor.set(0.5, 0.5);
			tennisHud.addChild(tennisScoreText, tennisStatusText);
			tennisLayer.addChild(tennisCourt, tennisNet, tennisHud);
			const arcadeTargetLayer = new PIXI.Graphics();
			const arcadeShardLayer = new PIXI.Graphics();
			const arcadeOverlayUi = createArcadeOverlayUi({ PIXI });
			const arcadeSweepUi = createArcadeSweepControl({ PIXI });
			const arcadeSweepControl = arcadeSweepUi.graphics;
			const arcadePopupUi = createArcadePopupUi({ PIXI });
			const arcadeCountdownUi = createArcadeCountdownUi({
				PIXI,
				playSfxSafe,
				ICON_SFX,
			});
			arcadeLayer.addChild(arcadeOverlayUi.dividerGlow, arcadeTargetLayer, arcadeShardLayer, arcadeOverlayUi.hintText, arcadeOverlayUi.scoreText, arcadePopupUi.text, arcadeCountdownUi.text, arcadeSweepControl);

			const getArcadeDividerScreenY = () => arcadeOverlayUi.getDividerScreenY(app.renderer.height);
			const arcadeState = {
				dividerWorldX: 0,
				dividerWorldY: 0,
			};
			const targetBackgroundInfluencers = new Array(8).fill(null).map(() => ({
				screenX: 0,
				screenY: 0,
				strength: 0,
				tint: 0xffffff,
			}));
			let targetBackgroundInfluencerCount = 0;
			let arcadeTargetsRuntime = null;
			const getArcadeCombo = () => arcadeTargetsRuntime?.getCombo?.() ?? 0;
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
			const targetReactiveBackgroundRuntime = createTargetReactiveBackgroundRuntime({
				TARGET_BACKGROUND_MODE,
				targetReactiveFxLayer,
				targetReactiveInfluenceLayer,
				targetReactiveRippleLayer,
				targetBackgroundInfluencers,
				getTargetBackgroundQualityProfile,
				isTargetGameplayBackgroundActive,
				getArcadeCombo,
				clamp01,
				screenToWorldSize,
				toScenePointFromScreen,
			});
			const resetTargetReactiveBackground = () => {
				targetBackgroundInfluencerCount = 0;
				targetReactiveBackgroundRuntime.resetBackground();
			};
			const clearTargetReactiveTransientFx = () => {
				targetBackgroundInfluencerCount = 0;
				targetReactiveBackgroundRuntime.clearTransientFx();
			};
			const updateTargetReactiveBackgroundMode = (dtSeconds) => {
				targetReactiveBackgroundRuntime.updateMode(dtSeconds);
			};
			const spawnTargetBackgroundRipple = (screenX, screenY, strength = 1, tint = 0x79d8ff) => {
				targetReactiveBackgroundRuntime.spawnRipple(screenX, screenY, strength, tint);
			};
			const renderTargetReactiveBackground = (dtSeconds) => {
				targetReactiveBackgroundRuntime.render(dtSeconds, targetBackgroundInfluencerCount);
			};
			const stopArcadeCountdown = () => {
				arcadeCountdownUi.stop();
			};
			const startArcadeCountdown = () => {
				arcadeCountdownUi.start();
			};
			const updateArcadeCountdown = (dtSeconds) => {
				arcadeCountdownUi.update(dtSeconds);
			};
			arcadeTargetsRuntime = createArcadeTargetsRuntime({
				arcadeTargetLayer,
				arcadeShardLayer,
				targetBackgroundInfluencers,
				getArcadeDividerScreenY,
				SCENE_SCALE,
			});

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
			const tennisState = createInitialTennisState();
			const canGrabActiveTennisBody = (body) => {
				if (!body?.container) return false;
				if (!dragEnabled || !tennisMode || !tennisState.active) return true;
				if (tennisState.phase !== TENNIS_PHASE.PLAY) return false;
				return tennisState.playerBody?.container === body.container;
			};
			appLauncher.setGrabFilter?.((body) => canGrabActiveTennisBody(body));
			const tennisController = createTennisModeController({
				tennisState,
				tennisScoreText,
				tennisStatusText,
				getAllIconBodies,
			});
			const tennisModeOrchestrator = createTennisModeOrchestrator({
				tennisController,
				tennisState,
				tennisStatusText,
				tennisLayer,
				getDragEnabled: () => dragEnabled,
				getMouseDown: () => mouse.down,
				setTennisMode: (enabled) => { tennisMode = Boolean(enabled); },
				setBasketballMode: (enabled) => { basketballMode = Boolean(enabled); },
				setArcadeLayerVisible: (visible) => { arcadeLayer.visible = Boolean(visible); },
				stopArcadeCountdown,
				resetArcadePopup: () => arcadePopupUi.reset(),
				clearTargetReactiveTransientFx,
				syncMusicTrack,
			});
			const startTennisMode = () => tennisModeOrchestrator.startMode();
			const stopTennisMode = ({ restoreIcons = false } = {}) => {
				tennisModeOrchestrator.stopMode({ restoreIcons });
			};
			const updateTennisMode = (dtSeconds, timeSeconds) => {
				updateTennisModeFrame({
					TENNIS_PHASE,
					TENNIS_WIN_SCORE,
					tennisMode,
					dragEnabled,
					tennisState,
					app,
					world,
					mouse,
					cameraOffset,
					SCENE_SCALE,
					screenToWorldSize,
					clamp01,
					nowMs,
					playSfxSafe,
					ICON_SFX,
					tennisLayer,
					tennisCourt,
					tennisNet,
					tennisScoreText,
					tennisStatusText,
					assignTennisRolesFromPlayer: tennisController.assignRolesFromPlayer,
					beginTennisRound: tennisController.beginRound,
					updateTennisScoreUi: tennisController.updateScoreUi,
					dtSeconds,
					timeSeconds,
				});
			};
			const findHoveredIconBody = () => {
				const bodies = getAllIconBodies();
				for (let i = bodies.length - 1; i >= 0; i--) {
					const body = bodies[i];
					if (body?.state?.hovered) return body;
				}
				return null;
			};
			const iconSfxMonitor = createIconSfxMonitor({
				getAllIconBodies,
				nowMs,
				clamp01,
				SCENE_SCALE,
				isTennisModeActive: () => tennisMode,
				playSfxSafe,
				ICON_SFX,
			});
			const updateArcadeScoreLabel = () => {
				const combo = arcadeTargetsRuntime?.getCombo?.() ?? 0;
				const score = arcadeTargetsRuntime?.getScore?.() ?? 0;
				arcadeOverlayUi.setScore(score, combo);
			};
			const resetArcadeRound = () => {
				arcadeFeedback.noGoVoided = false;
				arcadeFeedback.cursorWasBlocked = false;
				arcadePopupUi.reset();
				stopArcadeCountdown();
				arcadeTargetsRuntime?.resetRound?.({
					appWidth: app.renderer.width,
					appHeight: app.renderer.height,
					onScoreChange: updateArcadeScoreLabel,
				});
				updateArcadeScoreLabel();
			};
			const triggerArcadePopup = (message, baseScale = 1, color = null) => {
				arcadePopupUi.trigger(message, baseScale, color);
			};
			let launcherReturnToRingUntilMs = 0;
			const applyDragEnabled = (enabled) => {
				const wasDragEnabled = dragEnabled;
				const dragModeResult = applyDragEnabledMode({
					dragEnabled,
					basketballMode,
					tennisMode,
					nowMs,
					moodState,
					MOOD_REENABLE_DELAY_MS,
					DRAG_MOOD,
					BASE_MOOD,
					clearMoodSources,
					resolveActiveMood,
					arcadeModeToggles,
					stopTennisMode,
					clearTargetReactiveTransientFx,
					resetTargetReactiveBackground,
					appLauncher,
					blogIconSetDragEnabled,
					linkedinIconSetDragEnabled,
					reflexIconSetDragEnabled,
					walklatroIconSetDragEnabled,
					getCoreWorldPos,
					ringSpinVel,
					ringSpin,
					blogIconGetBody,
					linkedinIconGetBody,
					reflexIconGetBody,
					walklatroIconGetBody,
					ringSpinInput,
					stopSfxLoopSafe,
					RING_SPIN_LOOP_KEY,
					stopArcadeCountdown,
					resetArcadeRound,
					layoutBlogIcon,
					layoutLinkedinIcon,
					layoutReflexIcon,
					layoutWalklatroIcon,
				}, {
					enabled,
				});
				dragEnabled = dragModeResult.dragEnabled;
				basketballMode = dragModeResult.basketballMode;
				arcadeLayer.visible = basketballMode;
				lockAnimTarget = dragModeResult.lockAnimTarget;
				ringSpinVel = dragModeResult.ringSpinVel;
				ringSpin = dragModeResult.ringSpin;
				lockNeedsRedraw = dragModeResult.lockNeedsRedraw;
				if (wasDragEnabled && !dragEnabled) {
					launcherReturnToRingUntilMs = nowMs() + 950;
				} else if (dragEnabled) {
					launcherReturnToRingUntilMs = 0;
				}
			};
			const placeLockButton = () => {
				lockScreenX = app.renderer.width - lockButtonSize - 16;
				lockScreenY = app.renderer.height - lockButtonSize - 16;
				const x = screenToWorldX(lockScreenX);
				const y = screenToWorldY(lockScreenY);
				lockToggle.position.set(x, y);
				soundPanelUi.setAnchorFromLockButton(lockScreenX, lockScreenY);
				arcadeModeToggles.place({
					rendererWidth: app.renderer.width,
					rendererHeight: app.renderer.height,
					lockButtonSize,
					screenToWorldX,
					screenToWorldY,
				});
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
			basketballToggle.on('pointerover', () => { arcadeModeToggles.setBasketballHoverTarget(1); });
			basketballToggle.on('pointerout', () => { arcadeModeToggles.setBasketballHoverTarget(0); });
			basketballToggle.on('pointertap', () => {
				if (!dragEnabled) return;
				if (tennisMode) {
					stopTennisMode({ restoreIcons: false });
				}
				basketballMode = !basketballMode;
				arcadeLayer.visible = basketballMode;
				if (basketballMode) {
					resetArcadeRound();
					startArcadeCountdown();
					arcadeFeedback.cursorWasBlocked = mouse.y <= getArcadeDividerScreenY();
					arcadeFeedback.noGoVoided = arcadeFeedback.cursorWasBlocked;
				} else {
					stopArcadeCountdown();
					arcadePopupUi.reset();
					clearTargetReactiveTransientFx();
				}
			});
			tennisToggle.on('pointerover', () => { arcadeModeToggles.setTennisHoverTarget(1); });
			tennisToggle.on('pointerout', () => { arcadeModeToggles.setTennisHoverTarget(0); });
			tennisToggle.on('pointertap', () => {
				if (!dragEnabled) return;
				if (tennisMode) {
					stopTennisMode({ restoreIcons: false });
					return;
				}
				if (basketballMode) {
					basketballMode = false;
					arcadeLayer.visible = false;
					stopArcadeCountdown();
					arcadePopupUi.reset();
					clearTargetReactiveTransientFx();
				}
				startTennisMode();
			});
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
			window.setTimeout(async () => {
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
			if (blogIconSetMouseProvider) blogIconSetMouseProvider(() => {
				const mouse = lastMouseWorld || { x: 0, y: 0, down: false };
				if (canGrabActiveTennisBody(blogIconGetBody?.())) return mouse;
				return { ...mouse, down: false };
			});
			if (linkedinIconSetMouseProvider) linkedinIconSetMouseProvider(() => {
				const mouse = lastMouseWorld || { x: 0, y: 0, down: false };
				if (canGrabActiveTennisBody(linkedinIconGetBody?.())) return mouse;
				return { ...mouse, down: false };
			});
			if (reflexIconSetMouseProvider) reflexIconSetMouseProvider(() => {
				const mouse = lastMouseWorld || { x: 0, y: 0, down: false };
				if (canGrabActiveTennisBody(reflexIconGetBody?.())) return mouse;
				return { ...mouse, down: false };
			});
			if (walklatroIconSetMouseProvider) walklatroIconSetMouseProvider(() => {
				const mouse = lastMouseWorld || { x: 0, y: 0, down: false };
				if (canGrabActiveTennisBody(walklatroIconGetBody?.())) return mouse;
				return { ...mouse, down: false };
			});
			}, 0);

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

		const portfolioTransitionController = createPortfolioTransitionController({
			storageKey: 'mw_portfolio_seen',
			storage: typeof localStorage !== 'undefined' ? localStorage : null,
		});
		const portfolioEntryTransition = portfolioTransitionController.state;
		const vineLabTransition = {
			active: false,
			phase: 0,
			duration: 0.34,
			direction: 1,
			action: null,
			actionTriggered: false,
		};
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
			portfolioTransitionController.startExit({
				isLivingRoomActive: livingRoomActive,
				onStartSfx: playExitToMenuSfx,
				onClose: () => closePortfolioLibraryNow(),
				onDrawWipe: drawTransitionWipe,
			});
		};
		const startPortfolioEntryTransition = () => {
			portfolioTransitionController.startEntry({
				isLivingRoomActive: livingRoomActive,
				onBeforeStart: () => { terminalTypingHold = true; },
				onOpen: () => openPortfolioLibraryNow(),
				onDrawWipe: drawTransitionWipe,
			});
		};
		systemCore.eventMode = 'none';
		systemCore.cursor = 'default';
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
		function layoutLeftPortal() {
			const leftPortalLayout = layoutLeftPortalUi({
				PIXI,
				app,
				screenToWorldX,
				screenToWorldY,
				screenToWorldSize,
				leftPortal,
				leftGlowSoft,
				leftGlow,
				leftArrow,
				leftPortalHitZone,
				leftPortalLabel,
				leftPortalHint,
			});
			leftPortalWidth = leftPortalLayout.leftPortalWidth;
			leftPortalShownX = leftPortalLayout.leftPortalShownX;
			leftPortalHiddenX = leftPortalLayout.leftPortalHiddenX;
			leftPortalY = leftPortalLayout.leftPortalY;
		}
		layoutLeftPortal();

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
			mobileLayout: false,
			drawerOpen: false,
			drawerProgress: 0,
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
		const livingRoomAmbientBlobs = createLivingRoomAmbientBlobConfigs();
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
		const cartridgeDrawerDim = new PIXI.Graphics();
		cartridgeDrawerDim.visible = false;
		cartridgeDrawerDim.eventMode = 'none';
		cartridgeDrawerDim.cursor = 'pointer';
		const cartridgeTapesTab = new PIXI.Container();
		const cartridgeTapesTabBg = new PIXI.Graphics();
		const cartridgeTapesTabLabel = new PIXI.Text('TAPES', {
			fontFamily: 'Minecraft, monospace',
			fontSize: 9,
			fill: 0xe8f6ff,
			letterSpacing: 1,
		});
		cartridgeTapesTabLabel.anchor.set(0.5, 0.5);
		cartridgeTapesTab.addChild(cartridgeTapesTabBg, cartridgeTapesTabLabel);
		cartridgeTapesTab.visible = false;
		cartridgeTapesTab.eventMode = 'none';
		cartridgeTapesTab.cursor = 'pointer';
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
		const livingRoomLayoutMetrics = {
			tvBroTitleBaseY: 0,
			tvBroSubBaseY: 0,
			tvTerminalStartX: 0,
			tvTerminalStartY: 0,
			tvTerminalLineHeight: 18,
			tvTerminalFontSize: 12,
			livingRoomTvSlotX: 0,
			livingRoomTvSlotY: 0,
			livingRoomTapeW: 108,
			livingRoomTapeH: 62,
		};
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
		let terminalTypingHold = false;
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
		const TERMINAL_AERO_WAVE_TEXT = 'Frutiger Aero';
		const TERMINAL_AERO_WAVE_SEA_BLUE = 0x74d3ff;
		const TERMINAL_AERO_WAVE_LIGHT_PURPLE = 0xc9bbff;
		const TERMINAL_AERO_WAVE_AMPLITUDE = 1.35;
		const TERMINAL_AERO_WAVE_SPEED = 1.1;
		const TERMINAL_AERO_WAVE_COLOR_SPEED = 2.15;
		const TERMINAL_AERO_HIDE_COLOR = 0x071322;
		const STATIC_TERMINAL_KEYWORDS = createStaticTerminalKeywords({
			PORTFOLIO_HIGHLIGHT_ACCENT,
			PORTFOLIO_HIGHLIGHT_RAINBOW,
		});
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
		const terminalTypingController = createLivingRoomTerminalTypingController({
			PIXI,
			PORTFOLIO_RIGHT_INFO_FONT_FAMILY,
			PORTFOLIO_HIGHLIGHT_ACCENT,
			PORTFOLIO_HIGHLIGHT_RAINBOW,
			TERMINAL_TYPE_RATE,
			TERMINAL_BASE_COLOR,
			TERMINAL_LABEL_COLORS,
			TERMINAL_LINK_COLOR,
			TERMINAL_ACCENT_COLOR,
			TERMINAL_RAINBOW_FILL,
			TERMINAL_AERO_WAVE_TEXT,
			TERMINAL_AERO_WAVE_SEA_BLUE,
			TERMINAL_AERO_WAVE_LIGHT_PURPLE,
			TERMINAL_AERO_WAVE_AMPLITUDE,
			TERMINAL_AERO_WAVE_SPEED,
			TERMINAL_AERO_WAVE_COLOR_SPEED,
			TERMINAL_AERO_HIDE_COLOR,
			mixColors,
			livingRoomTerminalLayout,
			tvTerminalLines,
			tvTerminalCursor,
			tvTerminalOverviewText,
			tvTerminalDesignWaveCover,
			tvTerminalDesignWave,
			tvTerminalDesignWaveMask,
			tvTerminalDesignText,
			destroyContainerChildren,
			getTvTerminalStartX: () => livingRoomLayoutMetrics.tvTerminalStartX,
			getTvTerminalStartY: () => livingRoomLayoutMetrics.tvTerminalStartY,
			getTvTerminalLineHeight: () => livingRoomLayoutMetrics.tvTerminalLineHeight,
			getTvTerminalFontSize: () => livingRoomLayoutMetrics.tvTerminalFontSize,
			getTerminalTypingHold: () => terminalTypingHold,
		});
		const revealTerminalTextNow = () => terminalTypingController.revealTerminalTextNow();
		const dedupeKeywordRules = terminalTypingController.dedupeKeywordRules;
		const renderTerminalTypedText = terminalTypingController.renderTerminalTypedText;
		const setTerminalText = terminalTypingController.setTerminalText;
		const setTerminalOverviewText = terminalTypingController.setTerminalOverviewText;
		const stepTerminalOverviewTyping = (dtSeconds) => terminalTypingController.stepTerminalOverviewTyping(dtSeconds);
		const wrapTerminalText = terminalTypingController.wrapTerminalText;
		const clearTerminalDesignWave = terminalTypingController.clearTerminalDesignWave;
		const buildTerminalDesignWave = terminalTypingController.buildTerminalDesignWave;
		const stepTerminalDesignWave = (pulseTime) => terminalTypingController.stepTerminalDesignWave(pulseTime);
		const tintColor = (hexColor, factor = 1) => {
			const r = Math.max(0, Math.min(255, Math.round(((hexColor >> 16) & 0xff) * factor)));
			const g = Math.max(0, Math.min(255, Math.round(((hexColor >> 8) & 0xff) * factor)));
			const b = Math.max(0, Math.min(255, Math.round((hexColor & 0xff) * factor)));
			return (r << 16) | (g << 8) | b;
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
		const livingRoomMediaUi = createLivingRoomMediaUiController({
			DEFAULT_NEON_ACCENT,
			tintColor,
			tvMediaFrameGlow,
			tvMediaFrame,
			tvMediaZoomHint,
			tvDesktopContentSprite,
			tvMediaPrevSprite,
			onOpenMediaPopout: () => openMediaPopout(),
		});
		const getLivingRoomMediaScale = () => livingRoomMediaUi.getMediaScale();
		const updateLivingRoomMediaZoomHint = () => {
			const zoomAllowed = !getActiveProject()?.useDesktopFeed;
			const accent = getActiveAccentColor();
			livingRoomMediaUi.updateZoomHint({
				zoomAllowed,
				accent,
			});
		};
		const setLivingRoomBezelTarget = (frameX, frameY, frameW, frameH, accent) => {
			livingRoomMediaUi.setBezelTarget(frameX, frameY, frameW, frameH, accent);
		};
		const stepLivingRoomBezelAnimation = (dtSeconds) => {
			livingRoomMediaUi.stepBezelAnimation(dtSeconds);
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
		const livingRoomMediaPopoutController = createLivingRoomMediaPopoutController({
			PIXI,
			app,
			VIEW_TV_AREA,
			PORTFOLIO_EMPTY_SLIDE,
			MEDIA_POPOUT_GLOSS_BASE_ALPHA,
			mediaPopoutState,
			mediaPopoutLayer,
			mediaPopoutDim,
			mediaPopoutCard,
			mediaPopoutShadow,
			mediaPopoutFrame,
			mediaPopoutSprite,
			mediaPopoutGloss,
			mediaPopoutHint,
			tintColor,
			getActiveAccentColor,
			getActiveProject,
			getActiveSlide,
			getLivingRoomSlideIndex: () => livingRoomSlideIndex,
			isLivingRoomActive: () => livingRoomActive,
			getLivingRoomViewMode: () => livingRoomState.viewMode,
			getTextureNaturalSize,
			playEnlargeScreenshotSfx,
			playReturnScreenshotSfx,
		});
		const layoutMediaPopoutCard = () => livingRoomMediaPopoutController.layoutCard();
		const openMediaPopout = () => {
			if (!livingRoomMediaPopoutController.open()) return;
			livingRoomMediaUi.setExpanded(true);
		};
		const closeMediaPopout = (options = {}) => {
			livingRoomMediaPopoutController.close(options);
			livingRoomMediaUi.setExpanded(false);
		};
		const stepMediaPopout = (dtSeconds) => livingRoomMediaPopoutController.step(dtSeconds);
		const fitLivingRoomMediaSprite = (sprite, texture) => {
			const { x, y, w, h } = livingRoomMediaLayout;
			if (w <= 0 || h <= 0) return;
			const framePad = 0;
			const maxW = Math.max(1, w - framePad * 2);
			const maxH = Math.max(1, h - framePad * 2);
			const size = getTextureNaturalSize(texture);
			const ratio = size.width / Math.max(1, size.height);
			const fitScale = Math.min(maxW / Math.max(1, size.width), maxH / Math.max(1, size.height));
			const scale = fitScale * Math.min(1, getLivingRoomMediaScale());
			sprite.texture = texture;
			sprite.width = Math.max(1, size.width * scale);
			sprite.height = Math.max(1, size.height * scale);
			sprite.position.set(x + w * 0.5, y + h * 0.5);
			sprite.rotation = 0;
			sprite.tint = 0xffffff;
			sprite._previewBaseWidth = sprite.width;
			sprite._previewBaseHeight = sprite.height;
			sprite._previewBaseX = sprite.position.x;
			sprite._previewBaseY = sprite.position.y;
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
			const terminalPanelState = rebuildLivingRoomTerminalPanelView({
				PIXI,
				PORTFOLIO_HIGHLIGHT_ACCENT,
				PORTFOLIO_HIGHLIGHT_RAINBOW,
				PORTFOLIO_RIGHT_INFO_FONT_FAMILY,
				TERMINAL_AERO_WAVE_AMPLITUDE,
				TERMINAL_ACCENT_COLOR,
				TERMINAL_LABEL_COLORS,
				TERMINAL_LINK_COLOR,
				TERMINAL_RAINBOW_FILL,
				STATIC_TERMINAL_KEYWORDS,
				DEFAULT_TERMINAL_TEXT,
				livingRoomSlideIndex,
				livingRoomState,
				livingRoomTerminalLayout,
				tvBroTitle,
				tvBroSub,
				tvTerminalSlideTitle,
				tvTerminalSlideValue,
				tvTerminalOverviewLabel,
				tvTerminalOverviewText,
				tvTerminalDesignLabel,
				tvTerminalDesignText,
				tvTerminalTechLabel,
				tvTerminalTechText,
				tvTerminalHighlightsLabel,
				tvTerminalHighlights,
				tvTerminalLinksLabel,
				tvTerminalLinks,
				tvTerminalDesignWaveCover,
				tvTerminalDesignWave,
				tvTerminalDesignWaveMask,
				tvTerminalLines,
				tvTerminalCursor,
				tvTerminalStartX: livingRoomLayoutMetrics.tvTerminalStartX,
				tvTerminalStartY: livingRoomLayoutMetrics.tvTerminalStartY,
				tvTerminalFontSize: livingRoomLayoutMetrics.tvTerminalFontSize,
				getTerminalDesignWaveGlyphs: () => terminalTypingController.getTerminalDesignWaveGlyphs(),
				getActiveProject,
				getActiveSlide,
				dedupeKeywordRules,
				normalizeHighlight,
				destroyContainerChildren,
				clearTerminalDesignWave,
				setTerminalText,
				setTerminalOverviewText,
				wrapTerminalText,
				buildTerminalDesignWave,
			}, { instant });
			terminalTypingController.setTerminalKeywordRules(terminalPanelState.terminalKeywordRules);
			terminalTypingController.setTerminalLinkLabelSet(terminalPanelState.terminalLinkLabelSet);
		};
		const redrawLivingRoomDots = () => {
			redrawLivingRoomDotsView({
				dotNodes: livingRoomDotNodes,
				livingRoomSlideIndex,
				getActiveAccentColor,
				tintColor,
			});
		};
		const rebuildLivingRoomDots = () => {
			livingRoomDotNodes = rebuildLivingRoomDotsView({
				PIXI,
				tvSlideDotNav,
				destroyContainerChildren,
				getSlidesForProject,
				getActiveProject,
				onDotSelected: (index) => {
					setLivingRoomSlide(index, { instantTerminal: true, userInitiated: true });
				},
				onRedraw: () => {
					redrawLivingRoomDots();
				},
			});
			redrawLivingRoomDots();
		};
		let setLivingRoomSlide = () => {};
		let setLivingRoomProjectForTape = () => {};
		let refreshPlacard = () => {};
		let playTape = () => {};
		let enterLivingRoom = () => {};
		let exitLivingRoom = () => {};
		let layoutLivingRoom = () => {};
		let setLivingRoomDetailFocus = () => {};
		const livingRoomTapes = VHS_TAPE_LIBRARY.map((tape, index) => createLivingRoomTapeNode({
			PIXI,
			tape,
			index,
			PORTFOLIO_LEFT_TITLE_FONT_FAMILY,
			VIEW_TV_AREA,
			livingRoomState,
			playCartridgeHoverSfx,
			playCartridgeSelectSfx,
			applyWipSpriteTexture,
			getTapeCoverForProject,
			getProjectForTape,
			onPlayTape: (tapeId) => playTape(tapeId),
		}));
		const tapeNodeById = new Map(livingRoomTapes.map((entry) => [entry.tape.id, entry]));
		const livingRoomFlowController = createLivingRoomFlowController({
			PIXI,
			PORTFOLIO_EMPTY_SLIDE,
			PORTFOLIO_MEDIA_VIDEO,
			CONTENT_EMPTY,
			CONTENT_BRO_MEME,
			STATE_LIVING_ROOM_PLAYING,
			OVERLAY_MODE_LIBRARY,
			OVERLAY_MODE_TV,
			VIEW_TV_AREA,
			VIEW_FULLSCREEN,
			VHS_TAPE_LIBRARY,
			livingRoomState,
			livingRoomLayer,
			tvDesktopTransitionLayer,
			tvDesktopTransitionSprite,
			tvDesktopContentSprite,
			tvDesktopRenderTexture,
			tvMediaPrevSprite,
			cursorContainer,
			uiTopLayer,
			getSlidesForProject,
			getActiveProject,
			getActiveSlide,
			getProjectForTape,
			getSelectedTape,
			closeMediaPopout,
			livingRoomMediaUi,
			updateLivingRoomMediaZoomHint,
			stopLivingRoomVideoSource,
			playLivingRoomVideoSource,
			fitLivingRoomMediaSprite,
			refreshDesktopTvTexture,
			rebuildLivingRoomTerminalPanel,
			redrawLivingRoomDots,
			rebuildLivingRoomDots,
			setLivingRoomDetailFocus: (...args) => setLivingRoomDetailFocus(...args),
			setCartridgeDrawerOpen: (...args) => setCartridgeDrawerOpen(...args),
			isLivingRoomMobileLayout: () => Boolean(livingRoomState.mobileLayout),
			getRendererWidth: () => app.renderer.width,
			layoutLivingRoom: (...args) => layoutLivingRoom(...args),
			updateCartridgeScrollUi,
			setInGameCursorVisible,
			playScreenshotScrollSfx,
			pickBroPlaceholderWord,
			isVideoSource,
			getLivingRoomActiveProjectId: () => livingRoomActiveProjectId,
			setLivingRoomActiveProjectId: (nextId) => {
				livingRoomActiveProjectId = nextId;
			},
			getLivingRoomSlideIndex: () => livingRoomSlideIndex,
			setLivingRoomSlideIndex: (nextIndex) => {
				livingRoomSlideIndex = nextIndex;
			},
			getLivingRoomActiveVideoSource: () => livingRoomActiveVideoSource,
			setLivingRoomActiveVideoSource: (source) => {
				livingRoomActiveVideoSource = source;
			},
			tapeNodeById,
			setPreviewUsesDesktopFeed: (nextValue) => {
				previewUsesDesktopFeed = nextValue;
			},
			getPreviewUsesDesktopFeed: () => previewUsesDesktopFeed,
			revealTerminalTextNow,
		});
		setLivingRoomSlide = livingRoomFlowController.setLivingRoomSlide;
		setLivingRoomProjectForTape = livingRoomFlowController.setLivingRoomProjectForTape;
		refreshPlacard = livingRoomFlowController.refreshPlacard;
		playTape = livingRoomFlowController.playTape;
		enterLivingRoom = livingRoomFlowController.enterLivingRoom;
		exitLivingRoom = livingRoomFlowController.exitLivingRoom;
		returnToTvAreaFromFullscreen = livingRoomFlowController.returnToTvAreaFromFullscreen;
		isFullscreenTvPlaybackActive = livingRoomFlowController.isFullscreenTvPlaybackActive;
		tvScreenGroup.addChild(tvContentContainer, tvScreenMask, tvCrtOverlay);
		roomBg.zIndex = 10;
		leftShelf.zIndex = 58;
		rightShelf.zIndex = 21;
		vhsTapesLeft.zIndex = 30;
		vhsTapesRight.zIndex = 31;
		cartridgeDrawerDim.zIndex = 55;
		cartridgeListViewport.zIndex = 60;
		cartridgeScrollUi.zIndex = 61;
		cartridgeTapesTab.zIndex = 95;
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
		livingRoomBackBtn.zIndex = 95;
		livingRoomFocusBtn.zIndex = 95;
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
		livingRoomLayer.addChild(
			roomBg,
			livingRoomForeground,
			livingRoomTv,
			cartridgeDrawerDim,
			leftShelf,
			cartridgeListViewport,
			cartridgeScrollUi,
			cartridgeTapesTab,
			tvDesktopTransitionLayer,
			livingRoomBackBtn,
			livingRoomFocusBtn,
		);
		app.stage.addChild(livingRoomLayer);
		const livingRoomTvScreenRect = { x: 0, y: 0, w: 0, h: 0, r: 0 };
		const holoPanelLocalRect = { x: 0, y: 0, w: 0, h: 0 };
		const livingRoomAmbientController = createLivingRoomAmbientController({
			app,
			getActiveBackgroundQualityMode: () => activeBackgroundQualityMode,
			BACKGROUND_QUALITY_MODE,
			livingRoomAmbientLayer,
			livingRoomAmbientBlobs,
			livingRoomAmbientComputed,
			livingRoomAmbientBlur,
			livingRoomAmbientMetaFilter,
			livingRoomAmbientFilterArea,
		}, {
			initialTime: Math.random() * 10,
		});
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

		const livingRoomLayoutController = createLivingRoomLayoutController({
			PIXI,
			app,
			livingRoomState,
			livingRoomLayoutFocus,
			getActiveAccentColor,
			tintColor,
			livingRoomRackRect,
			livingRoomTvPanelRect,
			livingRoomLayer,
			livingRoomWallGlow,
			roomVignette,
			livingRoomFloor,
			livingRoomForeground,
			leftShelf,
			rightShelf,
			cartridgeDrawerDim,
			cartridgeTapesTab,
			cartridgeTapesTabBg,
			cartridgeTapesTabLabel,
			cartridgeViewportRect,
			cartridgeListViewport,
			cartridgeListMask,
			cartridgeScrollUi,
			cartridgeScrollTrack,
			cartridgeScrollState,
			livingRoomTv,
			tvBodyShadow,
			tvBody,
			livingRoomTvFrame,
			holoPanelLocalRect,
			livingRoomTvScreenRect,
			tvScreenGroup,
			tvScreenMask,
			tvScreenHitArea,
			tvContentContainer,
			tvScreenBaseBg,
			livingRoomMediaLayout,
			fitLivingRoomMediaSprite,
			tvMediaPrevSprite,
			tvDesktopContentSprite,
			tvSlideDotNav,
			tvMediaZoomHint,
			updateLivingRoomMediaZoomHint,
			livingRoomMediaUi,
			tvBroBg,
			tvTerminalMask,
			tvBroTitle,
			tvBroSub,
			livingRoomTerminalLayout,
			tvTerminalLines,
			tvTerminalCursor,
			rebuildLivingRoomTerminalPanel,
			renderTerminalTypedText,
			redrawLivingRoomDots,
			tvEmptyBg,
			tvEmptyScreen,
			tvEmptySprite,
			tvEmptyText,
			tvScreensaverBg,
			tvScreensaverNoise,
			tvCrtOverlay,
			tvGlassReflection,
			tvSlotForeground,
			tvEjectBtn,
			placard,
			livingRoomBackBg,
			livingRoomBackBtn,
			livingRoomBackLabel,
			livingRoomFocusLabel,
			livingRoomFocusBg,
			livingRoomFocusBtn,
			livingRoomTapes,
			updateCartridgeScrollUi,
			tvDesktopTransitionSprite,
			fullscreenTvContentBg,
			fullscreenTvContentTitle,
			fullscreenTvContentSub,
			fullscreenExitBtnBg,
			fullscreenExitBtn,
			fullscreenExitBtnLabel,
			drawLivingRoomBackdrop,
			livingRoomLayoutMetrics,
		});
		layoutLivingRoom = (options = {}) => livingRoomLayoutController.layoutLivingRoom(options);
		const setCartridgeDrawerOpen = (open, options = {}) => {
			const nextOpen = Boolean(open) && Boolean(livingRoomState.mobileLayout || options.forceMobile);
			const instant = Boolean(options.instant);
			if (livingRoomState.drawerOpen === nextOpen && !options.forceLayout && !instant) return;
			livingRoomState.drawerOpen = nextOpen;
			if (instant) {
				livingRoomState.drawerProgress = nextOpen ? 1 : 0;
			} else if (nextOpen && livingRoomState.drawerProgress < 0.001) {
				// Ensure drawer nodes are laid out before the slide starts.
				livingRoomState.drawerProgress = 0.001;
			}
			if (options.skipLayout) return;
			layoutLivingRoom({ instantTerminal: Boolean(options.instantTerminal) });
		};
		const toggleCartridgeDrawer = () => {
			if (!livingRoomState.mobileLayout) return;
			setCartridgeDrawerOpen(!livingRoomState.drawerOpen);
		};
		setLivingRoomDetailFocus = (enabled, options = {}) => {
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
		const toRendererPoint = (event) => {
			const rect = app.view.getBoundingClientRect();
			if (!rect || rect.width <= 0 || rect.height <= 0) return null;
			const x = (event.clientX - rect.left) * (app.renderer.width / rect.width);
			const y = (event.clientY - rect.top) * (app.renderer.height / rect.height);
			if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
			return { x, y };
		};
		bindLivingRoomInteractionBindings({
			PIXI,
			windowRef: window,
			app,
			livingRoomLayer,
			livingRoomState,
			livingRoomLayoutFocus,
			livingRoomTv,
			livingRoomMediaLayout,
			livingRoomTvScreenRect,
			livingRoomRackRect,
			livingRoomTvPanelRect,
			cartridgeViewportRect,
			cartridgeScrollUi,
			cartridgeScrollTrack,
			cartridgeScrollThumb,
			cartridgeScrollState,
			mediaPopoutState,
			tvScreenHitArea,
			tvEjectBtn,
			tvDesktopContentSprite,
			tvMediaPrevSprite,
			fullscreenExitBtn,
			livingRoomBackBtn,
			livingRoomFocusBtn,
			cartridgeDrawerDim,
			cartridgeTapesTab,
			VIEW_TV_AREA,
			VIEW_FULLSCREEN,
			OVERLAY_MODE_LIBRARY,
			isLivingRoomActive: () => livingRoomActive,
			isFullscreenTvPlaybackActive,
			returnToTvAreaFromFullscreen,
			closeLivingRoomScene,
			setLivingRoomDetailFocus,
			setCartridgeDrawerOpen: (...args) => setCartridgeDrawerOpen(...args),
			toggleCartridgeDrawer,
			updateLivingRoomMediaZoomHint,
			updateCartridgeScrollUi,
			refreshPlacard,
			toRendererPoint,
			setLivingRoomSlide,
			getLivingRoomSlideIndex: () => livingRoomSlideIndex,
			getLivingRoomDotCount: () => livingRoomDotNodes.length,
			getActiveProject,
			openMediaPopout,
			closeMediaPopout,
		});
		const livingRoomDisplayEffectsController = createLivingRoomDisplayEffectsController({
			livingRoomState,
			CONTENT_SCREENSAVER,
			CONTENT_EMPTY,
			CONTENT_DESKTOP,
			TERMINAL_TYPE_RATE,
			getTerminalFullText: () => terminalTypingController.getTerminalFullText(),
			stepTerminalOverviewTyping,
			stepTerminalDesignWave,
			getActiveAccentColor,
			livingRoomTerminalLayout,
			tvTerminalLines,
			tvTerminalCursor,
			tvBroTitle,
			getTvBroTitleBaseY: () => livingRoomLayoutMetrics.tvBroTitleBaseY,
			tvSlotForeground,
			tvScreensaverLayer,
			tvScreensaverBg,
			tvScreensaverNoise,
			fullscreenTvContentLayer,
			fullscreenTvContentTitle,
			fullscreenTvContentSub,
			fullscreenTvContentBg,
			tvCrtOverlay,
			getNowMs: () => (performance.now ? performance.now() : Date.now()),
		});
		const livingRoomTapeDisplayController = createLivingRoomTapeDisplayController({
			livingRoomTapes,
			livingRoomState,
			VIEW_TV_AREA,
			DEFAULT_NEON_ACCENT,
		});
		const updateLivingRoomScene = createLivingRoomSceneRuntime({
			app,
			LIVING_ROOM_TRANSITION_SECONDS,
			livingRoomState,
			livingRoomLayoutFocus,
			scene,
			fullscreenTvContentLayer,
			fullscreenExitBtn,
			livingRoomLayer,
			tvDesktopTransitionLayer,
			tvDesktopTransitionSprite,
			livingRoomTvScreenRect,
			livingRoomRackRect,
			cartridgeViewportRect,
			livingRoomWallGlow,
			livingRoomFloor,
			leftShelf,
			rightShelf,
			cartridgeDrawerDim,
			cartridgeTapesTab,
			livingRoomForeground,
			placard,
			livingRoomBackBtn,
			livingRoomFocusBtn,
			tvScreenHitArea,
			tvEjectBtn,
			cartridgeListViewport,
			cartridgeScrollUi,
			livingRoomTv,
			livingRoomMediaLayout,
			tvMediaFrame,
			tvMediaFrameGlow,
			tvDesktopContentSprite,
			tvMediaPrevSprite,
			tvBroScreen,
			tvEmptyScreen,
			tvSlideDotNav,
			tvMediaZoomHint,
			tvScreensaverLayer,
			mediaPopoutState,
			cursorContainer,
			uiTopLayer,
			OVERLAY_MODE_TV,
			VIEW_FULLSCREEN,
			VIEW_TV_AREA,
			STATE_DESKTOP_FULLSCREEN,
			CONTENT_SCREENSAVER,
			getActiveProject,
			isFullscreenTvPlaybackActive,
			setInGameCursorVisible,
			drawLivingRoomBackdrop,
			stepLivingRoomDetailFocus,
			ambientController: livingRoomAmbientController,
			getPreviewUsesDesktopFeed: () => previewUsesDesktopFeed,
			refreshDesktopTvTexture,
			stepLivingRoomBezelAnimation,
			stepMediaPopout: (dtSeconds) => {
				livingRoomMediaUi.stepMediaTransition(dtSeconds);
				stepMediaPopout(dtSeconds);
			},
			displayEffectsController: livingRoomDisplayEffectsController,
			tapeDisplayController: livingRoomTapeDisplayController,
			getTerminalState: () => terminalTypingController.getDisplayTypingState(),
			applyDisplayEffectsResult: (displayEffectsResult) => terminalTypingController.applyDisplayEffectsResult(displayEffectsResult),
			getLivingRoomDotCount: () => livingRoomDotNodes.length,
			getLivingRoomTapeDimensions: () => ({
				livingRoomTapeW: livingRoomLayoutMetrics.livingRoomTapeW,
				livingRoomTapeH: livingRoomLayoutMetrics.livingRoomTapeH,
			}),
			refreshPlacard,
			setLivingRoomActive: (isActive) => {
				livingRoomActive = isActive;
			},
			getPointerScreenPos: () => ({ x: mouse.x, y: mouse.y }),
		});
		let livingRoomRuntimeDisabled = false;
		let launcherRuntimeDisabled = false;
		let launcherRuntimeRetryAt = 0;
		let mainTickerLastErrorAt = 0;

		ringSpinInput = setupInputAudioBindings({
			app,
			cursor,
			mouse,
			setInGameCursorVisible,
			markPortalInteraction,
			closeSoundPanelIfOutside: (point) => soundPanelUi.closeIfOutside(point),
			findHoveredIconBody,
			primeSfxContext,
			primeMusicContext,
			syncMusicTrack,
			setMusicPausedSafe,
			playSfxSafe,
			ICON_SFX,
			getDragEnabled: () => dragEnabled,
			getRingSpinBlocked: () => dragEnabled || livingRoomActive || vineLabActive,
			getCoreScreenPos,
			getCoreControlRadius,
			onSpin: (delta, nextSpinVel) => {
				ringSpin += delta;
				ringSpinVel = nextSpinVel;
			},
			onLayout: () => {
				appLauncher.layout();
				layoutBlogIcon();
				layoutLinkedinIcon();
				layoutReflexIcon();
				layoutWalklatroIcon();
			},
			ringThrowBoost: RING_THROW_BOOST,
			ringMaxSpinVel: RING_MAX_SPIN_VEL,
			enableClickAudio: false,
			clickAudioUrl: './assets/audio/clickdown.wav',
			toRendererPoint,
		}).ringSpinInput;

		let time = 0;
		let vineGrab = null;
		let grabRequested = false;
		let releaseRequested = false;
		const GRAB_KEY = 'KeyE';
		const SWING_ACCEL = 9.5;
		const SWING_DAMP = 0.995;
		const SWING_GRAVITY = 18.0;
		window.addEventListener('keydown', (e) => {
			if (e.code === 'KeyP') {
				if (!livingRoomActive && !vineLabActive && !portfolioEntryTransition.active && !vineLabTransition.active) {
					startPortfolioEntryTransition();
				}
			}
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

		function forceLauncherVisualRecovery(seconds = 1 / 60) {
			const follow = Math.min(1, Math.max(0.08, seconds * 10));
			const bodies = getAllIconBodies();
			for (let i = 0; i < bodies.length; i++) {
				const body = bodies[i];
				const container = body?.container;
				if (!container) continue;
				const pose = getIntroPoseForSlot(i);
				if (!pose || !Number.isFinite(pose.x) || !Number.isFinite(pose.y)) continue;
				const targetX = screenToWorldX(pose.x);
				const targetY = screenToWorldY(pose.y);
				container.visible = true;
				container.alpha = 1;
				container.position.x += (targetX - container.position.x) * follow;
				container.position.y += (targetY - container.position.y) * follow;
				if (body.state?.free) {
					body.state.free.x = container.position.x;
					body.state.free.y = container.position.y;
				}
			}
			world.sortChildren?.();
		}

		let launcherCollapsedFrameCount = 0;
		function enforceLauncherRingVisibility(seconds = 1 / 60) {
			if (dragEnabled || livingRoomActive || vineLabActive) {
				launcherCollapsedFrameCount = 0;
				return;
			}
			const appBodies = appLauncher.getBodies?.() || [];
			if (!appBodies.length) return;

			if (appLauncher?.container) {
				appLauncher.container.visible = true;
				appLauncher.container.alpha = 1;
				if (!Number.isFinite(appLauncher.container.zIndex) || appLauncher.container.zIndex < 120) {
					appLauncher.container.zIndex = 120;
				}
			}

			const core = getCoreWorldPos();
			const ringRadiusWorld = screenToWorldSize(getRingSlotRadius());
			let distSum = 0;
			let validBodies = 0;
			for (let i = 0; i < appBodies.length; i++) {
				const body = appBodies[i];
				const container = body?.container;
				if (!container) continue;
				container.visible = true;
				container.alpha = 1;
				if (!Number.isFinite(container.zIndex) || container.zIndex < 100) {
					container.zIndex = 100 + i;
				}
				const dx = container.position.x - core.x;
				const dy = container.position.y - core.y;
				if (!Number.isFinite(dx) || !Number.isFinite(dy)) continue;
				distSum += Math.hypot(dx, dy);
				validBodies += 1;
			}

			if (!validBodies) return;
			const avgDist = distSum / validBodies;
			const introComplete = iconIntroProgress >= 0.9;
			const collapsed = introComplete && avgDist < ringRadiusWorld * 0.45;
			launcherCollapsedFrameCount = collapsed ? (launcherCollapsedFrameCount + 1) : 0;

			if (launcherCollapsedFrameCount >= 6) {
				appLauncher.layout(true);
				layoutBlogIcon();
				layoutLinkedinIcon();
				layoutReflexIcon();
				layoutWalklatroIcon();
				forceLauncherVisualRecovery(seconds);
				launcherCollapsedFrameCount = 0;
			}
		}

		app.ticker.add((dt) => {
			const dtFrames = Number.isFinite(dt)
				? dt
				: (Number.isFinite(dt?.deltaTime) ? dt.deltaTime : 1);
			try {
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
			updateCRTScanlinesFilter({ uniforms: crtScanlinesUniforms }, app, dtFrames / 60);
			updateCursorPixelate();
			const seconds = dtFrames / 60;
			const lockEase = Math.min(1, seconds * 14);
			const prevHover = lockHover;
			const prevAnim = lockAnim;
			lockHover += (lockHoverTarget - lockHover) * lockEase;
			lockAnim += (lockAnimTarget - lockAnim) * lockEase;
			if (Math.abs(lockHover - prevHover) > 0.001 || Math.abs(lockAnim - prevAnim) > 0.001 || lockNeedsRedraw) {
				drawLockControl();
			}
			arcadeModeToggles.update(seconds);
			soundPanelUi.update(seconds);
			let transitionWipePhase = 0;
			let keepLivingRoomJitter = false;
			const portfolioStep = portfolioTransitionController.step(seconds, {
				isLivingRoomVisible: livingRoomLayer.visible,
			});
			if (portfolioStep.keepJitter) {
				livingRoomLayer.position.x = portfolioStep.jitterX;
				keepLivingRoomJitter = true;
			}
			if (portfolioStep.entryFinished) terminalTypingHold = false;
			transitionWipePhase = Math.max(transitionWipePhase, portfolioStep.wipePhase);
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
			if (!livingRoomRuntimeDisabled) {
				try {
					updateLivingRoomScene(seconds);
				} catch (err) {
					livingRoomRuntimeDisabled = true;
					livingRoomActive = false;
					livingRoomLayer.visible = false;
					livingRoomLayer.eventMode = 'none';
					fullscreenTvContentLayer.visible = false;
					console.error('Living-room runtime disabled after frame exception:', err);
				}
			}
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
			const portfolioSnapTimer = portfolioTransitionController.consumeSnapTimer(seconds, livingRoomActive);
			if (portfolioSnapTimer > 0 && livingRoomActive) {
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
				const hintTarget = (portfolioTransitionController.getShowFirstHint() && idleMs >= 6000 && !portfolioEntryTransition.active) ? 1 : 0;
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
			const transitionSurge = portfolioEntryTransition.surge;
			flowAmbienceFrameCounter = stepMoodReactiveBackgroundFrame({
				seconds,
				time,
				nowMs,
				dragEnabled,
				moodState,
				moodCurrent,
				MOOD_TRANSITION_SECONDS,
				resolveActiveMood,
				flushPendingMoodSources,
				updateTargetReactiveBackgroundMode,
				portfolioEntryTransition,
				targetReactiveBackgroundRuntime,
				FLOW_BASE,
				mixColors,
				clamp01,
				backgroundSceneQuality,
				flowAmbienceFrameCounter,
				setFlowAmbience,
				crtScanlinesUniforms,
			}).flowAmbienceFrameCounter;
			let launcherArcadeFrameResult = null;
			const launcherLayoutSnap = nowMs() >= launcherReturnToRingUntilMs;
			if (launcherRuntimeDisabled && nowMs() >= launcherRuntimeRetryAt) {
				launcherRuntimeDisabled = false;
			}
			if (!launcherRuntimeDisabled) {
				try {
					launcherArcadeFrameResult = stepLauncherArcadeFrame({
						dt: dtFrames,
						seconds,
						time,
						app,
						mouse,
						dragEnabled,
						iconIntroProgress,
						ringSpin,
						ringSpinVel,
						ringSpinInput,
						RING_MAX_SPIN_VEL,
						clamp01,
						startSfxLoopSafe,
						updateSfxLoopSafe,
						stopSfxLoopSafe,
						ICON_SFX,
						RING_SPIN_LOOP_KEY,
						layoutSnap: launcherLayoutSnap,
						appLauncher,
						layoutBlogIcon,
						layoutLinkedinIcon,
						layoutReflexIcon,
						layoutWalklatroIcon,
						getCoreScreenPos,
						getCoreControlRadius,
						coreHoverAmount,
						drawSystemCore,
						backgroundSceneQuality,
						ambientDebrisFrameCounter,
						ambientDebris,
						cameraParallax,
						CAMERA_SMOOTHING,
						cameraOffset,
						updateFlowBackground,
						SCENE_SCALE,
						scene,
						cursorContainer,
						lastMouseWorld,
						iconSfxMonitor,
						tennisMode,
						basketballMode,
						targetBackgroundInfluencerCount,
						arcadeLayer,
						arcadePopupUi,
						stopArcadeCountdown,
						arcadeTargetsRuntime,
						arcadeSweepUi,
						tennisState,
						stopTennisMode,
						updateTennisMode,
						getArcadeDividerScreenY,
						arcadeFeedback,
						updateArcadeScoreLabel,
						triggerArcadePopup,
						spawnTargetBackgroundRipple,
						playSfxSafe,
						updateArcadeCountdown,
						arcadeCountdownUi,
						arcadeOverlayUi,
						arcadeState,
						renderTargetReactiveBackground,
						getAllIconBodies,
					});
				} catch (error) {
					launcherRuntimeDisabled = true;
					launcherRuntimeRetryAt = nowMs() + 1500;
					console.error('[launcher-runtime] disabling extracted frame runtime after error', error);
				}
			}
			if (!launcherArcadeFrameResult) {
				let fallbackLayoutFailed = false;
				let fallbackLauncherUpdateFailed = false;
				const introSpeed = 1.25;
				if (!Number.isFinite(iconIntroProgress)) iconIntroProgress = 1;
				if (appLauncher?.container) {
					appLauncher.container.visible = true;
					appLauncher.container.alpha = 1;
					if (!Number.isFinite(appLauncher.container.zIndex) || appLauncher.container.zIndex < 120) {
						appLauncher.container.zIndex = 120;
					}
				}
				if (iconIntroProgress < 1) {
					iconIntroProgress = Math.min(1, iconIntroProgress + seconds * introSpeed);
				}

				const coreScreen = getCoreScreenPos();
				const coreDist = Math.hypot(mouse.x - coreScreen.x, mouse.y - coreScreen.y);
				const hoverTarget = !dragEnabled && coreDist <= getCoreControlRadius() ? 1 : 0;
				coreHoverAmount += (hoverTarget - coreHoverAmount) * Math.min(1, seconds * 12);
				drawSystemCore(time);

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
				const mouseWorld = {
					x: (screenX - cx - cameraOffset.x) / SCENE_SCALE + cx,
					y: (screenY - cy - cameraOffset.y) / SCENE_SCALE + cy,
					down: mouse.down,
				};
				cursorContainer.position.set(screenX, screenY);
				scene.position.set(
					app.renderer.width / 2 + cameraOffset.x,
					app.renderer.height / 2 + cameraOffset.y,
				);

				if (!dragEnabled) {
					try {
						appLauncher.layout(launcherLayoutSnap);
						layoutBlogIcon(launcherLayoutSnap);
						layoutLinkedinIcon(launcherLayoutSnap);
						layoutReflexIcon(launcherLayoutSnap);
						layoutWalklatroIcon(launcherLayoutSnap);
					} catch (error) {
						fallbackLayoutFailed = true;
						console.error('[launcher-runtime] fallback layout failed', error);
					}
				}

				try {
					appLauncher.update(time, seconds, mouseWorld);
				} catch (error) {
					fallbackLauncherUpdateFailed = true;
					console.error('[launcher-runtime] fallback app launcher update failed', error);
				}
				try {
					iconSfxMonitor.update();
				} catch (error) {
					console.error('[launcher-runtime] fallback icon sfx monitor update failed', error);
				}
				if (fallbackLayoutFailed || fallbackLauncherUpdateFailed) {
					forceLauncherVisualRecovery(seconds);
				}

				launcherArcadeFrameResult = {
					iconIntroProgress,
					ringSpin,
					ringSpinVel,
					coreHoverAmount,
					ambientDebrisFrameCounter,
					lastMouseWorld: mouseWorld,
					targetBackgroundInfluencerCount: 0,
					launcherUpdateFailed: fallbackLauncherUpdateFailed,
					mouseWorld,
				};
			}
			iconIntroProgress = Number.isFinite(launcherArcadeFrameResult.iconIntroProgress)
				? launcherArcadeFrameResult.iconIntroProgress
				: 1;
			ringSpin = launcherArcadeFrameResult.ringSpin;
			ringSpinVel = launcherArcadeFrameResult.ringSpinVel;
			coreHoverAmount = launcherArcadeFrameResult.coreHoverAmount;
			ambientDebrisFrameCounter = launcherArcadeFrameResult.ambientDebrisFrameCounter;
			lastMouseWorld = launcherArcadeFrameResult.lastMouseWorld;
			targetBackgroundInfluencerCount = launcherArcadeFrameResult.targetBackgroundInfluencerCount;
			if (launcherArcadeFrameResult.launcherUpdateFailed) {
				forceLauncherVisualRecovery(seconds);
			}
			enforceLauncherRingVisibility(seconds);
			const mouseWorld = launcherArcadeFrameResult.mouseWorld || lastMouseWorld || {
				x: app.renderer.width * 0.5,
				y: app.renderer.height * 0.5,
				down: false,
			};
			try {
				const lampBoostByIndex = new Array(vines.length).fill(0);
				if (moodState.activeMoodEntry?.container) {
					const hoverX = moodState.activeMoodEntry.container.position.x;
					const hoverY = moodState.activeMoodEntry.container.position.y;
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
			} catch (error) {
				console.error('[launcher-runtime] vine/lamp frame update failed', error);
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
					w *= Math.pow(SWING_DAMP, dtFrames);
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
			} catch (error) {
				const errorNowMs = nowMs();
				if (errorNowMs - mainTickerLastErrorAt > 1000) {
					mainTickerLastErrorAt = errorNowMs;
					console.error('[main-ticker] uncaught frame error; running recovery path', error);
				}

				const safeSeconds = Math.max(0, dtFrames / 60);
				time += safeSeconds;

				if (!vineLabActive) {
					try {
						scene.visible = true;
						if (iconIntroProgress < 1) {
							iconIntroProgress = Math.min(1, iconIntroProgress + safeSeconds * 1.25);
						}

						drawSystemCore(time);

						const rendererWidth = Math.max(1, app.renderer.width);
						const rendererHeight = Math.max(1, app.renderer.height);
						const screenX = Math.max(0, Math.min(rendererWidth, mouse.x));
						const screenY = Math.max(0, Math.min(rendererHeight, mouse.y));
						const nx = (screenX / rendererWidth) * 2 - 1;
						const ny = (screenY / rendererHeight) * 2 - 1;
						const targetX = -nx * cameraParallax;
						const targetY = -ny * cameraParallax;
						cameraOffset.x += (targetX - cameraOffset.x) * CAMERA_SMOOTHING;
						cameraOffset.y += (targetY - cameraOffset.y) * CAMERA_SMOOTHING;
						updateFlowBackground(time, cameraOffset);

						const cx = rendererWidth * 0.5;
						const cy = rendererHeight * 0.5;
						const safeMouseWorld = {
							x: (screenX - cx - cameraOffset.x) / SCENE_SCALE + cx,
							y: (screenY - cy - cameraOffset.y) / SCENE_SCALE + cy,
							down: Boolean(mouse.down),
						};
						lastMouseWorld = safeMouseWorld;
						cursorContainer.position.set(screenX, screenY);
						scene.position.set(
							rendererWidth * 0.5 + cameraOffset.x,
							rendererHeight * 0.5 + cameraOffset.y,
						);

						if (!dragEnabled) {
							const recoveryLayoutSnap = nowMs() >= launcherReturnToRingUntilMs;
							appLauncher.layout(recoveryLayoutSnap);
							layoutBlogIcon(recoveryLayoutSnap);
							layoutLinkedinIcon(recoveryLayoutSnap);
							layoutReflexIcon(recoveryLayoutSnap);
							layoutWalklatroIcon(recoveryLayoutSnap);
						}

						appLauncher.update(time, safeSeconds, safeMouseWorld);
						iconSfxMonitor.update();
					} catch (recoveryError) {
						if (errorNowMs - mainTickerLastErrorAt > 1000) {
							mainTickerLastErrorAt = errorNowMs;
							console.error('[main-ticker] recovery path failed', recoveryError);
						}
					}
				}
			}
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




