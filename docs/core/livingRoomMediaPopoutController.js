export function createLivingRoomMediaPopoutController(options = {}) {
	const {
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
		getLivingRoomSlideIndex,
		isLivingRoomActive,
		getLivingRoomViewMode,
		getTextureNaturalSize,
		playEnlargeScreenshotSfx,
		playReturnScreenshotSfx,
	} = options;

	if (!PIXI || !app) throw new Error('createLivingRoomMediaPopoutController requires PIXI and app');
	if (!mediaPopoutState || !mediaPopoutLayer || !mediaPopoutCard || !mediaPopoutSprite) {
		throw new Error('createLivingRoomMediaPopoutController requires media popout state and display objects');
	}

	const layoutCard = () => {
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

	const open = () => {
		if (!isLivingRoomActive() || getLivingRoomViewMode() !== VIEW_TV_AREA) return false;
		const project = getActiveProject();
		if (project?.useDesktopFeed) return false;
		const wasClosed = mediaPopoutState.target <= 0.02 && mediaPopoutState.progress <= 0.02;
		const slide = getActiveSlide();
		const texture = PIXI.Texture.from(slide?.src || PORTFOLIO_EMPTY_SLIDE.src);
		if (!texture) return false;
		mediaPopoutSprite.texture = texture;
		mediaPopoutState.textureKey = `${project?.id || 'project'}:${getLivingRoomSlideIndex()}:${slide?.src || ''}`;
		mediaPopoutState.target = 1;
		mediaPopoutLayer.visible = true;
		mediaPopoutLayer.eventMode = 'static';
		mediaPopoutState.targetTiltX = 0;
		mediaPopoutState.targetTiltY = 0;
		if (wasClosed) playEnlargeScreenshotSfx();
		layoutCard();
		return true;
	};

	const close = (optionsArg = {}) => {
		const playReturnSfx = Boolean(optionsArg.playReturnSfx);
		const wasOpen = mediaPopoutState.target > 0.02;
		mediaPopoutState.target = 0;
		mediaPopoutState.targetTiltX = 0;
		mediaPopoutState.targetTiltY = 0;
		if (playReturnSfx && wasOpen) playReturnScreenshotSfx();
		return wasOpen;
	};

	const step = (dtSeconds) => {
		const blend = Math.min(1, dtSeconds * 10);
		mediaPopoutState.progress += (mediaPopoutState.target - mediaPopoutState.progress) * blend;
		if (mediaPopoutState.progress < 0.002 && mediaPopoutState.target <= 0) {
			mediaPopoutLayer.visible = false;
			mediaPopoutLayer.eventMode = 'none';
			mediaPopoutState.progress = 0;
			return;
		}
		mediaPopoutLayer.visible = true;
		layoutCard();
		const ease = 1 - Math.pow(1 - Math.max(0, Math.min(1, mediaPopoutState.progress)), 3);
		mediaPopoutState.tiltX = 0;
		mediaPopoutState.tiltY = 0;
		mediaPopoutCard.scale.set(0.94 + ease * 0.06);
		mediaPopoutCard.alpha = ease;
		mediaPopoutCard.position.set(mediaPopoutState.cardX, mediaPopoutState.cardY);
		mediaPopoutCard.skew.set(0, 0);
		mediaPopoutGloss.alpha = MEDIA_POPOUT_GLOSS_BASE_ALPHA * ease;
	};

	return {
		layoutCard,
		open,
		close,
		step,
	};
}
