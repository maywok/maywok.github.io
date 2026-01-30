import { createCardMotion } from './cardMotion.js';

export function createAppLauncher(app, world, options = {}) {
	const {
		items = [],
		screenToWorldX,
		screenToWorldY,
		screenToWorldSize,
		pixelFont = 'Minecraft, monospace',
	} = options;

	const container = new PIXI.Container();
	container.sortableChildren = true;
	world.addChild(container);
	const dragState = {
		enabled: false,
		active: null,
	};
	const PHYSICS = {
		gravity: 1400,
		airDamp: 0.992,
		bounce: 0.35,
		floorFriction: 0.88,
		margin: 16,
	};
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

	function createAppIcon(item, index) {
		const iconContainer = new PIXI.Container();
		const bg = new PIXI.Graphics();
		const border = new PIXI.Graphics();
		const glow = new PIXI.Graphics();
		const label = new PIXI.Text(item.label, {
			fontFamily: pixelFont,
			fontSize: 12,
			fill: 0xeafbff,
			align: 'center',
			letterSpacing: 1,
		});
		label.anchor.set(0.5, 0);

		const glyph = new PIXI.Text(item.glyph || item.label?.[0] || '', {
			fontFamily: pixelFont,
			fontSize: 22,
			fill: 0x0b1714,
			align: 'center',
			letterSpacing: 1,
		});
		glyph.anchor.set(0.5);

		const tooltip = new PIXI.Container();
		const tooltipBg = new PIXI.Graphics();
		const tooltipText = new PIXI.Text(item.tooltip || item.label, {
			fontFamily: pixelFont,
			fontSize: 12,
			fill: 0xeafffb,
			align: 'center',
			letterSpacing: 1,
		});
		tooltipText.anchor.set(0.5);
		tooltip.addChild(tooltipBg, tooltipText);
		tooltip.visible = false;

		iconContainer.addChild(glow, bg, border, glyph, label, tooltip);

		const state = {
			index,
			hovered: false,
			base: { x: 0, y: 0 },
			free: { x: 0, y: 0 },
			phase: index * 0.9,
			iconSize: 56,
			dragging: false,
			dragOffset: { x: 0, y: 0 },
			vx: 0,
			vy: 0,
			lastDragTime: 0,
		};

		const cardMotion = createCardMotion(iconContainer, {
			width: state.iconSize,
			height: state.iconSize,
			tiltAmount: 0.12,
			layers: [
				{ target: glyph, strength: 3 },
				{ target: glow, strength: 1.5, invert: true },
			],
		});

		function drawIcon(size) {
			state.iconSize = size;
			const radius = Math.max(6, Math.round(size * 0.18));
			const glowPad = Math.round(size * 0.12);
			const inner = size - 4;

			glow.clear();
			glow.beginFill(0xe4ff5a, 0.08);
			glow.drawRoundedRect(-size / 2 - glowPad, -size / 2 - glowPad, size + glowPad * 2, size + glowPad * 2, radius + 4);
			glow.endFill();

			bg.clear();
			bg.beginFill(0x22f3c8, 0.9);
			bg.drawRoundedRect(-size / 2, -size / 2, size, size, radius);
			bg.endFill();

			border.clear();
			border.lineStyle(2, 0x0b3a33, 0.85);
			border.drawRoundedRect(-size / 2 + 1, -size / 2 + 1, inner, inner, radius - 2);

			glyph.style.fontSize = Math.max(18, Math.round(size * 0.44));
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

			glyph.position.set(0, 0);
			iconContainer.hitArea = new PIXI.Rectangle(-size / 2, -size / 2, size, size);
			cardMotion.reset();
		}

		drawIcon(state.iconSize);

		iconContainer.eventMode = 'static';
		iconContainer.cursor = 'pointer';
		iconContainer.on('pointertap', () => {
			if (dragState.enabled) return;
			window.open(item.url, '_blank', 'noopener');
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
			state.hovered = true;
			tooltip.visible = true;
		});
		iconContainer.on('pointermove', (event) => {
			cardMotion.onPointerMove(event);
		});
		iconContainer.on('pointerout', () => {
			state.hovered = false;
			tooltip.visible = false;
			cardMotion.reset();
		});

		iconContainer._updatePlatformRect = () => {
			const b = iconContainer.getBounds();
			iconContainer._platformRect = { x: b.x, y: b.y, w: b.width, h: b.height };
		};
		iconContainer._updatePlatformRect();

		return { container: iconContainer, state, drawIcon, glow, border, cardMotion };
	}

	function layout() {
		const centerY = app.renderer.height * 0.52;
		const spacing = Math.max(86, Math.min(140, app.renderer.height * 0.18));
		const startY = centerY - spacing;
		const iconSize = Math.max(48, Math.min(74, app.renderer.height * 0.1));
		const leftX = 110;

		icons.forEach((icon, idx) => {
			const x = screenToWorldX(leftX);
			const y = screenToWorldY(startY + spacing * idx);
			icon.state.base.x = x;
			icon.state.base.y = y;
			if (!dragState.enabled) {
				icon.state.free.x = x;
				icon.state.free.y = y;
			}
			icon.container.position.set(x, y);
			icon.drawIcon(screenToWorldSize(iconSize));
			icon.container._updatePlatformRect?.();
		});
	}

	function update(time, dtSeconds = 1 / 60) {
		const minX = screenToWorldX(PHYSICS.margin);
		const maxX = screenToWorldX(app.renderer.width - PHYSICS.margin);
		const minY = screenToWorldY(PHYSICS.margin);
		const maxY = screenToWorldY(app.renderer.height - PHYSICS.margin);
		icons.forEach((icon) => {
			const scale = icon.state.hovered ? 1.08 : 1.0;
			const amp = icon.state.hovered ? 6 : 3;
			const bounce = Math.sin(time * 3 + icon.state.phase) * amp;
			const popOut = icon.state.hovered ? 4 : 0;
			if (!dragState.enabled) {
				const targetX = icon.state.base.x;
				const targetY = icon.state.base.y + bounce - popOut;
				icon.container.position.x += (targetX - icon.container.position.x) * 0.12;
				icon.container.position.y += (targetY - icon.container.position.y) * 0.12;
			} else if (!icon.state.dragging) {
				icon.state.vy += PHYSICS.gravity * dtSeconds;
				icon.state.vx *= PHYSICS.airDamp;
				icon.state.vy *= PHYSICS.airDamp;
				icon.container.position.x += icon.state.vx * dtSeconds;
				icon.container.position.y += icon.state.vy * dtSeconds;
				if (icon.container.position.x < minX) {
					icon.container.position.x = minX;
					icon.state.vx *= -PHYSICS.bounce;
				}
				if (icon.container.position.x > maxX) {
					icon.container.position.x = maxX;
					icon.state.vx *= -PHYSICS.bounce;
				}
				if (icon.container.position.y < minY) {
					icon.container.position.y = minY;
					icon.state.vy *= -PHYSICS.bounce;
				}
				if (icon.container.position.y > maxY) {
					icon.container.position.y = maxY;
					if (icon.state.vy > 0) icon.state.vy = 0;
					icon.state.vx *= PHYSICS.floorFriction;
				}
			}
			icon.container.scale.set(scale);
			icon.container.zIndex = icon.state.dragging ? 3 : (icon.state.hovered ? 2 : 1);
			if (icon.glow) icon.glow.alpha = icon.state.hovered ? 0.24 : 0.08;
			if (icon.border) icon.border.tint = icon.state.hovered ? 0xa00026 : 0xffffff;
			icon.cardMotion?.update();
			icon.container._updatePlatformRect?.();
		});
	}

	function setDragEnabled(enabled) {
		dragState.enabled = Boolean(enabled);
		if (!dragState.enabled && dragState.active) {
			dragState.active.state.dragging = false;
			dragState.active = null;
		}
		icons.forEach((icon) => {
			icon.state.vx = 0;
			icon.state.vy = 0;
			icon.state.lastDragTime = 0;
			if (!dragState.enabled) {
				icon.state.free.x = icon.state.base.x;
				icon.state.free.y = icon.state.base.y;
			}
		});
		icons.forEach((icon) => {
			icon.container.cursor = dragState.enabled ? 'move' : 'pointer';
		});
	}

	return {
		container,
		icons: icons.map((icon) => icon.container),
		layout,
		update,
		setDragEnabled,
		platforms: icons.map((icon) => icon.container),
	};
}
