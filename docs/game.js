import { Player } from './player.js';
import { createVines } from './vines.js';
import { createBlogIcon } from './blogIcon.js';
import { createLinkedinIcon } from './linkedinIcon.js';
import { createReflexIcon } from './reflex/reflexIcon.js';
import { createWalklatroIcon } from './walklatro/walklatroIcon.js';
import { createCrimsonFlowBackground } from './background.js?v=2';
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
		const portfolioUi = document.getElementById('portfolio-ui');
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
		const setPortfolioUiActive = (active) => {
			if (!portfolioUi) return;
			portfolioUi.setAttribute('aria-hidden', active ? 'false' : 'true');
		};
		setPortfolioUiActive(false);
		let tryCloseDesktopTwoPortfolioWindow = () => false;
		let desktopTwoApp = null;
		let desktopTwoActive = false;
		let onDesktopTwoActivated = null;
		let onDesktopTwoExitRequested = null;
		let pendingDesktopTwoTape = null;
		let setDesktopTwoLoadedTape = (tape) => {
			pendingDesktopTwoTape = tape ? { ...tape } : null;
		};
		let livingRoomActive = false;
		let closeLivingRoomScene = () => {};
		let openLivingRoomScene = () => {};
		let closePortfolioLibraryNow = () => {};
		let openPortfolioLibraryNow = () => {};
		let returnToTvAreaFromFullscreen = () => {};
		let isFullscreenTvPlaybackActive = () => false;
		const ensureDesktopTwoBackground = () => {
			if (!desktopTwoRoot || desktopTwoApp) return;
			const DESKTOP_TWO_BG = 0x090b10;
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
			desktopTwoRoot.style.backgroundColor = '#090b10';
			desktopTwoApp.view.style.width = '100%';
			desktopTwoApp.view.style.height = '100%';
			desktopTwoApp.view.style.display = 'block';
			desktopTwoApp.view.style.backgroundColor = '#090b10';
			const desktopTwoBaseFill = new PIXI.Sprite(PIXI.Texture.WHITE);
			desktopTwoBaseFill.tint = DESKTOP_TWO_BG;
			desktopTwoBaseFill.position.set(0, 0);
			desktopTwoBaseFill.width = desktopTwoApp.renderer.width;
			desktopTwoBaseFill.height = desktopTwoApp.renderer.height;
			desktopTwoApp.stage.addChild(desktopTwoBaseFill);
			const desktopTwoScene = new PIXI.Container();
			desktopTwoScene.sortableChildren = true;
			desktopTwoApp.stage.addChild(desktopTwoScene);
			const {
				container: desktopTwoFlow,
				update: updateDesktopTwoFlow,
				resize: resizeDesktopTwoFlow,
				setAmbience: setDesktopTwoFlowAmbience,
			} = createCrimsonFlowBackground(desktopTwoApp, {
				lineColor: 0x2a1414,
				glowColor: 0x8f1b31,
				bgColor: DESKTOP_TWO_BG,
				glowAlpha: 0.55,
				parallax: 0.06,
				pixelSize: 8,
				density: 4.6,
				speed: 0.75,
			});
			const { filter: desktopTwoFisheyeFilter, uniforms: desktopTwoFisheyeUniforms } = createCRTFisheyeFilter(desktopTwoApp, {
				intensity: 0.08,
				brightness: 0.06,
				scanStrength: 0.85,
				curve: 0.008,
				vignette: 0.0,
				edgeColor: DESKTOP_TWO_BG,
			});
			const { filter: desktopTwoScanlinesFilter, uniforms: desktopTwoScanlinesUniforms } = createCRTScanlinesFilter(desktopTwoApp, {
				strength: 0.18,
				speed: 0.08,
				noise: 0.0,
				mask: 0.06,
			});
			desktopTwoFisheyeFilter.padding = 16;
			desktopTwoScene.filters = [desktopTwoFisheyeFilter, desktopTwoScanlinesFilter];
			desktopTwoScene.filterArea = new PIXI.Rectangle(0, 0, desktopTwoApp.renderer.width, desktopTwoApp.renderer.height);
			desktopTwoScene.addChild(desktopTwoFlow);

			const mixDesktopColor = (a, b, t) => {
				const tt = Math.max(0, Math.min(1, t));
				const ar = (a >> 16) & 255;
				const ag = (a >> 8) & 255;
				const ab = a & 255;
				const br = (b >> 16) & 255;
				const bg = (b >> 8) & 255;
				const bb = b & 255;
				const rr = Math.round(ar + (br - ar) * tt);
				const rg = Math.round(ag + (bg - ag) * tt);
				const rb = Math.round(ab + (bb - ab) * tt);
				return (rr << 16) | (rg << 8) | rb;
			};
			const stepDesktopColor = (from, to, t) => {
				const tt = Math.max(0, Math.min(1, t));
				const fr = (from >> 16) & 255;
				const fg = (from >> 8) & 255;
				const fb = from & 255;
				const tr = (to >> 16) & 255;
				const tg = (to >> 8) & 255;
				const tb = to & 255;
				const nr = Math.round(fr + (tr - fr) * tt);
				const ng = Math.round(fg + (tg - fg) * tt);
				const nb = Math.round(fb + (tb - fb) * tt);
				return (nr << 16) | (ng << 8) | nb;
			};
			const makeDesktopTwoNoiseTexture = () => {
				const canvas = document.createElement('canvas');
				canvas.width = 128;
				canvas.height = 128;
				const ctx = canvas.getContext('2d');
				if (!ctx) return PIXI.Texture.WHITE;
				ctx.clearRect(0, 0, canvas.width, canvas.height);
				for (let i = 0; i < 650; i++) {
					const x = Math.floor(Math.random() * canvas.width);
					const y = Math.floor(Math.random() * canvas.height);
					const a = 0.025 + Math.random() * 0.045;
					ctx.fillStyle = `rgba(52, 39, 24, ${a.toFixed(3)})`;
					ctx.fillRect(x, y, 1, 1);
				}
				return PIXI.Texture.from(canvas);
			};
			const desktopTwoFlowBase = {
				lineColor: 0x2a1414,
				glowColor: 0x8f1b31,
				mistColorB: 0x6a5643,
				mistColorC: 0x8a6f51,
				speed: 0.75,
				density: 4.6,
				glowStrength: 0.35,
			};
			const portfolioPanel = new PIXI.Container();
			const portfolioShadow = new PIXI.Graphics();
			const portfolioOuterGlowMagenta = new PIXI.Graphics();
			const portfolioOuterGlowTeal = new PIXI.Graphics();
			const portfolioBody = new PIXI.Graphics();
			const portfolioInnerBorder = new PIXI.Graphics();
			const portfolioAccent = new PIXI.Graphics();
			const portfolioCornerPixels = new PIXI.Graphics();
			const portfolioRigging = new PIXI.Graphics();
			const portfolioPlatform = new PIXI.Graphics();
			const portfolioMask = new PIXI.Graphics();
			const portfolioNoise = new PIXI.TilingSprite(makeDesktopTwoNoiseTexture(), 64, 64);
			portfolioNoise.alpha = 0;
			portfolioNoise.blendMode = PIXI.BLEND_MODES.MULTIPLY;
			portfolioNoise.mask = portfolioMask;
			const portfolioShelfLayer = new PIXI.Graphics();
			const portfolioFocusRails = new PIXI.Graphics();
			const portfolioStatusPanel = new PIXI.Graphics();
			const portfolioTitle = new PIXI.Text('PROJECT CARTRIDGES', {
				fontFamily: 'Minecraft, monospace',
				fontSize: 16,
				fill: 0x5a3f2b,
				align: 'center',
				letterSpacing: 1,
			});
			portfolioTitle.anchor.set(0.5, 0);
			const portfolioSub = new PIXI.Text('Select a cartridge to load', {
				fontFamily: 'Minecraft, monospace',
				fontSize: 10,
				fill: 0x7e6549,
				align: 'center',
				letterSpacing: 1,
			});
			portfolioSub.anchor.set(0.5, 0);
			portfolioSub.alpha = 0.92;
			const portfolioStatusText = new PIXI.Text('EMPTY BAY : 6 SLOTS', {
				fontFamily: 'Minecraft, monospace',
				fontSize: 10,
				fill: 0xd9e6f5,
				align: 'center',
				letterSpacing: 1,
			});
			portfolioStatusText.anchor.set(0.5, 0.5);

			const portfolioWindow = new PIXI.Container();
			const portfolioWindowGlow = new PIXI.Graphics();
			const portfolioWindowFrame = new PIXI.Graphics();
			const portfolioWindowInner = new PIXI.Graphics();
			const portfolioWindowTitlebar = new PIXI.Graphics();
			const portfolioWindowBody = new PIXI.Graphics();
			const portfolioWindowGallery = new PIXI.Graphics();
			const portfolioWindowGalleryMask = new PIXI.Graphics();
			const portfolioWindowInfo = new PIXI.Graphics();
			const portfolioWindowScanlines = new PIXI.Graphics();
			const portfolioWindowSweep = new PIXI.Graphics();
			const portfolioWindowClose = new PIXI.Container();
			const portfolioWindowCloseBg = new PIXI.Graphics();
			const portfolioWindowCloseX = new PIXI.Text('X', {
				fontFamily: 'Minecraft, monospace',
				fontSize: 11,
				fill: 0xffe1d3,
				align: 'center',
			});
			portfolioWindowCloseX.anchor.set(0.5, 0.5);
			portfolioWindowClose.addChild(portfolioWindowCloseBg, portfolioWindowCloseX);
			portfolioWindowClose.eventMode = 'static';
			portfolioWindowClose.cursor = 'pointer';
			let portfolioWindowCloseHover = 0;

			const portfolioWindowTitle = new PIXI.Text('PROJECT VIEWER', {
				fontFamily: 'Minecraft, monospace',
				fontSize: 13,
				fill: 0xf4e5cc,
				letterSpacing: 1,
			});
			portfolioWindowTitle.anchor.set(0, 0.5);
			const portfolioWindowHint = new PIXI.Text('Nothing here yet.', {
				fontFamily: 'Minecraft, monospace',
				fontSize: 10,
				fill: 0xe6cda9,
				letterSpacing: 1,
			});
			portfolioWindowHint.anchor.set(0, 0);
			const portfolioTypingPrefix = new PIXI.Text('', {
				fontFamily: 'Minecraft, monospace',
				fontSize: 13,
				fill: 0xf2e4cf,
				letterSpacing: 0.8,
			});
			const portfolioTypingWord = new PIXI.Text('', {
				fontFamily: 'Minecraft, monospace',
				fontSize: 13,
				fill: 0xffd56b,
				letterSpacing: 0.8,
			});
			const portfolioTypingSuffix = new PIXI.Text('', {
				fontFamily: 'Minecraft, monospace',
				fontSize: 13,
				fill: 0xf2e4cf,
				letterSpacing: 0.8,
			});
			const portfolioTypingCursor = new PIXI.Graphics();
			const portfolioPreview = new PIXI.Sprite(PIXI.Texture.from('./assets/images/Uh-Oh.png'));
			portfolioPreview.anchor.set(0.5, 0.5);
			portfolioPreview.alpha = 0.9;
			portfolioPreview.visible = false;
			portfolioPreview.mask = portfolioWindowGalleryMask;

			portfolioWindow.addChild(
				portfolioWindowGlow,
				portfolioWindowFrame,
				portfolioWindowInner,
				portfolioWindowTitlebar,
				portfolioWindowBody,
				portfolioWindowGallery,
				portfolioWindowGalleryMask,
				portfolioWindowInfo,
				portfolioWindowScanlines,
				portfolioWindowSweep,
				portfolioPreview,
				portfolioWindowTitle,
				portfolioWindowClose,
				portfolioTypingPrefix,
				portfolioTypingWord,
				portfolioTypingSuffix,
				portfolioTypingCursor,
				portfolioWindowHint,
			);
			const projectCartridgeDefs = [
				{ label: 'BLOG', tint: 0x5c9d6f, rare: false },
				{ label: 'REFLEX', tint: 0xcf5f8f, rare: false },
				{ label: 'WALKLATRO', tint: 0xd5a063, rare: true },
				{ label: 'RESUME', tint: 0xb58a59, rare: false },
				{ label: 'LINKEDIN', tint: 0x4f80bf, rare: false },
				{ label: 'GITHUB', tint: 0x7a659d, rare: true },
			];
			const DEFAULT_PORTFOLIO_SUB_LABEL = 'Select a cartridge to load';
			const DEFAULT_PORTFOLIO_STATUS_LABEL = 'EMPTY BAY : 6 SLOTS';
			const DEFAULT_PORTFOLIO_WINDOW_TITLE = 'PROJECT VIEWER';
			const DEFAULT_PORTFOLIO_WINDOW_HINT = 'Nothing here yet.';
			let desktopTwoLoadedTape = null;
			const applyDesktopTwoLoadedTape = () => {
				if (desktopTwoLoadedTape) {
					const statusLabel = (desktopTwoLoadedTape.status || 'wip').toUpperCase();
					portfolioSub.text = `Loaded tape: ${desktopTwoLoadedTape.label}`;
					portfolioStatusText.text = `${statusLabel} TAPE`;
					portfolioWindowTitle.text = `${desktopTwoLoadedTape.label} PLAYBACK`;
					portfolioWindowHint.text = desktopTwoLoadedTape.hasContent
						? 'Playback ready.'
						: 'Nothing here yet.';
					return;
				}
				portfolioSub.text = DEFAULT_PORTFOLIO_SUB_LABEL;
				portfolioStatusText.text = DEFAULT_PORTFOLIO_STATUS_LABEL;
				portfolioWindowTitle.text = DEFAULT_PORTFOLIO_WINDOW_TITLE;
				portfolioWindowHint.text = DEFAULT_PORTFOLIO_WINDOW_HINT;
			};
			setDesktopTwoLoadedTape = (tape) => {
				desktopTwoLoadedTape = tape ? { ...tape } : null;
				applyDesktopTwoLoadedTape();
			};
			if (pendingDesktopTwoTape) {
				setDesktopTwoLoadedTape(pendingDesktopTwoTape);
			}
			const slotLabelStyle = {
				fontFamily: 'Minecraft, monospace',
				fontSize: 9,
				fill: 0xe8dcc7,
				align: 'center',
				letterSpacing: 1,
			};
			const portfolioCartridges = projectCartridgeDefs.map((project, index) => {
				const node = new PIXI.Container();
				const glow = new PIXI.Graphics();
				const body = new PIXI.Graphics();
				const notch = new PIXI.Graphics();
				const labelStrip = new PIXI.Graphics();
				const details = new PIXI.Graphics();
				const led = new PIXI.Graphics();
				const label = new PIXI.Text('EMPTY', slotLabelStyle);
				label.anchor.set(0.5, 0.5);
				node.eventMode = 'static';
				node.cursor = 'pointer';
				node.addChild(glow, body, notch, labelStrip, details, led, label);
				return {
					index,
					tint: project.tint,
					rare: project.rare,
					node,
					glow,
					body,
					notch,
					labelStrip,
					details,
					led,
					label,
					hovered: false,
					hoverMix: 0,
				};
			});
			portfolioPanel.addChild(
				portfolioShadow,
				portfolioOuterGlowMagenta,
				portfolioOuterGlowTeal,
				portfolioBody,
				portfolioInnerBorder,
				portfolioAccent,
				portfolioCornerPixels,
				portfolioMask,
				portfolioNoise,
				portfolioRigging,
				portfolioPlatform,
				portfolioShelfLayer,
				portfolioStatusPanel,
				portfolioFocusRails,
			);
			for (const cartridge of portfolioCartridges) portfolioPanel.addChild(cartridge.node);
			portfolioPanel.addChild(portfolioTitle, portfolioSub, portfolioStatusText);
			portfolioPanel.zIndex = 10;
			portfolioWindow.zIndex = 20;
			desktopTwoScene.addChild(portfolioPanel, portfolioWindow);

			let desktopTwoPanelBoot = 0;
			let desktopTwoPanelBaseY = 0;
			let desktopTwoGlowBreath = 0;
			let desktopTwoCartridgeHover = -1;
			let desktopTwoLastCartridgeHover = -2;
			let desktopTwoFlowHoverCurrent = 0;
			let desktopTwoFlowTintCurrent = desktopTwoFlowBase.glowColor;
			const portfolioLayout = {
				panelW: 0,
				panelH: 0,
				cardW: 0,
				cardH: 0,
				xGap: 0,
				yGap: 0,
				startX: 0,
				startY: 0,
				statusY: 0,
				statusTopY: 0,
			};
			let portfolioWindowOpen = false;
			let portfolioWindowBoot = 0;
			let portfolioWindowScanPhase = 0;
			let portfolioTypingPrefixSrc = '';
			let portfolioTypingWordSrc = '';
			let portfolioTypingSuffixSrc = '';
			let portfolioTypingChars = 0;
			let portfolioTypingTimer = 0;
			let portfolioCursorTimer = 0;

			const applyPortfolioTypedLine = () => {
				const full = `${portfolioTypingPrefixSrc}${portfolioTypingWordSrc}${portfolioTypingSuffixSrc}`;
				const shown = full.slice(0, Math.max(0, Math.min(full.length, portfolioTypingChars)));
				const preLen = portfolioTypingPrefixSrc.length;
				const wordLen = portfolioTypingWordSrc.length;
				const pre = shown.slice(0, preLen);
				const word = shown.slice(preLen, preLen + wordLen);
				const suf = shown.slice(preLen + wordLen);
				portfolioTypingPrefix.text = pre;
				portfolioTypingWord.text = word;
				portfolioTypingSuffix.text = suf;
				portfolioTypingWord.x = portfolioTypingPrefix.x + portfolioTypingPrefix.width;
				portfolioTypingSuffix.x = portfolioTypingWord.x + portfolioTypingWord.width;
				portfolioTypingCursor.clear();
				portfolioTypingCursor.beginFill(0xf3e0c0, 0.95);
				portfolioTypingCursor.drawRect(0, 0, 8, 13);
				portfolioTypingCursor.endFill();
				portfolioTypingCursor.position.set(portfolioTypingSuffix.x + portfolioTypingSuffix.width + 4, portfolioTypingPrefix.y + 1);
			};

			const openPortfolioWindow = () => {
				portfolioWindowOpen = true;
				portfolioWindowScanPhase = 0;
				portfolioTypingPrefixSrc = desktopTwoLoadedTape?.hasContent ? 'Loading tape, ' : 'Nothing here yet, ';
				portfolioTypingWordSrc = pickBroPlaceholderWord();
				portfolioTypingSuffixSrc = desktopTwoLoadedTape?.hasContent ? '...' : '.';
				portfolioTypingChars = 0;
				portfolioTypingTimer = 0;
				portfolioCursorTimer = 0;
				applyPortfolioTypedLine();
			};

			const closePortfolioWindow = () => {
				portfolioWindowOpen = false;
			};

			tryCloseDesktopTwoPortfolioWindow = () => {
				if (!portfolioWindowOpen && portfolioWindowBoot <= 0.04) return false;
				closePortfolioWindow();
				return true;
			};

			const setDesktopTwoCartridgeHover = (index, hovered) => {
				if (hovered) {
					desktopTwoCartridgeHover = index;
					return;
				}
				if (desktopTwoCartridgeHover === index) desktopTwoCartridgeHover = -1;
			};
			for (const cartridge of portfolioCartridges) {
				cartridge.node.on('pointerover', () => setDesktopTwoCartridgeHover(cartridge.index, true));
				cartridge.node.on('pointerout', () => setDesktopTwoCartridgeHover(cartridge.index, false));
				cartridge.node.on('pointertap', openPortfolioWindow);
			}
			portfolioWindowClose.on('pointerover', () => { portfolioWindowCloseHover = 1; });
			portfolioWindowClose.on('pointerout', () => { portfolioWindowCloseHover = 0; });
			portfolioWindowClose.on('pointertap', closePortfolioWindow);

			const drawPortfolioCartridges = (dtSeconds, timeNow = 0) => {
				portfolioFocusRails.clear();
				const { cardW, cardH, startX, startY, xGap, yGap, statusTopY } = portfolioLayout;
				if (cardW <= 0 || cardH <= 0) return;
				const cols = 3;
				portfolioCartridges.forEach((cartridge, idx) => {
					const col = idx % cols;
					const row = Math.floor(idx / cols) % 2;
					const x = startX + xGap * col;
					const y = startY + yGap * row;
					const targetHover = desktopTwoCartridgeHover === idx ? 1 : 0;
					const lerpT = Math.min(1, dtSeconds > 0 ? dtSeconds * 12 : 1);
					cartridge.hoverMix += (targetHover - cartridge.hoverMix) * lerpT;
					const h = Math.max(0, Math.min(1, cartridge.hoverMix));

					cartridge.node.position.set(x, y);
					cartridge.node.scale.set(1 + h * 0.04);

					cartridge.glow.clear();
					cartridge.glow.beginFill(cartridge.tint, 0.06 + h * 0.2);
					cartridge.glow.drawRoundedRect(-cardW * 0.53, -cardH * 0.53, cardW * 1.06, cardH * 1.06, 7);
					cartridge.glow.endFill();

					cartridge.body.clear();
					cartridge.body.beginFill(0x261b13, 0.96);
					cartridge.body.lineStyle(2, mixDesktopColor(0x7b6550, cartridge.tint, 0.16 + h * 0.24), 0.9);
					cartridge.body.drawRoundedRect(-cardW * 0.5, -cardH * 0.5, cardW, cardH, 6);
					cartridge.body.endFill();

					cartridge.notch.clear();
					cartridge.notch.beginFill(0x1f170f, 0.9);
					cartridge.notch.drawRoundedRect(-cardW * 0.18, -cardH * 0.5, cardW * 0.36, cardH * 0.2, 4);
					cartridge.notch.endFill();

					cartridge.labelStrip.clear();
					cartridge.labelStrip.beginFill(0x3b2a1d, 0.95);
					cartridge.labelStrip.drawRoundedRect(-cardW * 0.48, cardH * 0.14, cardW * 0.96, cardH * 0.3, 4);
					cartridge.labelStrip.endFill();

					cartridge.details.clear();
					cartridge.details.lineStyle(1, 0x9a8468, 0.8);
					cartridge.details.drawCircle(-cardW * 0.38, -cardH * 0.34, Math.max(2, cardH * 0.06));
					cartridge.details.drawCircle(cardW * 0.38, -cardH * 0.34, Math.max(2, cardH * 0.06));
					cartridge.details.drawCircle(-cardW * 0.38, cardH * 0.02, Math.max(2, cardH * 0.05));
					cartridge.details.drawCircle(cardW * 0.38, cardH * 0.02, Math.max(2, cardH * 0.05));

					const ledPulse = 0.06 + (0.06 + 0.04 * Math.sin(timeNow * 1.7 + idx * 0.8)) * (0.15 + h * 0.85);
					cartridge.led.clear();
					cartridge.led.beginFill(0x0d1117, 0.7);
					cartridge.led.drawCircle(cardW * 0.32, -cardH * 0.33, Math.max(2, cardH * 0.07));
					cartridge.led.endFill();
					const ledColor = cartridge.rare ? 0xffd56b : 0x5ef0cb;
					cartridge.led.beginFill(ledColor, ledPulse);
					cartridge.led.drawCircle(cardW * 0.32, -cardH * 0.33, Math.max(1.5, cardH * 0.045));
					cartridge.led.endFill();

					cartridge.label.style.fill = mixDesktopColor(0xe8dcc7, 0xfff2da, h * 0.85);
					cartridge.label.position.set(0, cardH * 0.295);

					if (h > 0.03) {
						const railColor = mixDesktopColor(0x5a6b77, cartridge.tint, 0.4);
						portfolioFocusRails.lineStyle(1.2, railColor, 0.08 + h * 0.2);
						const fromY = y + cardH * 0.54;
						const midY = statusTopY - 12;
						portfolioFocusRails.moveTo(x, fromY);
						portfolioFocusRails.lineTo(x * 0.8, midY);
						portfolioFocusRails.lineTo(0, statusTopY);
					}
				});
			};

			const layoutPortfolioPanel = () => {
				const w = desktopTwoApp.renderer.width;
				const h = desktopTwoApp.renderer.height;
				const panelW = Math.max(540, Math.min(1120, w * 0.78));
				const panelH = Math.max(360, Math.min(780, h * 0.76));
				const r = Math.max(12, Math.round(Math.min(panelW, panelH) * 0.03));
				desktopTwoPanelBaseY = h * 0.52;
				portfolioPanel.position.set(w * 0.5, desktopTwoPanelBaseY);

				portfolioShadow.clear();
				portfolioShadow.beginFill(0x000000, 0.24);
				portfolioShadow.drawRoundedRect(-panelW * 0.52 + 10, panelH * 0.34, panelW * 1.04, panelH * 0.24, r + 6);
				portfolioShadow.endFill();

				portfolioOuterGlowMagenta.clear();
				portfolioOuterGlowMagenta.lineStyle(5, 0xa53567, 0.1 + desktopTwoGlowBreath * 0.05);
				portfolioOuterGlowMagenta.drawRoundedRect(-panelW * 0.5 - 3, -panelH * 0.5 - 3, panelW + 6, panelH + 6, r + 2);

				portfolioOuterGlowTeal.clear();
				portfolioOuterGlowTeal.lineStyle(4, 0x35b1a0, 0.08 + desktopTwoGlowBreath * 0.04);
				portfolioOuterGlowTeal.drawRoundedRect(-panelW * 0.5 - 1, -panelH * 0.5 - 1, panelW + 2, panelH + 2, r + 1);

				portfolioBody.clear();
				portfolioBody.beginFill(0xd6c3a3, 0.97);
				portfolioBody.drawRoundedRect(-panelW * 0.5, -panelH * 0.5, panelW, panelH, r);
				portfolioBody.endFill();
				portfolioBody.lineStyle(3, 0x222028, 0.92);
				portfolioBody.drawRoundedRect(-panelW * 0.5, -panelH * 0.5, panelW, panelH, r);

				portfolioInnerBorder.clear();
				portfolioInnerBorder.lineStyle(2, 0xe0c8a4, 0.62);
				portfolioInnerBorder.drawRoundedRect(-panelW * 0.5 + 8, -panelH * 0.5 + 8, panelW - 16, panelH - 16, Math.max(8, r - 4));

				portfolioAccent.clear();
				portfolioAccent.lineStyle(2, 0x8f1b31, 0.24);
				portfolioAccent.moveTo(-panelW * 0.46, -panelH * 0.33);
				portfolioAccent.lineTo(panelW * 0.46, -panelH * 0.33);
				portfolioAccent.lineStyle(1.5, 0x3bb9a6, 0.16);
				portfolioAccent.moveTo(-panelW * 0.46, panelH * 0.34);
				portfolioAccent.lineTo(panelW * 0.46, panelH * 0.34);

				portfolioCornerPixels.clear();
				const px = Math.max(3, Math.round(panelW * 0.006));
				const drawCornerPixels = (x, y, c) => {
					portfolioCornerPixels.beginFill(c, 0.9);
					portfolioCornerPixels.drawRect(x, y, px, px);
					portfolioCornerPixels.drawRect(x + px, y, px, px);
					portfolioCornerPixels.drawRect(x, y + px, px, px);
					portfolioCornerPixels.endFill();
				};
				drawCornerPixels(-panelW * 0.5 + 12, -panelH * 0.5 + 12, 0x9f2b4f);
				drawCornerPixels(panelW * 0.5 - 12 - px * 2, -panelH * 0.5 + 12, 0x3dc2aa);
				drawCornerPixels(-panelW * 0.5 + 12, panelH * 0.5 - 12 - px * 2, 0x3dc2aa);
				drawCornerPixels(panelW * 0.5 - 12 - px * 2, panelH * 0.5 - 12 - px * 2, 0x9f2b4f);

				portfolioMask.clear();
				portfolioMask.beginFill(0xffffff, 1);
				portfolioMask.drawRoundedRect(-panelW * 0.5 + 4, -panelH * 0.5 + 4, panelW - 8, panelH - 8, Math.max(8, r - 3));
				portfolioMask.endFill();
				portfolioNoise.width = panelW - 8;
				portfolioNoise.height = panelH - 8;
				portfolioNoise.position.set(-panelW * 0.5 + 4, -panelH * 0.5 + 4);

				portfolioRigging.clear();
				portfolioRigging.lineStyle(2, 0x57412f, 0.45);
				portfolioRigging.moveTo(-panelW * 0.34, -panelH * 0.58);
				portfolioRigging.lineTo(-panelW * 0.34, -panelH * 0.5 + 8);
				portfolioRigging.moveTo(panelW * 0.34, -panelH * 0.58);
				portfolioRigging.lineTo(panelW * 0.34, -panelH * 0.5 + 8);

				portfolioPlatform.clear();
				portfolioPlatform.beginFill(0x1e2a35, 0.16);
				portfolioPlatform.drawRoundedRect(-panelW * 0.48, panelH * 0.36, panelW * 0.96, panelH * 0.15, Math.max(8, r - 4));
				portfolioPlatform.endFill();

				portfolioTitle.position.set(0, -panelH * 0.42);
				portfolioSub.position.set(0, -panelH * 0.35);

				portfolioShelfLayer.clear();
				portfolioShelfLayer.lineStyle(3, 0x8f734f, 0.72);
				const shelfTop = -panelH * 0.22;
				const shelfGap = panelH * 0.31;
				for (let i = 0; i < 2; i++) {
					const y = shelfTop + shelfGap * i;
					portfolioShelfLayer.moveTo(-panelW * 0.38, y);
					portfolioShelfLayer.lineTo(panelW * 0.38, y);
					portfolioShelfLayer.lineStyle(1.2, 0xe0c8a4, 0.34);
					portfolioShelfLayer.moveTo(-panelW * 0.38, y - 2);
					portfolioShelfLayer.lineTo(panelW * 0.38, y - 2);
					portfolioShelfLayer.lineStyle(3, 0x8f734f, 0.72);
				}

				portfolioLayout.panelW = panelW;
				portfolioLayout.panelH = panelH;
				portfolioLayout.cardW = panelW * 0.2;
				portfolioLayout.cardH = panelH * 0.16;
				portfolioLayout.xGap = panelW * 0.26;
				portfolioLayout.yGap = panelH * 0.31;
				portfolioLayout.startX = -portfolioLayout.xGap;
				portfolioLayout.startY = -panelH * 0.2;
				portfolioLayout.statusY = panelH * 0.395;
				const statusW = panelW * 0.48;
				const statusH = panelH * 0.1;
				portfolioLayout.statusTopY = portfolioLayout.statusY - statusH * 0.5;

				portfolioStatusPanel.clear();
				portfolioStatusPanel.beginFill(0x1f2d3d, 0.35);
				portfolioStatusPanel.lineStyle(2, 0x7f99b7, 0.38);
				portfolioStatusPanel.drawRoundedRect(-statusW * 0.5, portfolioLayout.statusY - statusH * 0.5, statusW, statusH, 8);
				portfolioStatusPanel.endFill();
				portfolioStatusText.position.set(0, portfolioLayout.statusY);
				for (const cartridge of portfolioCartridges) {
					cartridge.label.style.fontSize = Math.max(10, Math.round(portfolioLayout.cardH * 0.27));
				}

				drawPortfolioCartridges(0, 0);

				const winW = Math.max(460, Math.min(920, w * 0.72));
				const winH = Math.max(300, Math.min(560, h * 0.66));
				const winR = Math.max(10, Math.round(Math.min(winW, winH) * 0.03));
				const titleH = Math.max(42, Math.round(winH * 0.12));
				portfolioWindow.position.set(w * 0.5, h * 0.5);

				portfolioWindowGlow.clear();
				portfolioWindowGlow.lineStyle(4, 0xaa2f62, 0.14 + desktopTwoGlowBreath * 0.08);
				portfolioWindowGlow.drawRoundedRect(-winW * 0.5 - 4, -winH * 0.5 - 4, winW + 8, winH + 8, winR + 2);

				portfolioWindowFrame.clear();
				portfolioWindowFrame.beginFill(0xd6c3a3, 0.98);
				portfolioWindowFrame.drawRoundedRect(-winW * 0.5, -winH * 0.5, winW, winH, winR);
				portfolioWindowFrame.endFill();
				portfolioWindowFrame.lineStyle(3, 0x10161f, 0.96);
				portfolioWindowFrame.drawRoundedRect(-winW * 0.5, -winH * 0.5, winW, winH, winR);

				portfolioWindowInner.clear();
				portfolioWindowInner.lineStyle(2, 0xe0c8a4, 0.58);
				portfolioWindowInner.drawRoundedRect(-winW * 0.5 + 8, -winH * 0.5 + 8, winW - 16, winH - 16, Math.max(8, winR - 4));

				portfolioWindowTitlebar.clear();
				portfolioWindowTitlebar.beginFill(0x263145, 0.95);
				portfolioWindowTitlebar.drawRoundedRect(-winW * 0.5 + 4, -winH * 0.5 + 4, winW - 8, titleH, Math.max(8, winR - 4));
				portfolioWindowTitlebar.endFill();

				portfolioWindowBody.clear();
				portfolioWindowBody.beginFill(0x1a2433, 0.94);
				portfolioWindowBody.drawRoundedRect(-winW * 0.5 + 16, -winH * 0.5 + titleH + 12, winW - 32, winH - titleH - 28, 10);
				portfolioWindowBody.endFill();

				const galleryX = -winW * 0.5 + 34;
				const galleryY = -winH * 0.5 + titleH + 28;
				const galleryW = winW * 0.56;
				const galleryH = winH - titleH - 66;
				const infoX = galleryX + galleryW + 18;
				const infoW = winW - (infoX + winW * 0.5) - 22;
				const infoH = galleryH;

				portfolioWindowGallery.clear();
				portfolioWindowGallery.beginFill(0x101720, 0.95);
				portfolioWindowGallery.lineStyle(2, 0x303e52, 0.85);
				portfolioWindowGallery.drawRoundedRect(galleryX, galleryY, galleryW, galleryH, 8);
				portfolioWindowGallery.endFill();
				portfolioWindowGalleryMask.clear();
				portfolioWindowGalleryMask.beginFill(0xffffff, 1);
				portfolioWindowGalleryMask.drawRoundedRect(galleryX + 2, galleryY + 2, Math.max(4, galleryW - 4), Math.max(4, galleryH - 4), 7);
				portfolioWindowGalleryMask.endFill();

				portfolioWindowInfo.clear();
				portfolioWindowInfo.beginFill(0x3a2c1d, 0.82);
				portfolioWindowInfo.lineStyle(2, 0x76583d, 0.85);
				portfolioWindowInfo.drawRoundedRect(infoX, galleryY, infoW, infoH, 8);
				portfolioWindowInfo.endFill();

				portfolioWindowScanlines.clear();
				portfolioWindowScanlines.lineStyle(1, 0xffffff, 0.055);
				const linesTop = -winH * 0.5 + titleH + 16;
				const linesBottom = winH * 0.5 - 16;
				for (let y = linesTop; y <= linesBottom; y += 4) {
					portfolioWindowScanlines.moveTo(-winW * 0.5 + 12, y);
					portfolioWindowScanlines.lineTo(winW * 0.5 - 12, y);
				}

				portfolioWindowTitle.position.set(-winW * 0.5 + 22, -winH * 0.5 + 4 + titleH * 0.5);
				portfolioWindowClose.position.set(winW * 0.5 - 28, -winH * 0.5 + 8 + titleH * 0.5);
				portfolioWindowCloseBg.clear();
				portfolioWindowCloseBg.beginFill(0xa5374d, 0.92 + portfolioWindowCloseHover * 0.08);
				portfolioWindowCloseBg.lineStyle(2, 0x6d2032, 0.95);
				portfolioWindowCloseBg.drawRoundedRect(-14, -11, 28, 22, 5);
				portfolioWindowCloseBg.endFill();
				portfolioWindowCloseX.position.set(0, 0);

				portfolioPreview.width = Math.min(galleryW * 0.74, galleryH * 0.74);
				portfolioPreview.height = portfolioPreview.width;
				portfolioPreview.position.set(galleryX + galleryW * 0.5, galleryY + galleryH * 0.5);

				portfolioTypingPrefix.position.set(infoX + 14, galleryY + 22);
				portfolioTypingWord.position.set(portfolioTypingPrefix.x, portfolioTypingPrefix.y);
				portfolioTypingSuffix.position.set(portfolioTypingPrefix.x, portfolioTypingPrefix.y);
				portfolioWindowHint.position.set(infoX + 14, galleryY + 52);
				applyPortfolioTypedLine();
			};
			layoutPortfolioPanel();
			applyDesktopTwoLoadedTape();

			const rightPortal = new PIXI.Container();
			const rightGlowSoft = new PIXI.Graphics();
			const rightGlow = new PIXI.Graphics();
			const rightArrow = new PIXI.Graphics();
			const rightPortalHitZone = new PIXI.Graphics();
			rightPortal.addChild(rightGlowSoft, rightGlow, rightArrow, rightPortalHitZone);
			rightPortal.zIndex = 30;
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
			let desktopTwoCursorSpriteRef = null;
			const desktopTwoCursorFallbackHalf = Math.max(10, frameW * 0.45);
			const updateDesktopTwoMouse = (event) => {
				if (!desktopTwoApp?.view) return;
				const rect = desktopTwoApp.view.getBoundingClientRect();
				if (!rect || rect.width <= 0 || rect.height <= 0) return;
				const x = (event.clientX - rect.left) * (desktopTwoApp.renderer.width / rect.width);
				const y = (event.clientY - rect.top) * (desktopTwoApp.renderer.height / rect.height);
				const cursorHalfW = desktopTwoCursorSpriteRef ? desktopTwoCursorSpriteRef.width * 0.5 : desktopTwoCursorFallbackHalf;
				const cursorHalfH = desktopTwoCursorSpriteRef ? desktopTwoCursorSpriteRef.height * 0.5 : desktopTwoCursorFallbackHalf;
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
			desktopTwoCursorSpriteRef = desktopTwoCursorSprite;
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
			desktopTwoCursor.zIndex = 999;
			const { filter: desktopTwoCursorPixelate, update: updateDesktopTwoCursorPixelate } = createPixelateFilter(desktopTwoApp, { pixelSize: 2 });
			desktopTwoCursor.filters = [desktopTwoCursorPixelate];
			desktopTwoScene.addChild(desktopTwoCursor);
			document.documentElement.classList.add('desktop-two-cursor-ready');

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
				const dtSeconds = dt / 60;
				updateCRTFisheyeFilter({ uniforms: desktopTwoFisheyeUniforms }, desktopTwoApp, dt / 60);
				updateCRTScanlinesFilter({ uniforms: desktopTwoScanlinesUniforms }, desktopTwoApp, dt / 60);
				const nx = (desktopTwoMouse.x / Math.max(1, desktopTwoApp.renderer.width)) * 2 - 1;
				const ny = (desktopTwoMouse.y / Math.max(1, desktopTwoApp.renderer.height)) * 2 - 1;
				const targetX = -nx * DESKTOP_TWO_PARALLAX;
				const targetY = -ny * DESKTOP_TWO_PARALLAX;
				desktopTwoCameraOffset.x += (targetX - desktopTwoCameraOffset.x) * DESKTOP_TWO_SMOOTHING;
				desktopTwoCameraOffset.y += (targetY - desktopTwoCameraOffset.y) * DESKTOP_TWO_SMOOTHING;
				desktopTwoPanelBoot += ((desktopTwoActive ? 1 : 0) - desktopTwoPanelBoot) * Math.min(1, dtSeconds * 9);
				desktopTwoGlowBreath = 0.5 + 0.5 * Math.sin(desktopTwoTime * 1.8);
				portfolioPanel.visible = desktopTwoPanelBoot > 0.01;
				portfolioPanel.alpha = desktopTwoPanelBoot;
				portfolioPanel.scale.set(0.98 + desktopTwoPanelBoot * 0.02);
				portfolioPanel.position.y = desktopTwoPanelBaseY + Math.sin(desktopTwoTime * 1.3) * 2.2 * desktopTwoPanelBoot;

				portfolioWindowBoot += ((portfolioWindowOpen ? 1 : 0) - portfolioWindowBoot) * Math.min(1, dtSeconds * 12);
				portfolioWindow.visible = portfolioWindowBoot > 0.02;
				portfolioWindow.alpha = portfolioWindowBoot;
				portfolioWindow.scale.set(0.98 + portfolioWindowBoot * 0.02);
				portfolioWindowClose.scale.set(1 + portfolioWindowCloseHover * 0.04);
				portfolioPreview.visible = portfolioWindow.visible;

				if (portfolioWindow.visible) {
					portfolioWindowScanPhase += dtSeconds * (portfolioWindowOpen ? 1.8 : 0.8);
					portfolioWindowSweep.clear();
					const sweepW = desktopTwoApp.renderer.width * 0.62;
					const sweepH = 10;
					const y = -desktopTwoApp.renderer.height * 0.23 + ((portfolioWindowScanPhase * 120) % (desktopTwoApp.renderer.height * 0.44));
					portfolioWindowSweep.beginFill(0x9ad8ff, 0.08 + Math.max(0, 1 - portfolioWindowBoot) * 0.22);
					portfolioWindowSweep.drawRoundedRect(-sweepW * 0.5, y, sweepW, sweepH, 4);
					portfolioWindowSweep.endFill();

					if (portfolioWindowOpen) {
						const totalChars = (`${portfolioTypingPrefixSrc}${portfolioTypingWordSrc}${portfolioTypingSuffixSrc}`).length;
						if (portfolioTypingChars < totalChars) {
							portfolioTypingTimer += dtSeconds;
							const interval = 0.017;
							while (portfolioTypingTimer >= interval && portfolioTypingChars < totalChars) {
								portfolioTypingTimer -= interval;
								portfolioTypingChars += 1;
							}
							applyPortfolioTypedLine();
						}
						portfolioCursorTimer += dtSeconds;
						portfolioTypingCursor.alpha = (portfolioCursorTimer % 0.66) < 0.36 ? 1 : 0.2;
					} else {
						portfolioTypingCursor.alpha = 0;
					}
				}

				if (portfolioLayout.cardW <= 0 || portfolioLayout.cardH <= 0) {
					layoutPortfolioPanel();
				}
				drawPortfolioCartridges(dtSeconds, desktopTwoTime);
				portfolioSub.alpha = 0.9 + 0.01 * Math.sin(desktopTwoTime * 1.6);

				const hoverTintTarget = desktopTwoCartridgeHover >= 0
					? projectCartridgeDefs[desktopTwoCartridgeHover]?.tint ?? desktopTwoFlowBase.glowColor
					: desktopTwoFlowBase.glowColor;
				const hoverMixTarget = desktopTwoCartridgeHover >= 0 ? 1 : 0;
				desktopTwoFlowHoverCurrent += (hoverMixTarget - desktopTwoFlowHoverCurrent) * Math.min(1, dtSeconds * 8);
				desktopTwoFlowTintCurrent = stepDesktopColor(desktopTwoFlowTintCurrent, hoverTintTarget, Math.min(1, dtSeconds * 7));
				const hoverBreathe = desktopTwoFlowHoverCurrent > 0.05
					? (0.5 + 0.5 * Math.sin(desktopTwoTime * 4.2)) * desktopTwoFlowHoverCurrent * 0.06
					: 0;
				const cartridgeMix = 0.04 + desktopTwoFlowHoverCurrent * 0.16 + hoverBreathe;
				setDesktopTwoFlowAmbience?.({
					lineColor: mixDesktopColor(desktopTwoFlowBase.lineColor, desktopTwoFlowTintCurrent, cartridgeMix),
					glowColor: mixDesktopColor(desktopTwoFlowBase.glowColor, desktopTwoFlowTintCurrent, cartridgeMix + 0.05),
					mistColorB: mixDesktopColor(desktopTwoFlowBase.mistColorB, desktopTwoFlowTintCurrent, cartridgeMix * 0.34),
					mistColorC: mixDesktopColor(desktopTwoFlowBase.mistColorC, desktopTwoFlowTintCurrent, cartridgeMix * 0.38),
					speed: desktopTwoFlowBase.speed * (1 + desktopTwoFlowHoverCurrent * 0.05),
					density: desktopTwoFlowBase.density * (1 + desktopTwoFlowHoverCurrent * 0.04),
					glowStrength: desktopTwoFlowBase.glowStrength + desktopTwoFlowHoverCurrent * 0.08 + hoverBreathe * 0.7,
				});
				updateDesktopTwoFlow(desktopTwoTime, desktopTwoCameraOffset);
				updateDesktopTwoCursorPixelate();
				desktopTwoCursor.visible = desktopTwoActive;
				desktopTwoCursor.alpha = desktopTwoActive ? 1 : 0;
				desktopTwoCursor.position.set(desktopTwoMouse.x, desktopTwoMouse.y);

				if (!desktopTwoActive) {
					desktopTwoCartridgeHover = -1;
					portfolioWindowOpen = false;
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
				desktopTwoScene.filterArea = new PIXI.Rectangle(0, 0, desktopTwoApp.renderer.width, desktopTwoApp.renderer.height);
				resizeDesktopTwoFlow();
				layoutPortfolioPanel();
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
			setPortfolioUiActive(false);
			if (!next) {
				tryCloseDesktopTwoPortfolioWindow();
				onDesktopTwoExitRequested?.();
			}
			if (next) {
				try {
					ensureDesktopTwoBackground();
					onDesktopTwoActivated?.();
				} catch (err) {
					console.error('Desktop Two activation failed:', err);
					desktopTwoActive = false;
					document.documentElement.classList.remove('desktop-two-active');
					if (desktopTwoOverlay) desktopTwoOverlay.setAttribute('aria-hidden', 'true');
				}
			}
		};
		window.addEventListener('keydown', (event) => {
			if (event.key !== 'Escape') return;
			if (desktopTwoActive && tryCloseDesktopTwoPortfolioWindow()) {
				return;
			}
			if (desktopTwoActive) {
				setDesktopTwoActive(false);
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
			app.view.style.cursor = 'none';

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
			} = createCrimsonFlowBackground(app, {
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
			let { container: vinesLayer, vines } = createVines(app, 6, 28, vineOptions);
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
			const ringSlotCount = 7;
			const ringSlotStep = (Math.PI * 2) / ringSlotCount;
			const ringStartAngle = -Math.PI * 0.62;
			const CORE_CLOCK_SCALE = 1.3;
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
				const baseRadius = Math.max(132, Math.min(250, Math.min(app.renderer.width, app.renderer.height) * 0.285));
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
				const slot = ((slotIndex % ringSlotCount) + ringSlotCount) % ringSlotCount;
				const radius = getRingSlotRadius();
				const angle = ringStartAngle + slot * ringSlotStep + ringSpin;
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
				coreSpinCue.lineStyle(2, rgbB, spinCueAlpha);
				const cueHead = screenToWorldSize(7);
				const cueOffset = dialHalf + screenToWorldSize(24);
				const cueTilt = Math.sin(ringSpin * 0.4) * cueHead * 0.28;
				const leftX = -cueOffset;
				const rightX = cueOffset;
				const midY = 0;
				coreSpinCue.moveTo(leftX + cueHead, midY - cueHead + cueTilt);
				coreSpinCue.lineTo(leftX - cueHead, midY + cueTilt);
				coreSpinCue.lineTo(leftX + cueHead, midY + cueHead + cueTilt);
				coreSpinCue.moveTo(rightX - cueHead, midY - cueHead - cueTilt);
				coreSpinCue.lineTo(rightX + cueHead, midY - cueTilt);
				coreSpinCue.lineTo(rightX - cueHead, midY + cueHead - cueTilt);
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

			const appLauncher = createAppLauncher(app, world, {
				items: [
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
						displayName: 'Portfolio',
						label: 'Portfolio',
						moodKey: 'Portfolio',
						glyph: 'P',
						hoverActionText: 'Open Portfolio',
						tooltip: 'Open Portfolio',
						onTap: () => {
							startDesktopTwoEntryTransition();
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
				],
				screenToWorldX,
				screenToWorldY,
				screenToWorldSize,
				onHoverChange: ({ hovered, key, container }) => {
					setMoodHover(key, hovered, container);
				},
				layoutProvider: ({ index }) => {
					const slots = [5, 1, 6];
					const slot = slots[index] ?? 5;
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
				cursorWasRight: false,
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
			arcadeLayer.addChild(arcadeDividerGlow, arcadeTargetLayer, arcadeShardLayer, arcadeHintText, arcadeScoreText, arcadePopupText, arcadeSweepControl);

			const arcadeTargetTypes = [
				{ points: 1, radiusPx: 33, ringColor: 0xff86bb, coreColor: 0x2a1223, shardColor: 0xffa6d0, respawnMin: 0.65, respawnMax: 1.25 },
				{ points: 3, radiusPx: 24, ringColor: 0x68ffd9, coreColor: 0x0f2a22, shardColor: 0x90ffe7, respawnMin: 0.85, respawnMax: 1.55 },
				{ points: 5, radiusPx: 15, ringColor: 0xffd56b, coreColor: 0x312206, shardColor: 0xffe7a7, respawnMin: 1.2, respawnMax: 2.1 },
			];
			const arcadeTargets = [];
			const arcadeShards = [];
			let arcadeTargetSeed = 0;
			const arcadeState = {
				dividerWorldX: 0,
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
				target.screenX = arcadeRand(app.renderer.width * 0.58, app.renderer.width * 0.9);
				target.screenY = arcadeRand(app.renderer.height * 0.2, app.renderer.height * 0.63);
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
				arcadeFeedback.cursorWasRight = false;
				arcadePopupText.visible = false;
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
				const x = screenToWorldX(app.renderer.width - lockButtonSize - 16);
				const y = screenToWorldY(app.renderer.height - lockButtonSize - 16);
				lockToggle.position.set(x, y);
				const bx = screenToWorldX(app.renderer.width - lockButtonSize - basketballButtonSize - 26);
				const by = screenToWorldY(app.renderer.height - basketballButtonSize - 19);
				basketballToggle.position.set(bx, by);
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
			basketballToggle.on('pointerover', () => { basketballHoverTarget = 1; });
			basketballToggle.on('pointerout', () => { basketballHoverTarget = 0; });
			basketballToggle.on('pointertap', () => {
				if (!dragEnabled) return;
				basketballMode = !basketballMode;
				arcadeLayer.visible = basketballMode;
				if (basketballMode) {
					resetArcadeRound();
					arcadeFeedback.cursorWasRight = mouse.x >= app.renderer.width * 0.5;
					arcadeFeedback.noGoVoided = arcadeFeedback.cursorWasRight;
				} else {
					arcadePopupText.visible = false;
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
					if (c.position.x <= arcadeState.dividerWorldX + screenToWorldSize(8)) continue;
					c.position.x -= step;
					st.vx = Math.min(st.vx ?? 0, -shove);
					st.vy = (st.vy ?? 0) * 0.9;
					if (st.free) {
						st.free.x = c.position.x;
						st.free.y = c.position.y;
					}
					moved += 1;
				}
				if (moved > 0) {
					triggerArcadePopup('SWEEP LEFT', 0.86, 0x90dcff);
				}
			});
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
					onHoverChange: ({ hovered, key, container }) => setMoodHover(key, hovered, container),
					dockScreenX: () => getSlotX(2),
					dockScreenY: () => getSlotY(2),
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
					dockScreenX: () => getSlotX(0),
					dockScreenY: () => getSlotY(0),
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
					dockScreenX: () => getSlotX(3),
					dockScreenY: () => getSlotY(3),
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
					dockScreenX: () => getSlotX(4),
					dockScreenY: () => getSlotY(4),
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
		uiTopLayer.addChild(cursorContainer);

		const transitionWipe = new PIXI.Graphics();
		transitionWipe.eventMode = 'none';
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
		onDesktopTwoActivated = () => {
			showFirstPortfolioHint = false;
			try {
				localStorage.setItem(PORTFOLIO_SEEN_KEY, '1');
			} catch (_) {
			}
		};

		const desktopTwoEntryTransition = {
			active: false,
			phase: 0,
			duration: 0.28,
			surge: 0,
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
			transitionWipe.beginFill(0x05070d, 0.08 + glitchPulse * 0.14);
			transitionWipe.drawRect(0, 0, sw, sh);
			transitionWipe.endFill();
			const stripeCount = 22;
			for (let i = 0; i < stripeCount; i++) {
				const y = Math.random() * sh;
				const h = 1 + Math.random() * 3;
				const xJitter = (Math.random() - 0.5) * 24 * glitchPulse;
				transitionWipe.beginFill(0xaedfff, 0.03 + Math.random() * 0.08 * glitchPulse);
				transitionWipe.drawRect(xJitter, y, sw, h);
				transitionWipe.endFill();
			}
			if (glitchPulse > 0.45) {
				for (let i = 0; i < 4; i++) {
					const bandH = Math.max(8, sh * (0.03 + Math.random() * 0.08));
					const by = Math.random() * (sh - bandH);
					const bx = (Math.random() - 0.5) * 18;
					transitionWipe.beginFill(0xffffff, 0.03 + Math.random() * 0.07);
					transitionWipe.drawRect(bx, by, sw, bandH);
					transitionWipe.endFill();
				}
			}
		};
		const startDesktopTwoExitTransition = () => {
			if (!livingRoomActive || desktopTwoActive || desktopTwoEntryTransition.active) return;
			desktopTwoEntryTransition.active = true;
			desktopTwoEntryTransition.phase = 0;
			desktopTwoEntryTransition.duration = 0.3;
			desktopTwoEntryTransition.surge = 1;
			desktopTwoEntryTransition.direction = -1;
			desktopTwoEntryTransition.actionTriggered = false;
			desktopTwoEntryTransition.action = () => {
				closePortfolioLibraryNow();
			};
			drawTransitionWipe(0.01);
		};
		const startDesktopTwoEntryTransition = () => {
			if (livingRoomActive || desktopTwoActive || desktopTwoEntryTransition.active) return;
			terminalTypingHold = true;
			desktopTwoEntryTransition.active = true;
			desktopTwoEntryTransition.phase = 0;
			desktopTwoEntryTransition.duration = 0.28;
			desktopTwoEntryTransition.surge = 1;
			desktopTwoEntryTransition.direction = 1;
			desktopTwoEntryTransition.actionTriggered = false;
			desktopTwoEntryTransition.action = () => {
				openPortfolioLibraryNow();
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
			startDesktopTwoEntryTransition();
		});
		leftPortalHitZone.eventMode = ENABLE_LEFT_PORTAL_SHORTCUT ? 'static' : 'none';
		leftPortalHitZone.cursor = ENABLE_LEFT_PORTAL_SHORTCUT ? 'pointer' : 'default';
		leftPortalHitZone.on('pointerover', onPortalHoverIn);
		leftPortalHitZone.on('pointerout', onPortalHoverOut);
		leftPortalHitZone.on('pointertap', () => {
			if (!ENABLE_LEFT_PORTAL_SHORTCUT) return;
			markPortalInteraction();
			startDesktopTwoEntryTransition();
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

		// Scene B asset metadata: keep paths here so WIP placeholders are easy to swap later.
		const LIVING_ROOM_ASSETS = {
			tvSpritePath: '',
			tapeSpritePath: './assets/images/Uh-Oh.png',
			tapeLabelById: {
				'default-home': './assets/images/background.gif',
				'slot-b': './assets/images/Uh-Oh.png',
				'slot-c': './assets/images/Uh-Oh.png',
				'slot-d': './assets/images/Uh-Oh.png',
				'slot-e': './assets/images/Uh-Oh.png',
				'slot-f': './assets/images/Uh-Oh.png',
			},
		};
		const VHS_TAPE_LIBRARY = [
			{ id: 'default-home', label: 'MAIN PAGE', title: 'MAIN PAGE', status: 'ready', contentType: 'BRO_MEME', hasContent: true, accent: 0x8eb8ff, summary: 'the magic happens here' },
			{ id: 'slot-b', label: 'EMPTY', title: 'EMPTY', status: 'empty', contentType: 'EMPTY', hasContent: false, accent: 0xcf5f8f, summary: 'Nothing here yet.' },
			{ id: 'slot-c', label: 'EMPTY', title: 'EMPTY', status: 'empty', contentType: 'EMPTY', hasContent: false, accent: 0xd5a063, summary: 'Nothing here yet.' },
			{ id: 'slot-d', label: 'EMPTY', title: 'EMPTY', status: 'empty', contentType: 'EMPTY', hasContent: false, accent: 0xb58a59, summary: 'Nothing here yet.' },
			{ id: 'slot-e', label: 'EMPTY', title: 'EMPTY', status: 'empty', contentType: 'EMPTY', hasContent: false, accent: 0x4f80bf, summary: 'Nothing here yet.' },
			{ id: 'slot-f', label: 'EMPTY', title: 'EMPTY', status: 'empty', contentType: 'EMPTY', hasContent: false, accent: 0x7a659d, summary: 'Nothing here yet.' },
		];
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
		const livingRoomLayer = new PIXI.Container();
		livingRoomLayer.zIndex = 180;
		livingRoomLayer.sortableChildren = true;
		livingRoomLayer.visible = false;
		livingRoomLayer.eventMode = 'none';
		const roomBg = new PIXI.Container();
		const livingRoomBackdrop = new PIXI.Graphics();
		const livingRoomWallGlow = new PIXI.Graphics();
		const livingRoomFloor = new PIXI.Graphics();
		const roomVignette = new PIXI.Graphics();
		roomBg.addChild(livingRoomBackdrop, livingRoomWallGlow, livingRoomFloor, roomVignette);
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
		const tvInnerFrame = new PIXI.Graphics();
		const tvGlassReflection = new PIXI.Graphics();
		const livingRoomTvFrame = new PIXI.Graphics();
		const livingRoomTvArt = new PIXI.Sprite(PIXI.Texture.WHITE);
		const tvScreenGroup = new PIXI.Container();
		const tvScreenMask = new PIXI.Graphics();
		const tvContentContainer = new PIXI.Container();
		const tvScreenBaseBg = new PIXI.Graphics();
		const tvDesktopContentSprite = new PIXI.Sprite(PIXI.Texture.WHITE);
		const tvDesktopTransitionLayer = new PIXI.Container();
		const tvDesktopTransitionSprite = new PIXI.Sprite(PIXI.Texture.WHITE);
		tvDesktopTransitionLayer.addChild(tvDesktopTransitionSprite);
		tvDesktopTransitionLayer.visible = false;
		tvDesktopTransitionLayer.eventMode = 'none';
		const tvBroScreen = new PIXI.Container();
		const tvBroBg = new PIXI.Graphics();
		const tvBroTitle = new PIXI.Text('TERMINAL', {
			fontFamily: 'Minecraft, monospace',
			fontSize: 13,
			fill: 0xf5ecdb,
			letterSpacing: 1,
		});
		tvBroTitle.anchor.set(0.5, 0.5);
		const tvBroSub = new PIXI.Text('placeholder playback', {
			fontFamily: 'Minecraft, monospace',
			fontSize: 9,
			fill: 0xd4c0a4,
			letterSpacing: 1,
		});
		tvBroSub.anchor.set(0.5, 0.5);
		const tvTerminalLines = new PIXI.Container();
		const tvTerminalCursor = new PIXI.Graphics();
		let tvBroTitleBaseY = 0;
		let tvBroSubBaseY = 0;
		let tvTerminalStartX = 0;
		let tvTerminalStartY = 0;
		let tvTerminalLineHeight = 15;
		let tvTerminalFontSize = 11;
		let tvDesktopRenderTexture = PIXI.RenderTexture.create({
			width: Math.max(1, app.renderer.width),
			height: Math.max(1, app.renderer.height),
		});
		tvDesktopContentSprite.texture = tvDesktopRenderTexture;
		tvDesktopTransitionSprite.texture = tvDesktopRenderTexture;
		tvDesktopTransitionSprite.alpha = 0;
		tvBroScreen.addChild(tvBroBg, tvBroTitle, tvTerminalLines, tvTerminalCursor, tvBroSub);
		const tvEmptyScreen = new PIXI.Container();
		const tvEmptyBg = new PIXI.Graphics();
		const tvEmptySprite = new PIXI.Sprite(PIXI.Texture.WHITE);
		const tvEmptyText = new PIXI.Text('Nothing here yet bro', {
			fontFamily: 'Minecraft, monospace',
			fontSize: 10,
			fill: 0xf4d06d,
			letterSpacing: 1,
			align: 'center',
		});
		tvEmptyText.anchor.set(0.5, 0.5);
		tvEmptyScreen.alpha = 0;
		tvEmptyScreen.addChild(tvEmptyBg, tvEmptySprite, tvEmptyText);
		tvContentContainer.addChild(tvScreenBaseBg, tvDesktopContentSprite, tvBroScreen, tvEmptyScreen);
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
			fontFamily: 'Minecraft, monospace',
			fontSize: 8,
			fill: 0xe9dfcf,
			letterSpacing: 1,
		});
		placardLedLabel.anchor.set(0, 0.5);
		const placardTitle = new PIXI.Text('NO TAPE SELECTED', {
			fontFamily: 'Minecraft, monospace',
			fontSize: 10,
			fill: 0xf4e5cc,
			letterSpacing: 1,
		});
		const placardStatus = new PIXI.Text('STATUS: IDLE', {
			fontFamily: 'Minecraft, monospace',
			fontSize: 8,
			fill: 0xd9c6a8,
			letterSpacing: 1,
		});
		const placardBody = new PIXI.Text('Hover a tape to inspect metadata.', {
			fontFamily: 'Minecraft, monospace',
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
		applyWipSpriteTexture(livingRoomTvArt, LIVING_ROOM_ASSETS.tvSpritePath);
		applyWipSpriteTexture(tvEmptySprite, LIVING_ROOM_ASSETS.tapeSpritePath);
		let terminalFullText = '';
		let terminalTypedIndex = 0;
		let terminalTypeTimer = 0;
		let terminalRenderedSnapshot = '';
		let terminalCursorBlinkTimer = 0;
		let terminalTypingHold = false;
		let terminalSourceKey = '';
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
		const TERMINAL_TYPE_RATE = 54;
		const TERMINAL_BASE_COLOR = 0xf3f8ff;
		const TERMINAL_BRO_COLOR = 0xffd56b;
		const DEFAULT_NEON_ACCENT = 0x6ec6f7;
		const DEFAULT_TERMINAL_TEXT = [
			'> MAIN PAGE READY',
			'the magic happens here',
			'> bro-link synced',
		].join('\n');
		const getTapeById = (tapeId) => VHS_TAPE_LIBRARY.find((tape) => tape.id === tapeId) || null;
		const getSelectedTape = () => {
			const selectedId = livingRoomState.insertedTapeId || livingRoomState.activeTapeId;
			return getTapeById(selectedId) || getTapeById('default-home');
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
		const renderTerminalTypedText = (force = false) => {
			const typedText = terminalFullText.slice(0, terminalTypedIndex);
			if (!force && terminalRenderedSnapshot === typedText) return;
			terminalRenderedSnapshot = typedText;
			destroyContainerChildren(tvTerminalLines);
			const lines = typedText.length ? typedText.split('\n') : [''];
			let cursorX = tvTerminalStartX;
			let cursorY = tvTerminalStartY;
			for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
				const lineText = lines[lineIndex] || '';
				const line = new PIXI.Container();
				line.position.set(tvTerminalStartX, tvTerminalStartY + lineIndex * tvTerminalLineHeight);
				let lineX = 0;
				const regex = /bro/ig;
				let last = 0;
				let match = null;
				const appendChunk = (chunkText, color) => {
					if (!chunkText) return;
					const chunk = new PIXI.Text(chunkText, {
						fontFamily: 'Minecraft, monospace',
						fontSize: tvTerminalFontSize,
						fill: color,
						letterSpacing: 0.8,
					});
					chunk.position.set(lineX, 0);
					line.addChild(chunk);
					lineX += chunk.width;
				};
				while ((match = regex.exec(lineText)) !== null) {
					appendChunk(lineText.slice(last, match.index), TERMINAL_BASE_COLOR);
					appendChunk(match[0], TERMINAL_BRO_COLOR);
					last = regex.lastIndex;
				}
				appendChunk(lineText.slice(last), TERMINAL_BASE_COLOR);
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
		const getTerminalTextForTape = (tape) => {
			if (!tape) return 'No cartridge selected.';
			if (tape.id === 'default-home') return DEFAULT_TERMINAL_TEXT;
			return `Nothing here yet ${livingRoomState.emptyPreviewWord}`;
		};
		const setTerminalText = (nextText, sourceKey = nextText) => {
			if (terminalSourceKey === sourceKey && terminalFullText === nextText) return;
			terminalSourceKey = sourceKey;
			terminalFullText = nextText;
			terminalTypedIndex = 0;
			terminalTypeTimer = 0;
			terminalRenderedSnapshot = '';
			renderTerminalTypedText(true);
		};
		const setPreviewForTape = (tape) => {
			const nextPreviewKey = tape?.id || 'none';
			if (previewSourceKey === nextPreviewKey) return;
			previewSourceKey = nextPreviewKey;
			if (tape?.id === 'default-home') {
				previewUsesDesktopFeed = true;
				tvDesktopContentSprite.texture = tvDesktopRenderTexture;
				tvDesktopContentSprite.tint = 0xffffff;
				return;
			}
			previewUsesDesktopFeed = false;
			const previewPath = LIVING_ROOM_ASSETS.tapeLabelById[tape?.id] || LIVING_ROOM_ASSETS.tapeSpritePath;
			applyWipSpriteTexture(tvDesktopContentSprite, previewPath);
		};
		const refreshPlacard = () => {
			const hoveredTape = VHS_TAPE_LIBRARY[livingRoomState.hoverIndex] || null;
			const selectedTape = getTapeById(livingRoomState.activeTapeId) || getTapeById('default-home');
			const focusTape = hoveredTape || selectedTape;
			if (!focusTape) return;
			setPreviewForTape(focusTape);
			const sourceKey = `${hoveredTape ? 'hover' : 'selected'}:${focusTape.id}:${livingRoomState.emptyPreviewWord}`;
			setTerminalText(getTerminalTextForTape(focusTape), sourceKey);
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
			const labelStrip = new PIXI.Graphics();
			const title = new PIXI.Text('EMPTY', {
				fontFamily: 'Minecraft, monospace',
				fontSize: 13,
				fill: 0xf2fbff,
				stroke: 0x0a1320,
				strokeThickness: 2,
				letterSpacing: 1,
			});
			title.anchor.set(0.5, 0.5);
			title.text = tape.label;
			applyWipSpriteTexture(art, LIVING_ROOM_ASSETS.tapeLabelById[tape.id] || LIVING_ROOM_ASSETS.tapeSpritePath);
			art.alpha = 0.6;
			node.addChild(aura, shadow, body, notch, labelStrip, badge, art, badgeSpec, screws, shellHighlight, shellShadow, title);
			node.eventMode = 'static';
			node.cursor = 'pointer';
			node.on('pointerover', () => {
				if (livingRoomState.viewMode !== VIEW_TV_AREA || livingRoomState.inserting || livingRoomState.targetBlend < 1) return;
				if (!tape.hasContent || tape.contentType === CONTENT_EMPTY) {
					livingRoomState.emptyPreviewWord = pickBroPlaceholderWord();
				}
				livingRoomState.hoverIndex = index;
				refreshPlacard();
			});
			node.on('pointerout', () => {
				if (livingRoomState.hoverIndex === index) livingRoomState.hoverIndex = -1;
				refreshPlacard();
			});
			node.on('pointertap', () => {
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
			if (!tapeEntry.tape.hasContent || tapeEntry.tape.contentType === CONTENT_EMPTY) {
				livingRoomState.mode = STATE_LIVING_ROOM_IDLE;
				livingRoomState.contentMode = CONTENT_EMPTY;
				livingRoomState.emptyPreviewWord = pickBroPlaceholderWord();
				livingRoomState.playingMix = 0;
				refreshPlacard();
				return;
			}
			livingRoomState.mode = STATE_LIVING_ROOM_PLAYING;
			livingRoomState.contentMode = CONTENT_BRO_MEME;
			livingRoomState.playingMix = 1;
			setDesktopTwoLoadedTape(tapeEntry.tape);
			layoutLivingRoom();
			refreshPlacard();
		};
		const enterLivingRoom = ({ preserveContent = false } = {}) => {
			livingRoomState.overlayMode = OVERLAY_MODE_LIBRARY;
			livingRoomState.viewMode = VIEW_TV_AREA;
			if (!preserveContent) {
				livingRoomState.mode = STATE_LIVING_ROOM_PLAYING;
				livingRoomState.contentMode = CONTENT_BRO_MEME;
				livingRoomState.activeTapeId = 'default-home';
				livingRoomState.insertedTapeId = 'default-home';
				livingRoomState.emptyPreviewWord = pickBroPlaceholderWord();
				livingRoomState.playingMix = 1;
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
			cursorContainer.visible = true;
			cursorContainer.zIndex = 5000;
			uiTopLayer.sortChildren();
			layoutLivingRoom();
			refreshPlacard();
		};
		returnToTvAreaFromFullscreen = () => {
			enterLivingRoom({ preserveContent: true });
		};
		isFullscreenTvPlaybackActive = () => livingRoomState.overlayMode === OVERLAY_MODE_TV && livingRoomState.viewMode === VIEW_FULLSCREEN && livingRoomState.fullscreenFromTv;
		const exitLivingRoom = () => {
			livingRoomState.hoverIndex = -1;
			livingRoomState.inserting = null;
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
		tvInnerFrame.zIndex = 30;
		livingRoomTvFrame.zIndex = 31;
		tvScreenGroup.zIndex = 40;
		tvGlassReflection.zIndex = 45;
		tvSlotForeground.zIndex = 46;
		tvScreenHitArea.zIndex = 47;
		tvEjectBtn.zIndex = 50;
		placard.zIndex = 70;
		tvDesktopTransitionLayer.zIndex = 75;
		livingRoomBackBtn.zIndex = 80;
		livingRoomForeground.zIndex = 60;
		livingRoomTv.addChild(
			tvBodyShadow,
			tvBody,
			tvInnerFrame,
			livingRoomTvFrame,
			tvScreenGroup,
			tvGlassReflection,
			tvSlotForeground,
		);
		for (const tape of livingRoomTapes) {
			cartridgeListContent.addChild(tape.node);
		}
		livingRoomLayer.addChild(roomBg, leftShelf, cartridgeListViewport, cartridgeScrollUi, livingRoomTv, tvDesktopTransitionLayer, livingRoomBackBtn);
		app.stage.addChild(livingRoomLayer);
		let livingRoomTvSlotX = 0;
		let livingRoomTvSlotY = 0;
		const livingRoomTvScreenRect = { x: 0, y: 0, w: 0, h: 0, r: 0 };
		const holoPanelLocalRect = { x: 0, y: 0, w: 0, h: 0 };
		let livingRoomTapeW = 108;
		let livingRoomTapeH = 62;
		const drawLivingRoomBackdrop = (blend) => {
			const sw = app.renderer.width;
			const sh = app.renderer.height;
			const t = Math.max(0, Math.min(1, blend));
			const eased = 1 - Math.pow(1 - t, 3);

			livingRoomBackdrop.clear();
			livingRoomBackdrop.beginFill(0x0b090d, 0.86 * eased);
			livingRoomBackdrop.drawRect(0, 0, sw, sh);
			livingRoomBackdrop.endFill();
		};

		const layoutLivingRoom = () => {
			const sw = app.renderer.width;
			const sh = app.renderer.height;
			const margin = Math.max(20, Math.round(sw * 0.028));
			const colGap = Math.max(14, Math.round(sw * 0.02));
			const rackW = Math.max(220, Math.min(Math.round(sw * 0.3), Math.round(sw * 0.32)));
			const panelW = Math.max(320, sw - margin * 2 - colGap - rackW);
			const panelH = Math.max(300, Math.min(Math.round(sh * 0.8), Math.round(sw * 0.62)));
			const rackX = margin;
			const rackY = Math.round((sh - panelH) * 0.5);
			const panelX = rackX + rackW + colGap;
			const panelY = Math.round((sh - panelH) * 0.5);

			livingRoomLayer.position.set(0, 0);
			livingRoomLayer.hitArea = new PIXI.Rectangle(0, 0, sw, sh);

			livingRoomWallGlow.clear();
			livingRoomWallGlow.beginFill(0x15111b, 0.36);
			livingRoomWallGlow.drawRect(0, 0, sw, sh);
			livingRoomWallGlow.endFill();
			roomVignette.clear();
			roomVignette.beginFill(0x05050a, 0.28);
			roomVignette.drawRect(0, 0, sw, sh);
			roomVignette.endFill();

			livingRoomFloor.clear();
			livingRoomFloor.beginFill(0x0b121a, 0.35);
			livingRoomFloor.drawRect(0, sh * 0.7, sw, sh * 0.3);
			livingRoomFloor.endFill();

			leftShelf.clear();
			leftShelf.beginFill(0x0f1720, 0.88);
			leftShelf.lineStyle(2, 0x39556f, 0.85);
			leftShelf.drawRoundedRect(rackX, rackY, rackW, panelH, 10);
			leftShelf.endFill();
			leftShelf.lineStyle(1, 0x7ab2cf, 0.16);
			for (let y = rackY + 22; y < rackY + panelH - 20; y += 14) {
				leftShelf.moveTo(rackX + 10, y);
				leftShelf.lineTo(rackX + rackW - 10, y);
			}

			rightShelf.clear();
			rightShelf.alpha = 0;

			const rackPad = 12;
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
			tvInnerFrame.clear();
			tvInnerFrame.beginFill(0x0d1e2f, 0.84);
			tvInnerFrame.lineStyle(1, 0x9fdefc, 0.38);
			tvInnerFrame.drawRoundedRect(10, 10, panelW - 20, panelH - 20, 10);
			tvInnerFrame.endFill();
			livingRoomTvFrame.clear();

			const innerPad = Math.max(14, Math.round(panelW * 0.03));
			const contentX = innerPad;
			const contentY = innerPad;
			const contentW = panelW - innerPad * 2;
			const contentH = panelH - innerPad * 2;
			const paneGap = Math.max(10, Math.round(contentW * 0.02));
			const previewW = Math.round(contentW * 0.58);
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
			tvScreenMask.drawRoundedRect(contentX, contentY, contentW, contentH, 10);
			tvScreenMask.endFill();
			tvScreenHitArea.clear();
			tvScreenHitArea.eventMode = 'none';
			tvScreenHitArea.cursor = 'default';

			tvContentContainer.position.set(0, 0);
			tvScreenBaseBg.clear();
			tvScreenBaseBg.beginFill(0x07101a, 1);
			tvScreenBaseBg.drawRoundedRect(previewX, contentY, previewW, contentH, 8);
			tvScreenBaseBg.endFill();

			const desktopSrcW = Math.max(1, tvDesktopRenderTexture.width);
			const desktopSrcH = Math.max(1, tvDesktopRenderTexture.height);
			const previewTargetW = previewW * 0.94;
			const previewTargetH = contentH * 0.94;
			const desktopScale = Math.min(previewTargetW / desktopSrcW, previewTargetH / desktopSrcH);
			const desktopFitW = desktopSrcW * desktopScale;
			const desktopFitH = desktopSrcH * desktopScale;
			tvDesktopContentSprite.position.set(previewX + (previewW - desktopFitW) * 0.5, contentY + (contentH - desktopFitH) * 0.5);
			tvDesktopContentSprite.width = desktopFitW;
			tvDesktopContentSprite.height = desktopFitH;

			tvBroBg.clear();
			tvBroBg.beginFill(0x060e18, 0.96);
			tvBroBg.lineStyle(1, getActiveAccentColor(), 0.48);
			tvBroBg.drawRoundedRect(terminalX, contentY, terminalW, contentH, 8);
			tvBroBg.endFill();
			tvBroTitle.anchor.set(0, 0);
			tvBroTitle.style.fontSize = Math.max(11, Math.round(Math.min(16, terminalW * 0.07)));
			tvBroTitle.style.fill = 0x9fdfff;
			tvBroTitle.text = 'TERMINAL';
			tvBroTitle.position.set(terminalX + 12, contentY + 10);
			tvBroSub.visible = false;
			tvTerminalFontSize = Math.max(10, Math.round(Math.min(13, terminalW * 0.058)));
			tvTerminalLineHeight = Math.max(13, Math.round(tvTerminalFontSize * 1.24));
			tvTerminalStartX = terminalX + 12;
			tvTerminalStartY = contentY + 34;
			tvBroTitleBaseY = tvBroTitle.y;
			tvBroSubBaseY = tvBroSub.y;
			renderTerminalTypedText(true);

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
			tvGlassReflection.beginFill(0xb0e6ff, 0.12);
			tvGlassReflection.drawRoundedRect(contentX + 10, contentY + 8, contentW - 20, Math.max(16, contentH * 0.08), 6);
			tvGlassReflection.endFill();

			tvSlotForeground.clear();
			tvSlotForeground.beginFill(0x8bd9ff, 0.14);
			tvSlotForeground.drawRoundedRect(contentX + 10, contentY + 8, contentW - 20, 3, 2);
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
			livingRoomBackBtn.position.set(margin, margin);
			livingRoomBackLabel.position.set(44, 15);

			livingRoomTapeW = Math.max(160, rackW * 0.8);
			livingRoomTapeH = Math.max(64, livingRoomTapeW * 0.44);
			const tapeSpacing = Math.max(10, Math.round(livingRoomTapeH * 0.12));
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
		layoutLivingRoom();
		openPortfolioLibraryNow = () => {
			if (desktopTwoActive) return;
			enterLivingRoom();
		};
		closePortfolioLibraryNow = () => {
			exitLivingRoom();
		};
		openLivingRoomScene = () => {
			startDesktopTwoEntryTransition();
		};
		closeLivingRoomScene = () => {
			startDesktopTwoExitTransition();
		};
		onDesktopTwoExitRequested = () => {};
		tvScreenHitArea.on('pointertap', () => {
			if (livingRoomState.viewMode !== VIEW_TV_AREA) return;
			if (livingRoomState.blend < 0.95) return;
			refreshPlacard();
		});
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
			const local = event.data.getLocalPosition(cartridgeScrollUi);
			setCartridgeScrollFromThumbY(local.y - cartridgeScrollState.thumbH * 0.5);
		});
		cartridgeScrollThumb.on('pointerdown', (event) => {
			if (!livingRoomActive || livingRoomState.viewMode !== VIEW_TV_AREA) return;
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
			const point = toRendererPoint(event);
			if (!point) return;
			const insideViewport = point.x >= cartridgeViewportRect.x
				&& point.x <= (cartridgeViewportRect.x + cartridgeViewportRect.w)
				&& point.y >= cartridgeViewportRect.y
				&& point.y <= (cartridgeViewportRect.y + cartridgeViewportRect.h);
			if (!insideViewport) return;
			event.preventDefault();
			cartridgeScrollState.scrollY += event.deltaY;
			updateCartridgeScrollUi();
		}, { passive: false });
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
				const showTvFullscreen = livingRoomState.overlayMode === OVERLAY_MODE_TV && livingRoomState.fullscreenFromTv;
				fullscreenTvContentLayer.visible = showTvFullscreen;
				fullscreenTvContentLayer.eventMode = showTvFullscreen ? 'passive' : 'none';
				livingRoomActive = false;
				return;
			}
			const blend = Math.max(0, Math.min(1, livingRoomState.blend));
			const reveal = 1 - Math.pow(1 - blend, 3);
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
				fullscreenTvContentLayer.visible = livingRoomState.overlayMode === OVERLAY_MODE_TV && livingRoomState.fullscreenFromTv;
			} else {
				scene.visible = true;
				fullscreenTvContentLayer.visible = false;
			}
			livingRoomActive = blend > 0.02;
			const fullscreenUiActive = livingRoomActive && isFullscreenTvPlaybackActive() && blend < 0.02;
			fullscreenTvContentLayer.eventMode = fullscreenUiActive ? 'passive' : 'none';
			fullscreenExitBtn.visible = fullscreenUiActive;
			livingRoomLayer.visible = true;
			livingRoomLayer.eventMode = blend > 0.02 ? 'static' : 'none';
			livingRoomLayer.alpha = 1;
			cursorContainer.visible = true;
			cursorContainer.zIndex = 5000;
			uiTopLayer.sortChildren();
			drawLivingRoomBackdrop(blend);
			tvDesktopTransitionLayer.visible = blend > 0.001 && blend < 0.999;
			tvDesktopTransitionSprite.position.set(
				livingRoomTvScreenRect.x * desktopProxyMix,
				livingRoomTvScreenRect.y * desktopProxyMix,
			);
			tvDesktopTransitionSprite.width = app.renderer.width + (livingRoomTvScreenRect.w - app.renderer.width) * desktopProxyMix;
			tvDesktopTransitionSprite.height = app.renderer.height + (livingRoomTvScreenRect.h - app.renderer.height) * desktopProxyMix;
			tvDesktopTransitionSprite.alpha = Math.max(0, 1 - Math.max(0, (desktopProxyMix - 0.92) / 0.08));

			livingRoomWallGlow.alpha = 0.2 + reveal * 0.8;
			livingRoomFloor.alpha = 0.24 + reveal * 0.62;
			leftShelf.alpha = 0.24 + reveal * 0.76;
			rightShelf.alpha = 0;
			livingRoomForeground.alpha = 0;
			placard.alpha = 0;
			livingRoomBackBtn.alpha = Math.max(0, (reveal - 0.32) / 0.68);
			livingRoomBackBtn.eventMode = reveal > 0.55 ? 'static' : 'none';
			tvScreenHitArea.alpha = 0;
			tvScreenHitArea.eventMode = 'none';
			tvEjectBtn.alpha = 0;
			tvEjectBtn.eventMode = 'none';

			const panelReveal = Math.max(0, (reveal - 0.04) / 0.96);
			livingRoomTv.alpha = panelReveal;
			livingRoomTv.scale.set(1);

			tvDesktopContentSprite.alpha = 1;
			tvBroScreen.alpha = 1;
			tvEmptyScreen.alpha = 0;
			const screensaverTarget = livingRoomState.contentMode === CONTENT_SCREENSAVER ? 1 : 0;
			tvScreensaverLayer.alpha += (screensaverTarget - tvScreensaverLayer.alpha) * Math.min(1, dtSeconds * 6);

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
			terminalCursorBlinkTimer = (terminalCursorBlinkTimer + dtSeconds) % 1;
			tvTerminalCursor.visible = terminalCursorBlinkTimer < 0.5;

			const pulseTime = (performance.now ? performance.now() : Date.now()) * 0.003;
			tvBroTitle.y = tvBroTitleBaseY;
			const shimmerY = holoPanelLocalRect.y + ((pulseTime * 42) % (holoPanelLocalRect.h + 26)) - 12;
			tvSlotForeground.clear();
			tvSlotForeground.beginFill(getActiveAccentColor(), 0.12);
			tvSlotForeground.drawRoundedRect(holoPanelLocalRect.x + 10, shimmerY, Math.max(24, holoPanelLocalRect.w - 20), 3, 2);
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
				tape.art.alpha = 0.85;
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
				tape.title.position.set(tw * 0.12, th * 0.12);
				tape.title.text = tape.tape.label;
				tape.title.style.fill = selected ? 0xf0fbff : 0xd0dce8;
				tape.title.style.fontSize = Math.max(12, Math.round(th * 0.28));
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
			if (dragEnabled || livingRoomActive) return;
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
			if (dragEnabled || livingRoomActive || !ringCandidate.active) return;
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
			const prevBHover = basketballHover;
			basketballHover += (basketballHoverTarget - basketballHover) * lockEase;
			if (Math.abs(basketballHover - prevBHover) > 0.001) {
				drawBasketballToggle();
			}
			desktopTwoEntryTransition.surge = Math.max(0, desktopTwoEntryTransition.surge - seconds / 0.32);
			if (desktopTwoEntryTransition.active) {
				desktopTwoEntryTransition.phase += seconds / desktopTwoEntryTransition.duration;
				const triggerAt = desktopTwoEntryTransition.direction > 0 ? 0.78 : 0.16;
				if (!desktopTwoEntryTransition.actionTriggered && desktopTwoEntryTransition.phase >= triggerAt) {
					desktopTwoEntryTransition.action?.();
					desktopTwoEntryTransition.actionTriggered = true;
				}
				drawTransitionWipe(desktopTwoEntryTransition.phase);
				if (desktopTwoEntryTransition.direction > 0 && desktopTwoEntryTransition.actionTriggered && livingRoomLayer.visible) {
					const jitterScale = Math.max(0, 1 - desktopTwoEntryTransition.phase);
					livingRoomLayer.position.x = (Math.random() - 0.5) * 6 * jitterScale;
				}
				if (desktopTwoEntryTransition.phase >= 1) {
					desktopTwoEntryTransition.active = false;
					if (!desktopTwoEntryTransition.actionTriggered) {
						desktopTwoEntryTransition.action?.();
					}
					desktopTwoEntryTransition.actionTriggered = false;
					desktopTwoEntryTransition.action = null;
					if (desktopTwoEntryTransition.direction > 0) {
						terminalTypingHold = false;
					}
					livingRoomLayer.position.x = 0;
					drawTransitionWipe(0);
				}
			} else if (transitionWipe.visible) {
				drawTransitionWipe(0);
				livingRoomLayer.position.x = 0;
			}
			updateLivingRoomScene(seconds);
			if (portfolioSnapTimer > 0 && livingRoomActive) {
				portfolioSnapTimer = Math.max(0, portfolioSnapTimer - seconds);
				const t = 1 - (portfolioSnapTimer / 0.16);
				const eased = 1 - Math.pow(1 - Math.max(0, Math.min(1, t)), 3);
				livingRoomLayer.scale.set(0.98 + eased * 0.02);
			} else {
				livingRoomLayer.scale.set(1);
			}
			if (ENABLE_LEFT_PORTAL_SHORTCUT && !desktopTwoActive && !livingRoomActive) {
				const edgeWidth = Math.max(1, leftPortalWidth * 1.9);
				const edgeFactor = Math.max(0, Math.min(1, 1 - mouse.x / edgeWidth));
				leftPortalProgress += (edgeFactor - leftPortalProgress) * 0.18;
				leftPortalHover += (leftPortalHoverTarget - leftPortalHover) * Math.min(1, seconds * 12);
				const edgePromptTarget = edgeFactor > 0.12 ? Math.min(1, (edgeFactor - 0.12) / 0.52) : 0;
				leftPortalEdgePrompt += (edgePromptTarget - leftPortalEdgePrompt) * Math.min(1, seconds * 9);
				const idleMs = nowMs() - lastPortalInteractionAtMs;
				const hintTarget = (showFirstPortfolioHint && idleMs >= 6000 && !desktopTwoEntryTransition.active) ? 1 : 0;
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
			const transitionSurge = desktopTwoEntryTransition.surge;
			const blendedLineColor = mixColors(FLOW_BASE.lineColor, moodCurrent.waveTint, clamp01(moodCurrent.waveMix));
			const blendedGlowColor = mixColors(FLOW_BASE.glowColor, moodCurrent.waveTint, clamp01(moodCurrent.waveMix + 0.1));
			const blendedMistB = mixColors(FLOW_BASE.mistColorB, moodCurrent.waveTint, clamp01(moodCurrent.waveMix * 0.38));
			const blendedMistC = mixColors(FLOW_BASE.mistColorC, moodCurrent.particleColor, 0.5);
			const surgedLineColor = mixColors(blendedLineColor, 0xff5fa8, transitionSurge * 0.24);
			const surgedGlowColor = mixColors(blendedGlowColor, 0xff7fa8, transitionSurge * 0.3);
			setFlowAmbience?.({
				lineColor: surgedLineColor,
				glowColor: surgedGlowColor,
				mistColorA: FLOW_BASE.mistColorA,
				mistColorB: blendedMistB,
				mistColorC: blendedMistC,
				sparkStrength: FLOW_BASE.sparkStrength + moodCurrent.glowStrength * 0.1 + transitionSurge * 0.08,
				glowStrength: FLOW_BASE.glowStrength + moodCurrent.glowStrength * 0.32 + transitionSurge * 0.42,
				speed: FLOW_BASE.speed * (1 + (moodCurrent.waveMotion - 1) * 0.9 + transitionSurge * 0.25),
				density: FLOW_BASE.density * (1 + (moodCurrent.waveMotion - 1) * 0.45 + transitionSurge * 0.14),
				glowAlpha: clamp01(FLOW_BASE.glowAlpha + moodCurrent.glowStrength * 0.16 + transitionSurge * 0.2),
			});
			crtFisheyeUniforms.u_vignette = clamp01(moodCurrent.vignette);
			crtFisheyeUniforms.u_brightness = 0.06 + moodCurrent.contrast;
			crtScanlinesUniforms.u_strength = 0.42 + moodCurrent.contrast * 0.45;
			window.moodCurrent = {
				key: activeMoodEntry?.key || 'default',
				locked: Boolean(moodLockTarget),
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
			cursorContainer.position.set(screenX, screenY);
			scene.position.set(
				app.renderer.width / 2 + cameraOffset.x,
				app.renderer.height / 2 + cameraOffset.y,
			);
			const mouseWorld = { x: mouseWorldX, y: mouseWorldY, down: mouse.down };
			lastMouseWorld = mouseWorld;
			appLauncher.update(time, seconds, mouseWorld);
			if (basketballMode && dragEnabled) {
				arcadeLayer.visible = true;
				arcadeSweepControl.visible = true;
				arcadeSweepControl.eventMode = 'static';
				const toWorldFromScreen = (sx, sy) => ({
					x: (sx - cx - cameraOffset.x) / SCENE_SCALE + cx,
					y: (sy - cy - cameraOffset.y) / SCENE_SCALE + cy,
				});
				const toWorldSizeWithCamera = (s) => s / SCENE_SCALE;
				const dividerX = app.renderer.width * 0.5;
				const cursorIsRight = mouse.x >= dividerX;
				if (!arcadeFeedback.cursorWasRight && cursorIsRight) {
					arcadeFeedback.combo = 0;
					updateArcadeScoreLabel();
					triggerArcadePopup('RIGHT SIDE BLOCKED', 1.02, 0xff5f88);
				} else if (arcadeFeedback.cursorWasRight && !cursorIsRight) {
					triggerArcadePopup('LEFT SIDE ACTIVE', 0.92, 0x8fffb9);
				}
				arcadeFeedback.cursorWasRight = cursorIsRight;
				arcadeFeedback.noGoVoided = cursorIsRight;
				const dividerNear = Math.max(0, Math.min(1, 1 - Math.abs(mouse.x - dividerX) / 170));
				const dividerTop = app.renderer.height * 0.06;
				const dividerBottom = app.renderer.height * 0.94;
				const dividerCenter = toWorldFromScreen(dividerX, app.renderer.height * 0.5);
				const dividerWidth = toWorldSizeWithCamera(16);
				const dividerHeight = toWorldSizeWithCamera(dividerBottom - dividerTop);
				arcadeState.dividerWorldX = dividerCenter.x;

				arcadeDividerGlow.clear();
				arcadeDividerGlow.beginFill(arcadeFeedback.noGoVoided ? 0xff5f88 : 0x7fd8ff, dividerNear * (arcadeFeedback.noGoVoided ? 0.62 : 0.48));
				arcadeDividerGlow.drawRoundedRect(
					dividerCenter.x - dividerWidth * 0.95,
					dividerCenter.y - dividerHeight * 0.52,
					dividerWidth * 1.9,
					dividerHeight * 1.04,
					dividerWidth * 0.6,
				);
				arcadeDividerGlow.endFill();

				arcadeSweepHover += (arcadeSweepHoverTarget - arcadeSweepHover) * Math.min(1, seconds * 14);
				const sweepNear = Math.max(0, Math.min(1, 1 - (app.renderer.width - mouse.x) / 150));
				const sweepBoost = Math.max(arcadeSweepHover, sweepNear * 0.75);
				const sweepPos = toWorldFromScreen(app.renderer.width * 0.974, app.renderer.height * 0.5);
				const sweepW = toWorldSizeWithCamera(17);
				const sweepH = toWorldSizeWithCamera(30);
				const sway = Math.sin(time * 4.2) * toWorldSizeWithCamera(2.4) * (0.35 + sweepBoost);
				const p0x = sweepPos.x + sweepW * 0.58 + sway;
				const p0y = sweepPos.y - sweepH * 0.72;
				const p1x = sweepPos.x - sweepW * 0.62 + sway;
				const p1y = sweepPos.y;
				const p2x = sweepPos.x + sweepW * 0.58 + sway;
				const p2y = sweepPos.y + sweepH * 0.72;
				arcadeSweepControl.clear();
				arcadeSweepControl.beginFill(0x8fdcff, 0.14 + sweepBoost * 0.24);
				arcadeSweepControl.drawPolygon([p0x, p0y, p1x, p1y, p2x, p2y]);
				arcadeSweepControl.endFill();
				arcadeSweepControl.lineStyle(1.5, 0xd8f5ff, 0.45 + sweepBoost * 0.45);
				arcadeSweepControl.drawPolygon([p0x, p0y, p1x, p1y, p2x, p2y]);
				arcadeSweepControl.hitArea = new PIXI.Polygon([p0x, p0y, p1x, p1y, p2x, p2y]);

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
				}

				arcadeHintText.text = arcadeFeedback.noGoVoided
					? 'RIGHT SIDE BLOCKED: CURSOR LEFT TO SCORE'
					: 'THROW MODE: HIT TARGETS (1 / 3 / 5)';
				arcadeHintText.position.set(toWorldFromScreen(24, 18).x, toWorldFromScreen(24, 18).y);
				const scorePulse = 1 + Math.min(0.24, arcadeFeedback.combo * 0.035) + Math.sin(time * 5.2) * 0.02;
				const scorePos = toWorldFromScreen(app.renderer.width * 0.5, app.renderer.height - 58);
				arcadeScoreText.position.set(scorePos.x, scorePos.y);
				arcadeScoreText.scale.set(scorePulse);
				arcadeScoreText.tint = arcadeFeedback.noGoVoided ? 0xff8fab : 0xffffff;

				const bodies = getAllIconBodies();
				const rightFloorY = toWorldFromScreen(0, app.renderer.height - 18).y;
				for (const body of bodies) {
					const key = body.container;
					let st = iconScoreState.get(key);
					if (!st) {
						st = { cooldown: 0, returnCooldown: 0 };
						iconScoreState.set(key, st);
					}
					st.cooldown = Math.max(0, st.cooldown - seconds);
					st.returnCooldown = Math.max(0, st.returnCooldown - seconds);

					const c = body.container;
					const bodyState = body.state;
					if (!c || !bodyState) continue;

					if (c.position.x > arcadeState.dividerWorldX + toWorldSizeWithCamera(18)
						&& c.position.y >= rightFloorY
						&& st.returnCooldown <= 0
						&& !bodyState.dragging
						&& !bodyState.grabbed) {
						c.position.x -= toWorldSizeWithCamera(8);
						bodyState.vx = Math.min(bodyState.vx ?? 0, -420 / SCENE_SCALE);
						bodyState.vy = Math.min(bodyState.vy ?? 0, -140 / SCENE_SCALE);
						if (bodyState.free) {
							bodyState.free.x = c.position.x;
							bodyState.free.y = c.position.y;
						}
						st.returnCooldown = 0.45;
					}

					if (arcadeFeedback.noGoVoided || st.cooldown > 0) continue;
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
				arcadeLayer.visible = false;
				arcadePopupText.visible = false;
				arcadeTargetLayer.clear();
				arcadeShardLayer.clear();
				arcadeSweepControl.eventMode = 'none';
				arcadeSweepControl.visible = false;
				arcadeSweepHoverTarget = 0;
				arcadeSweepHover = 0;
			}
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
			layoutLivingRoom();
			if (desktopTwoEntryTransition.active) drawTransitionWipe(desktopTwoEntryTransition.phase);
			else drawTransitionWipe(0);
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
			if (ENABLE_PLAYER_CUBE) player.onResize();

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