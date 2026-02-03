import { createCardMotion } from './cardMotion.js';

export async function createLinkedinIcon(app, world, options = {}) {
	const {
		url = 'https://www.linkedin.com/',
		frozenJsonUrl = './assets/spritesheet/json/linkedin.json',
		hoverJsonUrl = './assets/spritesheet/json/hoverlinkedin.json',
		frozenImageUrl = './assets/spritesheet/linkedin.png',
		hoverImageUrl = './assets/spritesheet/hoverlinkedin.png',
		backgroundWidth = 56,
		backgroundHeight = 56,
		backgroundCornerRadius = 12,
		margin = 24,
		animationSpeed = 0.12,
		scale = 1.0,
		parallaxOffset = 6,
		tiltAmount = 0.12,
		screenScale = 1,
		label = 'LinkedIn',
		pixelFont = 'Minecraft, monospace',
		panelFill = 0x0b1b1a,
		panelFillAlpha = 0.22,
		panelBorder = 0x22f3c8,
		panelBorderAlpha = 0.55,
		dockScreenX = null,
		dockScreenY = null,
	} = options;

	function extractFrameIndex(name) {
		const match = name.match(/(\d+)(?!.*\d)/);
		return match ? Number(match[1]) : 0;
	}

	function buildTextures(data, imageUrl) {
		const baseTexture = PIXI.BaseTexture.from(imageUrl);
		const frames = Object.entries(data.frames || {}).map(([name, value]) => ({
			name,
			frame: value.frame,
		}));
		frames.sort((a, b) => extractFrameIndex(a.name) - extractFrameIndex(b.name));
		return frames.map(({ frame }) => new PIXI.Texture(
			baseTexture,
			new PIXI.Rectangle(frame.x, frame.y, frame.w, frame.h),
		));
	}

	const [frozenData, hoverData] = await Promise.all([
		fetch(frozenJsonUrl).then((r) => r.json()),
		fetch(hoverJsonUrl).then((r) => r.json()),
	]);
	await PIXI.Assets.load([frozenImageUrl, hoverImageUrl]);

	const frozenTextures = buildTextures(frozenData, frozenImageUrl);
	const hoverTextures = buildTextures(hoverData, hoverImageUrl);
	const frozenSprite = new PIXI.AnimatedSprite(frozenTextures);
	const hoverSprite = new PIXI.AnimatedSprite(hoverTextures);
	frozenSprite.anchor.set(0.5);
	hoverSprite.anchor.set(0.5);
	frozenSprite.animationSpeed = animationSpeed;
	hoverSprite.animationSpeed = animationSpeed;
	const baseTextureWidth = frozenTextures?.[0]?.width || frozenSprite.width || 1;
	const baseTextureHeight = frozenTextures?.[0]?.height || frozenSprite.height || 1;
	const targetSize = Math.min(backgroundWidth, backgroundHeight) * 0.78;
	const scaleFactor = targetSize / Math.max(baseTextureWidth, baseTextureHeight);
	frozenSprite.scale.set(scaleFactor);
	hoverSprite.scale.set(scaleFactor);
	frozenSprite.play();
	hoverSprite.visible = false;
	hoverSprite.stop();

	const container = new PIXI.Container();
	const panel = new PIXI.Graphics();
	const panelBorderGraphic = new PIXI.Graphics();
	const labelText = new PIXI.Text(label, {
		fontFamily: pixelFont,
		fontSize: 12,
		fill: 0xeafbff,
		align: 'center',
		letterSpacing: 1,
	});
	labelText.anchor.set(0.5, 0);

	function drawPanel() {
		panel.clear();
		panel.beginFill(panelFill, panelFillAlpha);
		panel.drawRoundedRect(-backgroundWidth / 2, -backgroundHeight / 2, backgroundWidth, backgroundHeight, backgroundCornerRadius);
		panel.endFill();
		panelBorderGraphic.clear();
		panelBorderGraphic.lineStyle(1.5, panelBorder, panelBorderAlpha);
		panelBorderGraphic.drawRoundedRect(-backgroundWidth / 2 + 1, -backgroundHeight / 2 + 1, backgroundWidth - 2, backgroundHeight - 2, Math.max(4, backgroundCornerRadius - 2));
		labelText.style.fontSize = Math.max(10, Math.round(backgroundWidth * 0.18));
		labelText.position.set(0, backgroundHeight / 2 + 6);
	}
	drawPanel();

	container.addChild(panel, panelBorderGraphic, frozenSprite, hoverSprite, labelText);
	container.scale.set(scale);
	const motionLayers = [
		{ target: hoverSprite, strength: parallaxOffset },
	];
	const cardMotion = createCardMotion(container, {
		width: backgroundWidth,
		height: backgroundHeight,
		tiltAmount,
		layers: motionLayers,
	});

	const state = {
		hovered: false,
		base: { x: 0, y: 0 },
		free: { x: 0, y: 0 },
		currentScale: scale,
		phase: Math.random() * 6.28,
		dragEnabled: false,
		dragging: false,
		grabbed: false,
		grabOffset: { x: 0, y: 0 },
		dragOffset: { x: 0, y: 0 },
		vx: 0,
		vy: 0,
		angle: 0,
		angVel: 0,
		lastDragTime: 0,
		radius: Math.max(backgroundWidth, backgroundHeight) * 0.5,
		radiusScaled: Math.max(backgroundWidth, backgroundHeight) * 0.5,
		mouseProvider: null,
		lastMouse: null,
		mouseVel: { x: 0, y: 0 },
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
	const SPIN = {
		damp: 0.985,
		grabTorque: 0.00032,
		max: 14,
	};
	const screenToWorldX = (screenX) => {
		const cx = app.renderer.width / 2;
		return (screenX - cx) / screenScale + cx;
	};
	const screenToWorldY = (screenY) => {
		const cy = app.renderer.height / 2;
		return (screenY - cy) / screenScale + cy;
	};

	container.eventMode = 'static';
	container.cursor = 'pointer';
	container.on('pointerover', () => {
		state.hovered = true;
		frozenSprite.visible = false;
		hoverSprite.visible = true;
		hoverSprite.gotoAndPlay(0);
	});
	container.on('pointermove', (event) => {
		if (!hoverSprite.visible) return;
		cardMotion.onPointerMove(event);
	});
	container.on('pointerout', () => {
		state.hovered = false;
		hoverSprite.stop();
		hoverSprite.visible = false;
		frozenSprite.visible = true;
		frozenSprite.play();
		cardMotion.reset();
	});
	container.on('pointertap', () => {
		if (state.dragEnabled) return;
		window.open(url, '_blank', 'noopener');
	});
	container.on('pointerdown', (event) => {
		if (!state.dragEnabled) return;
		const pos = event.getLocalPosition(world);
		state.dragging = true;
		state.dragOffset.x = container.position.x - pos.x;
		state.dragOffset.y = container.position.y - pos.y;
		state.lastDragTime = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
	});

	function layout() {
		const bounds = container.getLocalBounds();
		const w = bounds.width * container.scale.x;
		const h = bounds.height * container.scale.y;
		const resolvedDockX = typeof dockScreenX === 'function' ? dockScreenX() : dockScreenX;
		const resolvedDockY = typeof dockScreenY === 'function' ? dockScreenY() : dockScreenY;
		const screenX = (resolvedDockX != null) ? resolvedDockX : (app.renderer.width - margin - w / 2);
		const screenY = (resolvedDockY != null) ? resolvedDockY : (app.renderer.height - margin - h / 2);
		const cx = app.renderer.width / 2;
		const cy = app.renderer.height / 2;
		const worldX = (screenX - cx) / screenScale + cx;
		const worldY = (screenY - cy) / screenScale + cy;
		state.base.x = worldX;
		state.base.y = worldY;
		if (!state.dragEnabled) {
			state.free.x = worldX;
			state.free.y = worldY;
		}
		container.position.set(worldX, worldY);
	}

	world.addChild(container);
	layout();
	if (app?.stage) {
		if (!app.stage.eventMode || app.stage.eventMode === 'none') {
			app.stage.eventMode = 'static';
		}
		if (!app.stage.hitArea) {
			app.stage.hitArea = app.screen;
		}
		app.stage.on('pointermove', (event) => {
			if (!state.dragEnabled || !state.dragging) return;
			const pos = event.getLocalPosition(world);
			const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
			const nextX = pos.x + state.dragOffset.x;
			const nextY = pos.y + state.dragOffset.y;
			if (state.lastDragTime) {
				const dt = Math.max(0.001, (now - state.lastDragTime) / 1000);
				state.vx = (nextX - container.position.x) / dt;
				state.vy = (nextY - container.position.y) / dt;
				const torque = (state.dragOffset.x * state.vy - state.dragOffset.y * state.vx);
				state.angVel += torque * SPIN.grabTorque;
			}
			state.lastDragTime = now;
			container.position.set(nextX, nextY);
			state.free.x = container.position.x;
			state.free.y = container.position.y;
		});
		app.stage.on('pointerup', () => {
			if (state.dragging) {
				state.free.x = container.position.x;
				state.free.y = container.position.y;
			}
			state.dragging = false;
		});
		app.stage.on('pointerupoutside', () => {
			if (state.dragging) {
				state.free.x = container.position.x;
				state.free.y = container.position.y;
			}
			state.dragging = false;
		});
	}
	app.ticker.add((dt) => {
		cardMotion.update();
		const targetScale = state.hovered ? scale * 1.05 : scale;
		state.currentScale += (targetScale - state.currentScale) * 0.18 * dt;
		container.scale.set(state.currentScale);
		state.radiusScaled = state.radius * state.currentScale;
		const popOut = state.hovered ? 4 / screenScale : 0;
		const minX = screenToWorldX(PHYSICS.margin);
		const maxX = screenToWorldX(app.renderer.width - PHYSICS.margin);
		const minY = screenToWorldY(PHYSICS.margin);
		const maxY = screenToWorldY(app.renderer.height - PHYSICS.margin);
		const mouse = state.mouseProvider?.();
		const dtSeconds = dt / 60;
		if (mouse) {
			if (state.lastMouse && dtSeconds > 0) {
				state.mouseVel = {
					x: (mouse.x - state.lastMouse.x) / dtSeconds,
					y: (mouse.y - state.lastMouse.y) / dtSeconds,
				};
			}
			state.lastMouse = { x: mouse.x, y: mouse.y };
		}
		if (!mouse?.down) {
			state.grabbed = false;
			if (state.dragging) {
				state.dragging = false;
				state.lastDragTime = 0;
			}
		}
		if (!state.dragEnabled) {
			const bob = Math.sin(app.ticker.lastTime * 0.003 + state.phase) * (3 / screenScale);
			const targetX = state.base.x;
			const targetY = state.base.y - popOut + bob;
			container.position.x += (targetX - container.position.x) * 0.12 * dt;
			container.position.y += (targetY - container.position.y) * 0.12 * dt;
			state.angVel = 0;
			state.angle += (0 - state.angle) * 0.2 * dt;
			container.rotation = state.angle;
		} else if (mouse?.down) {
			const dx = container.position.x - mouse.x;
			const dy = container.position.y - mouse.y;
			const dist = Math.hypot(dx, dy) || 1;
			const grabR = screenToWorldX(PHYSICS.mouseGrabRadius) - screenToWorldX(0);
			if (dist < grabR) {
				if (!state.grabbed) {
					state.grabbed = true;
					state.grabOffset.x = container.position.x - mouse.x;
					state.grabOffset.y = container.position.y - mouse.y;
				}
				state.vx = state.mouseVel.x;
				state.vy = state.mouseVel.y;
				const torque = (state.grabOffset.x * state.mouseVel.y - state.grabOffset.y * state.mouseVel.x);
				state.angVel += torque * SPIN.grabTorque;
				container.position.x = mouse.x + state.grabOffset.x;
				container.position.y = mouse.y + state.grabOffset.y;
			} else {
				state.grabbed = false;
			}
		}
		if (state.dragEnabled && !state.dragging && !state.grabbed) {
			if (mouse) {
				const dx = container.position.x - mouse.x;
				const dy = container.position.y - mouse.y;
				const dist = Math.hypot(dx, dy) || 1;
				const mouseR = screenToWorldX(PHYSICS.mousePushRadius) - screenToWorldX(0);
				if (dist < mouseR) {
					const push = (1 - dist / mouseR) * PHYSICS.mousePushForce;
					state.vx += (dx / dist) * push * (dt / 60);
					state.vy += (dy / dist) * push * (dt / 60);
				}
			}
			state.vy += PHYSICS.gravity * (dt / 60);
			state.vx *= PHYSICS.airDamp;
			state.vy *= PHYSICS.airDamp;
			container.position.x += state.vx * (dt / 60);
			container.position.y += state.vy * (dt / 60);
			if (container.position.x < minX) {
				container.position.x = minX;
				state.vx *= -PHYSICS.bounce;
			}
			if (container.position.x > maxX) {
				container.position.x = maxX;
				state.vx *= -PHYSICS.bounce;
			}
			if (container.position.y < minY) {
				container.position.y = minY;
				state.vy *= -PHYSICS.bounce;
			}
			if (container.position.y > maxY) {
				container.position.y = maxY;
				if (state.vy > 0) state.vy = 0;
				state.vx *= PHYSICS.floorFriction;
			}
		}
		if (state.dragEnabled) {
			state.angVel *= Math.pow(SPIN.damp, dtSeconds * 60);
			state.angVel = Math.max(-SPIN.max, Math.min(SPIN.max, state.angVel));
			state.angle += state.angVel * dtSeconds;
			container.rotation = state.angle;
		}
	});

	function setDragEnabled(enabled) {
		state.dragEnabled = Boolean(enabled);
		if (!state.dragEnabled) state.dragging = false;
		state.vx = 0;
		state.vy = 0;
		state.angVel = 0;
		state.angle = 0;
		container.rotation = 0;
		state.lastDragTime = 0;
		state.grabbed = false;
		if (!state.dragEnabled) {
			state.free.x = state.base.x;
			state.free.y = state.base.y;
		}
		container.cursor = state.dragEnabled ? 'move' : 'pointer';
	}

	function setMouseProvider(provider) {
		state.mouseProvider = provider;
	}

	function getBody() {
		return { container, state };
	}

	return { container, layout, setDragEnabled, setMouseProvider, getBody };
}
