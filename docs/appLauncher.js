import { createCardMotion } from './cardMotion.js';

export function createAppLauncher(app, world, options = {}) {
	const {
		items = [],
		screenToWorldX,
		screenToWorldY,
		screenToWorldSize,
		pixelFont = 'Minecraft, monospace',
		layoutProvider = null,
		onHoverChange = null,
	} = options;

	const container = new PIXI.Container();
	container.sortableChildren = true;
	world.addChild(container);
	const fxLayer = new PIXI.Container();
	fxLayer.eventMode = 'none';
	fxLayer.zIndex = 0;
	container.addChild(fxLayer);
	const paperBits = [];
	const PAPER_FX = {
		gravity: 1100,
		airDamp: 0.992,
		bounce: 0.28,
		friction: 0.9,
		spawnIntervalMin: 0.08,
		spawnIntervalMax: 0.17,
		lifetime: 5.2,
	};
	const dragState = {
		enabled: false,
		active: null,
		grabbed: null,
	};
	const PHYSICS = {
		gravity: 1400,
		airDamp: 0.992,
		bounce: 0.35,
		floorFriction: 0.88,
		margin: 16,
		mousePushRadius: 26,
		mousePushForce: 9000,
		mouseGrabRadius: 34,
	};
	let externalBodiesProvider = null;
	let lastMouseWorld = null;
	let lastMouseVel = { x: 0, y: 0 };
	if (app?.stage) {
		if (!app.stage.eventMode || app.stage.eventMode === 'none') {
			app.stage.eventMode = 'static';
		}
		if (!app.stage.hitArea) {
			app.stage.hitArea = app.screen;
		}
		app.stage.on('pointermove', (event) => {
			if (!dragState.enabled || !dragState.active) return;
			const pos = event.getLocalPosition(world);
			const icon = dragState.active;
			const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
			const nextX = pos.x + icon.state.dragOffset.x;
			const nextY = pos.y + icon.state.dragOffset.y;
			if (icon.state.lastDragTime) {
				const dt = Math.max(0.001, (now - icon.state.lastDragTime) / 1000);
				icon.state.vx = (nextX - icon.container.position.x) / dt;
				icon.state.vy = (nextY - icon.container.position.y) / dt;
			}
			icon.state.lastDragTime = now;
			icon.container.position.set(nextX, nextY);
		});
		app.stage.on('pointerup', () => {
			if (dragState.active) {
				dragState.active.state.free.x = dragState.active.container.position.x;
				dragState.active.state.free.y = dragState.active.container.position.y;
				dragState.active.state.dragging = false;
			}
			dragState.active = null;
		});
		app.stage.on('pointerupoutside', () => {
			if (dragState.active) {
				dragState.active.state.free.x = dragState.active.container.position.x;
				dragState.active.state.free.y = dragState.active.container.position.y;
				dragState.active.state.dragging = false;
			}
			dragState.active = null;
		});
	}

	const icons = items.map((item, index) => createAppIcon(item, index));
	for (const icon of icons) container.addChild(icon.container);

	function spawnPaperBit(icon) {
		const width = 8 + Math.random() * 6;
		const height = 10 + Math.random() * 7;
		const page = new PIXI.Graphics();
		page.beginFill(0xf6efd8, 0.95);
		page.lineStyle(1, 0xb38c5e, 0.72);
		page.drawRoundedRect(-width / 2, -height / 2, width, height, 2);
		page.endFill();
		const spawnOffset = icon.state.paperSpawnOffset || { x: 0, y: -icon.state.radius * 0.95 };
		const isResume = icon.item?.ornament === 'resume';
		page.position.set(
			icon.container.position.x + spawnOffset.x + (Math.random() - 0.5) * (isResume ? 5 : 10),
			icon.container.position.y + spawnOffset.y + (Math.random() - 0.5) * (isResume ? 2 : 6),
		);
		page.rotation = (Math.random() - 0.5) * 0.35;
		page.zIndex = 0;
		fxLayer.addChild(page);
		const baseVx = (Math.random() - 0.5) * 90;
		const baseVy = isResume ? (35 + Math.random() * 55) : (-120 - Math.random() * 80);
		paperBits.push({
			node: page,
			w: width,
			h: height,
			vx: baseVx,
			vy: baseVy,
			vr: (Math.random() - 0.5) * 5.4,
			age: 0,
			life: PAPER_FX.lifetime + Math.random() * 1.8,
		});
	}

	function createAppIcon(item, index) {
		const iconContainer = new PIXI.Container();
		const bg = new PIXI.Graphics();
		const hoverWash = new PIXI.Graphics();
		const border = new PIXI.Graphics();
		const glow = new PIXI.Graphics();
		const pictureFrame = new PIXI.Graphics();
		const pictureMask = new PIXI.Graphics();
		const mountainFar = new PIXI.Graphics();
		const mountainMid = new PIXI.Graphics();
		const mountainNear = new PIXI.Graphics();
		const pictureHaze = new PIXI.Graphics();
		const labFace = new PIXI.Graphics();
		const labGrid = new PIXI.Graphics();
		const labGlass = new PIXI.Graphics();
		const labLiquid = new PIXI.Graphics();
		const labBubbles = new PIXI.Graphics();
		const labTicks = new PIXI.Graphics();
		const ornament = new PIXI.Graphics();
		const catWhiskers = new PIXI.Graphics();
		const statusLight = new PIXI.Graphics();
		const displayName = item.displayName || item.label || '';
		const label = new PIXI.Text(displayName, {
			fontFamily: pixelFont,
			fontSize: 12,
			fill: item.labelColor ?? 0xeafbff,
			align: 'center',
			letterSpacing: 1,
		});
		label.anchor.set(0.5, 0);

		const glyph = new PIXI.Text(item.glyph || displayName?.[0] || '', {
			fontFamily: pixelFont,
			fontSize: 22,
			fill: item.glyphColor ?? 0x0b1714,
			align: 'center',
			letterSpacing: 1,
		});
		glyph.anchor.set(0.5);

		const baseTextures = (item.spriteTextures && item.spriteTextures.length) ? item.spriteTextures : null;
		const hoverTextures = (item.hoverTextures && item.hoverTextures.length) ? item.hoverTextures : null;
		const iconSprite = baseTextures ? new PIXI.AnimatedSprite(baseTextures) : null;
		const hoverSprite = hoverTextures ? new PIXI.AnimatedSprite(hoverTextures) : null;
		if (iconSprite) {
			iconSprite.anchor.set(0.5);
			iconSprite.animationSpeed = item.spriteAnimationSpeed ?? 0.12;
			iconSprite.autoUpdate = false;
			iconSprite.play();
		}
		if (hoverSprite) {
			hoverSprite.anchor.set(0.5);
			hoverSprite.animationSpeed = item.spriteAnimationSpeed ?? 0.12;
			hoverSprite.autoUpdate = false;
			hoverSprite.visible = false;
			hoverSprite.stop();
		}

		const hoverHintText = item.hoverActionText || item.tooltip || displayName;
		const tooltip = new PIXI.Container();
		const tooltipBg = new PIXI.Graphics();
		const tooltipText = new PIXI.Text(hoverHintText, {
			fontFamily: pixelFont,
			fontSize: 12,
			fill: 0xeafffb,
			align: 'center',
			letterSpacing: 1,
		});
		tooltipText.anchor.set(0.5);
		tooltip.addChild(tooltipBg, tooltipText);
		tooltip.visible = false;

		pictureMask.renderable = false;
		mountainFar.mask = pictureMask;
		mountainMid.mask = pictureMask;
		mountainNear.mask = pictureMask;
		pictureHaze.mask = pictureMask;
		iconContainer.addChild(glow, bg, hoverWash, border, pictureFrame, pictureMask, mountainFar, mountainMid, mountainNear, pictureHaze, labFace, labGrid, labLiquid, labBubbles, labGlass, labTicks, ornament, catWhiskers, statusLight);
		if (iconSprite) iconContainer.addChild(iconSprite);
		if (hoverSprite) iconContainer.addChild(hoverSprite);
		iconContainer.addChild(glyph, label, tooltip);

		const state = {
			index,
			hovered: false,
			hoverMix: 0,
			base: { x: 0, y: 0 },
			free: { x: 0, y: 0 },
			phase: index * 0.9,
			iconSize: 56,
			radius: 28,
			dragging: false,
			grabbed: false,
			grabOffset: { x: 0, y: 0 },
			dragOffset: { x: 0, y: 0 },
			vx: 0,
			vy: 0,
			angle: 0,
			angVel: 0,
			lastDragTime: 0,
			paperCooldown: Math.random() * 0.2,
			paperSpawnOffset: { x: 0, y: -28 },
			labBeakerRect: null,
			labBubbleSeed: [Math.random() * Math.PI * 2, Math.random() * Math.PI * 2, Math.random() * Math.PI * 2],
		};

		const motionLayers = [
			{ target: iconSprite || glyph, strength: 3 },
			{ target: glow, strength: 1.5, invert: true },
		];
		if (hoverSprite) motionLayers.unshift({ target: hoverSprite, strength: 3 });
		const cardMotion = createCardMotion(iconContainer, {
			width: state.iconSize,
			height: state.iconSize,
			tiltAmount: 0.12,
			layers: motionLayers,
		});

		function drawIcon(size) {
			state.iconSize = size;
			state.radius = Math.max(12, size * 0.52);
			const radius = Math.max(6, Math.round(size * 0.18));
			const glowPad = Math.round(size * 0.12);
			const inner = size - 4;
			const panelFill = item.panelFill ?? 0x22f3c8;
			const panelFillAlpha = item.panelFillAlpha ?? 0.9;
			const panelBorder = item.panelBorder ?? 0x0b3a33;
			const panelBorderAlpha = item.panelBorderAlpha ?? 0.85;
			const glowAlpha = item.glowAlpha ?? 0.08;
			const ornamentColor = item.ornamentColor ?? panelBorder;
			const accentColor = item.accentColor ?? panelBorder;

			glow.clear();
			glow.beginFill(accentColor, glowAlpha);
			glow.drawRoundedRect(-size / 2 - glowPad, -size / 2 - glowPad, size + glowPad * 2, size + glowPad * 2, radius + 4);
			glow.endFill();

			bg.clear();
			bg.beginFill(panelFill, panelFillAlpha);
			bg.drawRoundedRect(-size / 2, -size / 2, size, size, radius);
			bg.endFill();

			hoverWash.clear();
			hoverWash.beginFill(accentColor, 0.28);
			hoverWash.drawRoundedRect(-size / 2, -size / 2, size, size, radius);
			hoverWash.endFill();
			hoverWash.alpha = 0;

			border.clear();
			border.lineStyle(2, panelBorder, panelBorderAlpha);
			border.drawRoundedRect(-size / 2 + 1, -size / 2 + 1, inner, inner, radius - 2);

			ornament.clear();
			catWhiskers.clear();
			catWhiskers.visible = false;
			statusLight.clear();
			statusLight.alpha = 0;
			pictureFrame.clear();
			pictureMask.clear();
			mountainFar.clear();
			mountainMid.clear();
			mountainNear.clear();
			pictureHaze.clear();
			labFace.clear();
			labGrid.clear();
			labGlass.clear();
			labLiquid.clear();
			labBubbles.clear();
			labTicks.clear();
			state.labBeakerRect = null;

			if (item.ornament === 'mountains') {
				const inset = 2;
				const frameX = -size * 0.5 + inset;
				const frameY = -size * 0.5 + inset;
				const frameW = size - inset * 2;
				const frameH = size - inset * 2;
				const frameR = Math.max(6, radius - 2);
				const drawMountainBand = (graphics, color, alpha, baseY, radius, offset = 0) => {
					graphics.clear();
					graphics.beginFill(color, alpha);
					const spanStep = radius * 1.05;
					const minCenter = frameX - radius * 1.2;
					const maxCenter = frameX + frameW + radius * 1.2;
					for (let cx = minCenter + offset; cx < maxCenter; cx += spanStep) {
						graphics.moveTo(cx - radius, baseY);
						graphics.arc(cx, baseY, radius, Math.PI, 0, false);
						graphics.lineTo(cx + radius, frameY + frameH + radius * 1.15);
						graphics.lineTo(cx - radius, frameY + frameH + radius * 1.15);
						graphics.closePath();
					}
					graphics.endFill();
				};
				pictureFrame.beginFill(0x1a3348, 0.95);
				pictureFrame.lineStyle(0);
				pictureFrame.drawRoundedRect(frameX, frameY, frameW, frameH, frameR);
				pictureFrame.endFill();
				pictureMask.beginFill(0xffffff, 1);
				pictureMask.drawRoundedRect(frameX, frameY, frameW, frameH, frameR);
				pictureMask.endFill();
				drawMountainBand(mountainFar, 0xc1d4e7, 0.94, frameY + frameH * 0.5, frameH * 0.42, 0);
				drawMountainBand(mountainMid, 0x7d9dbf, 0.96, frameY + frameH * 0.67, frameH * 0.38, frameW * 0.18);
				drawMountainBand(mountainNear, 0x3b5f85, 0.98, frameY + frameH * 0.84, frameH * 0.35, frameW * 0.08);
				pictureHaze.beginFill(0xe6f3ff, 0.16);
				pictureHaze.drawRoundedRect(frameX + 5, frameY + 5, frameW - 10, Math.max(8, frameH * 0.2), 3);
				pictureHaze.endFill();
				mountainFar.position.set(0, 0);
				mountainMid.position.set(0, 0);
				mountainNear.position.set(0, 0);
				pictureHaze.position.set(0, 0);
			}
			if (item.ornament === 'cat') {
				const spacing = Math.max(2, size * 0.04);
				const outline = ornamentColor;
				const darkFace = 0x11151c;
				const visorW = size * 0.56;
				const visorH = size * 0.2;
				const visorY = -size * 0.24;
				const eyeW = Math.max(2, size * 0.075);
				const eyeH = Math.max(2, size * 0.04);
				const eyeGap = Math.max(1, size * 0.04);
				const earBaseY = visorY - visorH * 0.88;
				const earTipY = earBaseY - size * 0.21;
				const earSpan = size * 0.16;
				const earInset = size * 0.2;
				ornament.lineStyle(1.8, outline, 0.9);
				ornament.beginFill(darkFace, 0.97);
				ornament.moveTo(-earInset - earSpan * 0.5, earBaseY);
				ornament.lineTo(-earInset, earTipY);
				ornament.lineTo(-earInset + earSpan * 0.5, earBaseY);
				ornament.closePath();
				ornament.moveTo(earInset - earSpan * 0.5, earBaseY);
				ornament.lineTo(earInset, earTipY);
				ornament.lineTo(earInset + earSpan * 0.5, earBaseY);
				ornament.closePath();
				ornament.drawRoundedRect(-visorW * 0.5, visorY - visorH * 0.5, visorW, visorH, Math.max(4, size * 0.085));
				ornament.endFill();
				ornament.lineStyle(1.2, outline, 0.45);
				ornament.moveTo(-visorW * 0.46, visorY - visorH * 0.9);
				ornament.lineTo(visorW * 0.46, visorY - visorH * 0.9);
				ornament.beginFill(0xd4d9e5, 0.84);
				ornament.drawRoundedRect(-eyeGap * 0.5 - eyeW, visorY - eyeH * 0.5, eyeW, eyeH, 1.1);
				ornament.drawRoundedRect(eyeGap * 0.5, visorY - eyeH * 0.5, eyeW, eyeH, 1.1);
				ornament.endFill();
			}
			if (item.ornament === 'lab-beaker') {
				const faceInset = 3;
				const faceX = -size * 0.5 + faceInset;
				const faceY = -size * 0.5 + faceInset;
				const faceW = size - faceInset * 2;
				const faceH = size - faceInset * 2;
				const faceR = Math.max(6, radius - 2);
				labFace.beginFill(0x0b1d28, 0.96);
				labFace.drawRoundedRect(faceX, faceY, faceW, faceH, faceR);
				labFace.endFill();
				labGrid.lineStyle(1, 0x58bca6, 0.16);
				for (let y = faceY + 5; y < faceY + faceH; y += 6) {
					labGrid.moveTo(faceX + 1, y);
					labGrid.lineTo(faceX + faceW - 1, y);
				}
				for (let x = faceX + 5; x < faceX + faceW * 0.5; x += 7) {
					labGrid.moveTo(x, faceY + 1);
					labGrid.lineTo(x, faceY + faceH - 1);
				}
				labGrid.lineStyle(1.4, 0x7ee8d2, 0.36);
				const waveY = faceY + faceH * 0.68;
				labGrid.moveTo(faceX + faceW * 0.08, waveY);
				for (let i = 0; i <= 6; i++) {
					const t = i / 6;
					const px = faceX + faceW * (0.08 + t * 0.42);
					const py = waveY + Math.sin(t * Math.PI * 2.2) * (faceH * 0.08);
					if (i === 0) labGrid.moveTo(px, py);
					else labGrid.lineTo(px, py);
				}
				const beakerW = faceW * 0.36;
				const beakerH = faceH * 0.5;
				const beakerX = faceX + faceW * 0.56;
				const beakerY = faceY + faceH * 0.24;
				state.labBeakerRect = { x: beakerX, y: beakerY, w: beakerW, h: beakerH };
				labGlass.lineStyle(1.8, 0xe8fffa, 0.9);
				labGlass.moveTo(beakerX + beakerW * 0.24, beakerY + beakerH * 0.03);
				labGlass.lineTo(beakerX + beakerW * 0.18, beakerY + beakerH * 0.94);
				labGlass.lineTo(beakerX + beakerW * 0.82, beakerY + beakerH * 0.94);
				labGlass.lineTo(beakerX + beakerW * 0.76, beakerY + beakerH * 0.03);
				labGlass.lineTo(beakerX + beakerW * 0.24, beakerY + beakerH * 0.03);
				labTicks.lineStyle(1, 0xc8fff1, 0.52);
				for (let i = 0; i < 4; i++) {
					const ty = beakerY + beakerH * (0.16 + i * 0.18);
					labTicks.moveTo(beakerX + beakerW * 0.12, ty);
					labTicks.lineTo(beakerX + beakerW * 0.22, ty);
				}
				labLiquid.beginFill(item.accentColor ?? 0x38ffd0, 0.55);
				labLiquid.drawRoundedRect(beakerX + beakerW * 0.24, beakerY + beakerH * 0.53, beakerW * 0.52, beakerH * 0.36, 3);
				labLiquid.endFill();
				labBubbles.beginFill(0xbaffef, 0.66);
				labBubbles.drawCircle(beakerX + beakerW * 0.52, beakerY + beakerH * 0.68, Math.max(1.2, size * 0.016));
				labBubbles.drawCircle(beakerX + beakerW * 0.62, beakerY + beakerH * 0.58, Math.max(1.4, size * 0.018));
				labBubbles.drawCircle(beakerX + beakerW * 0.45, beakerY + beakerH * 0.5, Math.max(1.6, size * 0.02));
				labBubbles.endFill();
				statusLight.beginFill(item.accentColor ?? 0x38ffd0, 1);
				statusLight.drawCircle(faceX + faceW * 0.88, faceY + faceH * 0.84, Math.max(2, size * 0.03));
				statusLight.endFill();
				statusLight.alpha = 0.42;
			}
			if (item.ornament === 'resume') {
				const printerBodyW = size * 0.56;
				const printerBodyH = size * 0.2;
				const printerBodyY = size * 0.27;
				const topCapW = printerBodyW * 0.86;
				const topCapH = printerBodyH * 0.26;
				const slotW = printerBodyW * 0.34;
				const slotH = Math.max(2, size * 0.035);
				const chuteW = printerBodyW * 0.2;
				const chuteH = size * 0.1;
				const chuteY = printerBodyY + printerBodyH * 0.52;
				const ledX = printerBodyW * 0.32;
				const ledY = printerBodyY - printerBodyH * 0.16;

				ornament.lineStyle(2, ornamentColor, 0.92);
				ornament.beginFill(0xe7d8bd, 0.96);
				ornament.drawRoundedRect(-printerBodyW / 2, printerBodyY - printerBodyH / 2, printerBodyW, printerBodyH, 4);
				ornament.endFill();

				ornament.lineStyle(1.6, ornamentColor, 0.86);
				ornament.beginFill(0xf2e8d2, 0.96);
				ornament.drawRoundedRect(-topCapW / 2, printerBodyY - printerBodyH * 0.62, topCapW, topCapH, 3);
				ornament.endFill();

				ornament.lineStyle(1.2, ornamentColor, 0.74);
				ornament.beginFill(0x8b6f45, 0.5);
				ornament.drawRoundedRect(-slotW / 2, printerBodyY + printerBodyH * 0.04, slotW, slotH, 2);
				ornament.endFill();

				ornament.lineStyle(1.2, ornamentColor, 0.72);
				ornament.beginFill(0x2e2015, 0.95);
				ornament.drawRoundedRect(-chuteW / 2, chuteY, chuteW, chuteH, 2);
				ornament.endFill();

				ornament.lineStyle(1.5, ornamentColor, 0.65);
				ornament.moveTo(-printerBodyW * 0.3, printerBodyY + printerBodyH * 0.02);
				ornament.lineTo(printerBodyW * 0.22, printerBodyY + printerBodyH * 0.02);

				state.paperSpawnOffset.x = 0;
				state.paperSpawnOffset.y = chuteY + chuteH * 0.55;

				statusLight.beginFill(0xff2d2d, 1);
				statusLight.drawCircle(ledX, ledY, Math.max(2.2, size * 0.045));
				statusLight.endFill();
				statusLight.alpha = 0.24;
			} else {
				state.paperSpawnOffset.x = 0;
				state.paperSpawnOffset.y = -state.radius * 0.95;
			}

			glyph.style.fontSize = Math.max(18, Math.round(size * 0.44));
			glyph.style.dropShadow = false;
			glyph.style.stroke = 0x000000;
			glyph.style.strokeThickness = 0;
			glyph.style.fill = item.glyphColor ?? 0x0b1714;
			if (item.ornament === 'mountains') {
				glyph.style.fill = item.glyphColor ?? 0xe8f6ff;
				glyph.style.stroke = 0x102236;
				glyph.style.strokeThickness = Math.max(2, Math.round(size * 0.06));
				glyph.style.dropShadow = true;
				glyph.style.dropShadowColor = '#06111d';
				glyph.style.dropShadowAlpha = 0.88;
				glyph.style.dropShadowDistance = Math.max(1, Math.round(size * 0.03));
				glyph.style.dropShadowBlur = 0;
			}
			if (item.ornament === 'lab-beaker') {
				glyph.style.fill = 0xf4fffb;
				glyph.style.stroke = 0x0c2230;
				glyph.style.strokeThickness = Math.max(2, Math.round(size * 0.055));
				glyph.style.dropShadow = true;
				glyph.style.dropShadowColor = '#041018';
				glyph.style.dropShadowAlpha = 0.86;
				glyph.style.dropShadowDistance = Math.max(1, Math.round(size * 0.026));
				glyph.style.dropShadowBlur = 0;
				glyph.style.fontSize = Math.max(20, Math.round(size * 0.46));
				glyph.position.set(0, size * 0.03);
			}
			label.style.fontSize = Math.max(10, Math.round(size * 0.18));
			label.position.set(0, size / 2 + 8);

			const tooltipPaddingX = 10;
			const tooltipPaddingY = 6;
			tooltipText.style.fontSize = Math.max(10, Math.round(size * 0.18));
			const textBounds = tooltipText.getLocalBounds();
			const tooltipW = Math.ceil(textBounds.width + tooltipPaddingX * 2);
			const tooltipH = Math.ceil(textBounds.height + tooltipPaddingY * 2);
			tooltipBg.clear();
			tooltipBg.beginFill(0x0b1512, 0.92);
			tooltipBg.lineStyle(1, 0x22f3c8, 0.6);
			tooltipBg.drawRoundedRect(-tooltipW / 2, -tooltipH / 2, tooltipW, tooltipH, 6);
			tooltipBg.endFill();
			tooltipText.position.set(0, 0);
			tooltip.position.set(0, -size / 2 - tooltipH * 0.6);

			glyph.position.set(0, item.ornament === 'cat' ? size * 0.08 : 0);
			if (iconSprite) {
				const baseW = baseTextures?.[0]?.width || iconSprite.width || 1;
				const baseH = baseTextures?.[0]?.height || iconSprite.height || 1;
				const target = size * (item.spriteScale ?? 0.72);
				const scale = target / Math.max(baseW, baseH);
				iconSprite.scale.set(scale);
				iconSprite.position.set(0, 0);
			}
			if (hoverSprite) {
				const hoverW = hoverTextures?.[0]?.width || hoverSprite.width || 1;
				const hoverH = hoverTextures?.[0]?.height || hoverSprite.height || 1;
				const target = size * (item.spriteScale ?? 0.72);
				const scale = target / Math.max(hoverW, hoverH);
				hoverSprite.scale.set(scale);
				hoverSprite.position.set(0, 0);
			}
			if (iconSprite || hoverSprite) {
				glyph.visible = false;
			} else if (item.ornament === 'mountains') {
				glyph.visible = true;
			} else if (item.ornament === 'lab-beaker') {
				glyph.visible = true;
			} else {
				glyph.visible = true;
			}
			iconContainer.hitArea = new PIXI.Rectangle(-size / 2, -size / 2, size, size);
			cardMotion.reset();
		}

		drawIcon(state.iconSize);

		iconContainer.eventMode = 'static';
		iconContainer.cursor = 'pointer';
		iconContainer.on('pointertap', () => {
			if (dragState.enabled) return;
			if (typeof item.onTap === 'function') {
				item.onTap({ item, iconContainer, state });
				return;
			}
			if (item.url) {
				window.open(item.url, '_blank', 'noopener');
			}
		});
		iconContainer.on('pointerdown', (event) => {
			if (!dragState.enabled) return;
			const pos = event.getLocalPosition(world);
			state.dragging = true;
			dragState.active = { container: iconContainer, state };
			state.dragOffset.x = iconContainer.position.x - pos.x;
			state.dragOffset.y = iconContainer.position.y - pos.y;
			state.lastDragTime = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
		});
		iconContainer.on('pointerover', () => {
			if (dragState.enabled) return;
			state.hovered = true;
			tooltip.visible = true;
			onHoverChange?.({
				hovered: true,
				item,
				key: item?.moodKey || displayName || '',
				container: iconContainer,
			});
			if (hoverSprite) {
				if (iconSprite) iconSprite.visible = false;
				hoverSprite.visible = true;
				hoverSprite.gotoAndPlay(0);
			}
		});
		iconContainer.on('pointermove', (event) => {
			if (dragState.enabled) return;
			cardMotion.onPointerMove(event);
		});
		iconContainer.on('pointerout', () => {
			state.hovered = false;
			tooltip.visible = false;
			onHoverChange?.({
				hovered: false,
				item,
				key: item?.moodKey || displayName || '',
				container: iconContainer,
			});
			if (hoverSprite) {
				hoverSprite.stop();
				hoverSprite.visible = false;
				if (iconSprite) {
					iconSprite.visible = true;
					iconSprite.play();
				}
			}
			cardMotion.reset();
		});

		iconContainer._updatePlatformRect = () => {
			const b = iconContainer.getBounds();
			iconContainer._platformRect = { x: b.x, y: b.y, w: b.width, h: b.height };
		};
		iconContainer._updatePlatformRect();

		return { container: iconContainer, state, drawIcon, glow, hoverWash, border, ornament, catWhiskers, statusLight, pictureHaze, mountainFar, mountainMid, mountainNear, labLiquid, labBubbles, labGlass, labTicks, cardMotion, iconSprite, hoverSprite, tooltip, item };
	}

	function layout(snap = true) {
		const centerY = app.renderer.height * 0.54;
		const spacing = Math.max(92, Math.min(136, app.renderer.height * 0.19));
		const startY = centerY - spacing;
		const iconSize = Math.max(58, Math.min(82, app.renderer.height * 0.11));
		const leftX = Math.max(96, Math.min(168, app.renderer.width * 0.11));

		icons.forEach((icon, idx) => {
			const provided = typeof layoutProvider === 'function'
				? layoutProvider({
					index: idx,
					total: icons.length,
					defaultX: leftX,
					defaultY: startY + spacing * idx,
					defaultSize: iconSize,
				})
				: null;
			const sx = Number.isFinite(provided?.x) ? provided.x : leftX;
			const sy = Number.isFinite(provided?.y) ? provided.y : (startY + spacing * idx);
			const ssize = Number.isFinite(provided?.size) ? provided.size : iconSize;
			const x = screenToWorldX(sx);
			const y = screenToWorldY(sy);
			icon.state.base.x = x;
			icon.state.base.y = y;
			if (!dragState.enabled && snap) {
				icon.state.free.x = x;
				icon.state.free.y = y;
			}
			if (snap) icon.container.position.set(x, y);
			icon.drawIcon(screenToWorldSize(ssize));
			icon.container._updatePlatformRect?.();
		});
	}

	function update(time, dtSeconds = 1 / 60, mouseWorld = null) {
		const minX = screenToWorldX(PHYSICS.margin);
		const maxX = screenToWorldX(app.renderer.width - PHYSICS.margin);
		const minY = screenToWorldY(PHYSICS.margin);
		const maxY = screenToWorldY(app.renderer.height - PHYSICS.margin);
		const mouseR = screenToWorldSize(PHYSICS.mousePushRadius);
		const mouseForce = PHYSICS.mousePushForce;
		const grabR = screenToWorldSize(PHYSICS.mouseGrabRadius);
		const spinDamp = 0.985;
		const spinGrabTorque = 0.00016;
		const spinMax = 14;
		const spinUpright = 0;
		const groundRoll = 0.018;
		if (mouseWorld) {
			if (lastMouseWorld && dtSeconds > 0) {
				lastMouseVel = {
					x: (mouseWorld.x - lastMouseWorld.x) / dtSeconds,
					y: (mouseWorld.y - lastMouseWorld.y) / dtSeconds,
				};
			}
			lastMouseWorld = { x: mouseWorld.x, y: mouseWorld.y };
		}
		if (!mouseWorld?.down) {
			icons.forEach((icon) => {
				icon.state.grabbed = false;
				if (icon.state.dragging) {
					icon.state.dragging = false;
					icon.state.lastDragTime = 0;
				}
			});
			if (dragState.active) dragState.active = null;
			dragState.grabbed = null;
		}
		let launcherHovered = false;
		icons.forEach((icon) => {
			const radiusBound = icon.state.radius * icon.container.scale.x;
			const minBoundX = minX + radiusBound;
			const maxBoundX = maxX - radiusBound;
			const minBoundY = minY + radiusBound;
			const maxBoundY = maxY - radiusBound;
			const scale = icon.state.hovered ? 1.08 : 1.0;
			icon.state.hoverMix += ((icon.state.hovered ? 1 : 0) - icon.state.hoverMix) * 0.18;
			const amp = icon.state.hovered ? 6 : 3;
			const bounce = Math.sin(time * 3 + icon.state.phase) * amp;
			const popOut = icon.state.hovered ? 4 : 0;
			if (!dragState.enabled) {
				const targetX = icon.state.base.x;
				const targetY = icon.state.base.y + bounce - popOut;
				icon.container.position.x += (targetX - icon.container.position.x) * 0.12;
				icon.container.position.y += (targetY - icon.container.position.y) * 0.12;
				icon.state.angVel = 0;
				icon.state.angle += (0 - icon.state.angle) * 0.2;
				icon.container.rotation = icon.state.angle;
			} else {
				if (mouseWorld?.down) {
					if (icon.state.grabbed) {
						icon.state.vx = lastMouseVel.x;
						icon.state.vy = lastMouseVel.y;
						const torque = (icon.state.grabOffset.x * lastMouseVel.y - icon.state.grabOffset.y * lastMouseVel.x);
						icon.state.angVel += torque * spinGrabTorque;
						icon.container.position.x = mouseWorld.x + icon.state.grabOffset.x;
						icon.container.position.y = mouseWorld.y + icon.state.grabOffset.y;
					} else if (!dragState.grabbed) {
						const dx = icon.container.position.x - mouseWorld.x;
						const dy = icon.container.position.y - mouseWorld.y;
						const dist = Math.hypot(dx, dy) || 1;
						if (dist < grabR) {
							icon.state.grabbed = true;
							dragState.grabbed = icon;
							icon.state.grabOffset.x = icon.container.position.x - mouseWorld.x;
							icon.state.grabOffset.y = icon.container.position.y - mouseWorld.y;
						}
					}
				}
				if (icon.state.dragging && !icon.state.grabbed) {
					const torque = (icon.state.dragOffset.x * lastMouseVel.y - icon.state.dragOffset.y * lastMouseVel.x);
					icon.state.angVel += torque * spinGrabTorque;
				}
				if (icon.state.dragging || icon.state.grabbed) {
					icon.state.angVel += (-icon.state.angle) * spinUpright * dtSeconds;
				}
				if (!icon.state.dragging && !icon.state.grabbed) {
				if (mouseWorld) {
					const dx = icon.container.position.x - mouseWorld.x;
					const dy = icon.container.position.y - mouseWorld.y;
					const dist = Math.hypot(dx, dy) || 1;
					if (dist < mouseR) {
						const push = (1 - dist / mouseR) * mouseForce;
						icon.state.vx += (dx / dist) * push * dtSeconds;
						icon.state.vy += (dy / dist) * push * dtSeconds;
					}
				}
				icon.state.vy += PHYSICS.gravity * dtSeconds;
				icon.state.vx *= PHYSICS.airDamp;
				icon.state.vy *= PHYSICS.airDamp;
				icon.container.position.x += icon.state.vx * dtSeconds;
				icon.container.position.y += icon.state.vy * dtSeconds;
				if (icon.container.position.x < minBoundX) {
					icon.container.position.x = minBoundX;
					icon.state.vx *= -PHYSICS.bounce;
					icon.state.angVel += (-icon.state.vx) * 0.003;
					if (Math.abs(icon.state.vx) < 18) icon.state.vx = 0;
				}
			}
				if (icon.container.position.x > maxBoundX) {
					icon.container.position.x = maxBoundX;
					icon.state.vx *= -PHYSICS.bounce;
					icon.state.angVel += (icon.state.vx) * 0.003;
					if (Math.abs(icon.state.vx) < 18) icon.state.vx = 0;
				}
				if (icon.container.position.y < minBoundY) {
					icon.container.position.y = minBoundY;
					icon.state.vy *= -PHYSICS.bounce;
					icon.state.angVel += (icon.state.vx) * 0.0025;
					icon.state.angVel += icon.state.vx * (groundRoll * 0.35);
					icon.state.angVel *= Math.pow(0.82, dtSeconds * 60);
				}
				if (icon.container.position.y > maxBoundY) {
					icon.container.position.y = maxBoundY;
					if (icon.state.vy > 0) icon.state.vy = 0;
					icon.state.vx *= PHYSICS.floorFriction;
					icon.state.angVel += icon.state.vx * (groundRoll * 0.55);
					if (Math.abs(icon.state.vx) < 20) {
						icon.state.angVel *= Math.pow(0.76, dtSeconds * 60);
						if (Math.abs(icon.state.angVel) < 0.02) icon.state.angVel = 0;
						icon.state.vx = 0;
					}
					const floorMinX = minBoundX;
					const floorMaxX = maxBoundX;
					if (icon.container.position.x < floorMinX) {
						icon.container.position.x = floorMinX;
						if (icon.state.vx < 0) {
							icon.state.vx *= -PHYSICS.bounce;
							icon.state.angVel += (-icon.state.vx) * 0.003;
							if (Math.abs(icon.state.vx) < 18) icon.state.vx = 0;
						}
					}
					if (icon.container.position.x > floorMaxX) {
						icon.container.position.x = floorMaxX;
						if (icon.state.vx > 0) {
							icon.state.vx *= -PHYSICS.bounce;
							icon.state.angVel += (icon.state.vx) * 0.003;
							if (Math.abs(icon.state.vx) < 18) icon.state.vx = 0;
						}
					}
					if (Math.abs(icon.state.vx) < 8 && Math.abs(icon.state.vy) < 8 && Math.abs(icon.state.angVel) < 0.08) {
						icon.state.vx = 0;
						icon.state.vy = 0;
						icon.state.angVel = 0;
					}
				}
				icon.state.angVel *= Math.pow(spinDamp, dtSeconds * 60);
				if (!icon.state.dragging && !icon.state.grabbed) {
					const speed = Math.hypot(icon.state.vx, icon.state.vy);
					if (speed < 26) icon.state.angVel *= Math.pow(0.93, dtSeconds * 60);
				}
				icon.state.angVel = Math.max(-spinMax, Math.min(spinMax, icon.state.angVel));
				icon.state.angle += icon.state.angVel * dtSeconds;
				icon.container.rotation = icon.state.angle;
			}
			icon.container.scale.set(scale);
			if (icon.state.hovered || icon.state.dragging || icon.state.grabbed) launcherHovered = true;
			if (icon.tooltip) icon.tooltip.visible = icon.state.hovered && !dragState.enabled;
			const baseZ = 100 + icon.state.index;
			icon.container.zIndex = (icon.state.dragging || icon.state.grabbed) ? 1200 : (icon.state.hovered ? 999 : baseZ);
			if (icon.glow) {
				const hoverGlow = icon.item?.glowHoverAlpha ?? 0.24;
				const idleGlow = icon.item?.glowAlpha ?? 0.08;
				icon.glow.alpha = icon.state.hovered ? hoverGlow : idleGlow;
			}
			if (icon.hoverWash) {
				const mix = Math.max(0, Math.min(1, icon.state.hoverMix));
				icon.hoverWash.alpha = 0.03 + mix * 0.15;
			}
			if (icon.border) icon.border.alpha = icon.state.hovered ? 1 : 0.9;
			if (icon.ornament && icon.item?.ornament === 'cat') {
				icon.ornament.rotation = icon.state.hovered ? Math.sin(time * 4 + icon.state.phase) * 0.03 : 0;
				if (icon.catWhiskers) {
					if (icon.state.hovered) {
						icon.catWhiskers.rotation = Math.sin(time * 22 + icon.state.phase * 1.2) * 0.085;
						icon.catWhiskers.position.x = Math.sin(time * 15 + icon.state.phase) * 0.9;
					} else {
						icon.catWhiskers.rotation = 0;
						icon.catWhiskers.position.x = 0;
					}
				}
			}
			if (icon.statusLight && icon.item?.ornament === 'resume') {
				if (icon.state.hovered) {
					const blinkOn = Math.sin(time * 18 + icon.state.phase) > 0;
					icon.statusLight.alpha = blinkOn ? 1 : 0.12;
					const blinkScale = blinkOn ? 1.2 : 0.92;
					icon.statusLight.scale.set(blinkScale);
				} else {
					icon.statusLight.alpha = 0.24;
					icon.statusLight.scale.set(1);
				}
			}
			if (icon.item?.paperEmitter) {
				icon.state.paperCooldown -= dtSeconds;
				if (icon.state.hovered && icon.state.paperCooldown <= 0) {
					spawnPaperBit(icon);
					icon.state.paperCooldown = PAPER_FX.spawnIntervalMin + Math.random() * (PAPER_FX.spawnIntervalMax - PAPER_FX.spawnIntervalMin);
				}
			}
			if (icon.item?.ornament === 'mountains') {
				const mix = Math.max(0, Math.min(1, icon.state.hoverMix));
				const breathe = Math.sin(time * 3.2 + icon.state.phase) * (0.22 + mix * 0.38);
				icon.mountainFar.position.set(0.8 * mix, -0.28 * mix + breathe * 0.18);
				icon.mountainMid.position.set(1.8 * mix, -0.55 * mix + breathe * 0.26);
				icon.mountainNear.position.set(3.2 * mix, -0.95 * mix + breathe * 0.34);
				icon.mountainFar.scale.set(1 + mix * 0.003);
				icon.mountainMid.scale.set(1 + mix * 0.004);
				icon.mountainNear.scale.set(1 + mix * 0.006);
				if (icon.pictureHaze) icon.pictureHaze.alpha = 0.16 + mix * 0.08;
			}
			if (icon.item?.ornament === 'lab-beaker') {
				const mix = Math.max(0, Math.min(1, icon.state.hoverMix));
				const liquidY = Math.sin(time * (3.8 + mix * 3.6) + icon.state.phase + icon.state.labBubbleSeed[2]) * (1.1 + mix * 3.6);
				const liquidX = Math.cos(time * (2.6 + mix * 2.1) + icon.state.phase) * (0.35 + mix * 1.4);
				if (icon.labLiquid) {
					icon.labLiquid.position.y = liquidY;
					icon.labLiquid.position.x = liquidX;
					icon.labLiquid.rotation = Math.sin(time * (4.8 + mix * 3.4) + icon.state.phase) * (0.01 + mix * 0.045);
				}
				if (icon.labBubbles) {
					const b1 = Math.sin(time * (2.6 + mix * 3.8) + icon.state.labBubbleSeed[0]) * (1.2 + mix * 2.2);
					const b2 = Math.sin(time * (3.4 + mix * 4.4) + icon.state.labBubbleSeed[1]) * (1.1 + mix * 2.6);
					icon.labBubbles.position.y = -(2.2 + mix * 5.6) + b1;
					icon.labBubbles.position.x = b2 * 0.72;
					icon.labBubbles.alpha = 0.62 + mix * 0.32;
				}
				if (icon.statusLight) {
					icon.statusLight.alpha = 0.42 + mix * 0.54;
					icon.statusLight.scale.set(1 + mix * 0.2);
				}
			}
			icon.cardMotion?.update();
			if (icon.iconSprite?.playing) icon.iconSprite.update(dtSeconds * 60);
			if (icon.hoverSprite?.playing && icon.hoverSprite.visible) icon.hoverSprite.update(dtSeconds * 60);
			icon.container._updatePlatformRect?.();
		});
		container.zIndex = launcherHovered ? 999 : 80;
		container.parent?.sortChildren?.();
		container.sortChildren?.();

		for (let i = paperBits.length - 1; i >= 0; i--) {
			const p = paperBits[i];
			p.age += dtSeconds;
			p.vy += PAPER_FX.gravity * dtSeconds;
			p.vx *= PAPER_FX.airDamp;
			p.vy *= PAPER_FX.airDamp;
			p.node.position.x += p.vx * dtSeconds;
			p.node.position.y += p.vy * dtSeconds;
			p.node.rotation += p.vr * dtSeconds;
			const floorY = maxY - p.h * 0.5;
			if (p.node.position.y > floorY) {
				p.node.position.y = floorY;
				if (p.vy > 0) p.vy *= -PAPER_FX.bounce;
				p.vx *= PAPER_FX.friction;
				if (Math.abs(p.vy) < 20) p.vy = 0;
				if (Math.abs(p.vx) < 10) p.vx = 0;
			}
			const minPX = minX + p.w * 0.5;
			const maxPX = maxX - p.w * 0.5;
			if (p.node.position.x < minPX) {
				p.node.position.x = minPX;
				p.vx *= -0.35;
			}
			if (p.node.position.x > maxPX) {
				p.node.position.x = maxPX;
				p.vx *= -0.35;
			}
			const lifeT = Math.max(0, Math.min(1, p.age / p.life));
			p.node.alpha = 1 - lifeT * 0.9;
			if (p.age >= p.life) {
				p.node.destroy();
				paperBits.splice(i, 1);
			}
		}
		if (dragState.enabled) {
			const bodies = icons.map((icon) => ({
				container: icon.container,
				state: icon.state,
				radius: icon.state.radius * icon.container.scale.x,
			}));
			const externalBodies = externalBodiesProvider ? externalBodiesProvider() : [];
			if (externalBodies?.length) {
				for (const ext of externalBodies) {
					if (!ext?.container || !ext?.state) continue;
					bodies.push({
						container: ext.container,
						state: ext.state,
						radius: (ext.state.radiusScaled ?? ext.state.radius ?? 24) * (ext.container.scale?.x ?? 1),
					});
				}
			}
			for (let i = 0; i < bodies.length; i++) {
				for (let j = i + 1; j < bodies.length; j++) {
					const a = bodies[i];
					const b = bodies[j];
					const dx = b.container.position.x - a.container.position.x;
					const dy = b.container.position.y - a.container.position.y;
					const dist = Math.hypot(dx, dy) || 1;
					const minDist = a.radius + b.radius;
					if (dist < minDist) {
						const nx = dx / dist;
						const ny = dy / dist;
						const overlap = (minDist - dist) * 0.5;
						a.container.position.x -= nx * overlap;
						a.container.position.y -= ny * overlap;
						b.container.position.x += nx * overlap;
						b.container.position.y += ny * overlap;
						const rvx = (b.state.vx ?? 0) - (a.state.vx ?? 0);
						const rvy = (b.state.vy ?? 0) - (a.state.vy ?? 0);
						const rel = rvx * nx + rvy * ny;
						if (rel < 0) {
							const impulse = -(1 + PHYSICS.bounce) * rel * 0.5;
							a.state.vx -= impulse * nx;
							a.state.vy -= impulse * ny;
							b.state.vx += impulse * nx;
							b.state.vy += impulse * ny;
						}
					}
				}
			}
		}
	}

	function setDragEnabled(enabled, options = {}) {
		dragState.enabled = Boolean(enabled);
		const preserveMomentum = Boolean(options?.preserveMomentum);
		if (!dragState.enabled && dragState.active) {
			dragState.active.state.dragging = false;
			dragState.active = null;
		}
		if (!dragState.enabled) {
			dragState.grabbed = null;
		}
		icons.forEach((icon) => {
			if (dragState.enabled && icon.state.hovered) {
				onHoverChange?.({
					hovered: false,
					item: icon.item,
					key: icon.item?.moodKey || icon.item?.displayName || icon.item?.label || '',
					container: icon.container,
				});
			}
			icon.state.hovered = false;
			if (icon.tooltip) icon.tooltip.visible = false;
			if (icon.hoverSprite) {
				icon.hoverSprite.stop();
				icon.hoverSprite.visible = false;
			}
			if (icon.iconSprite) {
				icon.iconSprite.visible = true;
				icon.iconSprite.play();
			}
			icon.cardMotion?.reset?.();
			if (!preserveMomentum) {
				icon.state.vx = 0;
				icon.state.vy = 0;
				icon.state.angVel = 0;
				icon.state.angle = 0;
				icon.container.rotation = 0;
			}
			icon.state.lastDragTime = 0;
			icon.state.grabbed = false;
			if (!dragState.enabled) {
				icon.state.free.x = icon.state.base.x;
				icon.state.free.y = icon.state.base.y;
			}
		});
		icons.forEach((icon) => {
			icon.container.cursor = dragState.enabled ? 'move' : 'pointer';
		});
	}

	function setExternalBodiesProvider(provider) {
		externalBodiesProvider = provider;
	}

	function applyOrbitalImpulse(center, angularVelocity) {
		if (!center || !Number.isFinite(center.x) || !Number.isFinite(center.y)) return;
		if (!Number.isFinite(angularVelocity)) return;
		for (const icon of icons) {
			const dx = icon.container.position.x - center.x;
			const dy = icon.container.position.y - center.y;
			icon.state.vx += -dy * angularVelocity;
			icon.state.vy += dx * angularVelocity;
			icon.state.angVel += angularVelocity * 0.35;
		}
	}

	function getBodies() {
		return icons.map((icon) => ({ container: icon.container, state: icon.state }));
	}

	return {
		container,
		icons: icons.map((icon) => icon.container),
		layout,
		update,
		setDragEnabled,
		applyOrbitalImpulse,
		setExternalBodiesProvider,
		getBodies,
		platforms: icons.map((icon) => icon.container),
	};
}
