export function createArcadeTargetsRuntime(options = {}) {
	const {
		arcadeTargetLayer,
		arcadeShardLayer,
		targetBackgroundInfluencers,
		getArcadeDividerScreenY,
		SCENE_SCALE,
	} = options;
	if (!arcadeTargetLayer) throw new Error('createArcadeTargetsRuntime requires arcadeTargetLayer');
	if (!arcadeShardLayer) throw new Error('createArcadeTargetsRuntime requires arcadeShardLayer');
	if (!Array.isArray(targetBackgroundInfluencers)) throw new Error('createArcadeTargetsRuntime requires targetBackgroundInfluencers');
	if (typeof getArcadeDividerScreenY !== 'function') throw new Error('createArcadeTargetsRuntime requires getArcadeDividerScreenY');
	if (!Number.isFinite(SCENE_SCALE) || SCENE_SCALE <= 0) throw new Error('createArcadeTargetsRuntime requires SCENE_SCALE');

	const arcadeTargetTypes = [
		{ points: 1, radiusPx: 33, ringColor: 0xff86bb, coreColor: 0x2a1223, shardColor: 0xffa6d0, respawnMin: 0.65, respawnMax: 1.25 },
		{ points: 3, radiusPx: 24, ringColor: 0x68ffd9, coreColor: 0x0f2a22, shardColor: 0x90ffe7, respawnMin: 0.85, respawnMax: 1.55 },
		{ points: 5, radiusPx: 15, ringColor: 0xffd56b, coreColor: 0x312206, shardColor: 0xffe7a7, respawnMin: 1.2, respawnMax: 2.1 },
	];
	const arcadeMaxTargetRadiusPx = Math.max(...arcadeTargetTypes.map((targetType) => targetType.radiusPx));
	const arcadeTargets = [];
	const arcadeShards = [];
	const iconScoreState = new Map();
	let arcadeTargetSeed = 0;
	let basketballScore = 0;
	let combo = 0;
	let lastScoreTime = -999;

	const arcadeRand = (min, max) => min + Math.random() * (max - min);
	const getArcadeTargetTypeIndex = () => {
		const roll = Math.random();
		if (roll < 0.54) return 0;
		if (roll < 0.86) return 1;
		return 2;
	};

	const emitScoreChange = (onScoreChange) => {
		onScoreChange?.({ score: basketballScore, combo });
	};

	const respawnArcadeTarget = (target, appWidth, appHeight, forceTypeIndex = null) => {
		target.typeIndex = Number.isInteger(forceTypeIndex) ? forceTypeIndex : getArcadeTargetTypeIndex();
		const dividerY = getArcadeDividerScreenY();
		const spawnMinY = Math.max(20, appHeight * 0.06);
		const spawnMaxY = Math.max(spawnMinY + 6, dividerY - (arcadeMaxTargetRadiusPx + 12));
		target.screenX = arcadeRand(appWidth * 0.08, appWidth * 0.92);
		target.screenY = arcadeRand(spawnMinY, spawnMaxY);
		target.phase = Math.random() * Math.PI * 2;
		target.phaseVel = arcadeRand(1.3, 2.6);
		target.drawScreenX = target.screenX;
		target.drawScreenY = target.screenY;
		target.alive = true;
		target.respawnTimer = 0;
	};

	const seedArcadeTargets = (appWidth, appHeight) => {
		arcadeTargets.length = 0;
		const seedTypes = [0, 0, 1, 1, 2];
		for (let i = 0; i < seedTypes.length; i++) {
			const target = { id: ++arcadeTargetSeed, typeIndex: 0, screenX: 0, screenY: 0, phase: 0, phaseVel: 0, drawScreenX: 0, drawScreenY: 0, alive: true, respawnTimer: 0 };
			respawnArcadeTarget(target, appWidth, appHeight, seedTypes[i]);
			arcadeTargets.push(target);
		}
	};

	const spawnArcadeShards = (screenX, screenY, tint, radiusPx) => {
		const shardCount = 8 + Math.floor(Math.random() * 7);
		for (let i = 0; i < shardCount; i++) {
			const angle = arcadeRand(-Math.PI, Math.PI);
			const speed = arcadeRand(140, 360) + radiusPx * 2.6;
			arcadeShards.push({
				x: screenX,
				y: screenY,
				vx: Math.cos(angle) * speed,
				vy: Math.sin(angle) * speed - arcadeRand(40, 130),
				size: arcadeRand(3.2, 7.2),
				rot: Math.random() * Math.PI * 2,
				rotV: arcadeRand(-8.5, 8.5),
				life: arcadeRand(0.4, 0.95),
				age: 0,
				bounces: 0,
				tint,
			});
		}
	};

	const resetRound = ({ appWidth, appHeight, onScoreChange } = {}) => {
		basketballScore = 0;
		combo = 0;
		lastScoreTime = -999;
		iconScoreState.clear();
		arcadeShards.length = 0;
		if (Number.isFinite(appWidth) && Number.isFinite(appHeight)) {
			seedArcadeTargets(appWidth, appHeight);
		}
		emitScoreChange(onScoreChange);
	};

	const resetCombo = (onScoreChange) => {
		if (combo === 0) return;
		combo = 0;
		emitScoreChange(onScoreChange);
	};

	const clearVisuals = ({ clearShards = true } = {}) => {
		arcadeTargetLayer.clear();
		arcadeShardLayer.clear();
		if (clearShards) arcadeShards.length = 0;
	};

	const updateAndRender = ({
		seconds,
		time,
		appWidth,
		appHeight,
		toWorldFromScreen,
		toWorldSizeWithCamera,
		allBodies,
		countdownActive,
		noGoBlocked,
		playSfxSafe,
		ICON_SFX,
		triggerArcadePopup,
		spawnTargetBackgroundRipple,
		onScoreChange,
	}) => {
		let influencerCount = 0;
		arcadeTargetLayer.clear();
		for (const target of arcadeTargets) {
			const type = arcadeTargetTypes[target.typeIndex] ?? arcadeTargetTypes[0];
			if (!target.alive) {
				target.respawnTimer -= seconds;
				if (target.respawnTimer <= 0) {
					respawnArcadeTarget(target, appWidth, appHeight);
				}
				continue;
			}
			target.phase += seconds * target.phaseVel;
			const wobbleX = Math.cos(target.phase * 0.64 + target.id) * type.radiusPx * 0.13;
			const wobbleY = Math.sin(target.phase) * type.radiusPx * 0.16;
			target.drawScreenX = target.screenX + wobbleX;
			target.drawScreenY = target.screenY + wobbleY;
			const center = toWorldFromScreen(target.drawScreenX, target.drawScreenY);
			const radius = toWorldSizeWithCamera(type.radiusPx);
			arcadeTargetLayer.beginFill(type.coreColor, 0.9);
			arcadeTargetLayer.drawCircle(center.x, center.y, radius);
			arcadeTargetLayer.endFill();
			arcadeTargetLayer.lineStyle(toWorldSizeWithCamera(2.6), type.ringColor, 0.95);
			arcadeTargetLayer.drawCircle(center.x, center.y, radius * 0.98);
			arcadeTargetLayer.lineStyle(toWorldSizeWithCamera(2.1), 0xffffff, 0.58);
			arcadeTargetLayer.drawCircle(center.x, center.y, radius * 0.63);
			arcadeTargetLayer.lineStyle(toWorldSizeWithCamera(1.65), type.ringColor, 0.84);
			arcadeTargetLayer.drawCircle(center.x, center.y, radius * 0.34);
			if (influencerCount < targetBackgroundInfluencers.length) {
				const influencer = targetBackgroundInfluencers[influencerCount];
				influencer.screenX = target.drawScreenX;
				influencer.screenY = target.drawScreenY;
				influencer.strength = Math.max(0.2, Math.min(1, type.points / 5));
				influencer.tint = type.ringColor;
				influencerCount += 1;
			}
		}

		for (const body of allBodies) {
			const key = body.container;
			let st = iconScoreState.get(key);
			if (!st) {
				st = { cooldown: 0 };
				iconScoreState.set(key, st);
			}
			st.cooldown = Math.max(0, st.cooldown - seconds);

			const c = body.container;
			const bodyState = body.state;
			if (!c || !bodyState) continue;

			if (countdownActive || noGoBlocked || st.cooldown > 0) continue;
			const bodyRadius = (bodyState.radiusScaled ?? bodyState.radius ?? (24 / SCENE_SCALE)) * (c.scale?.x || 1);
			const speed = Math.hypot(bodyState.vx ?? 0, bodyState.vy ?? 0);
			if (speed < 56 / SCENE_SCALE) continue;

			for (const target of arcadeTargets) {
				if (!target.alive) continue;
				const type = arcadeTargetTypes[target.typeIndex] ?? arcadeTargetTypes[0];
				const targetPos = toWorldFromScreen(target.drawScreenX, target.drawScreenY);
				const targetRadius = toWorldSizeWithCamera(type.radiusPx * 0.82);
				const dx = c.position.x - targetPos.x;
				const dy = c.position.y - targetPos.y;
				if (dx * dx + dy * dy > (bodyRadius + targetRadius) * (bodyRadius + targetRadius)) continue;

				basketballScore += type.points;
				playSfxSafe(ICON_SFX.breakTarget, {
					volume: 0.62 + Math.random() * 0.16,
					rate: 0.96 + Math.random() * 0.09,
				});
				if (type.points >= 5) {
					playSfxSafe(ICON_SFX.breakTarget, {
						volume: 0.24,
						rate: 1.5 + Math.random() * 0.08,
						offset: 0.012,
					});
				}
				const chainWindow = 2.2;
				if (time - lastScoreTime <= chainWindow) combo += 1;
				else combo = 1;
				lastScoreTime = time;
				emitScoreChange(onScoreChange);
				const phrase = type.points >= 5
					? 'Bullseye!'
					: (combo <= 1
						? 'Nice throw!'
						: (combo === 2 ? 'Great toss!' : (combo === 3 ? 'Long throw!' : 'Heat check!')));
				const popupMsg = combo > 1
					? `${phrase}  x${combo}`
					: `${phrase} +${type.points}`;
				const popupScale = 1.0 + Math.min(0.7, combo * 0.1);
				triggerArcadePopup(popupMsg, popupScale);
				spawnTargetBackgroundRipple(
					target.drawScreenX,
					target.drawScreenY,
					Math.min(1, 0.4 + type.points * 0.12 + combo * 0.04),
					type.ringColor,
				);
				spawnArcadeShards(target.drawScreenX, target.drawScreenY, type.shardColor, type.radiusPx);
				target.alive = false;
				target.respawnTimer = arcadeRand(type.respawnMin, type.respawnMax);
				st.cooldown = 0.28;
				break;
			}
		}

		arcadeShardLayer.clear();
		const shardFloorY = appHeight - 16;
		for (let i = arcadeShards.length - 1; i >= 0; i--) {
			const shard = arcadeShards[i];
			shard.age += seconds;
			if (shard.age >= shard.life) {
				arcadeShards.splice(i, 1);
				continue;
			}
			shard.vy += 1180 * seconds;
			shard.x += shard.vx * seconds;
			shard.y += shard.vy * seconds;
			shard.rot += shard.rotV * seconds;
			if (shard.y >= shardFloorY && shard.bounces < 1) {
				shard.y = shardFloorY;
				shard.vy *= -0.36;
				shard.vx *= 0.82;
				shard.bounces += 1;
			}
			if (shard.y > appHeight + 80) {
				arcadeShards.splice(i, 1);
				continue;
			}
			const lifeT = 1 - shard.age / shard.life;
			const alpha = Math.max(0, Math.min(1, lifeT * 0.94));
			if (alpha <= 0.01) continue;
			const p = toWorldFromScreen(shard.x, shard.y);
			const halfW = toWorldSizeWithCamera(shard.size * (0.46 + lifeT * 0.35));
			const halfH = toWorldSizeWithCamera(shard.size * (0.25 + lifeT * 0.22));
			const cR = Math.cos(shard.rot);
			const sR = Math.sin(shard.rot);
			const ax = p.x + (-halfW) * cR - (-halfH) * sR;
			const ay = p.y + (-halfW) * sR + (-halfH) * cR;
			const bx = p.x + halfW * cR - 0 * sR;
			const by = p.y + halfW * sR + 0 * cR;
			const cx = p.x + (-halfW) * cR - halfH * sR;
			const cy = p.y + (-halfW) * sR + halfH * cR;
			arcadeShardLayer.beginFill(shard.tint, alpha);
			arcadeShardLayer.drawPolygon([ax, ay, bx, by, cx, cy]);
			arcadeShardLayer.endFill();
		}

		if (combo > 0 && time - lastScoreTime > 2.5) {
			combo = 0;
			emitScoreChange(onScoreChange);
		}

		return {
			influencerCount,
			combo,
			score: basketballScore,
		};
	};

	return {
		resetRound,
		resetCombo,
		clearVisuals,
		updateAndRender,
		getScore: () => basketballScore,
		getCombo: () => combo,
	};
}
