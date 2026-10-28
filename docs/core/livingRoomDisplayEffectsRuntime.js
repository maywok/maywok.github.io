export function updateLivingRoomDisplayEffectsFrame(context, args = {}) {
	const {
		livingRoomState,
		CONTENT_SCREENSAVER,
		CONTENT_EMPTY,
		CONTENT_DESKTOP,
		TERMINAL_TYPE_RATE,
		terminalFullText,
		getTerminalFullText,
		stepTerminalOverviewTyping,
		stepTerminalDesignWave,
		getActiveAccentColor,
		livingRoomTerminalLayout,
		tvTerminalLines,
		tvTerminalCursor,
		tvBroTitle,
		tvBroTitleBaseY,
		getTvBroTitleBaseY,
		tvSlotForeground,
		tvScreensaverLayer,
		tvScreensaverBg,
		tvScreensaverNoise,
		fullscreenTvContentLayer,
		fullscreenTvContentTitle,
		fullscreenTvContentSub,
		fullscreenTvContentBg,
		tvCrtOverlay,
		getNowMs,
	} = context;
	const {
		dtSeconds,
		terminalTypingHold,
		terminalTypeTimer,
		terminalTypedIndex,
		terminalCursorBlinkTimer,
	} = args;

	let nextTerminalTypeTimer = terminalTypeTimer;
	let nextTerminalTypedIndex = terminalTypedIndex;
	let nextTerminalCursorBlinkTimer = terminalCursorBlinkTimer;
	let shouldRenderTerminalTypedText = false;
	const resolvedTerminalFullText = typeof getTerminalFullText === 'function'
		? String(getTerminalFullText() || '')
		: String(terminalFullText || '');
	const resolvedTvBroTitleBaseY = typeof getTvBroTitleBaseY === 'function'
		? getTvBroTitleBaseY()
		: tvBroTitleBaseY;

	if (tvTerminalLines.visible) {
		if (!terminalTypingHold) {
			nextTerminalTypeTimer += dtSeconds * TERMINAL_TYPE_RATE;
		}
		if (!terminalTypingHold && nextTerminalTypedIndex < resolvedTerminalFullText.length) {
			const charsToAdd = Math.floor(nextTerminalTypeTimer);
			if (charsToAdd > 0) {
				nextTerminalTypeTimer -= charsToAdd;
				nextTerminalTypedIndex = Math.min(resolvedTerminalFullText.length, nextTerminalTypedIndex + charsToAdd);
				shouldRenderTerminalTypedText = true;
			}
		}
	}
	stepTerminalOverviewTyping(dtSeconds);
	nextTerminalCursorBlinkTimer = (nextTerminalCursorBlinkTimer + dtSeconds) % 1;
	tvTerminalCursor.visible = tvTerminalLines.visible && nextTerminalCursorBlinkTimer < 0.5;

	const pulseTime = getNowMs() * 0.003;
	tvBroTitle.y = resolvedTvBroTitleBaseY;
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
	const idleStatic = 0.08 + 0.02 * Math.sin(getNowMs() * 0.004);
	const burstStatic = livingRoomState.staticBurst > 0 ? (0.03 + (livingRoomState.staticBurst / 0.3) * 0.06) : 0;
	tvCrtOverlay.alpha = Math.max(idleStatic, burstStatic);

	return {
		terminalTypeTimer: nextTerminalTypeTimer,
		terminalTypedIndex: nextTerminalTypedIndex,
		terminalCursorBlinkTimer: nextTerminalCursorBlinkTimer,
		shouldRenderTerminalTypedText,
		pulseTime,
	};
}

export function createLivingRoomDisplayEffectsController(context) {
	const boundContext = { ...context };
	return {
		step(args = {}) {
			return updateLivingRoomDisplayEffectsFrame(boundContext, args);
		},
	};
}
