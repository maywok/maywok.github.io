import { createRingSpinInputController } from './ringSpinInput.js';

export function setupInputAudioBindings(options = {}) {
	const {
		app,
		cursor,
		mouse,
		setInGameCursorVisible = () => {},
		markPortalInteraction = () => {},
		closeSoundPanelIfOutside = () => {},
		findHoveredIconBody = () => null,
		primeSfxContext = () => {},
		primeMusicContext = () => {},
		syncMusicTrack = () => {},
		setMusicPausedSafe = () => {},
		playSfxSafe = () => {},
		ICON_SFX = {},
		getDragEnabled = () => false,
		getRingSpinBlocked = () => false,
		getCoreScreenPos = () => ({ x: 0, y: 0 }),
		getCoreControlRadius = () => 0,
		onSpin = () => {},
		onLayout = () => {},
		ringThrowBoost = 1.7,
		ringMaxSpinVel = 10.5,
		enableClickAudio = false,
		clickAudioUrl = './assets/audio/clickdown.wav',
		toRendererPoint: customToRendererPoint = null,
	} = options;

	let clickAudioCtx = null;
	let clickBuffer = null;
	let clickLoadPromise = null;
	let pointerPressedIcon = null;

	async function ensureClickAudio() {
		if (!enableClickAudio) return null;
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
				const res = await fetch(clickAudioUrl);
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

	function updateMouseFromEvent(event) {
		const rect = app.view.getBoundingClientRect();
		if (!rect || rect.width <= 0 || rect.height <= 0) return;
		const x = event.clientX - rect.left;
		const y = event.clientY - rect.top;
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

	const toRendererPoint = customToRendererPoint || ((event) => {
		const rect = app.view.getBoundingClientRect();
		if (!rect || rect.width <= 0 || rect.height <= 0) return null;
		const x = (event.clientX - rect.left) * (app.renderer.width / rect.width);
		const y = (event.clientY - rect.top) * (app.renderer.height / rect.height);
		if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
		return { x, y };
	});

	window.addEventListener('pointermove', updateMouseFromEvent);
	window.addEventListener('pointerdown', updateMouseFromEvent);
	window.addEventListener('pointerenter', updateMouseFromEvent);
	window.addEventListener('mousemove', updateMouseFromEvent);
	app.view.addEventListener('pointermove', updateMouseFromEvent);
	app.view.addEventListener('pointerdown', updateMouseFromEvent);
	app.view.addEventListener('pointerenter', updateMouseFromEvent);

	const ringSpinInput = createRingSpinInputController({
		toRendererPoint,
		getCoreScreenPos,
		getCoreControlRadius,
		isBlocked: getRingSpinBlocked,
		onSpin,
		onLayout,
		ringThrowBoost,
		ringMaxSpinVel,
	});

	window.addEventListener('pointerdown', async (event) => {
		mouse.down = true;
		setInGameCursorVisible(true);
		const point = toRendererPoint(event);
		closeSoundPanelIfOutside(point);
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
		setMusicPausedSafe(hidden);
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
		const shouldPlayClick = Boolean(!getDragEnabled() && pointerPressedIcon && hoveredIcon && pointerPressedIcon === hoveredIcon);
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

	return {
		ringSpinInput,
	};
}
