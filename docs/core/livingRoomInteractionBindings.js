export function bindLivingRoomInteractionBindings(options = {}) {
	const {
		PIXI,
		windowRef = typeof window !== 'undefined' ? window : null,
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
		cartridgeDrawerDim = null,
		cartridgeTapesTab = null,
		VIEW_TV_AREA,
		VIEW_FULLSCREEN,
		OVERLAY_MODE_LIBRARY,
		isLivingRoomActive = () => false,
		isFullscreenTvPlaybackActive = () => false,
		returnToTvAreaFromFullscreen = () => {},
		closeLivingRoomScene = () => {},
		setLivingRoomDetailFocus = () => {},
		setCartridgeDrawerOpen = () => {},
		toggleCartridgeDrawer = () => {},
		updateLivingRoomMediaZoomHint = () => {},
		updateCartridgeScrollUi = () => {},
		refreshPlacard = () => {},
		toRendererPoint = () => null,
		setLivingRoomSlide = () => {},
		getLivingRoomSlideIndex = () => 0,
		getLivingRoomDotCount = () => 0,
		getActiveProject = () => null,
		openMediaPopout = () => {},
		closeMediaPopout = () => {},
	} = options;

	const PIXI_REF = PIXI || windowRef?.PIXI || globalThis?.PIXI;
	const MEDIA_SWIPE_MIN_PX = 48;
	const MEDIA_TAP_MAX_PX = 12;
	const MEDIA_HORIZONTAL_LOCK_RATIO = 1.15;
	const mediaSwipeState = {
		active: false,
		startX: 0,
		startY: 0,
		lastX: 0,
		lastY: 0,
		swiped: false,
	};
	const mediaNavBounds = {
		left: null,
		right: null,
	};

	const isMediaPopoutOpen = () => mediaPopoutState.progress > 0.02 || mediaPopoutState.target > 0;
	const getMediaRect = () => {
		const x = livingRoomTv.x + livingRoomMediaLayout.x;
		const y = livingRoomTv.y + livingRoomMediaLayout.y;
		return {
			x,
			y,
			w: livingRoomMediaLayout.w,
			h: livingRoomMediaLayout.h,
		};
	};
	const isPointInsideRect = (point, rect) => point
		&& rect
		&& point.x >= rect.x
		&& point.x <= (rect.x + rect.w)
		&& point.y >= rect.y
		&& point.y <= (rect.y + rect.h);
	const isPointInsideMedia = (point) => isPointInsideRect(point, getMediaRect());
	const isMediaSlideNavigationAvailable = () => {
		if (!isLivingRoomActive()) return false;
		if (livingRoomState.viewMode !== VIEW_TV_AREA) return false;
		if (isMediaPopoutOpen()) return false;
		if (livingRoomState.mobileLayout && (
			livingRoomState.drawerOpen
			|| (Number(livingRoomState.drawerProgress) || 0) > 0.05
		)) return false;
		if (getLivingRoomDotCount() <= 1) return false;
		if (getActiveProject()?.useDesktopFeed) return false;
		return true;
	};
	const changeSlideBy = (delta) => {
		if (!isMediaSlideNavigationAvailable()) return;
		setLivingRoomSlide(getLivingRoomSlideIndex() + delta, {
			instantTerminal: true,
			userInitiated: true,
		});
	};
	const isPointInsideMediaNav = (point) => {
		if (!point) return false;
		if (!isMediaSlideNavigationAvailable()) return false;
		return isPointInsideRect(point, mediaNavBounds.left) || isPointInsideRect(point, mediaNavBounds.right);
	};
	const getMediaNavAccent = () => {
		const accent = getActiveProject()?.accent;
		return Number.isFinite(accent) ? accent : 0x8ed3fb;
	};
	const scaleColor = (hex, factor = 1) => {
		const r = Math.max(0, Math.min(255, Math.round(((hex >> 16) & 0xff) * factor)));
		const g = Math.max(0, Math.min(255, Math.round(((hex >> 8) & 0xff) * factor)));
		const b = Math.max(0, Math.min(255, Math.round((hex & 0xff) * factor)));
		return (r << 16) | (g << 8) | b;
	};

	const mediaNav = PIXI_REF ? (() => {
		const root = new PIXI_REF.Container();
		root.sortableChildren = true;
		root.zIndex = 92;
		root.visible = false;

		const createButton = (delta) => {
			const node = new PIXI_REF.Container();
			const gfx = new PIXI_REF.Graphics();
			node.addChild(gfx);
			node.eventMode = 'static';
			node.cursor = 'pointer';
			node.zIndex = 1;
			return {
				node,
				gfx,
				delta,
				hovered: false,
				pressed: false,
				displayScale: 1,
				targetScale: 1,
				size: 36,
			};
		};

		const left = createButton(-1);
		const right = createButton(1);
		root.addChild(left.node, right.node);
		livingRoomLayer.addChild(root);

		const drawButton = (button, enabled) => {
			const size = Math.max(24, button.size);
			const alpha = enabled ? (button.hovered ? 0.98 : 0.9) : 0.46;
			const accent = getMediaNavAccent();
			const bodyColor = enabled
				? scaleColor(accent, button.pressed ? 0.72 : (button.hovered ? 1.02 : 0.88))
				: 0x2a3140;
			const borderColor = enabled ? scaleColor(accent, 1.28) : 0x5e6a7c;
			const iconColor = enabled ? (button.hovered ? 0xffffff : 0xe9f9ff) : 0x9aa5b5;
			const dir = button.delta < 0 ? -1 : 1;
			const tipX = dir * size * 0.24;
			const wingX = dir * size * 0.12;
			const wingY = size * 0.26;
			const half = size * 0.5;
			const radius = size * 0.34;

			button.gfx.clear();
			const shadowAlpha = enabled ? (button.pressed ? 0.22 : (button.hovered ? 0.16 : 0.12)) : 0.08;
			const shadowYOffset = button.pressed ? 1 : (button.hovered ? 3 : 2);
			button.gfx.beginFill(0x000000, shadowAlpha);
			button.gfx.drawRoundedRect(-half, -half + shadowYOffset, size, size, radius);
			button.gfx.endFill();
			button.gfx.beginFill(bodyColor, alpha);
			button.gfx.lineStyle(2, borderColor, enabled ? 0.95 : 0.65);
			button.gfx.drawRoundedRect(-half, -half, size, size, radius);
			button.gfx.endFill();
			button.gfx.beginFill(iconColor, enabled ? 0.98 : 0.7);
			button.gfx.drawPolygon([
				tipX, 0,
				-wingX, -wingY,
				-wingX, wingY,
			]);
			button.gfx.endFill();
		};

		const setPressed = (button, pressed) => {
			if (button.pressed === pressed) return;
			button.pressed = pressed;
			button.targetScale = pressed ? 0.97 : (button.hovered ? 1.06 : 1);
			drawButton(button, isMediaSlideNavigationAvailable());
		};

		const setHover = (button, hovered) => {
			if (button.hovered === hovered) return;
			button.hovered = hovered;
			button.targetScale = button.pressed ? 0.97 : (hovered ? 1.06 : 1);
			drawButton(button, isMediaSlideNavigationAvailable());
		};

		const bindButton = (button) => {
			button.node.on('pointerdown', (event) => {
				event.stopPropagation?.();
				setPressed(button, true);
				mediaSwipeState.active = false;
				mediaSwipeState.swiped = false;
			});
			button.node.on('pointerup', () => setPressed(button, false));
			button.node.on('pointerupoutside', () => setPressed(button, false));
			button.node.on('pointertap', (event) => {
				event.stopPropagation?.();
				setPressed(button, false);
				changeSlideBy(button.delta);
			});
			button.node.on('pointerover', () => setHover(button, true));
			button.node.on('pointerout', () => {
				setPressed(button, false);
				setHover(button, false);
			});
		};

		bindButton(left);
		bindButton(right);

		const update = () => {
			const enabled = isMediaSlideNavigationAvailable();
			root.visible = enabled;
			if (!enabled) {
				mediaNavBounds.left = null;
				mediaNavBounds.right = null;
				return;
			}
			const mediaRect = getMediaRect();
			const size = Math.max(30, Math.min(42, mediaRect.h * 0.21));
			const inset = Math.max(10, size * 1.1);
			const navY = Number.isFinite(livingRoomMediaLayout.navY)
				? (livingRoomMediaLayout.navY + 16)
				: (Number.isFinite(livingRoomMediaLayout.dotY) ? (livingRoomMediaLayout.dotY + 8) : (mediaRect.y + mediaRect.h + 8));
			left.size = size;
			right.size = size;
			left.targetScale = left.pressed ? 0.97 : (left.hovered ? 1.06 : 1);
			right.targetScale = right.pressed ? 0.97 : (right.hovered ? 1.06 : 1);
			left.displayScale += (left.targetScale - left.displayScale) * 0.22;
			right.displayScale += (right.targetScale - right.displayScale) * 0.22;
			left.node.scale.set(left.displayScale);
			right.node.scale.set(right.displayScale);
			const leftOffsetY = (left.hovered ? -2 : 0) + (left.pressed ? 2 : 0);
			const rightOffsetY = (right.hovered ? -2 : 0) + (right.pressed ? 2 : 0);
			left.node.position.set(mediaRect.x + inset, navY + leftOffsetY);
			right.node.position.set(mediaRect.x + mediaRect.w - inset, navY + rightOffsetY);
			mediaNavBounds.left = {
				x: left.node.position.x - size,
				y: left.node.position.y - size,
				w: size * 2,
				h: size * 2,
			};
			mediaNavBounds.right = {
				x: right.node.position.x - size,
				y: right.node.position.y - size,
				w: size * 2,
				h: size * 2,
			};
			drawButton(left, enabled);
			drawButton(right, enabled);
		};

		app.ticker?.add?.(() => {
			update();
		});

		update();
		return { root, update };
	})() : null;

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
	fullscreenExitBtn.on('pointerover', () => {
		fullscreenExitBtn.scale.set(1.04);
	});
	fullscreenExitBtn.on('pointerout', () => {
		fullscreenExitBtn.scale.set(1);
	});

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
	livingRoomBackBtn.on('pointerover', () => {
		livingRoomBackBtn.scale.set(1.04);
	});
	livingRoomBackBtn.on('pointerout', () => {
		livingRoomBackBtn.scale.set(1);
	});

	livingRoomFocusBtn.on('pointertap', () => {
		if (livingRoomState.viewMode !== VIEW_TV_AREA) return;
		if (livingRoomState.mobileLayout) return;
		setLivingRoomDetailFocus(livingRoomLayoutFocus.targetMix < 0.5);
	});
	livingRoomFocusBtn.on('pointerover', () => {
		livingRoomFocusBtn.scale.set(1.04);
	});
	livingRoomFocusBtn.on('pointerout', () => {
		livingRoomFocusBtn.scale.set(1);
	});

	if (cartridgeTapesTab) {
		cartridgeTapesTab.on('pointertap', (event) => {
			if (!isLivingRoomActive() || livingRoomState.viewMode !== VIEW_TV_AREA) return;
			if (!livingRoomState.mobileLayout) return;
			event.stopPropagation?.();
			toggleCartridgeDrawer();
		});
		cartridgeTapesTab.on('pointerover', () => {
			cartridgeTapesTab.scale.set(1.04);
		});
		cartridgeTapesTab.on('pointerout', () => {
			cartridgeTapesTab.scale.set(1);
		});
	}

	if (cartridgeDrawerDim) {
		cartridgeDrawerDim.on('pointertap', (event) => {
			if (!isLivingRoomActive() || livingRoomState.viewMode !== VIEW_TV_AREA) return;
			if (!livingRoomState.mobileLayout || !livingRoomState.drawerOpen) return;
			event.stopPropagation?.();
			setCartridgeDrawerOpen(false);
		});
	}

	const setCartridgeScrollFromThumbY = (thumbYLocal) => {
		const maxThumbTravel = Math.max(0, cartridgeScrollState.trackH - cartridgeScrollState.thumbH);
		const clampedThumbY = Math.max(
			cartridgeScrollState.trackY,
			Math.min(cartridgeScrollState.trackY + maxThumbTravel, thumbYLocal),
		);
		const progress = maxThumbTravel > 0 ? ((clampedThumbY - cartridgeScrollState.trackY) / maxThumbTravel) : 0;
		cartridgeScrollState.scrollY = progress * cartridgeScrollState.maxScroll;
		updateCartridgeScrollUi();
	};

	cartridgeScrollTrack.eventMode = 'static';
	cartridgeScrollTrack.cursor = 'pointer';
	cartridgeScrollThumb.eventMode = 'static';
	cartridgeScrollThumb.cursor = 'grab';

	cartridgeScrollTrack.on('pointerdown', (event) => {
		if (!isLivingRoomActive() || livingRoomState.viewMode !== VIEW_TV_AREA) return;
		if (!livingRoomState.mobileLayout) setLivingRoomDetailFocus(false);
		const local = event.data.getLocalPosition(cartridgeScrollUi);
		setCartridgeScrollFromThumbY(local.y - cartridgeScrollState.thumbH * 0.5);
	});

	cartridgeScrollThumb.on('pointerdown', (event) => {
		if (!isLivingRoomActive() || livingRoomState.viewMode !== VIEW_TV_AREA) return;
		if (!livingRoomState.mobileLayout) setLivingRoomDetailFocus(false);
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
	windowRef?.addEventListener('pointerup', endCartridgeScrollDrag);
	windowRef?.addEventListener('pointercancel', endCartridgeScrollDrag);

	app.view.addEventListener('wheel', (event) => {
		if (!isLivingRoomActive() || livingRoomState.viewMode !== VIEW_TV_AREA) return;
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
		if (insideMedia && getLivingRoomDotCount() > 1) {
			event.preventDefault();
			changeSlideBy(event.deltaY > 0 ? 1 : -1);
			return;
		}
		const insideViewport = point.x >= cartridgeViewportRect.x
			&& point.x <= (cartridgeViewportRect.x + cartridgeViewportRect.w)
			&& point.y >= cartridgeViewportRect.y
			&& point.y <= (cartridgeViewportRect.y + cartridgeViewportRect.h);
		if (!insideViewport) return;
		event.preventDefault();
		if (!livingRoomState.mobileLayout) setLivingRoomDetailFocus(false);
		cartridgeScrollState.scrollY += event.deltaY;
		updateCartridgeScrollUi();
	}, { passive: false });

	app.view.addEventListener('pointerdown', (event) => {
		if (!isLivingRoomActive() || livingRoomState.viewMode !== VIEW_TV_AREA) return;
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
		// Desktop only: clicking rack/panel auto-toggles FOCUS. Mobile uses PROJECTS + FOCUS.
		if (!livingRoomState.mobileLayout) {
			if (insideRack) setLivingRoomDetailFocus(false);
			if (insideDetailPanel) setLivingRoomDetailFocus(true);
		}
		if (isMediaPopoutOpen()) {
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
		const insideMedia = isPointInsideMedia(point);
		if (!insideMedia) return;
		if (isPointInsideMediaNav(point)) return;
		event.preventDefault();
		mediaSwipeState.active = true;
		mediaSwipeState.startX = point.x;
		mediaSwipeState.startY = point.y;
		mediaSwipeState.lastX = point.x;
		mediaSwipeState.lastY = point.y;
		mediaSwipeState.swiped = false;
	}, { passive: false });

	app.view.addEventListener('pointermove', (event) => {
		if (mediaSwipeState.active) {
			const point = toRendererPoint(event);
			if (point) {
				mediaSwipeState.lastX = point.x;
				mediaSwipeState.lastY = point.y;
				if (isMediaSlideNavigationAvailable()) {
					const dx = point.x - mediaSwipeState.startX;
					const dy = point.y - mediaSwipeState.startY;
					if (Math.abs(dx) >= MEDIA_SWIPE_MIN_PX && Math.abs(dx) > Math.abs(dy) * MEDIA_HORIZONTAL_LOCK_RATIO) {
						changeSlideBy(dx < 0 ? 1 : -1);
						mediaSwipeState.swiped = true;
						mediaSwipeState.active = false;
					}
				}
			}
		}
		if (!isMediaPopoutOpen()) return;
		mediaPopoutState.targetTiltX = 0;
		mediaPopoutState.targetTiltY = 0;
	}, { passive: true });

	const finalizeMediaSwipe = () => {
		if (!mediaSwipeState.active) return;
		const dx = mediaSwipeState.lastX - mediaSwipeState.startX;
		const dy = mediaSwipeState.lastY - mediaSwipeState.startY;
		const treatAsTap = !mediaSwipeState.swiped
			&& Math.abs(dx) <= MEDIA_TAP_MAX_PX
			&& Math.abs(dy) <= MEDIA_TAP_MAX_PX;
		if (treatAsTap && !isMediaPopoutOpen() && !getActiveProject()?.useDesktopFeed && isLivingRoomActive() && livingRoomState.viewMode === VIEW_TV_AREA) {
			openMediaPopout();
		}
		mediaSwipeState.active = false;
		mediaSwipeState.swiped = false;
	};
	app.view.addEventListener('pointerup', finalizeMediaSwipe, { passive: true });
	app.view.addEventListener('pointercancel', finalizeMediaSwipe, { passive: true });
	windowRef?.addEventListener('pointerup', finalizeMediaSwipe);
	windowRef?.addEventListener('pointercancel', finalizeMediaSwipe);

	windowRef?.addEventListener('keydown', (event) => {
		if (!isLivingRoomActive() || livingRoomState.viewMode !== VIEW_TV_AREA) return;
		if (event.key === 'Escape' && (mediaPopoutState.progress > 0.02 || mediaPopoutState.target > 0)) {
			event.preventDefault();
			closeMediaPopout({ playReturnSfx: true });
			return;
		}
		if (event.key === 'Escape' && livingRoomState.mobileLayout && livingRoomState.drawerOpen) {
			event.preventDefault();
			setCartridgeDrawerOpen(false);
			return;
		}
		if (mediaPopoutState.progress > 0.02 || mediaPopoutState.target > 0) return;
		if (getLivingRoomDotCount() <= 1) return;
		if (event.key === 'ArrowRight') {
			event.preventDefault();
			changeSlideBy(1);
		}
		if (event.key === 'ArrowLeft') {
			event.preventDefault();
			changeSlideBy(-1);
		}
	});
}
