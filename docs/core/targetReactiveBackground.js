export function createTargetReactiveBackgroundRuntime(options = {}) {
	const {
		TARGET_BACKGROUND_MODE,
		targetReactiveFxLayer,
		targetReactiveInfluenceLayer,
		targetReactiveRippleLayer,
		targetBackgroundInfluencers,
		getTargetBackgroundQualityProfile,
		isTargetGameplayBackgroundActive,
		getArcadeCombo,
		clamp01,
		screenToWorldSize,
		toScenePointFromScreen,
	} = options;
	if (!TARGET_BACKGROUND_MODE) throw new Error('createTargetReactiveBackgroundRuntime requires TARGET_BACKGROUND_MODE');
	if (!targetReactiveFxLayer || !targetReactiveInfluenceLayer || !targetReactiveRippleLayer) {
		throw new Error('createTargetReactiveBackgroundRuntime requires all reactive background layers');
	}
	if (!Array.isArray(targetBackgroundInfluencers)) throw new Error('createTargetReactiveBackgroundRuntime requires targetBackgroundInfluencers');
	if (typeof getTargetBackgroundQualityProfile !== 'function') throw new Error('createTargetReactiveBackgroundRuntime requires getTargetBackgroundQualityProfile');
	if (typeof isTargetGameplayBackgroundActive !== 'function') throw new Error('createTargetReactiveBackgroundRuntime requires isTargetGameplayBackgroundActive');
	if (typeof getArcadeCombo !== 'function') throw new Error('createTargetReactiveBackgroundRuntime requires getArcadeCombo');
	if (typeof clamp01 !== 'function') throw new Error('createTargetReactiveBackgroundRuntime requires clamp01');
	if (typeof screenToWorldSize !== 'function') throw new Error('createTargetReactiveBackgroundRuntime requires screenToWorldSize');
	if (typeof toScenePointFromScreen !== 'function') throw new Error('createTargetReactiveBackgroundRuntime requires toScenePointFromScreen');

	const state = {
		mode: TARGET_BACKGROUND_MODE.MENU,
		mix: 0,
		comboEnergy: 0,
		hitImpulse: 0,
		flowEnergy: 0,
		frameCounter: 0,
	};
	const ripples = [];
	const scratchPoint = { x: 0, y: 0 };

	const resetBackground = () => {
		ripples.length = 0;
		targetReactiveInfluenceLayer.clear();
		targetReactiveRippleLayer.clear();
		targetReactiveFxLayer.visible = false;
		state.mode = TARGET_BACKGROUND_MODE.MENU;
		state.mix = 0;
		state.comboEnergy = 0;
		state.hitImpulse = 0;
		state.flowEnergy = 0;
	};

	const clearTransientFx = () => {
		ripples.length = 0;
		targetReactiveInfluenceLayer.clear();
		targetReactiveRippleLayer.clear();
	};

	const updateMode = (dtSeconds) => {
		const dt = Math.max(0, dtSeconds || 0);
		const active = isTargetGameplayBackgroundActive();
		const targetMix = active ? 1 : 0;
		const response = active ? 5.2 : 3.2;
		state.mix += (targetMix - state.mix) * Math.min(1, dt * response);

		const comboTarget = active ? clamp01(getArcadeCombo() / 7) : 0;
		state.comboEnergy += (comboTarget - state.comboEnergy) * Math.min(1, dt * 2.4);
		state.comboEnergy = Math.max(0, state.comboEnergy - dt * (active ? 0.14 : 1.2));
		state.hitImpulse = Math.max(0, state.hitImpulse - dt * (active ? 1.3 : 3.1));
		const flowTarget = clamp01(state.comboEnergy * 0.72 + state.hitImpulse * 0.95);
		state.flowEnergy += (flowTarget - state.flowEnergy) * Math.min(1, dt * (active ? 4.4 : 3.2));

		if (active && state.mix >= 0.985) {
			state.mode = TARGET_BACKGROUND_MODE.TARGET_MINIGAME_UNLOCKED_ACTIVE;
		} else if (state.mix <= 0.015) {
			state.mode = TARGET_BACKGROUND_MODE.MENU;
		} else {
			state.mode = TARGET_BACKGROUND_MODE.TRANSITION_TO_TARGET;
		}
	};

	const spawnRipple = (screenX, screenY, strength = 1, tint = 0x79d8ff) => {
		if (!isTargetGameplayBackgroundActive()) return;
		const profile = getTargetBackgroundQualityProfile();
		if (ripples.length >= profile.maxRipples) {
			ripples.shift();
		}
		const mixStrength = clamp01(strength);
		ripples.push({
			screenX,
			screenY,
			tint,
			age: 0,
			life: 0.54 + mixStrength * 0.32,
			radiusPx: 14 + mixStrength * 18,
			speedPx: profile.rippleSpeedPx * (0.84 + mixStrength * 0.42),
			strokePx: profile.rippleStrokePx * (0.85 + mixStrength * 0.34),
			maxAlpha: 0.22 + mixStrength * 0.34,
		});
		state.hitImpulse = Math.min(1, state.hitImpulse + 0.2 + mixStrength * 0.34);
	};

	const render = (dtSeconds, influencerCount = 0) => {
		const dt = Math.max(0, dtSeconds || 0);
		const profile = getTargetBackgroundQualityProfile();
		state.frameCounter = (state.frameCounter + 1) % Math.max(1, profile.frameStep);
		if (state.frameCounter !== 0) return;

		const mix = clamp01(state.mix);
		if (mix <= 0.001 && ripples.length === 0) {
			targetReactiveFxLayer.visible = false;
			targetReactiveInfluenceLayer.clear();
			targetReactiveRippleLayer.clear();
			return;
		}

		targetReactiveFxLayer.visible = true;
		targetReactiveFxLayer.alpha = clamp01((profile.layerAlpha + state.flowEnergy * 0.18) * Math.max(mix, ripples.length > 0 ? 0.18 : 0));
		targetReactiveInfluenceLayer.clear();
		targetReactiveRippleLayer.clear();

		const influencerLimit = Math.min(influencerCount, profile.maxInfluencers);
		for (let i = 0; i < influencerLimit; i++) {
			const inf = targetBackgroundInfluencers[i];
			const influence = clamp01((0.28 + inf.strength * 0.5 + state.flowEnergy * 0.24) * mix);
			if (influence <= 0.01) continue;
			const targetWorld = toScenePointFromScreen(inf.screenX, inf.screenY, scratchPoint);
			const radius = screenToWorldSize(profile.targetRadiusPx * (0.88 + inf.strength * 0.22));
			targetReactiveInfluenceLayer.beginFill(inf.tint, 0.06 * influence);
			targetReactiveInfluenceLayer.drawCircle(targetWorld.x, targetWorld.y, radius);
			targetReactiveInfluenceLayer.endFill();
			targetReactiveInfluenceLayer.beginFill(0xffffff, 0.022 * influence);
			targetReactiveInfluenceLayer.drawCircle(targetWorld.x, targetWorld.y, radius * 0.54);
			targetReactiveInfluenceLayer.endFill();
		}

		for (let i = ripples.length - 1; i >= 0; i--) {
			const ripple = ripples[i];
			ripple.age += dt;
			if (ripple.age >= ripple.life) {
				ripples.splice(i, 1);
				continue;
			}
			const t = clamp01(ripple.age / Math.max(0.0001, ripple.life));
			const eased = 1 - Math.pow(1 - t, 2);
			const alpha = (1 - t) * ripple.maxAlpha * Math.max(mix, 0.2);
			if (alpha <= 0.003) continue;
			const worldPos = toScenePointFromScreen(ripple.screenX, ripple.screenY, scratchPoint);
			const radius = screenToWorldSize(ripple.radiusPx + ripple.speedPx * eased);
			targetReactiveRippleLayer.lineStyle(screenToWorldSize(ripple.strokePx * (1 - t * 0.45)), ripple.tint, alpha);
			targetReactiveRippleLayer.drawCircle(worldPos.x, worldPos.y, radius);
			targetReactiveRippleLayer.beginFill(ripple.tint, alpha * 0.14);
			targetReactiveRippleLayer.drawCircle(worldPos.x, worldPos.y, radius * 0.72);
			targetReactiveRippleLayer.endFill();
		}
	};

	return {
		resetBackground,
		clearTransientFx,
		updateMode,
		spawnRipple,
		render,
		getMode: () => state.mode,
		getMix: () => state.mix,
		getFlowEnergy: () => state.flowEnergy,
	};
}
