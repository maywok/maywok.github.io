import { createCardMotion } from '../cardMotion.js';
import { createReflexGameOverlay } from './reflexGame.js';

export async function createReflexIcon(app, world, options = {}) {
	const {
		backgroundWidth = 56,
		backgroundHeight = 56,
		backgroundCornerRadius = 12,
		margin = 24,
		scale = 1.0,
		parallaxOffset = 6,
		tiltAmount = 0.12,
		screenScale = 1,
		label = 'Reflex',
		pixelFont = 'Minecraft, monospace',
		panelFill = 0x0b1b1a,
		panelFillAlpha = 0.22,
		panelBorder = 0x22f3c8,
		panelBorderAlpha = 0.55,
		dockScreenX = null,
		dockScreenY = null,
	} = options;

	const playerIdleJsonUrl = './assets/spritesheet/json/blueNinjaIdle.json';
	const playerIdleImageUrl = './assets/spritesheet/blueNinjaIdle.png';
	const playerRunJsonUrl = './assets/spritesheet/json/blueNinjaRun.json';
	const playerRunImageUrl = './assets/spritesheet/blueNinjaRun.png';
	const cpuIdleJsonUrl = './assets/spritesheet/json/redNinjaIdle.json';
	const cpuIdleImageUrl = './assets/spritesheet/redNinjaIdle.png';

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

	const [playerIdleData, playerRunData, cpuIdleData] = await Promise.all([
		fetch(playerIdleJsonUrl).then((r) => r.json()),
		fetch(playerRunJsonUrl).then((r) => r.json()),
		fetch(cpuIdleJsonUrl).then((r) => r.json()),
	]);
	await PIXI.Assets.load([playerIdleImageUrl, playerRunImageUrl, cpuIdleImageUrl]);

	const playerIdleTextures = buildTextures(playerIdleData, playerIdleImageUrl);
	const playerRunTextures = buildTextures(playerRunData, playerRunImageUrl);
	const cpuIdleTextures = buildTextures(cpuIdleData, cpuIdleImageUrl);

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

	const iconLayer = new PIXI.Container();
	const idleSprite = new PIXI.AnimatedSprite(playerIdleTextures);
	const runSprite = new PIXI.AnimatedSprite(playerRunTextures);
	idleSprite.anchor.set(0.5);
	runSprite.anchor.set(0.5);
	idleSprite.animationSpeed = 0.14;
	runSprite.animationSpeed = 0.16;
	idleSprite.play();
	runSprite.play();
	runSprite.visible = false;

	const sizeToFit = (sprite) => {
		const baseW = playerIdleTextures?.[0]?.width || sprite.width || 1;
		const baseH = playerIdleTextures?.[0]?.height || sprite.height || 1;
		const target = Math.min(backgroundWidth, backgroundHeight) * 0.62;
		const scaleFactor = target / Math.max(baseW, baseH);
		sprite.scale.set(scaleFactor);
	};

	const drawPanel = () => {
		panel.clear();
		panel.beginFill(panelFill, panelFillAlpha);
		panel.drawRoundedRect(-backgroundWidth / 2, -backgroundHeight / 2, backgroundWidth, backgroundHeight, backgroundCornerRadius);
		panel.endFill();
		panelBorderGraphic.clear();
		panelBorderGraphic.lineStyle(1.5, panelBorder, panelBorderAlpha);
		panelBorderGraphic.drawRoundedRect(-backgroundWidth / 2 + 1, -backgroundHeight / 2 + 1, backgroundWidth - 2, backgroundHeight - 2, Math.max(4, backgroundCornerRadius - 2));
		labelText.style.fontSize = Math.max(10, Math.round(backgroundWidth * 0.18));
		labelText.position.set(0, backgroundHeight / 2 + 6);
	};

	drawPanel();
	sizeToFit(idleSprite);
	sizeToFit(runSprite);
	iconLayer.addChild(idleSprite, runSprite);

	container.addChild(panel, panelBorderGraphic, iconLayer, labelText);
	container.scale.set(scale);

	const cardMotion = createCardMotion(container, {
		width: backgroundWidth,
		height: backgroundHeight,
		tiltAmount,
		layers: [{ target: iconLayer, strength: parallaxOffset }],
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
		upright: 0,
		groundRoll: 0.018,
	};
	const screenToWorldX = (screenX) => {
		const cx = app.renderer.width / 2;
		return (screenX - cx) / screenScale + cx;
	};
	const screenToWorldY = (screenY) => {
		const cy = app.renderer.height / 2;
		return (screenY - cy) / screenScale + cy;
	};

	let gameOverlay = null;
	const ensureGameOverlay = () => {
		if (!gameOverlay) {
			gameOverlay = createReflexGameOverlay(app, world, {
				screenScale,
				playerTextures: playerIdleTextures,
				cpuTextures: cpuIdleTextures,
			});
		}
		return gameOverlay;
	};

	container.eventMode = 'static';
	container.cursor = 'pointer';
	container.on('pointerover', () => {
		state.hovered = true;
		idleSprite.visible = false;
		runSprite.visible = true;
	});
	container.on('pointermove', (event) => {
		if (!state.hovered) return;
		cardMotion.onPointerMove(event);
	});
	container.on('pointerout', () => {
		state.hovered = false;
		cardMotion.reset();
		runSprite.visible = false;
		idleSprite.visible = true;
	});
	container.on('pointertap', () => {
		if (state.dragEnabled) return;
		ensureGameOverlay().open();
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
		if (state.dragEnabled && (state.dragging || state.grabbed)) {
			state.angVel += (-state.angle) * SPIN.upright * dtSeconds;
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
				state.angVel += state.vx * SPIN.groundRoll;
				const floorMinX = minX + state.radiusScaled;
				const floorMaxX = maxX - state.radiusScaled;
				if (container.position.x < floorMinX) {
					container.position.x = floorMinX;
					if (state.vx < 0) state.vx *= -PHYSICS.bounce;
				}
				if (container.position.x > floorMaxX) {
					container.position.x = floorMaxX;
					if (state.vx > 0) state.vx *= -PHYSICS.bounce;
				}
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
