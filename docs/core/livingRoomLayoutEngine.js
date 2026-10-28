// Include phones and typical tablet/iPad portrait widths.
export const LIVING_ROOM_MOBILE_BREAKPOINT = 1024;

export function isLivingRoomMobileWidth(width) {
	return Number(width) < LIVING_ROOM_MOBILE_BREAKPOINT;
}

export function layoutLivingRoomView(context, { instantTerminal = false } = {}) {
	const {
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
		tvBroTitleBaseY,
		tvBroSubBaseY,
		tvTerminalStartX,
		tvTerminalStartY,
		tvTerminalLineHeight,
		tvTerminalFontSize,
		livingRoomTvSlotX,
		livingRoomTvSlotY,
		livingRoomTapeW,
		livingRoomTapeH,
	} = context;

	let nextTvBroTitleBaseY = tvBroTitleBaseY;
	let nextTvBroSubBaseY = tvBroSubBaseY;
	let nextTvTerminalStartX = tvTerminalStartX;
	let nextTvTerminalStartY = tvTerminalStartY;
	let nextTvTerminalLineHeight = tvTerminalLineHeight;
	let nextTvTerminalFontSize = tvTerminalFontSize;
	let nextLivingRoomTvSlotX = livingRoomTvSlotX;
	let nextLivingRoomTvSlotY = livingRoomTvSlotY;
	let nextLivingRoomTapeW = livingRoomTapeW;
	let nextLivingRoomTapeH = livingRoomTapeH;

	const sw = app.renderer.width;
	const sh = app.renderer.height;
	const isMobile = isLivingRoomMobileWidth(sw);
	livingRoomState.mobileLayout = isMobile;
	if (!isMobile) {
		livingRoomState.drawerOpen = false;
		livingRoomState.drawerProgress = 0;
	}
	if (!Number.isFinite(livingRoomState.drawerProgress)) {
		livingRoomState.drawerProgress = livingRoomState.drawerOpen ? 1 : 0;
	}
	const drawerOpen = Boolean(isMobile && livingRoomState.drawerOpen);
	const drawerProgress = isMobile
		? Math.max(0, Math.min(1, Number(livingRoomState.drawerProgress) || 0))
		: 0;
	const drawerVisible = isMobile && (drawerOpen || drawerProgress > 0.001);

	const margin = Math.max(isMobile ? 12 : 20, Math.round(sw * (isMobile ? 0.02 : 0.028)));
	const navBtnH = 30;
	const mobileNavY = Math.max(8, margin - 2);
	const navRowH = Math.max(34, Math.min(52, Math.round(sh * 0.06)));
	const navRowY = margin;
	const layoutTop = isMobile ? (mobileNavY + navBtnH + 10) : margin;
	const focusMixRaw = livingRoomLayoutFocus.mix;
	const focusMix = Math.max(0, Math.min(1, focusMixRaw));
	const activeAccent = getActiveAccentColor();
	const shelfBorderColor = tintColor(activeAccent, 0.9);
	const shelfLineColor = tintColor(activeAccent, 1.22);
	livingRoomLayoutFocus.lastAppliedMix = focusMixRaw;

	let rackW;
	let rackX;
	let rackY;
	let panelW;
	let panelH;
	let panelX;
	let panelY;
	let colGap = 0;

	if (isMobile) {
		colGap = 0;
		panelW = Math.max(280, sw - margin * 2);
		const panelHCap = Math.min(Math.round(sh * 0.88), Math.round(sh - layoutTop - margin));
		panelH = Math.max(240, panelHCap);
		panelX = margin;
		panelY = layoutTop;
		rackW = Math.max(200, Math.min(320, Math.round(sw * 0.86)));
		rackX = margin;
		rackY = layoutTop;
	} else {
		const browseRackRatio = sw < 980 ? 0.36 : 0.34;
		const focusRackRatio = sw < 980 ? 0.24 : 0.22;
		const rackRatio = browseRackRatio + (focusRackRatio - browseRackRatio) * focusMixRaw;
		colGap = Math.max(10, Math.round(sw * (0.02 - focusMix * 0.004)));
		rackW = Math.max(180, Math.min(Math.round(sw * 0.42), Math.round(sw * rackRatio)));
		panelW = Math.max(320, sw - margin * 2 - colGap - rackW);
		const panelHCap = Math.min(Math.round(sh * 0.84), Math.round(sw * 0.72));
		panelH = Math.max(300, Math.min(panelHCap, Math.round(sh - margin * 2)));
		rackX = margin;
		rackY = layoutTop;
		panelX = rackX + rackW + colGap;
		panelY = layoutTop;
	}

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
	leftShelf.beginFill(0x0f1720, isMobile ? 0.96 : 0.88);
	leftShelf.lineStyle(2, shelfBorderColor, 0.85);
	leftShelf.drawRoundedRect(rackX, rackY, rackW, panelH, 10);
	leftShelf.endFill();
	leftShelf.lineStyle(1, shelfLineColor, 0.16);
	for (let y = rackY + 22; y < rackY + panelH - 20; y += 14) {
		leftShelf.moveTo(rackX + 10, y);
		leftShelf.lineTo(rackX + rackW - 10, y);
	}
	leftShelf.visible = !isMobile || drawerVisible;
	leftShelf.eventMode = 'none';
	leftShelf.position.set(0, 0);

	rightShelf.clear();
	rightShelf.alpha = 0;

	if (cartridgeDrawerDim) {
		cartridgeDrawerDim.clear();
		if (isMobile && drawerVisible) {
			cartridgeDrawerDim.beginFill(0x02060c, 0.55);
			cartridgeDrawerDim.drawRect(0, 0, sw, sh);
			cartridgeDrawerDim.endFill();
			cartridgeDrawerDim.visible = true;
			cartridgeDrawerDim.eventMode = drawerProgress > 0.2 ? 'static' : 'none';
			cartridgeDrawerDim.cursor = 'pointer';
			cartridgeDrawerDim.alpha = drawerProgress;
		} else {
			cartridgeDrawerDim.visible = false;
			cartridgeDrawerDim.eventMode = 'none';
			cartridgeDrawerDim.alpha = 0;
		}
	}

	const rackPad = Math.max(8, Math.round(12 - (isMobile ? 0 : focusMix * 3)));
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
	cartridgeListViewport.visible = !isMobile || drawerVisible;
	cartridgeListMask.clear();
	cartridgeListMask.beginFill(0xffffff, 1);
	cartridgeListMask.drawRoundedRect(0, 0, viewportW, viewportH, 8);
	cartridgeListMask.endFill();
	cartridgeScrollUi.position.set(viewportX + viewportW + scrollbarGap, viewportY);
	cartridgeScrollUi.visible = !isMobile || drawerVisible;
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

	const innerPad = Math.max(isMobile ? 10 : 14, Math.round(panelW * (isMobile ? 0.025 : 0.03)));
	const contentX = innerPad;
	const contentY = innerPad;
	const contentW = panelW - innerPad * 2;
	const contentH = panelH - innerPad * 2;
	const paneGap = Math.max(8, Math.round((isMobile ? contentH : contentW) * 0.02));

	let previewW;
	let previewH;
	let previewX;
	let previewY;
	let terminalW;
	let terminalH;
	let terminalX;
	let terminalY;

	if (isMobile) {
		// Mobile always uses the larger preview stack; FOCUS/BROWSE is desktop-only.
		const tvRatio = 0.4;
		previewW = contentW;
		const preferredPreviewH = Math.round(contentH * tvRatio);
		previewH = Math.max(64, Math.min(preferredPreviewH, contentH - 140));
		terminalW = contentW;
		terminalH = Math.max(96, contentH - previewH - paneGap);
		previewX = contentX;
		previewY = contentY;
		terminalX = contentX;
		terminalY = contentY + previewH + paneGap;
	} else {
		previewW = Math.round(contentW * 0.56);
		previewH = contentH;
		terminalW = contentW - previewW - paneGap;
		terminalH = contentH;
		previewX = contentX;
		previewY = contentY;
		terminalX = previewX + previewW + paneGap;
		terminalY = contentY;
	}

	holoPanelLocalRect.x = contentX;
	holoPanelLocalRect.y = contentY;
	holoPanelLocalRect.w = contentW;
	holoPanelLocalRect.h = contentH;

	livingRoomTvScreenRect.x = panelX + previewX;
	livingRoomTvScreenRect.y = panelY + previewY;
	livingRoomTvScreenRect.w = previewW;
	livingRoomTvScreenRect.h = previewH;
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

	const mediaTopPad = Math.max(2, Math.round(previewH * 0.02));
	const mediaUiBandH = Math.max(isMobile ? 28 : 42, Math.round(previewH * (isMobile ? 0.18 : 0.14)));
	const mediaBottomPad = Math.max(mediaUiBandH + 6, Math.round(previewH * (isMobile ? 0.22 : 0.18)));
	const mediaSidePad = Math.max(6, Math.round(previewW * 0.02));
	livingRoomMediaLayout.x = previewX + mediaSidePad;
	livingRoomMediaLayout.y = previewY + mediaTopPad;
	livingRoomMediaLayout.w = Math.max(1, previewW - mediaSidePad * 2);
	livingRoomMediaLayout.h = Math.max(1, previewH - mediaTopPad - mediaBottomPad);
	const mediaUiRowY = previewY + previewH - Math.max(12, Math.round(mediaUiBandH * 0.42));
	livingRoomMediaLayout.dotY = mediaUiRowY - 6;
	livingRoomMediaLayout.navY = mediaUiRowY + 4;
	livingRoomMediaLayout.hintY = mediaUiRowY + 4;
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
	tvMediaZoomHint.position.set(previewX + previewW * 0.5, livingRoomMediaLayout.hintY);
	updateLivingRoomMediaZoomHint();
	tvMediaPrevSprite.visible = livingRoomMediaUi.isMediaTransitionActive();
	tvMediaPrevSprite.alpha = livingRoomMediaUi.isMediaTransitionActive() ? tvMediaPrevSprite.alpha : 0;

	tvBroBg.clear();
	tvBroBg.beginFill(0x060e18, 0.96);
	tvBroBg.lineStyle(1, getActiveAccentColor(), 0.48);
	tvBroBg.drawRoundedRect(terminalX, terminalY, terminalW, terminalH, 8);
	tvBroBg.endFill();
	tvTerminalMask.clear();
	tvTerminalMask.beginFill(0xffffff, 1);
	tvTerminalMask.drawRoundedRect(
		terminalX + 2,
		terminalY + 2,
		Math.max(8, terminalW - 4),
		Math.max(8, terminalH - 4),
		7,
	);
	tvTerminalMask.endFill();
	tvBroTitle.anchor.set(0, 0);
	tvBroTitle.style.fontSize = Math.max(11, Math.round(Math.min(16, terminalW * (isMobile ? 0.055 : 0.07))));
	tvBroTitle.style.fill = 0x9fdfff;
	tvBroTitle.text = 'TERMINAL';
	tvBroTitle.position.set(terminalX + 12, terminalY + 10);
	tvBroSub.visible = true;
	nextTvTerminalFontSize = Math.max(11, Math.round(Math.min(15, terminalW * (isMobile ? 0.048 : 0.07))));
	nextTvTerminalLineHeight = Math.max(18, Math.round(nextTvTerminalFontSize * 1.55));
	nextTvTerminalStartX = terminalX + 12;
	nextTvTerminalStartY = terminalY + 42;
	livingRoomTerminalLayout.x = terminalX + 12;
	livingRoomTerminalLayout.y = terminalY + 40;
	livingRoomTerminalLayout.w = Math.max(70, terminalW - 24);
	livingRoomTerminalLayout.h = Math.max(40, terminalH - 54);
	nextTvBroTitleBaseY = tvBroTitle.y;
	nextTvBroSubBaseY = tvBroSub.y;
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
	tvCrtOverlay.drawRoundedRect(previewX, previewY, previewW, previewH, 10);
	tvCrtOverlay.endFill();
	tvCrtOverlay.lineStyle(1, 0x8ed3fb, 0.1);
	for (let d = -previewH; d < previewW; d += 16) {
		tvCrtOverlay.moveTo(previewX + Math.max(0, d), previewY + Math.max(0, -d));
		tvCrtOverlay.lineTo(previewX + Math.min(previewW, d + previewH), previewY + Math.min(previewH, previewH - d));
	}

	tvGlassReflection.clear();
	const terminalSlideBandX = terminalX + 8;
	const terminalSlideBandY = nextTvTerminalStartY - 9;
	const terminalSlideBandW = Math.max(24, terminalW - 16);
	const terminalSlideBandH = Math.max(30, Math.round(nextTvTerminalLineHeight * 2.25));
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

	const navY = isMobile ? mobileNavY : Math.max(6, margin - 36);
	livingRoomBackBg.clear();
	livingRoomBackBg.beginFill(0x142334, 0.95);
	livingRoomBackBg.lineStyle(2, 0x7ed1ff, 0.82);
	livingRoomBackBg.drawRoundedRect(0, 0, 88, navBtnH, 8);
	livingRoomBackBg.endFill();
	livingRoomBackBtn.position.set(margin + 2, navY);
	livingRoomBackLabel.position.set(44, navBtnH * 0.5);

	livingRoomFocusLabel.text = focusMix >= 0.5 ? 'BROWSE' : 'FOCUS';
	const focusBtnW = Math.max(96, Math.ceil(livingRoomFocusLabel.width + 26));
	livingRoomFocusBg.clear();
	livingRoomFocusBg.beginFill(0x142334, 0.95);
	livingRoomFocusBg.lineStyle(2, focusMix >= 0.5 ? tintColor(activeAccent, 1.22) : 0x7ed1ff, 0.82);
	livingRoomFocusBg.drawRoundedRect(0, 0, focusBtnW, navBtnH, 8);
	livingRoomFocusBg.endFill();
	const focusBtnX = livingRoomBackBtn.x + 88 + 8;
	livingRoomFocusBtn.position.set(focusBtnX, navY);
	livingRoomFocusLabel.position.set(focusBtnW * 0.5, navBtnH * 0.5);
	livingRoomFocusBtn.visible = !isMobile;
	livingRoomFocusBtn.eventMode = isMobile ? 'none' : 'static';

	if (cartridgeTapesTab && cartridgeTapesTabBg && cartridgeTapesTabLabel) {
		// Horizontal PROJECTS control inline with BACK (mobile only).
		cartridgeTapesTabLabel.rotation = 0;
		cartridgeTapesTabLabel.text = 'PROJECTS';
		cartridgeTapesTabLabel.style.fontSize = 10;
		cartridgeTapesTabLabel.style.fill = 0xf4e5cc;
		cartridgeTapesTabLabel.style.letterSpacing = 1;
		cartridgeTapesTabLabel.anchor.set(0.5, 0.5);
		const projectsBtnW = Math.max(110, Math.ceil(cartridgeTapesTabLabel.width + 26));
		cartridgeTapesTabBg.clear();
		cartridgeTapesTabBg.beginFill(0x142334, 0.95);
		cartridgeTapesTabBg.lineStyle(
			2,
			drawerOpen || drawerProgress > 0.5 ? tintColor(activeAccent, 1.22) : 0x7ed1ff,
			0.82,
		);
		cartridgeTapesTabBg.drawRoundedRect(0, 0, projectsBtnW, navBtnH, 8);
		cartridgeTapesTabBg.endFill();
		cartridgeTapesTabLabel.position.set(projectsBtnW * 0.5, navBtnH * 0.5);
		const projectsBtnX = livingRoomBackBtn.x + 88 + 8;
		cartridgeTapesTab.position.set(projectsBtnX, navY);
		cartridgeTapesTab.visible = isMobile;
		cartridgeTapesTab.eventMode = isMobile ? 'static' : 'none';
		cartridgeTapesTab.cursor = isMobile ? 'pointer' : 'default';
	}

	const tapeWidthFactor = isMobile ? 0.82 : (0.8 - focusMix * 0.12);
	const tapeMinW = isMobile
		? Math.max(132, Math.round(rackW * 0.72))
		: Math.max(118, Math.round(160 - focusMix * 40));
	nextLivingRoomTapeW = Math.max(tapeMinW, rackW * tapeWidthFactor);
	nextLivingRoomTapeH = Math.max(
		Math.round(isMobile ? 58 : (52 + (1 - focusMix) * 12)),
		nextLivingRoomTapeW * 0.44,
	);
	const tapeSpacing = Math.max(8, Math.round(nextLivingRoomTapeH * (isMobile ? 0.12 : (0.12 - focusMix * 0.03))));
	const totalTapeH = livingRoomTapes.length * nextLivingRoomTapeH + (livingRoomTapes.length - 1) * tapeSpacing;
	const tapesTop = 10;
	const rackCenterX = viewportW * 0.5;
	for (let i = 0; i < livingRoomTapes.length; i++) {
		const tape = livingRoomTapes[i];
		tape.baseX = rackCenterX;
		tape.baseY = tapesTop + nextLivingRoomTapeH * 0.5 + i * (nextLivingRoomTapeH + tapeSpacing);
	}
	cartridgeScrollState.viewportH = viewportH;
	cartridgeScrollState.contentH = tapesTop + totalTapeH + 10;
	cartridgeScrollState.maxScroll = Math.max(0, cartridgeScrollState.contentH - viewportH);
	updateCartridgeScrollUi();

	nextLivingRoomTvSlotX = isMobile ? panelX + panelW * 0.5 : viewportX + rackCenterX;
	nextLivingRoomTvSlotY = panelY + panelH * 0.5;

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

	return {
		tvBroTitleBaseY: nextTvBroTitleBaseY,
		tvBroSubBaseY: nextTvBroSubBaseY,
		tvTerminalStartX: nextTvTerminalStartX,
		tvTerminalStartY: nextTvTerminalStartY,
		tvTerminalLineHeight: nextTvTerminalLineHeight,
		tvTerminalFontSize: nextTvTerminalFontSize,
		livingRoomTvSlotX: nextLivingRoomTvSlotX,
		livingRoomTvSlotY: nextLivingRoomTvSlotY,
		livingRoomTapeW: nextLivingRoomTapeW,
		livingRoomTapeH: nextLivingRoomTapeH,
	};
}
