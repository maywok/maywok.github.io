import { Player } from './player.js';
import { createVines } from './vines.js';

function clamp01(value) {
	return Math.max(0, Math.min(1, value));
}

function mixColors(a, b, t) {
	const tt = clamp01(t);
	const ar = (a >> 16) & 255;
	const ag = (a >> 8) & 255;
	const ab = a & 255;
	const br = (b >> 16) & 255;
	const bg = (b >> 8) & 255;
	const bb = b & 255;
	const rr = Math.round(ar + (br - ar) * tt);
	const rg = Math.round(ag + (bg - ag) * tt);
	const rb = Math.round(ab + (bb - ab) * tt);
	return (rr << 16) | (rg << 8) | rb;
}

function makeLampLightTexture(color = '#38ffd0') {
	const size = 256;
	const canvas = document.createElement('canvas');
	canvas.width = size;
	canvas.height = size;
	const ctx = canvas.getContext('2d');
	if (!ctx) return PIXI.Texture.WHITE;
	const cx = size / 2;
	const cy = size / 2;
	const r = parseInt(color.slice(1, 3), 16);
	const g = parseInt(color.slice(3, 5), 16);
	const b = parseInt(color.slice(5, 7), 16);
	const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, size * 0.5);
	grad.addColorStop(0, 'rgba(255,255,255,0.95)');
	grad.addColorStop(0.25, `rgba(${r},${g},${b},0.62)`);
	grad.addColorStop(0.6, `rgba(${r},${g},${b},0.14)`);
	grad.addColorStop(1, 'rgba(0,0,0,0)');
	ctx.fillStyle = grad;
	ctx.fillRect(0, 0, size, size);
	return PIXI.Texture.from(canvas);
}

export function createVineLab(app, options = {}) {
	const {
		accentColor = 0x38ffd0,
		onExit = () => {},
	} = options;

	const layer = new PIXI.Container();
	layer.sortableChildren = true;
	layer.zIndex = 860;
	layer.visible = false;
	layer.eventMode = 'none';
	app.stage.addChild(layer);

	const background = new PIXI.Graphics();
	const grid = new PIXI.Graphics();
	const world = new PIXI.Container();
	world.sortableChildren = true;
	const vineLightLayer = new PIXI.Container();
	vineLightLayer.blendMode = PIXI.BLEND_MODES.ADD;
	vineLightLayer.zIndex = 30;
	const platformLayer = new PIXI.Graphics();
	platformLayer.zIndex = 20;
	const spawnLayer = new PIXI.Graphics();
	spawnLayer.zIndex = 22;

	const ui = new PIXI.Container();
	ui.zIndex = 120;
	const panelBg = new PIXI.Graphics();
	const panelTitle = new PIXI.Text('VINE LAB // SANDBOX', {
		fontFamily: 'Minecraft, monospace',
		fontSize: 12,
		fill: 0xe8fffa,
		letterSpacing: 1,
	});
	const controlsText = new PIXI.Text('', {
		fontFamily: 'Minecraft, monospace',
		fontSize: 10,
		fill: 0xb6d1df,
		letterSpacing: 0.5,
		lineHeight: 14,
	});
	const logText = new PIXI.Text('', {
		fontFamily: 'Minecraft, monospace',
		fontSize: 10,
		fill: 0x9fffd8,
		letterSpacing: 0.4,
		lineHeight: 13,
	});
	panelTitle.anchor.set(0, 0);
	controlsText.anchor.set(0, 0);
	logText.anchor.set(0, 0);
	ui.addChild(panelBg, panelTitle, controlsText, logText);

	world.addChild(vineLightLayer, platformLayer, spawnLayer);
	layer.addChild(background, grid, world, ui);

	const lampTexture = makeLampLightTexture('#38ffd0');
	const lampSprites = [];
	const logs = [];
	const maxLogs = 7;
	const gravityModes = [
		{ key: 'normal', label: 'normal', value: 820 },
		{ key: 'low', label: 'low', value: 540 },
		{ key: 'moon', label: 'moon', value: 320 },
	];

	let active = false;
	let time = 0;
	let player = null;
	let vinesLayer = null;
	let vines = [];
	let vineGrab = null;
	let grabRequested = false;
	let releaseRequested = false;
	let gravityModeIndex = 0;
	let lampMode = true;
	let levelIndex = 0;
	let statusText = 'normal';
	let groundY = 0;

	const labState = {
		platforms: [],
		spawnables: [],
		nextSpawnId: 1,
	};

	const SWING_ACCEL = 9.8;
	const SWING_DAMP = 0.995;
	const SWING_GRAVITY = 18.0;
	const SPAWN_LANES = [0.14, 0.27, 0.42, 0.58, 0.73, 0.86];

	function pushLog(line) {
		logs.unshift(`> ${line}`);
		if (logs.length > maxLogs) logs.length = maxLogs;
		logText.text = logs.join('\n');
	}

	function setControlsText() {
		controlsText.text = [
			'WASD/Arrows: move',
			'Space: jump / release vine',
			'E: attach nearest vine',
			'1 crate  2 bouncy pad  3 wind zone',
			'G gravity  L lamp mode  M level A/B',
			`ESC exit lab   gravity=${statusText}  lamps=${lampMode ? 'on' : 'off'}`,
		].join('\n');
	}

	function clearWorld() {
		if (player) {
			player.destroy();
			player.view.parent?.removeChild(player.view);
			player = null;
		}
		if (vinesLayer) {
			vinesLayer.parent?.removeChild(vinesLayer);
			vinesLayer.destroy({ children: true });
			vinesLayer = null;
		}
		vines = [];
		while (lampSprites.length) {
			const sprite = lampSprites.pop();
			sprite?.destroy?.();
		}
		vineLightLayer.removeChildren();
		labState.spawnables.length = 0;
		labState.nextSpawnId = 1;
		vineGrab = null;
		grabRequested = false;
		releaseRequested = false;
	}

	function applyGravityMode() {
		const mode = gravityModes[gravityModeIndex] || gravityModes[0];
		statusText = mode.label;
		if (player) player.gravity = mode.value;
		setControlsText();
	}

	function buildBasePlatforms() {
		const w = app.renderer.width;
		const h = app.renderer.height;
		groundY = Math.max(80, h - 120);
		const levelLayouts = [
			[
				{ x: w * 0.18, y: h * 0.63, w: 140, h: 16, type: 'platform' },
				{ x: w * 0.62, y: h * 0.56, w: 170, h: 16, type: 'platform' },
			],
			[
				{ x: w * 0.24, y: h * 0.58, w: 120, h: 16, type: 'platform' },
				{ x: w * 0.48, y: h * 0.48, w: 120, h: 16, type: 'platform' },
				{ x: w * 0.7, y: h * 0.62, w: 140, h: 16, type: 'platform' },
			],
		];
		labState.platforms = levelLayouts[levelIndex % levelLayouts.length].map((p) => ({ ...p }));
	}

	function rectsOverlap(a, b, pad = 0) {
		return !(a.x + a.w + pad <= b.x || b.x + b.w + pad <= a.x || a.y + a.h + pad <= b.y || b.y + b.h + pad <= a.y);
	}

	function canPlaceSpawn(x, y, w, h, pad = 12) {
		const screenW = app.renderer.width;
		if (x < 8 || x + w > screenW - 8) return false;
		const centerX = x + w * 0.5;
		const centerForbidden = app.renderer.width * 0.5;
		if (labState.spawnables.length < 2 && Math.abs(centerX - centerForbidden) < 74) return false;
		const probe = { x, y, w, h };
		for (const existing of labState.spawnables) {
			if (rectsOverlap(probe, existing, pad)) return false;
		}
		return true;
	}

	function pickLaneX(w, jitter = 0.07) {
		const lane = SPAWN_LANES[Math.floor(Math.random() * SPAWN_LANES.length)] ?? 0.5;
		const j = (Math.random() - 0.5) * app.renderer.width * jitter;
		const center = app.renderer.width * lane + j;
		return Math.max(10, Math.min(app.renderer.width - w - 10, center - w * 0.5));
	}

	function findSpawnPosition({
		w,
		h,
		allowPlatform = false,
		platformBias = 0.4,
		groundYOffset = 0,
		platformYOffset = 0,
		pad = 12,
	}) {
		const attempts = 24;
		for (let i = 0; i < attempts; i++) {
			const usePlatform = allowPlatform && labState.platforms.length > 0 && Math.random() < platformBias;
			let x = 0;
			let y = 0;
			if (usePlatform) {
				const surface = labState.platforms[Math.floor(Math.random() * labState.platforms.length)];
				const minX = surface.x + 6;
				const maxX = surface.x + surface.w - w - 6;
				if (maxX > minX) {
					x = minX + Math.random() * (maxX - minX);
					y = surface.y - h + platformYOffset;
				} else {
					x = pickLaneX(w);
					y = groundY - h + groundYOffset;
				}
			} else {
				x = pickLaneX(w);
				y = groundY - h + groundYOffset;
			}
			if (canPlaceSpawn(x, y, w, h, pad)) return { x, y };
		}
		return {
			x: pickLaneX(w, 0.15),
			y: groundY - h + groundYOffset,
		};
	}

	function pushSpawnable(item) {
		labState.spawnables.push(item);
		if (labState.spawnables.length > 18) {
			labState.spawnables.shift();
			pushLog('max objects reached, oldest removed');
		}
	}

	function buildVines() {
		const vineOptions = {
			lamp: {
				enabled: true,
				color: 0xc3f6e8,
				glowColor: accentColor,
				radius: 9,
				glowRadius: 34,
				glowAlpha: 0.25,
				coreAlpha: 0.86,
			},
		};
		const rebuilt = createVines(app, 5, 70, vineOptions);
		vinesLayer = rebuilt.container;
		vines = rebuilt.vines;
		world.addChild(vinesLayer);
		for (let i = 0; i < vines.length; i++) {
			const sprite = new PIXI.Sprite(lampTexture);
			sprite.anchor.set(0.5);
			sprite.alpha = 0.22;
			const baseScale = 160 / (lampTexture.width * 0.5);
			sprite.scale.set(baseScale);
			vineLightLayer.addChild(sprite);
			lampSprites.push(sprite);
		}
	}

	function resetPlayer() {
		player = new Player(app, app.renderer.width * 0.5, groundY - 10, 26);
		player.setColors({ fill: 0xe9fff8, glow: accentColor, glowAlpha: 0.24 });
		player.maxSpeed = 300;
		player.jumpSpeed = 460;
		world.addChild(player.view);
		applyGravityMode();
	}

	function rebuildLayout() {
		const w = app.renderer.width;
		const h = app.renderer.height;
		background.clear();
		background.beginFill(0x05080f, 0.98);
		background.drawRect(0, 0, w, h);
		background.endFill();

		grid.clear();
		grid.lineStyle(1, 0x1d2f3f, 0.32);
		for (let x = 0; x <= w; x += 26) {
			grid.moveTo(x, 0);
			grid.lineTo(x, h);
		}
		for (let y = 0; y <= h; y += 26) {
			grid.moveTo(0, y);
			grid.lineTo(w, y);
		}

		panelBg.clear();
		panelBg.beginFill(0x07111b, 0.9);
		panelBg.lineStyle(1, accentColor, 0.58);
		panelBg.drawRoundedRect(12, 12, 348, 182, 8);
		panelBg.endFill();
		panelTitle.position.set(24, 22);
		controlsText.position.set(24, 46);
		logText.position.set(24, 134);

		buildBasePlatforms();
		platformLayer.clear();
		platformLayer.beginFill(0x132335, 0.98);
		platformLayer.drawRect(0, groundY, w, h - groundY + 20);
		platformLayer.endFill();
		platformLayer.lineStyle(2, accentColor, 0.42);
		platformLayer.moveTo(0, groundY);
		platformLayer.lineTo(w, groundY);
		for (const platform of labState.platforms) {
			platformLayer.beginFill(0x14283a, 0.96);
			platformLayer.lineStyle(1, 0x8de8d0, 0.6);
			platformLayer.drawRoundedRect(platform.x, platform.y, platform.w, platform.h, 5);
			platformLayer.endFill();
		}
	}

	function spawnCrate() {
		const w = 44;
		const h = 36;
		const at = findSpawnPosition({
			w,
			h,
			allowPlatform: true,
			platformBias: 0.52,
			groundYOffset: 0,
			platformYOffset: 0,
			pad: 12,
		});
		pushSpawnable({ id: labState.nextSpawnId++, type: 'crate', x: at.x, y: at.y, w, h });
		pushLog('spawned crate');
	}

	function spawnBouncePad() {
		const w = 70;
		const h = 14;
		const at = findSpawnPosition({
			w,
			h,
			allowPlatform: true,
			platformBias: 0.22,
			groundYOffset: 0,
			platformYOffset: 0,
			pad: 18,
		});
		pushSpawnable({ id: labState.nextSpawnId++, type: 'bounce', x: at.x, y: at.y, w, h, bounce: 1.45 });
		pushLog('spawned bouncy pad');
	}

	function spawnWindZone() {
		const w = 120;
		const h = 120;
		const at = findSpawnPosition({
			w,
			h,
			allowPlatform: true,
			platformBias: 0.7,
			groundYOffset: -18,
			platformYOffset: -22,
			pad: 20,
		});
		const dir = Math.random() > 0.5 ? 1 : -1;
		pushSpawnable({ id: labState.nextSpawnId++, type: 'wind', x: at.x, y: at.y, w, h, force: dir * 640 });
		pushLog(`spawned wind zone (${dir > 0 ? 'right' : 'left'})`);
	}

	function drawSpawnables(now) {
		spawnLayer.clear();
		for (const item of labState.spawnables) {
			if (item.type === 'crate') {
				spawnLayer.beginFill(0x8b6b46, 0.96);
				spawnLayer.lineStyle(1, 0xd1ab7f, 0.7);
				spawnLayer.drawRoundedRect(item.x, item.y, item.w, item.h, 4);
				spawnLayer.endFill();
				spawnLayer.lineStyle(1, 0xdeb587, 0.55);
				spawnLayer.moveTo(item.x + 6, item.y + 8);
				spawnLayer.lineTo(item.x + item.w - 6, item.y + item.h - 8);
				spawnLayer.moveTo(item.x + item.w - 6, item.y + 8);
				spawnLayer.lineTo(item.x + 6, item.y + item.h - 8);
			} else if (item.type === 'bounce') {
				const pulse = 0.75 + 0.25 * Math.sin(now * 6.2 + item.id);
				spawnLayer.beginFill(0x19394f, 0.95);
				spawnLayer.lineStyle(2, accentColor, 0.55 + pulse * 0.35);
				spawnLayer.drawRoundedRect(item.x, item.y, item.w, item.h, 5);
				spawnLayer.endFill();
				spawnLayer.lineStyle(1, 0xe6fffa, 0.4 + pulse * 0.35);
				spawnLayer.moveTo(item.x + 8, item.y + item.h * 0.55);
				spawnLayer.lineTo(item.x + item.w - 8, item.y + item.h * 0.55);
			} else if (item.type === 'wind') {
				const pulse = 0.5 + 0.5 * Math.sin(now * 4.5 + item.id * 0.8);
				spawnLayer.beginFill(0x2a5a78, 0.12 + pulse * 0.12);
				spawnLayer.lineStyle(1, accentColor, 0.25 + pulse * 0.32);
				spawnLayer.drawRoundedRect(item.x, item.y, item.w, item.h, 8);
				spawnLayer.endFill();
				const rows = 4;
				for (let r = 0; r < rows; r++) {
					const y = item.y + 18 + r * ((item.h - 36) / Math.max(1, rows - 1));
					const shift = Math.sin(now * 5 + r) * 6;
					spawnLayer.lineStyle(1.4, 0xbaf9ef, 0.4 + pulse * 0.3);
					if (item.force > 0) {
						spawnLayer.moveTo(item.x + 14 + shift, y);
						spawnLayer.lineTo(item.x + item.w - 16 + shift, y);
					} else {
						spawnLayer.moveTo(item.x + item.w - 14 - shift, y);
						spawnLayer.lineTo(item.x + 16 - shift, y);
					}
				}
			}
		}
	}

	function collectTopSurfaces() {
		const surfaces = [];
		surfaces.push({ x: 0, y: groundY, w: app.renderer.width, h: app.renderer.height - groundY + 20, type: 'ground' });
		for (const platform of labState.platforms) surfaces.push({ ...platform, type: 'platform' });
		for (const item of labState.spawnables) {
			if (item.type === 'crate' || item.type === 'bounce') {
				surfaces.push({ x: item.x, y: item.y, w: item.w, h: item.h, type: item.type, bounce: item.bounce || 1.25 });
			}
		}
		return surfaces;
	}

	function findNearestVinePoint(px, py, maxDist) {
		let best = null;
		let bestSq = maxDist * maxDist;
		for (const v of vines) {
			const pts = v.getPointsView?.();
			if (!pts) continue;
			for (let i = 1; i < pts.count; i++) {
				const dx = pts.x[i] - px;
				const dy = pts.y[i] - py;
				const dSq = dx * dx + dy * dy;
				if (dSq < bestSq) {
					bestSq = dSq;
					best = { vine: v, pointIndex: i };
				}
			}
		}
		return best;
	}

	function applyWind(dt) {
		if (!player) return;
		const half = player.size * 0.5;
		const px = player.view.x;
		const py = player.view.y;
		for (const item of labState.spawnables) {
			if (item.type !== 'wind') continue;
			if (px + half < item.x || px - half > item.x + item.w || py + half < item.y || py - half > item.y + item.h) continue;
			player.vx += item.force * dt;
		}
	}

	function resolvePlayerPlatforms(prevBottom) {
		if (!player) return;
		const half = player.size * 0.5;
		const left = player.view.x - half;
		const right = player.view.x + half;
		const bottom = player.view.y + half;
		const top = player.view.y - half;
		const surfaces = collectTopSurfaces();
		for (const s of surfaces) {
			const overlapX = right > s.x && left < (s.x + s.w);
			const fallingOnto = player.vy >= 0 && prevBottom <= s.y + 3 && bottom >= s.y;
			if (!overlapX || !fallingOnto) continue;
			player.view.y = s.y - half;
			if (s.type === 'bounce') {
				player.vy = -Math.max(280, Math.abs(player.vy) * (s.bounce || 1.3));
				player.grounded = false;
				pushLog('boing');
			} else {
				player.vy = 0;
				player.grounded = true;
			}
			break;
		}
	}

	function updateVines(dt) {
		if (!vines.length) return;
		const lampBoostByIndex = new Array(vines.length).fill(0);
		if (lampMode && player) {
			const ranked = [];
			for (let i = 0; i < vines.length; i++) {
				const p = vines[i]?.getLampPosition?.();
				if (!p) continue;
				const dx = p.x - player.view.x;
				const dy = p.y - player.view.y;
				ranked.push({ i, d2: dx * dx + dy * dy });
			}
			ranked.sort((a, b) => a.d2 - b.d2);
			for (let i = 0; i < Math.min(3, ranked.length); i++) {
				lampBoostByIndex[ranked[i].i] = 1 - i * 0.3;
			}
		}

		for (let i = 0; i < vines.length; i++) {
			const vine = vines[i];
			const boost = lampBoostByIndex[i];
			vine.setColor(mixColors(0x6ba4c5, accentColor, 0.22 + boost * 0.55));
			if (vine?.lamp?.enabled) {
				vine.lamp.color = mixColors(0xbfe2d6, accentColor, 0.3 + boost * 0.5);
				vine.lamp.glowColor = mixColors(0x8acbb8, accentColor, 0.42 + boost * 0.52);
				vine.lamp.glowAlpha = clamp01(0.16 + boost * 0.2);
				vine.lamp.coreAlpha = clamp01(0.78 + boost * 0.2);
			}
			vine.update(time, null, dt);
			const p = vine.getLampPosition();
			const sprite = lampSprites[i];
			if (!sprite || !p) continue;
			const pulse = 0.45 + 0.55 * Math.sin(time * 2.2 + i * 0.7);
			sprite.position.set(p.x, p.y);
			sprite.tint = mixColors(0x88c7b0, accentColor, 0.35 + boost * 0.6);
			sprite.alpha = clamp01(0.1 + pulse * 0.1 + boost * 0.18);
			const baseScale = 160 / (lampTexture.width * 0.5);
			sprite.scale.set(baseScale * (1 + boost * 0.15));
		}
	}

	function updateSwing(dt) {
		if (!player) return;
		if (grabRequested) {
			grabRequested = false;
			if (!vineGrab) {
				const near = findNearestVinePoint(player.view.x, player.view.y, 54);
				if (near) {
					const pts = near.vine.getPointsView?.();
					if (pts) {
						const gx = pts.x[near.pointIndex];
						const gy = pts.y[near.pointIndex];
						const ox = player.view.x - gx;
						const oy = player.view.y - (gy + player.size * 0.55);
						vineGrab = {
							vine: near.vine,
							pointIndex: near.pointIndex,
							ropeLen: Math.max(18, Math.hypot(ox, oy)),
							angle: Math.atan2(ox, oy),
							angVel: 0,
						};
						pushLog('attached to vine');
						player.grounded = false;
						player.vy *= 0.25;
						player.vx *= 0.25;
					}
				}
			} else {
				releaseRequested = true;
			}
		}

		if (releaseRequested) {
			releaseRequested = false;
			if (vineGrab) {
				const v = vineGrab.vine;
				const i = vineGrab.pointIndex;
				const pts = v.getPointsView?.();
				if (pts) {
					const gx = pts.x[i];
					const gy = pts.y[i];
					const L = vineGrab.ropeLen;
					const a = vineGrab.angle;
					const w = vineGrab.angVel;
					player.vx = Math.cos(a) * (w * L);
					player.vy = -Math.sin(a) * (w * L);
					player.view.x = gx + Math.sin(a) * L;
					player.view.y = gy + Math.cos(a) * L + player.size * 0.55;
				}
				vineGrab = null;
				pushLog('released vine');
			}
		}

		if (!vineGrab) {
			const prevBottom = player.view.y + player.size * 0.5;
			player.update(dt);
			applyWind(dt);
			resolvePlayerPlatforms(prevBottom);
			return;
		}

		const pts = vineGrab.vine.getPointsView?.();
		if (!pts) {
			vineGrab = null;
			return;
		}
		vineGrab.pointIndex = Math.max(1, Math.min(pts.count - 1, vineGrab.pointIndex));
		const gx = pts.x[vineGrab.pointIndex];
		const gy = pts.y[vineGrab.pointIndex];
		let input = 0;
		if (player.keys?.has('KeyA') || player.keys?.has('ArrowLeft')) input -= 1;
		if (player.keys?.has('KeyD') || player.keys?.has('ArrowRight')) input += 1;
		const L = vineGrab.ropeLen;
		const a = vineGrab.angle;
		let w = vineGrab.angVel;
		const accel = (-SWING_GRAVITY * Math.sin(a)) + (input * SWING_ACCEL);
		w += accel * dt;
		w *= Math.pow(SWING_DAMP, 60 * dt);
		vineGrab.angle = a + w * dt;
		vineGrab.angVel = w;
		player.view.x = gx + Math.sin(vineGrab.angle) * L;
		player.view.y = gy + Math.cos(vineGrab.angle) * L + player.size * 0.55;
		player.grounded = false;
		player.vx = Math.cos(vineGrab.angle) * (vineGrab.angVel * L);
		player.vy = -Math.sin(vineGrab.angle) * (vineGrab.angVel * L);
	}

	function onKeyDown(event) {
		if (!active) return;
		if (event.code === 'Escape') {
			event.preventDefault();
			onExit();
			return;
		}
		if (event.code === 'Digit1') {
			spawnCrate();
			return;
		}
		if (event.code === 'Digit2') {
			spawnBouncePad();
			return;
		}
		if (event.code === 'Digit3') {
			spawnWindZone();
			return;
		}
		if (event.code === 'KeyE') {
			grabRequested = true;
			return;
		}
		if (event.code === 'Space') {
			releaseRequested = true;
			return;
		}
		if (event.code === 'KeyG') {
			gravityModeIndex = (gravityModeIndex + 1) % gravityModes.length;
			applyGravityMode();
			pushLog(`gravity: ${gravityModes[gravityModeIndex].label}`);
			return;
		}
		if (event.code === 'KeyL') {
			lampMode = !lampMode;
			setControlsText();
			pushLog(`lamp mode: ${lampMode ? 'on' : 'off'}`);
			return;
		}
		if (event.code === 'KeyM') {
			levelIndex = (levelIndex + 1) % 2;
			rebuildLayout();
			pushLog(`loaded mini level ${levelIndex === 0 ? 'A' : 'B'}`);
			return;
		}
	}

	function onKeyUp(event) {
		if (!active) return;
		if (event.code === 'Space') releaseRequested = true;
	}

	function open() {
		if (active) return;
		active = true;
		time = 0;
		layer.visible = true;
		layer.eventMode = 'static';
		clearWorld();
		rebuildLayout();
		buildVines();
		resetPlayer();
		logs.length = 0;
		setControlsText();
		pushLog('vine lab booted');
		pushLog('spawn with 1/2/3');
		window.addEventListener('keydown', onKeyDown);
		window.addEventListener('keyup', onKeyUp);
	}

	function close() {
		if (!active) return;
		active = false;
		window.removeEventListener('keydown', onKeyDown);
		window.removeEventListener('keyup', onKeyUp);
		layer.visible = false;
		layer.eventMode = 'none';
		clearWorld();
	}

	function resize() {
		if (!active) return;
		rebuildLayout();
		if (vinesLayer) {
			vinesLayer.parent?.removeChild(vinesLayer);
			vinesLayer.destroy({ children: true });
		}
		vinesLayer = null;
		vines = [];
		while (lampSprites.length) {
			const sprite = lampSprites.pop();
			sprite?.destroy?.();
		}
		vineLightLayer.removeChildren();
		buildVines();
		if (player) {
			player.onResize();
			player.view.y = groundY - player.size * 0.5;
		}
		setControlsText();
	}

	function update(dt) {
		if (!active) return;
		time += dt;
		drawSpawnables(time);
		updateSwing(dt);
		updateVines(dt);
	}

	return {
		open,
		close,
		resize,
		update,
		isActive: () => active,
	};
}
