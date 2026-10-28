export function createSoundPanelUI(options = {}) {
	const {
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
	} = options;

	const soundToggle = new PIXI.Container();
	const soundBg = new PIXI.Graphics();
	const soundGlow = new PIXI.Graphics();
	const soundIcon = new PIXI.Graphics();
	const soundButtonSize = 52;
	const soundStackGap = 8;
	let soundHoverTarget = 0;
	let soundHover = 0;
	let soundNeedsRedraw = true;
	let soundPanelOpen = false;
	let soundCloseHoverTarget = 0;
	let soundCloseHover = 0;
	let soundAnchorLockScreenX = 0;
	let soundAnchorLockScreenY = 0;

	soundToggle.eventMode = 'static';
	soundToggle.cursor = 'pointer';
	const drawSoundControl = () => {
		const hover = Math.max(0, Math.min(1, soundHover));
		soundGlow.clear();
		soundGlow.beginFill(0xffffff, 0.07 + hover * 0.2);
		soundGlow.drawRoundedRect(-4, -4, soundButtonSize + 8, soundButtonSize + 8, 14);
		soundGlow.endFill();

		soundBg.clear();
		soundBg.beginFill(0x050d0b, 0.9);
		soundBg.lineStyle(1, 0x22f3c8, 0.58 + hover * 0.34);
		soundBg.drawRoundedRect(0, 0, soundButtonSize, soundButtonSize, 12);
		soundBg.endFill();

		const cx = soundButtonSize * 0.5;
		const cy = soundButtonSize * 0.5;
		soundIcon.clear();
		soundIcon.beginFill(0xffffff, 1);
		soundIcon.drawPolygon([
			cx - 12,
			cy - 6,
			cx - 7,
			cy - 6,
			cx - 2,
			cy - 11,
			cx - 2,
			cy + 11,
			cx - 7,
			cy + 6,
			cx - 12,
			cy + 6,
		]);
		soundIcon.endFill();
		soundIcon.lineStyle(2.2, 0xffffff, 0.85);
		soundIcon.arc(cx + 1, cy, 5.5, -0.7, 0.7);
		soundIcon.lineStyle(2, 0xffffff, 0.65);
		soundIcon.arc(cx + 1, cy, 9, -0.8, 0.8);

		soundToggle.scale.set(1 + hover * 0.04);
		soundToggle.pivot.set(
			(soundButtonSize * soundToggle.scale.x - soundButtonSize) * 0.5,
			(soundButtonSize * soundToggle.scale.y - soundButtonSize) * 0.5,
		);
		soundNeedsRedraw = false;
	};
	soundToggle.addChild(soundGlow, soundBg, soundIcon);
	soundToggle.zIndex = 151;
	world.addChild(soundToggle);

	const soundPanel = new PIXI.Container();
	const soundPanelGlow = new PIXI.Graphics();
	const soundPanelBg = new PIXI.Graphics();
	const soundPanelChrome = new PIXI.Graphics();
	const soundPanelDragStrip = new PIXI.Graphics();
	const soundPanelOrnament = new PIXI.Graphics();
	const soundPanelTitle = new PIXI.Text('SOUND', {
		fontFamily: 'Minecraft, monospace',
		fontSize: 12,
		fill: 0x22f3c8,
		letterSpacing: 1,
	});
	soundPanelTitle.anchor.set(0, 0);
	const soundCloseBtn = new PIXI.Container();
	const soundCloseBtnBg = new PIXI.Graphics();
	const soundCloseBtnText = new PIXI.Text('X', {
		fontFamily: 'Minecraft, monospace',
		fontSize: 11,
		fill: 0xffffff,
		letterSpacing: 1,
	});
	soundCloseBtnText.anchor.set(0.5, 0.5);
	soundCloseBtn.addChild(soundCloseBtnBg, soundCloseBtnText);
	soundCloseBtn.eventMode = 'static';
	soundCloseBtn.cursor = 'pointer';

	const soundPanelWidth = 248;
	const soundPanelHeight = 144;
	const soundPanelHeaderH = 26;
	const sliderTrackWidth = 142;
	const sliderTrackHeight = 11;
	const sliderLeft = 90;
	const sliderTop = 56;
	const sliderGap = 42;
	const soundSliders = [];
	let activeSoundSlider = null;
	let activeSoundPointerId = null;
	const soundPanelDrag = { active: false, offsetX: 0, offsetY: 0 };
	let soundPanelCustomPosition = false;
	const soundRendererPoint = new PIXI.Point();
	const soundLocalPoint = new PIXI.Point();

	const bringSoundPanelToFront = () => {
		if (soundPanel.parent) {
			soundPanel.parent.addChild(soundPanel);
		}
	};
	const moveSoundPanel = (worldX, worldY, custom = true) => {
		const minX = screenToWorldX(12);
		const minY = screenToWorldY(12);
		const maxX = screenToWorldX(app.renderer.width - soundPanelWidth - 12);
		const maxY = screenToWorldY(app.renderer.height - soundPanelHeight - 12);
		soundPanel.position.set(
			Math.max(minX, Math.min(maxX, worldX)),
			Math.max(minY, Math.min(maxY, worldY)),
		);
		soundPanelCustomPosition = custom;
	};
	const centerSoundPanel = () => {
		const panelScreenX = (app.renderer.width - soundPanelWidth) * 0.5;
		const panelScreenY = (app.renderer.height - soundPanelHeight) * 0.5;
		moveSoundPanel(screenToWorldX(panelScreenX), screenToWorldY(panelScreenY), false);
	};
	const clampSoundPanelToViewport = () => {
		moveSoundPanel(soundPanel.position.x, soundPanel.position.y, soundPanelCustomPosition);
	};
	const updateActiveSoundSliderFromClient = (clientX, clientY, persist = true) => {
		if (!activeSoundSlider || !soundPanelOpen) return;
		const rect = app.view.getBoundingClientRect();
		if (!rect || rect.width <= 0 || rect.height <= 0) return;
		soundRendererPoint.set(
			(clientX - rect.left) * (app.renderer.width / rect.width),
			(clientY - rect.top) * (app.renderer.height / rect.height),
		);
		soundPanel.toLocal(soundRendererPoint, undefined, soundLocalPoint);
		const nextValue = (soundLocalPoint.x - activeSoundSlider.trackX) / activeSoundSlider.trackW;
		activeSoundSlider.setValue?.(nextValue, persist);
	};

	const formatVolumeLabel = (value) => `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%`;

	const drawSoundCloseBtn = () => {
		const hover = Math.max(0, Math.min(1, soundCloseHover));
		soundCloseBtnBg.clear();
		soundCloseBtnBg.beginFill(0xff5667, 0.94 + hover * 0.06);
		soundCloseBtnBg.lineStyle(1, 0x000000, 0.6);
		soundCloseBtnBg.drawRoundedRect(0, 0, 28, 22, 5);
		soundCloseBtnBg.endFill();
		soundCloseBtn.scale.set(1 + hover * 0.05);
		soundCloseBtn.pivot.set((28 * soundCloseBtn.scale.x - 28) * 0.5, (22 * soundCloseBtn.scale.y - 22) * 0.5);
		soundCloseBtnText.position.set(14, 11);
	};

	const createSoundSlider = (labelText, rowIndex, initialValue, onChange) => {
		const rowY = sliderTop + rowIndex * sliderGap;
		const label = new PIXI.Text(labelText, {
			fontFamily: 'Minecraft, monospace',
			fontSize: 11,
			fill: 0xc7ebde,
			letterSpacing: 1,
		});
		label.anchor.set(0, 0.5);
		label.position.set(14, rowY);

		const valueText = new PIXI.Text('100%', {
			fontFamily: 'Minecraft, monospace',
			fontSize: 11,
			fill: 0xe5fff8,
			letterSpacing: 1,
		});
		valueText.anchor.set(1, 0.5);
		valueText.position.set(soundPanelWidth - 12, rowY);

		const hit = new PIXI.Graphics();
		const track = new PIXI.Graphics();
		const fillGlow = new PIXI.Graphics();
		const fill = new PIXI.Graphics();
		const knob = new PIXI.Graphics();
		hit.eventMode = 'static';
		hit.cursor = 'pointer';
		track.eventMode = 'static';
		track.cursor = 'pointer';
		fillGlow.eventMode = 'none';
		fill.eventMode = 'none';
		knob.eventMode = 'static';
		knob.cursor = 'pointer';
		label.eventMode = 'none';
		valueText.eventMode = 'none';

		const slider = {
			label,
			valueText,
			hit,
			track,
			fillGlow,
			fill,
			knob,
			rowY,
			trackX: sliderLeft,
			trackY: rowY - sliderTrackHeight * 0.5,
			trackW: sliderTrackWidth,
			trackH: sliderTrackHeight,
			value: Math.max(0, Math.min(1, initialValue)),
			onChange,
		};

		const draw = () => {
			const v = Math.max(0, Math.min(1, slider.value));
			const fillW = slider.trackW * v;
			slider.hit.clear();
			slider.hit.beginFill(0xffffff, 0.001);
			slider.hit.drawRect(slider.trackX - 8, slider.trackY - 8, slider.trackW + 16, slider.trackH + 16);
			slider.hit.endFill();
			slider.track.clear();
			slider.track.beginFill(0x12251f, 0.96);
			slider.track.lineStyle(1.2, 0x67efc9, 0.72);
			slider.track.drawRoundedRect(slider.trackX, slider.trackY, slider.trackW, slider.trackH, 4);
			slider.track.endFill();

			slider.fillGlow.clear();
			slider.fillGlow.beginFill(0x89ffe2, 0.34);
			slider.fillGlow.drawRoundedRect(slider.trackX - 1, slider.trackY - 1, Math.max(4, fillW + 2), slider.trackH + 2, 5);
			slider.fillGlow.endFill();

			slider.fill.clear();
			slider.fill.beginFill(0x8effda, 0.98);
			slider.fill.drawRoundedRect(slider.trackX, slider.trackY, Math.max(3, fillW), slider.trackH, 4);
			slider.fill.endFill();

			const knobX = slider.trackX + fillW;
			slider.knob.clear();
			slider.knob.beginFill(0xffffff, 1);
			slider.knob.lineStyle(1.5, 0x58ffd0, 0.98);
			slider.knob.drawCircle(knobX, slider.rowY, 7.2);
			slider.knob.lineStyle(0.8, 0xffffff, 0.9);
			slider.knob.drawCircle(knobX, slider.rowY, 3.4);
			slider.knob.endFill();

			slider.valueText.text = formatVolumeLabel(v);
		};

		const setValue = (nextValue, persist = true) => {
			slider.value = Math.max(0, Math.min(1, nextValue));
			draw();
			slider.onChange?.(slider.value, persist);
		};

		const setFromEvent = (event, persist = true) => {
			const local = event.getLocalPosition(soundPanel);
			const nextValue = (local.x - slider.trackX) / slider.trackW;
			setValue(nextValue, persist);
		};

		const beginDrag = (event) => {
			event.stopPropagation?.();
			activeSoundSlider = slider;
			const nativeEvent = event?.data?.originalEvent || event?.originalEvent;
			if (nativeEvent && Number.isFinite(nativeEvent.pointerId)) {
				activeSoundPointerId = nativeEvent.pointerId;
				if (typeof app.view.setPointerCapture === 'function') {
					try {
						app.view.setPointerCapture(activeSoundPointerId);
					} catch (_) {}
				}
			}
			setFromEvent(event);
		};

		hit.on('pointerdown', beginDrag);
		track.on('pointerdown', beginDrag);
		knob.on('pointerdown', beginDrag);
		slider.setValue = setValue;
		slider.setFromEvent = setFromEvent;
		slider.draw = draw;
		draw();
		soundSliders.push(slider);
		return slider;
	};

	createSoundSlider('MUSIC', 0, getMusicUiVolume(), (value, persist) => {
		applyMusicUiVolume(value, persist);
	});
	createSoundSlider('SFX', 1, getSfxUiVolume(), (value, persist) => {
		applySfxUiVolume(value, persist);
	});

	const layoutSoundPanel = () => {
		if (soundPanelCustomPosition) {
			clampSoundPanelToViewport();
			return;
		}
		centerSoundPanel();
	};

	const drawSoundPanel = () => {
		soundPanelGlow.clear();
		soundPanelGlow.beginFill(0x000000, 0.16);
		soundPanelGlow.drawRect(-4, -4, soundPanelWidth + 8, soundPanelHeight + 8);
		soundPanelGlow.endFill();

		soundPanelBg.clear();
		soundPanelBg.beginFill(0x0b0f13, 0.98);
		soundPanelBg.lineStyle(2, 0x1a1f27, 1);
		soundPanelBg.drawRect(0, 0, soundPanelWidth, soundPanelHeight);
		soundPanelBg.endFill();

		soundPanelChrome.clear();
		soundPanelChrome.beginFill(0x0f141a, 1);
		soundPanelChrome.drawRect(0, 0, soundPanelWidth, soundPanelHeaderH);
		soundPanelChrome.endFill();
		soundPanelChrome.beginFill(0x1c2430, 1);
		soundPanelChrome.drawRect(0, soundPanelHeaderH - 6, soundPanelWidth, 6);
		soundPanelChrome.endFill();

		soundPanelDragStrip.clear();
		soundPanelDragStrip.beginFill(0xffffff, 0.001);
		soundPanelDragStrip.drawRect(0, 0, soundPanelWidth - 36, soundPanelHeaderH);
		soundPanelDragStrip.endFill();

		soundPanelOrnament.clear();
		soundPanelTitle.position.set(10, Math.max(0, soundPanelHeaderH - 6 - soundPanelTitle.height + 1));
		soundCloseBtn.position.set(soundPanelWidth - 34, 3);
		drawSoundCloseBtn();
		for (const slider of soundSliders) slider.draw?.();
	};

	const closePanel = () => {
		soundPanelOpen = false;
		soundPanel.visible = false;
		soundPanel.eventMode = 'none';
		activeSoundSlider = null;
		soundPanelDrag.active = false;
	};
	const openPanel = () => {
		soundPanelOpen = true;
		soundPanel.visible = true;
		soundPanel.eventMode = 'static';
		soundPanelCustomPosition = false;
		layoutSoundPanel();
		bringSoundPanelToFront();
		drawSoundPanel();
	};
	const togglePanel = () => {
		if (soundPanelOpen) closePanel();
		else openPanel();
	};

	const isPointInDisplayObject = (obj, point) => {
		if (!obj || !obj.visible || !point) return false;
		const b = obj.getBounds();
		return point.x >= b.x && point.x <= b.x + b.width && point.y >= b.y && point.y <= b.y + b.height;
	};

	const closeIfOutside = (point) => {
		if (!soundPanelOpen || !point) return;
		if (!isPointInDisplayObject(soundPanel, point) && !isPointInDisplayObject(soundToggle, point)) {
			closePanel();
		}
	};

	soundPanel.addChild(soundPanelGlow, soundPanelBg, soundPanelChrome);
	for (const slider of soundSliders) {
		soundPanel.addChild(slider.label, slider.hit, slider.track, slider.fillGlow, slider.fill, slider.knob, slider.valueText);
	}
	soundPanel.addChild(soundPanelDragStrip, soundPanelOrnament, soundPanelTitle, soundCloseBtn);
	soundPanel.zIndex = 3300;
	soundPanel.visible = false;
	soundPanel.eventMode = 'none';
	world.addChild(soundPanel);
	drawSoundPanel();
	drawSoundControl();

	soundPanelDragStrip.eventMode = 'static';
	soundPanelDragStrip.cursor = 'move';
	soundPanelDragStrip.on('pointerdown', (event) => {
		if (!soundPanelOpen) return;
		event.stopPropagation();
		bringSoundPanelToFront();
		const pos = event.getLocalPosition(world);
		soundPanelDrag.active = true;
		soundPanelDrag.offsetX = pos.x - soundPanel.position.x;
		soundPanelDrag.offsetY = pos.y - soundPanel.position.y;
	});
	soundCloseBtn.on('pointerdown', (event) => {
		event.stopPropagation();
	});

	soundCloseBtn.on('pointerover', () => {
		soundCloseHoverTarget = 1;
	});
	soundCloseBtn.on('pointerout', () => {
		soundCloseHoverTarget = 0;
	});
	soundCloseBtn.on('pointertap', () => {
		playExitTabSfx();
		closePanel();
	});

	soundToggle.on('pointerover', () => {
		soundHoverTarget = 1;
		soundNeedsRedraw = true;
		playSfxSafe(ICON_SFX.hover, { volume: 0.33, rate: 1.02 });
	});
	soundToggle.on('pointerout', () => {
		soundHoverTarget = 0;
		soundNeedsRedraw = true;
	});
	soundToggle.on('pointertap', () => {
		playSfxSafe(ICON_SFX.click, { volume: 0.5, rate: 1.0 });
		togglePanel();
	});

	if (app?.stage) {
		if (!app.stage.eventMode || app.stage.eventMode === 'none') {
			app.stage.eventMode = 'static';
		}
		if (!app.stage.hitArea) {
			app.stage.hitArea = app.screen;
		}
		app.stage.on('pointermove', (event) => {
			if (soundPanelDrag.active && soundPanelOpen) {
				const pos = event.getLocalPosition(world);
				moveSoundPanel(pos.x - soundPanelDrag.offsetX, pos.y - soundPanelDrag.offsetY, true);
				return;
			}
			if (!activeSoundSlider || !soundPanelOpen) return;
			activeSoundSlider.setFromEvent?.(event);
		});
		const stopSoundSliderDrag = () => {
			if (activeSoundPointerId != null && typeof app.view.releasePointerCapture === 'function') {
				try {
					app.view.releasePointerCapture(activeSoundPointerId);
				} catch (_) {}
			}
			activeSoundPointerId = null;
			activeSoundSlider = null;
			soundPanelDrag.active = false;
		};
		app.stage.on('pointerup', stopSoundSliderDrag);
		app.stage.on('pointerupoutside', stopSoundSliderDrag);
		app.view.addEventListener('pointermove', (event) => {
			if (!activeSoundSlider || !soundPanelOpen) return;
			updateActiveSoundSliderFromClient(event.clientX, event.clientY, true);
		});
		app.view.addEventListener('pointerup', stopSoundSliderDrag);
		app.view.addEventListener('pointercancel', stopSoundSliderDrag);
		window.addEventListener('pointerup', stopSoundSliderDrag);
		window.addEventListener('pointercancel', stopSoundSliderDrag);
	}

	const setAnchorFromLockButton = (lockScreenX, lockScreenY) => {
		soundAnchorLockScreenX = lockScreenX;
		soundAnchorLockScreenY = lockScreenY;
		const soundScreenX = soundAnchorLockScreenX;
		const soundScreenY = soundAnchorLockScreenY - soundButtonSize - soundStackGap;
		soundToggle.position.set(screenToWorldX(soundScreenX), screenToWorldY(soundScreenY));
		layoutSoundPanel();
	};

	const update = (seconds) => {
		const lockEase = Math.min(1, seconds * 14);
		const prevSoundHover = soundHover;
		soundHover += (soundHoverTarget - soundHover) * lockEase;
		if (Math.abs(soundHover - prevSoundHover) > 0.001 || soundNeedsRedraw) {
			drawSoundControl();
		}

		const prevSoundCloseHover = soundCloseHover;
		soundCloseHover += (soundCloseHoverTarget - soundCloseHover) * lockEase;
		if (soundPanelOpen && Math.abs(soundCloseHover - prevSoundCloseHover) > 0.001) {
			drawSoundCloseBtn();
		}
	};

	return {
		soundToggle,
		soundButtonSize,
		soundStackGap,
		setAnchorFromLockButton,
		closePanel,
		closeIfOutside,
		update,
		isOpen: () => soundPanelOpen,
	};
}