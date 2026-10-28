export function updateLivingRoomAmbientLayer(context, args = {}) {
	const {
		app,
		activeBackgroundQualityMode,
		BACKGROUND_QUALITY_MODE,
		livingRoomAmbientLayer,
		livingRoomAmbientBlobs,
		livingRoomAmbientComputed,
		livingRoomAmbientBlur,
		livingRoomAmbientMetaFilter,
		livingRoomAmbientFilterArea,
		livingRoomAmbientTime,
	} = context;
	const {
		dtSeconds,
		reveal,
		focusMix,
	} = args;

	if (reveal <= 0.01) {
		livingRoomAmbientLayer.visible = false;
		return { livingRoomAmbientTime };
	}
	livingRoomAmbientLayer.visible = true;
	const dt = Math.max(1 / 180, Math.min(0.05, Math.max(0, dtSeconds || 0)));
	let nextAmbientTime = livingRoomAmbientTime + dt;
	const sw = app.renderer.width;
	const sh = app.renderer.height;
	const isReducedQuality = activeBackgroundQualityMode === BACKGROUND_QUALITY_MODE.REDUCED;
	const activeBlobCount = isReducedQuality ? Math.min(4, livingRoomAmbientBlobs.length) : livingRoomAmbientBlobs.length;
	livingRoomAmbientBlur.blur = isReducedQuality ? 5 : 8;
	livingRoomAmbientBlur.quality = 1;
	livingRoomAmbientMetaFilter.uniforms.u_thresholdLow = isReducedQuality ? 0.25 : 0.21;
	livingRoomAmbientMetaFilter.uniforms.u_thresholdHigh = isReducedQuality ? 0.64 : 0.58;
	livingRoomAmbientMetaFilter.uniforms.u_alphaBoost = isReducedQuality ? 1.0 : 1.08;
	livingRoomAmbientMetaFilter.uniforms.u_bodyContrast = isReducedQuality ? 1.09 : 1.14;
	livingRoomAmbientFilterArea.width = sw;
	livingRoomAmbientFilterArea.height = sh;
	const baseScale = Math.max(sw, sh) / 760;
	const readabilityDampen = 1 - focusMix * 0.08;
	livingRoomAmbientLayer.alpha = (0.42 + reveal * 0.22) * readabilityDampen * (isReducedQuality ? 0.9 : 1);
	const driftScale = isReducedQuality ? 0.84 : 1;
	for (let i = 0; i < livingRoomAmbientBlobs.length; i++) {
		const blob = livingRoomAmbientBlobs[i];
		const sprite = blob.sprite;
		const computed = livingRoomAmbientComputed[i];
		if (!sprite) continue;
		if (i >= activeBlobCount) {
			sprite.visible = false;
			continue;
		}
		sprite.visible = true;
		const phase = nextAmbientTime * blob.speed + blob.phase;
		const phaseY = nextAmbientTime * (blob.speed * 0.86) + blob.phase * 1.31;
		const driftX = (Math.sin(phase) * blob.driftX + Math.sin(phase * 0.39 + blob.phase * 0.5) * blob.driftX * 0.42) * driftScale;
		const driftY = (Math.cos(phaseY) * blob.driftY + Math.cos(phaseY * 0.44 + blob.phase * 0.82) * blob.driftY * 0.38) * driftScale;
		computed.baseX = sw * (blob.baseX + driftX);
		computed.baseY = sh * (blob.baseY + driftY);
		computed.phase = phase;
		computed.phaseY = phaseY;
	}
	const mergeDistance = Math.max(sw, sh) * (isReducedQuality ? 0.24 : 0.28);
	const pullStrength = Math.max(sw, sh) * (isReducedQuality ? 0.016 : 0.022);
	const repelStrength = Math.max(sw, sh) * (isReducedQuality ? 0.004 : 0.0055);
	for (let i = 0; i < activeBlobCount; i++) {
		const computed = livingRoomAmbientComputed[i];
		computed.targetX = computed.baseX;
		computed.targetY = computed.baseY;
		let merge = 0;
		for (let j = 0; j < activeBlobCount; j++) {
			if (i === j) continue;
			const other = livingRoomAmbientComputed[j];
			const dx = other.baseX - computed.baseX;
			const dy = other.baseY - computed.baseY;
			const distance = Math.max(0.001, Math.hypot(dx, dy));
			const influence = Math.max(0, 1 - distance / mergeDistance);
			if (influence <= 0) continue;
			const nx = dx / distance;
			const ny = dy / distance;
			const pull = influence * influence * pullStrength;
			computed.targetX += nx * pull;
			computed.targetY += ny * pull;
			const repelInfluence = Math.max(0, 1 - distance / (mergeDistance * 0.36));
			if (repelInfluence > 0) {
				computed.targetX -= nx * repelInfluence * repelStrength;
				computed.targetY -= ny * repelInfluence * repelStrength;
			}
			merge += influence;
		}
		computed.merge = Math.max(0, Math.min(1, merge * (isReducedQuality ? 0.34 : 0.4)));
	}

	const spring = isReducedQuality ? 0.12 : 0.14;
	const damping = isReducedQuality ? 0.84 : 0.82;
	const velocityDenominator = Math.max(sw, sh) * (isReducedQuality ? 0.0072 : 0.0065);
	for (let i = 0; i < activeBlobCount; i++) {
		const blob = livingRoomAmbientBlobs[i];
		const sprite = blob.sprite;
		const computed = livingRoomAmbientComputed[i];
		if (!sprite || !computed) continue;
		if (!computed.initialized) {
			computed.x = computed.targetX;
			computed.y = computed.targetY;
			computed.vx = 0;
			computed.vy = 0;
			computed.initialized = true;
		}
		computed.vx = (computed.vx + (computed.targetX - computed.x) * spring) * damping;
		computed.vy = (computed.vy + (computed.targetY - computed.y) * spring) * damping;
		computed.x += computed.vx;
		computed.y += computed.vy;
		sprite.x = computed.x;
		sprite.y = computed.y;
		const velocity = Math.hypot(computed.vx, computed.vy);
		const velocityMix = Math.max(0, Math.min(1, velocity / Math.max(0.0001, velocityDenominator)));
		const merge = computed.merge;
		const breath = 1 + Math.sin(computed.phase * 0.38 + blob.phase) * 0.1;
		const wobbleX = 1 + Math.sin(computed.phase * 0.9 + merge * 1.8) * blob.squish;
		const wobbleY = 1 + Math.cos(computed.phaseY * 1.03 + merge * 1.2) * blob.squish;
		const mergeScaleX = 1 + merge * 0.24 + velocityMix * 0.1;
		const mergeScaleY = 1 + merge * 0.14 - velocityMix * 0.06;
		const squishMix = Math.max(0.84, Math.min(1.18, 1 + Math.sin(computed.phase * 0.52 + blob.phase) * 0.08));
		sprite.scale.set(
			baseScale * blob.scale * breath * wobbleX * mergeScaleX * squishMix,
			baseScale * blob.scale * breath * wobbleY * mergeScaleY / squishMix,
		);
		sprite.rotation = Math.sin(computed.phase * 0.21 + blob.phase) * 0.08 + Math.atan2(computed.vy, computed.vx) * velocityMix * 0.08;
		const alpha = blob.alpha
			* (0.88 + Math.sin(computed.phase * 0.26 + blob.phase) * 0.12)
			* (0.92 + merge * 0.28);
		sprite.alpha = Math.max(0.2, Math.min(1, alpha));
	}

	return { livingRoomAmbientTime: nextAmbientTime };
}

export function createLivingRoomAmbientController(context, options = {}) {
	let livingRoomAmbientTime = Number.isFinite(options.initialTime)
		? options.initialTime
		: 0;

	return {
		step(args = {}) {
			const activeBackgroundQualityMode = typeof context.getActiveBackgroundQualityMode === 'function'
				? context.getActiveBackgroundQualityMode()
				: context.activeBackgroundQualityMode;
			const result = updateLivingRoomAmbientLayer({
				...context,
				activeBackgroundQualityMode,
				livingRoomAmbientTime,
			}, args);
			livingRoomAmbientTime = result.livingRoomAmbientTime;
			return result;
		},
		getTime() {
			return livingRoomAmbientTime;
		},
		setTime(nextTime) {
			if (!Number.isFinite(nextTime)) return;
			livingRoomAmbientTime = nextTime;
		},
	};
}
