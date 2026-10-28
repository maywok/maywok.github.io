export function createLivingRoomSceneRuntime(options = {}) {
	const {
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
		livingRoomRackRect = { x: 0, y: 0, w: 0, h: 0 },
		cartridgeViewportRect = { x: 0, y: 0, w: 0, h: 0 },
		livingRoomWallGlow,
		livingRoomFloor,
		leftShelf,
		rightShelf,
		cartridgeDrawerDim = null,
		cartridgeTapesTab = null,
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
		getActiveProject = () => null,
		isFullscreenTvPlaybackActive = () => false,
		setInGameCursorVisible = () => {},
		drawLivingRoomBackdrop = () => {},
		stepLivingRoomDetailFocus = () => {},
		ambientController,
		getPreviewUsesDesktopFeed = () => false,
		refreshDesktopTvTexture = () => {},
		stepLivingRoomBezelAnimation = () => {},
		stepMediaPopout = () => {},
		displayEffectsController,
		tapeDisplayController,
		getTerminalState = () => ({
			terminalTypingHold: false,
			terminalTypeTimer: 0,
			terminalTypedIndex: 0,
			terminalCursorBlinkTimer: 0,
		}),
		applyDisplayEffectsResult = () => {},
		getLivingRoomDotCount = () => 0,
		getLivingRoomTapeDimensions = () => ({ livingRoomTapeW: 1, livingRoomTapeH: 1 }),
		refreshPlacard = () => {},
		setLivingRoomActive = () => {},
		getPointerScreenPos = () => null,
	} = options;

	const previewHoverState = {
		mix: 0,
		scale: 1,
	};

	const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
	const blendColor = (a, b, t) => {
		const ta = clamp(t, 0, 1);
		const ar = (a >> 16) & 255;
		const ag = (a >> 8) & 255;
		const ab = a & 255;
		const br = (b >> 16) & 255;
		const bg = (b >> 8) & 255;
		const bb = b & 255;
		const rr = Math.round(ar + (br - ar) * ta);
		const rg = Math.round(ag + (bg - ag) * ta);
		const rb = Math.round(ab + (bb - ab) * ta);
		return (rr << 16) | (rg << 8) | rb;
	};

	const setPreviewSpriteBase = (sprite) => {
		if (!sprite) return;
		sprite._previewBaseWidth = sprite.width;
		sprite._previewBaseHeight = sprite.height;
		sprite._previewBaseX = sprite.position.x;
		sprite._previewBaseY = sprite.position.y;
	};

	const applyFrameHoverMotion = (node, centerX, centerY, mix) => {
		if (!node) return;
		node.pivot.set(centerX, centerY);
		node.position.set(centerX, centerY);
		node.scale.set(1 + mix * 0.018);
		node.rotation = 0;
		node.skew.set(0, 0);
	};

	const applyPreviewHoverEffects = (dtSeconds) => {
		const mediaRect = {
			x: livingRoomTv.x + livingRoomMediaLayout.x,
			y: livingRoomTv.y + livingRoomMediaLayout.y,
			w: livingRoomMediaLayout.w,
			h: livingRoomMediaLayout.h,
		};
		const project = getActiveProject();
		const popoutOpen = mediaPopoutState.progress > 0.02 || mediaPopoutState.target > 0;
		const enabled = livingRoomState.viewMode === VIEW_TV_AREA
			&& !project?.useDesktopFeed
			&& !popoutOpen
			&& mediaRect.w > 1
			&& mediaRect.h > 1;

		const pointer = getPointerScreenPos?.();
		const inside = enabled
			&& pointer
			&& pointer.x >= mediaRect.x
			&& pointer.x <= (mediaRect.x + mediaRect.w)
			&& pointer.y >= mediaRect.y
			&& pointer.y <= (mediaRect.y + mediaRect.h);

		const hoverTarget = inside ? 1 : 0;
		previewHoverState.mix += (hoverTarget - previewHoverState.mix) * Math.min(1, dtSeconds * 9);
		const targetScale = 1 + 0.018 * previewHoverState.mix;
		previewHoverState.scale += (targetScale - previewHoverState.scale) * Math.min(1, dtSeconds * 10);

		const accent = Number.isFinite(project?.accent) ? project.accent : 0x8ed3fb;
		const targetTint = blendColor(0xffffff, accent, previewHoverState.mix * 0.08);

		for (const sprite of [tvDesktopContentSprite, tvMediaPrevSprite]) {
			if (!sprite) continue;
			if (!Number.isFinite(sprite._previewBaseWidth) || sprite._previewBaseWidth <= 0 || !Number.isFinite(sprite._previewBaseX)) {
				setPreviewSpriteBase(sprite);
			}
			if (!Number.isFinite(sprite._previewBaseWidth) || sprite._previewBaseWidth <= 0) continue;
			sprite.width = sprite._previewBaseWidth * previewHoverState.scale;
			sprite.height = sprite._previewBaseHeight * previewHoverState.scale;
			sprite.position.set(sprite._previewBaseX, sprite._previewBaseY);
			sprite.rotation = 0;
			sprite.skew.set(0, 0);
			sprite.tint = targetTint;
		}

		const frameCenterX = Number.isFinite(tvDesktopContentSprite?._previewBaseX)
			? tvDesktopContentSprite._previewBaseX
			: (mediaRect.x + mediaRect.w * 0.5);
		const frameCenterY = Number.isFinite(tvDesktopContentSprite?._previewBaseY)
			? tvDesktopContentSprite._previewBaseY
			: (mediaRect.y + mediaRect.h * 0.5);
		applyFrameHoverMotion(tvMediaFrame, frameCenterX, frameCenterY, previewHoverState.mix);
		applyFrameHoverMotion(tvMediaFrameGlow, frameCenterX, frameCenterY, previewHoverState.mix);
		if (tvMediaFrameGlow) {
			tvMediaFrameGlow.alpha = 1 + previewHoverState.mix * 0.16;
		}
	};

	return (dtSeconds) => {
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
			setLivingRoomActive(false);
			return;
		}

		const blend = Math.max(0, Math.min(1, livingRoomState.blend));
		const reveal = 1 - Math.pow(1 - blend, 3);
		stepLivingRoomDetailFocus(dtSeconds);
		const focusMix = Math.max(0, Math.min(1, livingRoomLayoutFocus.mix));
		const desktopProxyMix = 1 - Math.pow(1 - blend, 2.35);
		const shouldRefreshDesktopFeed = getPreviewUsesDesktopFeed() && (blend < 1 || livingRoomState.targetBlend < 1 || livingRoomState.viewMode === VIEW_TV_AREA);
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

		const livingRoomActiveNow = blend > 0.02;
		setLivingRoomActive(livingRoomActiveNow);
		const fullscreenUiActive = livingRoomActiveNow && isFullscreenTvPlaybackActive() && blend < 0.02 && !getActiveProject()?.useDesktopFeed;
		fullscreenTvContentLayer.eventMode = fullscreenUiActive ? 'passive' : 'none';
		fullscreenExitBtn.visible = fullscreenUiActive;

		livingRoomLayer.visible = true;
		livingRoomLayer.eventMode = blend > 0.02 ? 'static' : 'none';
		livingRoomLayer.alpha = 1;
		setInGameCursorVisible(true);
		cursorContainer.zIndex = 5000;
		uiTopLayer.sortChildren();

		drawLivingRoomBackdrop(blend);
		ambientController.step({
			dtSeconds,
			reveal,
			focusMix,
		});

		tvDesktopTransitionLayer.visible = blend > 0.001 && blend < 0.999;
		tvDesktopTransitionSprite.position.set(
			livingRoomTvScreenRect.x * desktopProxyMix,
			livingRoomTvScreenRect.y * desktopProxyMix,
		);
		tvDesktopTransitionSprite.width = app.renderer.width + (livingRoomTvScreenRect.w - app.renderer.width) * desktopProxyMix;
		tvDesktopTransitionSprite.height = app.renderer.height + (livingRoomTvScreenRect.h - app.renderer.height) * desktopProxyMix;
		tvDesktopTransitionSprite.alpha = Math.max(0, 1 - Math.max(0, (desktopProxyMix - 0.92) / 0.08));

		const mobileLayout = Boolean(livingRoomState.mobileLayout);
		const drawerTarget = mobileLayout && livingRoomState.drawerOpen ? 1 : 0;
		if (!Number.isFinite(livingRoomState.drawerProgress)) {
			livingRoomState.drawerProgress = drawerTarget;
		}
		if (mobileLayout) {
			const drawerDelta = drawerTarget - livingRoomState.drawerProgress;
			if (Math.abs(drawerDelta) < 0.001) {
				livingRoomState.drawerProgress = drawerTarget;
			} else {
				// Subtle ease toward open/closed.
				livingRoomState.drawerProgress += drawerDelta * Math.min(1, dtSeconds * 9.5);
			}
		} else {
			livingRoomState.drawerProgress = 0;
		}
		const drawerProgress = Math.max(0, Math.min(1, Number(livingRoomState.drawerProgress) || 0));
		const drawerEased = drawerProgress * drawerProgress * (3 - 2 * drawerProgress);
		const drawerSlideX = mobileLayout
			? -(livingRoomRackRect.w + 28) * (1 - drawerEased)
			: 0;

		livingRoomWallGlow.alpha = 0.04 + reveal * 0.16;
		livingRoomFloor.alpha = 0.24 + reveal * 0.62;
		if (mobileLayout) {
			const drawerShown = drawerProgress > 0.001;
			leftShelf.visible = drawerShown;
			cartridgeListViewport.visible = drawerShown;
			cartridgeScrollUi.visible = drawerShown;
			leftShelf.alpha = drawerShown ? (0.4 + reveal * 0.6) * Math.min(1, drawerEased * 1.15) : 0;
			cartridgeListViewport.alpha = drawerShown ? Math.min(1, drawerEased * 1.2) : 0;
			cartridgeScrollUi.alpha = drawerShown ? Math.min(1, drawerEased * 1.2) : 0;
			leftShelf.position.set(drawerSlideX, 0);
			cartridgeListViewport.position.set(
				cartridgeViewportRect.x + drawerSlideX,
				cartridgeViewportRect.y,
			);
			cartridgeScrollUi.position.set(
				cartridgeViewportRect.x + cartridgeViewportRect.w + 8 + drawerSlideX,
				cartridgeViewportRect.y,
			);
		} else {
			leftShelf.position.set(0, 0);
			leftShelf.alpha = (0.24 + reveal * 0.76) * (1 - focusMix * 0.08);
			cartridgeListViewport.alpha = 1 - focusMix * 0.06;
			cartridgeScrollUi.alpha = 1 - focusMix * 0.08;
		}
		rightShelf.alpha = 0;
		livingRoomForeground.alpha = 0;
		placard.alpha = 0;
		livingRoomBackBtn.alpha = Math.max(0, (reveal - 0.32) / 0.68);
		livingRoomBackBtn.eventMode = reveal > 0.55 ? 'static' : 'none';
		if (mobileLayout) {
			livingRoomFocusBtn.visible = false;
			livingRoomFocusBtn.alpha = 0;
			livingRoomFocusBtn.eventMode = 'none';
		} else {
			livingRoomFocusBtn.visible = true;
			livingRoomFocusBtn.alpha = livingRoomBackBtn.alpha;
			livingRoomFocusBtn.eventMode = reveal > 0.55 ? 'static' : 'none';
		}
		tvScreenHitArea.alpha = 0;
		tvScreenHitArea.eventMode = 'none';
		tvEjectBtn.alpha = 0;
		tvEjectBtn.eventMode = 'none';
		if (cartridgeDrawerDim) {
			const dimShown = mobileLayout && drawerProgress > 0.001;
			cartridgeDrawerDim.visible = dimShown;
			cartridgeDrawerDim.alpha = dimShown ? Math.min(1, reveal) * drawerEased : 0;
			cartridgeDrawerDim.eventMode = dimShown && drawerProgress > 0.2 ? 'static' : 'none';
		}
		if (cartridgeTapesTab) {
			cartridgeTapesTab.alpha = mobileLayout ? livingRoomBackBtn.alpha : 0;
			cartridgeTapesTab.eventMode = mobileLayout && reveal > 0.55 ? 'static' : 'none';
		}

		const panelReveal = Math.max(0, (reveal - 0.04) / 0.96);
		livingRoomTv.alpha = Math.min(1, panelReveal + focusMix * 0.04);
		livingRoomTv.scale.set(1 + focusMix * 0.008);

		tvDesktopContentSprite.alpha = 1;
		tvBroScreen.alpha = 1;
		tvEmptyScreen.alpha = 0;
		tvSlideDotNav.visible = getLivingRoomDotCount() > 1;
		tvMediaZoomHint.alpha = (mediaPopoutState.progress > 0.02 || mediaPopoutState.target > 0) ? 0 : 0.82;
		stepLivingRoomBezelAnimation(dtSeconds);
		applyPreviewHoverEffects(dtSeconds);
		stepMediaPopout(dtSeconds);
		const screensaverTarget = livingRoomState.contentMode === CONTENT_SCREENSAVER ? 1 : 0;
		tvScreensaverLayer.alpha += (screensaverTarget - tvScreensaverLayer.alpha) * Math.min(1, dtSeconds * 6);

		const terminalState = getTerminalState();
		const displayEffectsResult = displayEffectsController.step({
			dtSeconds,
			terminalTypingHold: terminalState.terminalTypingHold,
			terminalTypeTimer: terminalState.terminalTypeTimer,
			terminalTypedIndex: terminalState.terminalTypedIndex,
			terminalCursorBlinkTimer: terminalState.terminalCursorBlinkTimer,
		});
		applyDisplayEffectsResult(displayEffectsResult);

		const { livingRoomTapeW, livingRoomTapeH } = getLivingRoomTapeDimensions();
		tapeDisplayController.step({
			reveal,
			focusMix,
			dtSeconds,
			pulseTime: displayEffectsResult.pulseTime,
			livingRoomTapeW,
			livingRoomTapeH,
		});

		refreshPlacard();
	};
}
