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
		panelFill = 0x2a1119,
		panelFillAlpha = 0.92,
		panelBorder = 0xff7f9d,
		panelBorderAlpha = 0.94,
		dockScreenX = null,
		dockScreenY = null,
		onHoverChange = null,
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
	const ninjaSword = new PIXI.Graphics();
	const ninjaStarTrail = new PIXI.Graphics();
	const ninjaStar = new PIXI.Graphics();
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

	const drawSword = () => {
		const bladeLen = Math.min(backgroundWidth, backgroundHeight) * 0.56;
		const bladeW = Math.max(3, bladeLen * 0.13);
		const guardW = bladeW * 2.9;
		const handleLen = bladeLen * 0.34;
		const outline = panelBorder;
		ninjaSword.clear();
		ninjaSword.lineStyle({ width: 2.7, color: outline, alpha: 0.96, cap: PIXI.LINE_CAP.ROUND, join: PIXI.LINE_JOIN.ROUND });
		ninjaSword.moveTo(-bladeW * 0.24, 0);
		ninjaSword.quadraticCurveTo(-bladeW * 0.72, -bladeLen * 0.46, -bladeW * 0.34, -bladeLen);
		ninjaSword.quadraticCurveTo(bladeW * 0.36, -bladeLen * 1.02, bladeW * 0.64, -bladeLen * 0.3);
		ninjaSword.quadraticCurveTo(bladeW * 0.46, -bladeLen * 0.06, bladeW * 0.16, 0);
		ninjaSword.moveTo(-guardW * 0.5, bladeW * 0.08);
		ninjaSword.lineTo(guardW * 0.5, bladeW * 0.08);
		ninjaSword.drawRoundedRect(-bladeW * 0.44, bladeW * 0.08, bladeW * 0.88, handleLen, 2.2);
		ninjaSword.drawCircle(0, bladeW * 0.08 + handleLen + bladeW * 0.26, bladeW * 0.26);
		ninjaSword.lineStyle({ width: 1.4, color: outline, alpha: 0.72, cap: PIXI.LINE_CAP.ROUND, join: PIXI.LINE_JOIN.ROUND });
		for (let i = 0; i < 4; i++) {
			const t = i / 3;
			const y = bladeW * 0.22 + t * (handleLen - bladeW * 0.22);
			ninjaSword.moveTo(-bladeW * 0.36, y);
			ninjaSword.lineTo(bladeW * 0.36, y + bladeW * 0.22);
		}
		ninjaSword.position.set(-backgroundWidth * 0.23, backgroundHeight * 0.26);
		ninjaSword.rotation = -0.68;
	};

	const drawStar = () => {
		const rOuter = Math.min(backgroundWidth, backgroundHeight) * 0.13;
		const rInner = rOuter * 0.42;
		const outline = panelBorder;
		ninjaStar.clear();
		ninjaStar.lineStyle({ width: 2.6, color: outline, alpha: 0.96, cap: PIXI.LINE_CAP.ROUND, join: PIXI.LINE_JOIN.ROUND });
		for (let i = 0; i < 8; i++) {
			const isOuter = i % 2 === 0;
			const a = -Math.PI * 0.5 + i * (Math.PI / 4);
			const r = isOuter ? rOuter : rInner;
			const x = Math.cos(a) * r;
			const y = Math.sin(a) * r;
			if (i === 0) ninjaStar.moveTo(x, y);
			else ninjaStar.lineTo(x, y);
		}
		ninjaStar.closePath();
		ninjaStar.lineStyle({ width: 1.9, color: outline, alpha: 0.8, cap: PIXI.LINE_CAP.ROUND, join: PIXI.LINE_JOIN.ROUND });
		ninjaStar.drawCircle(0, 0, rInner * 0.52);
	};

	drawPanel();
	drawSword();
	drawStar();
	sizeToFit(idleSprite);
	sizeToFit(runSprite);
	iconLayer.addChild(idleSprite, runSprite, ninjaSword, ninjaStarTrail, ninjaStar);

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
		star: {
			homeX: backgroundWidth * 0.24,
			homeY: -backgroundHeight * 0.06,
			x: backgroundWidth * 0.24,
			y: -backgroundHeight * 0.06,
			vx: 0,
			vy: 0,
			angle: 0,
			spin: 0,
			active: false,
			age: 0,
			cooldown: 0.35,
			trail: [],
		},
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
	const STAR_PHYSICS = {
		gravity: Math.max(180, backgroundHeight * 9.5),
		air: 0.994,
		spinDamp: 0.992,
		maxAge: 1.2,
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
				playerRunTextures: playerRunTextures,
				cpuTextures: cpuIdleTextures,
			});
		}
		return gameOverlay;
	};
	const randomBetween = (min, max) => min + Math.random() * (max - min);
	const resetStarDock = () => {
		state.star.active = false;
		state.star.vx = 0;
		state.star.vy = 0;
		state.star.age = 0;
		state.star.x += (state.star.homeX - state.star.x) * 0.22;
		state.star.y += (state.star.homeY - state.star.y) * 0.22;
		state.star.spin *= 0.88;
		if (state.star.trail.length) state.star.trail.length = Math.max(0, state.star.trail.length - 1);
	};
	const throwStar = () => {
		state.star.active = true;
		state.star.age = 0;
		state.star.x = state.star.homeX;
		state.star.y = state.star.homeY;
		const speed = randomBetween(backgroundWidth * 2.8, backgroundWidth * 4.6);
		const angle = randomBetween(-1.12, -0.5);
		state.star.vx = Math.cos(angle) * speed;
		state.star.vy = Math.sin(angle) * speed;
		state.star.angle = angle;
		state.star.spin = randomBetween(0, Math.PI * 2);
		state.star.cooldown = randomBetween(0.22, 0.7);
	};

	container.eventMode = 'static';
	container.cursor = 'pointer';
	container.on('pointerover', () => {
		state.hovered = true;
		onHoverChange?.({ hovered: true, key: 'Reflex', container });
		idleSprite.visible = false;
		runSprite.visible = true;
	});
	container.on('pointermove', (event) => {
		if (!state.hovered) return;
		cardMotion.onPointerMove(event);
	});
	container.on('pointerout', () => {
		state.hovered = false;
		onHoverChange?.({ hovered: false, key: 'Reflex', container });
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

	function layout(snap = true) {
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
		if (!state.dragEnabled && snap) {
			state.free.x = worldX;
			state.free.y = worldY;
		}
		if (snap) container.position.set(worldX, worldY);
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
		const dtSeconds = dt / 60;
		const swordBob = Math.sin(app.ticker.lastTime * 0.0048) * (state.hovered ? 1.4 : 0.8);
		ninjaSword.position.y = backgroundHeight * 0.26 + swordBob;
		ninjaSword.rotation = -0.68 + Math.sin(app.ticker.lastTime * 0.0038) * (state.hovered ? 0.11 : 0.05);
		if (state.hovered) {
			if (!state.star.active) {
				state.star.cooldown -= dtSeconds;
				if (state.star.cooldown <= 0) throwStar();
			}
		} else {
			state.star.cooldown = Math.min(0.45, state.star.cooldown + dtSeconds * 0.8);
			resetStarDock();
		}
		if (state.star.active) {
			state.star.age += dtSeconds;
			state.star.vy += STAR_PHYSICS.gravity * dtSeconds;
			state.star.vx *= Math.pow(STAR_PHYSICS.air, dtSeconds * 60);
			state.star.vy *= Math.pow(STAR_PHYSICS.air, dtSeconds * 60);
			state.star.x += state.star.vx * dtSeconds;
			state.star.y += state.star.vy * dtSeconds;
			state.star.spin += (state.star.vx > 0 ? 1 : -1) * 9.2 * dtSeconds;
			state.star.spin *= Math.pow(STAR_PHYSICS.spinDamp, dtSeconds * 60);
			state.star.trail.unshift({ x: state.star.x, y: state.star.y });
			if (state.star.trail.length > 7) state.star.trail.length = 7;
			const outOfBounds = (
				state.star.x > backgroundWidth * 0.88
				|| state.star.x < -backgroundWidth * 0.76
				|| state.star.y > backgroundHeight * 0.65
				|| state.star.y < -backgroundHeight * 0.86
			);
			if (state.star.age >= STAR_PHYSICS.maxAge || outOfBounds) {
				state.star.active = false;
				state.star.cooldown = randomBetween(0.18, 0.62);
			}
		}
		ninjaStar.position.set(state.star.x, state.star.y);
		ninjaStar.rotation = state.star.spin;
		ninjaStarTrail.clear();
		for (let i = 1; i < state.star.trail.length; i++) {
			const a = state.star.trail[i - 1];
			const b = state.star.trail[i];
			const alpha = (1 - i / state.star.trail.length) * (state.hovered ? 0.55 : 0.22);
			ninjaStarTrail.lineStyle(1.5, panelBorder, alpha);
			ninjaStarTrail.moveTo(a.x, a.y);
			ninjaStarTrail.lineTo(b.x, b.y);
		}
		if (!state.star.active && !state.hovered) {
			resetStarDock();
		}
		const targetScale = state.hovered ? scale * 1.05 : scale;
		state.currentScale += (targetScale - state.currentScale) * 0.18 * dt;
		container.scale.set(state.currentScale);
		state.radiusScaled = state.radius * state.currentScale;
		const popOut = state.hovered ? 4 / screenScale : 0;
		const minX = screenToWorldX(PHYSICS.margin);
		const maxX = screenToWorldX(app.renderer.width - PHYSICS.margin);
		const minY = screenToWorldY(PHYSICS.margin);
		const maxY = screenToWorldY(app.renderer.height - PHYSICS.margin);
		const minBoundX = minX + state.radiusScaled;
		const maxBoundX = maxX - state.radiusScaled;
		const minBoundY = minY + state.radiusScaled;
		const maxBoundY = maxY - state.radiusScaled;
		const mouse = state.mouseProvider?.();
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
			if (state.grabbed || dist < grabR) {
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
			if (container.position.x < minBoundX) {
				container.position.x = minBoundX;
				state.vx *= -PHYSICS.bounce;
				if (Math.abs(state.vx) < 18) state.vx = 0;
			}
			if (container.position.x > maxBoundX) {
				container.position.x = maxBoundX;
				state.vx *= -PHYSICS.bounce;
				if (Math.abs(state.vx) < 18) state.vx = 0;
			}
			if (container.position.y < minBoundY) {
				container.position.y = minBoundY;
				state.vy *= -PHYSICS.bounce;
				if (Math.abs(state.vy) < 18) state.vy = 0;
			}
			if (container.position.y > maxBoundY) {
				container.position.y = maxBoundY;
				if (state.vy > 0) state.vy = 0;
				state.vx *= PHYSICS.floorFriction;
				state.angVel += state.vx * (SPIN.groundRoll * 0.35);
				state.angVel *= Math.pow(0.82, dtSeconds * 60);
				if (Math.abs(state.vx) < 20) {
					state.vx = 0;
					state.angVel *= Math.pow(0.76, dtSeconds * 60);
					if (Math.abs(state.angVel) < 0.02) state.angVel = 0;
				}
				const floorMinX = minBoundX;
				const floorMaxX = maxBoundX;
				if (container.position.x < floorMinX) {
					container.position.x = floorMinX;
					if (state.vx < 0) {
						state.vx *= -PHYSICS.bounce;
						if (Math.abs(state.vx) < 18) state.vx = 0;
					}
				}
				if (container.position.x > floorMaxX) {
					container.position.x = floorMaxX;
					if (state.vx > 0) {
						state.vx *= -PHYSICS.bounce;
						if (Math.abs(state.vx) < 18) state.vx = 0;
					}
				}
				if (Math.abs(state.vx) < 8 && Math.abs(state.vy) < 8 && Math.abs(state.angVel) < 0.08) {
					state.vx = 0;
					state.vy = 0;
					state.angVel = 0;
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

	function setDragEnabled(enabled, options = {}) {
		state.dragEnabled = Boolean(enabled);
		const preserveMomentum = Boolean(options?.preserveMomentum);
		if (!state.dragEnabled) state.dragging = false;
		if (!preserveMomentum) {
			state.vx = 0;
			state.vy = 0;
			state.angVel = 0;
			state.angle = 0;
			container.rotation = 0;
		}
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
