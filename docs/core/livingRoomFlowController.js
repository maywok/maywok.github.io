import { isLivingRoomMobileWidth } from './livingRoomLayoutEngine.js';

export function createLivingRoomFlowController(options = {}) {
	const {
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
		setLivingRoomDetailFocus,
		setCartridgeDrawerOpen = () => {},
		isLivingRoomMobileLayout = () => false,
		getRendererWidth = () => 0,
		layoutLivingRoom,
		updateCartridgeScrollUi,
		setInGameCursorVisible,
		playScreenshotScrollSfx,
		pickBroPlaceholderWord,
		isVideoSource,
		getLivingRoomActiveProjectId,
		setLivingRoomActiveProjectId,
		getLivingRoomSlideIndex,
		setLivingRoomSlideIndex,
		getLivingRoomActiveVideoSource,
		setLivingRoomActiveVideoSource,
		tapeNodeById,
		setPreviewUsesDesktopFeed,
		getPreviewUsesDesktopFeed,
		revealTerminalTextNow,
	} = options;

	const setLivingRoomSlide = (nextSlideIndex, flowOptions = {}) => {
		const force = Boolean(flowOptions.force);
		const instantTerminal = Boolean(flowOptions.instantTerminal);
		const userInitiated = Boolean(flowOptions.userInitiated);
		const activeProject = getActiveProject();
		const slides = getSlidesForProject(activeProject);
		if (!slides.length) return;
		const livingRoomSlideIndex = getLivingRoomSlideIndex();
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
		livingRoomMediaUi.resetExpanded();
		updateLivingRoomMediaZoomHint();
		stopLivingRoomVideoSource(getLivingRoomActiveVideoSource());
		setLivingRoomSlideIndex(normalized);
		const slide = getActiveSlide();
		setPreviewUsesDesktopFeed(Boolean(activeProject?.useDesktopFeed));
		if (getPreviewUsesDesktopFeed()) {
			refreshDesktopTvTexture();
		}
		const texture = getPreviewUsesDesktopFeed()
			? tvDesktopRenderTexture
			: PIXI.Texture.from(slide.src || PORTFOLIO_EMPTY_SLIDE.src);
		const source = texture.baseTexture?.resource?.source;
		const nextVideoSource = (!getPreviewUsesDesktopFeed() && slide.type === PORTFOLIO_MEDIA_VIDEO && isVideoSource(source)) ? source : null;
		setLivingRoomActiveVideoSource(nextVideoSource);
		playLivingRoomVideoSource(nextVideoSource);
		fitLivingRoomMediaSprite(tvDesktopContentSprite, texture);
		tvDesktopContentSprite.visible = true;
		tvDesktopContentSprite.alpha = force ? 1 : 0;
		livingRoomMediaUi.startMediaTransition({ force });
		rebuildLivingRoomTerminalPanel({ instant: instantTerminal });
		redrawLivingRoomDots();
	};

	const setLivingRoomProjectForTape = (tape, flowOptions = {}) => {
		const resetSlide = flowOptions.resetSlide !== false;
		const force = Boolean(flowOptions.force);
		const instantTerminal = Boolean(flowOptions.instantTerminal);
		const nextProject = getProjectForTape(tape);
		const projectChanged = nextProject.id !== getLivingRoomActiveProjectId();
		if (nextProject.status === 'empty' && (projectChanged || resetSlide)) {
			livingRoomState.emptyPreviewWord = pickBroPlaceholderWord();
		}
		setLivingRoomActiveProjectId(nextProject.id);
		if (projectChanged || resetSlide) {
			closeMediaPopout();
			setLivingRoomSlideIndex(0);
			rebuildLivingRoomDots();
		}
		setLivingRoomSlide(getLivingRoomSlideIndex(), {
			force: force || projectChanged || resetSlide,
			instantTerminal,
		});
	};

	const refreshPlacard = () => {
		const selectedTape = getSelectedTape();
		if (!selectedTape) return;
		setLivingRoomProjectForTape(selectedTape, { resetSlide: false });
		updateCartridgeScrollUi();
	};

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
		setCartridgeDrawerOpen(false, { skipLayout: true });
		layoutLivingRoom();
		refreshPlacard();
	};

	const enterLivingRoom = ({ preserveContent = false } = {}) => {
		closeMediaPopout();
		livingRoomState.overlayMode = OVERLAY_MODE_LIBRARY;
		livingRoomState.viewMode = VIEW_TV_AREA;
		const defaultTapeId = VHS_TAPE_LIBRARY[0]?.id || null;
		const mobileEnter = isLivingRoomMobileLayout() || isLivingRoomMobileWidth(getRendererWidth());
		livingRoomState.mobileLayout = mobileEnter;
		livingRoomState.drawerOpen = false;
		livingRoomState.drawerProgress = 0;
		if (!preserveContent) {
			livingRoomState.mode = STATE_LIVING_ROOM_PLAYING;
			livingRoomState.contentMode = CONTENT_BRO_MEME;
			livingRoomState.activeTapeId = defaultTapeId;
			livingRoomState.insertedTapeId = defaultTapeId;
			livingRoomState.emptyPreviewWord = pickBroPlaceholderWord();
			livingRoomState.playingMix = 1;
			// Mobile keeps the larger preview stack; FOCUS/BROWSE is desktop-only.
			setLivingRoomDetailFocus(false, { instant: true });
		} else {
			setCartridgeDrawerOpen(false, { skipLayout: true });
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

	const returnToTvAreaFromFullscreen = () => {
		enterLivingRoom({ preserveContent: true });
	};

	const isFullscreenTvPlaybackActive = () => (
		livingRoomState.overlayMode === OVERLAY_MODE_TV
		&& livingRoomState.viewMode === VIEW_FULLSCREEN
		&& livingRoomState.fullscreenFromTv
	);

	const exitLivingRoom = () => {
		closeMediaPopout();
		livingRoomState.hoverIndex = -1;
		livingRoomState.inserting = null;
		livingRoomState.drawerOpen = false;
		livingRoomState.drawerProgress = 0;
		setLivingRoomDetailFocus(false, { instant: true });
		livingRoomState.overlayMode = OVERLAY_MODE_LIBRARY;
		livingRoomState.viewMode = VIEW_FULLSCREEN;
		livingRoomState.fullscreenFromTv = false;
		livingRoomState.targetBlend = 0;
		tvDesktopTransitionLayer.visible = true;
		tvDesktopTransitionSprite.alpha = 1;
	};

	return {
		setLivingRoomSlide,
		setLivingRoomProjectForTape,
		refreshPlacard,
		playTape,
		enterLivingRoom,
		returnToTvAreaFromFullscreen,
		isFullscreenTvPlaybackActive,
		exitLivingRoom,
	};
}
