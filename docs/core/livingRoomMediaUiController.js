export function createLivingRoomMediaUiController(options = {}) {
	const {
		DEFAULT_NEON_ACCENT,
		tintColor,
		tvMediaFrameGlow,
		tvMediaFrame,
		tvMediaZoomHint,
		tvDesktopContentSprite,
		tvMediaPrevSprite,
		onOpenMediaPopout,
	} = options;

	if (!Number.isFinite(DEFAULT_NEON_ACCENT)) throw new Error('createLivingRoomMediaUiController requires DEFAULT_NEON_ACCENT');
	if (typeof tintColor !== 'function') throw new Error('createLivingRoomMediaUiController requires tintColor');
	if (!tvMediaFrameGlow || !tvMediaFrame || !tvMediaZoomHint || !tvDesktopContentSprite || !tvMediaPrevSprite) {
		throw new Error('createLivingRoomMediaUiController requires media frame, hint, and sprite references');
	}

	let mediaExpanded = false;
	const LIVING_ROOM_MEDIA_SCALE_BASE = 1.05;
	const LIVING_ROOM_MEDIA_SCALE_EXPANDED = 1.18;
	const mediaTransition = {
		active: false,
		progress: 1,
		duration: 0.2,
	};

	const bezelAnim = {
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

	const drawBezel = () => {
		if (!bezelAnim.ready || bezelAnim.w <= 0 || bezelAnim.h <= 0) return;
		const frameX = bezelAnim.x;
		const frameY = bezelAnim.y;
		const frameW = bezelAnim.w;
		const frameH = bezelAnim.h;
		const accent = bezelAnim.accent;
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

	const setBezelTarget = (frameX, frameY, frameW, frameH, accent) => {
		bezelAnim.targetX = frameX;
		bezelAnim.targetY = frameY;
		bezelAnim.targetW = frameW;
		bezelAnim.targetH = frameH;
		bezelAnim.accent = accent;
		if (!bezelAnim.ready) {
			bezelAnim.x = frameX;
			bezelAnim.y = frameY;
			bezelAnim.w = frameW;
			bezelAnim.h = frameH;
			bezelAnim.ready = true;
			drawBezel();
		}
	};

	const stepBezelAnimation = (dtSeconds) => {
		if (!bezelAnim.ready) return;
		const blend = Math.min(1, dtSeconds * 10);
		bezelAnim.x += (bezelAnim.targetX - bezelAnim.x) * blend;
		bezelAnim.y += (bezelAnim.targetY - bezelAnim.y) * blend;
		bezelAnim.w += (bezelAnim.targetW - bezelAnim.w) * blend;
		bezelAnim.h += (bezelAnim.targetH - bezelAnim.h) * blend;
		drawBezel();
	};

	const updateZoomHint = ({ zoomAllowed, accent }) => {
		tvMediaZoomHint.visible = zoomAllowed;
		tvMediaZoomHint.text = 'CLICK TO EXPAND';
		tvMediaZoomHint.style.fill = tintColor(accent, 1.25);
		tvDesktopContentSprite.eventMode = zoomAllowed ? 'static' : 'none';
		tvMediaPrevSprite.eventMode = zoomAllowed ? 'static' : 'none';
		tvDesktopContentSprite.cursor = zoomAllowed ? 'zoom-in' : 'default';
		tvMediaPrevSprite.cursor = tvDesktopContentSprite.cursor;
	};

	const startMediaTransition = ({ force = false } = {}) => {
		mediaTransition.active = !force;
		mediaTransition.progress = force ? 1 : 0;
		if (force) {
			tvDesktopContentSprite.alpha = 1;
			tvMediaPrevSprite.alpha = 0;
			tvMediaPrevSprite.visible = false;
		}
	};

	const stepMediaTransition = (dtSeconds) => {
		if (!mediaTransition.active) return;
		mediaTransition.progress += dtSeconds / Math.max(0.001, mediaTransition.duration);
		const t = Math.max(0, Math.min(1, mediaTransition.progress));
		const eased = 1 - Math.pow(1 - t, 3);
		tvDesktopContentSprite.alpha = eased;
		tvMediaPrevSprite.alpha = 1 - eased;
		if (t >= 1) {
			mediaTransition.active = false;
			tvDesktopContentSprite.alpha = 1;
			tvMediaPrevSprite.alpha = 0;
			tvMediaPrevSprite.visible = false;
		}
	};

	return {
		getMediaScale: () => (mediaExpanded ? LIVING_ROOM_MEDIA_SCALE_EXPANDED : LIVING_ROOM_MEDIA_SCALE_BASE),
		resetExpanded: () => {
			mediaExpanded = false;
		},
		setExpanded: (value) => {
			mediaExpanded = Boolean(value);
		},
		updateZoomHint,
		startMediaTransition,
		stepMediaTransition,
		isMediaTransitionActive: () => mediaTransition.active,
		openZoom: () => {
			onOpenMediaPopout?.();
		},
		setBezelTarget,
		stepBezelAnimation,
	};
}
