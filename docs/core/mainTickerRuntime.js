export function stepMoodReactiveBackgroundFrame(context = {}) {
	const {
		seconds,
		time,
		nowMs,
		dragEnabled,
		moodState,
		moodCurrent,
		MOOD_TRANSITION_SECONDS,
		resolveActiveMood,
		flushPendingMoodSources,
		updateTargetReactiveBackgroundMode,
		portfolioEntryTransition,
		targetReactiveBackgroundRuntime,
		FLOW_BASE,
		mixColors,
		clamp01,
		backgroundSceneQuality,
		flowAmbienceFrameCounter,
		setFlowAmbience,
		crtScanlinesUniforms,
	} = context;

	const tickNow = nowMs();
	if (!dragEnabled && !moodState.moodHoverEnabled && moodState.moodHoverResumeAtMs > 0 && tickNow >= moodState.moodHoverResumeAtMs) {
		moodState.moodHoverEnabled = true;
		moodState.moodHoverResumeAtMs = 0;
		moodState.moodLockTarget = null;
		resolveActiveMood();
	}
	flushPendingMoodSources(tickNow);
	const moodLerp = 1 - Math.exp(-seconds / MOOD_TRANSITION_SECONDS);
	moodCurrent.waveTint = mixColors(moodCurrent.waveTint, moodState.moodTarget.waveTint, moodLerp);
	moodCurrent.lampTint = mixColors(moodCurrent.lampTint, moodState.moodTarget.lampTint, moodLerp);
	moodCurrent.particleColor = mixColors(moodCurrent.particleColor, moodState.moodTarget.particleColor, moodLerp);
	moodCurrent.waveMix += (moodState.moodTarget.waveMix - moodCurrent.waveMix) * moodLerp;
	moodCurrent.glowStrength += (moodState.moodTarget.glowStrength - moodCurrent.glowStrength) * moodLerp;
	moodCurrent.contrast += (moodState.moodTarget.contrast - moodCurrent.contrast) * moodLerp;
	moodCurrent.vignette += (moodState.moodTarget.vignette - moodCurrent.vignette) * moodLerp;
	moodCurrent.waveMotion += (moodState.moodTarget.waveMotion - moodCurrent.waveMotion) * moodLerp;
	moodCurrent.lampBoost += (moodState.moodTarget.lampBoost - moodCurrent.lampBoost) * moodLerp;

	updateTargetReactiveBackgroundMode(seconds);
	const transitionSurge = portfolioEntryTransition.surge;
	const targetMixRaw = clamp01(targetReactiveBackgroundRuntime.getMix());
	const targetMix = targetMixRaw * targetMixRaw * (3 - 2 * targetMixRaw);
	const targetPulse = (Math.sin(time * 4.3) * 0.5 + 0.5) * targetMix;
	const targetEnergy = clamp01(targetReactiveBackgroundRuntime.getFlowEnergy());
	const targetLiquidLineColor = mixColors(0x42b8ff, 0x89ffe3, clamp01(0.25 + targetEnergy * 0.65));
	const targetLiquidGlowColor = mixColors(0x6ad8ff, 0xa5fff0, clamp01(0.3 + targetEnergy * 0.62));
	const targetLiquidMistB = mixColors(0x10293f, 0x114156, clamp01(0.38 + targetEnergy * 0.42));
	const targetLiquidMistC = mixColors(0x163045, 0x255d74, clamp01(0.3 + targetEnergy * 0.44));
	const blendedLineColor = mixColors(FLOW_BASE.lineColor, moodCurrent.waveTint, clamp01(moodCurrent.waveMix));
	const blendedGlowColor = mixColors(FLOW_BASE.glowColor, moodCurrent.waveTint, clamp01(moodCurrent.waveMix + 0.1));
	const blendedMistB = mixColors(FLOW_BASE.mistColorB, moodCurrent.waveTint, clamp01(moodCurrent.waveMix * 0.38));
	const blendedMistC = mixColors(FLOW_BASE.mistColorC, moodCurrent.particleColor, 0.5);
	const surgedLineColor = mixColors(blendedLineColor, 0xff5fa8, transitionSurge * 0.24);
	const surgedGlowColor = mixColors(blendedGlowColor, 0xff7fa8, transitionSurge * 0.3);
	const targetLineColor = mixColors(surgedLineColor, targetLiquidLineColor, targetMix * (0.56 + targetPulse * 0.18));
	const targetGlowColor = mixColors(surgedGlowColor, targetLiquidGlowColor, targetMix * (0.6 + targetPulse * 0.22));
	const targetMistB = mixColors(blendedMistB, targetLiquidMistB, targetMix * 0.5);
	const targetMistC = mixColors(blendedMistC, targetLiquidMistC, targetMix * 0.56);
	const targetBoost = targetMix * (0.2 + targetEnergy * 0.72 + targetPulse * 0.18);
	let nextFlowAmbienceFrameCounter = (flowAmbienceFrameCounter + 1) % Math.max(1, backgroundSceneQuality.ambienceUpdateStep);
	if (nextFlowAmbienceFrameCounter === 0) {
		setFlowAmbience?.({
			lineColor: targetLineColor,
			glowColor: targetGlowColor,
			mistColorA: FLOW_BASE.mistColorA,
			mistColorB: targetMistB,
			mistColorC: targetMistC,
			sparkStrength: FLOW_BASE.sparkStrength
				+ moodCurrent.glowStrength * 0.1
				+ transitionSurge * 0.08
				+ targetBoost * 0.11,
			glowStrength: FLOW_BASE.glowStrength
				+ moodCurrent.glowStrength * 0.32
				+ transitionSurge * 0.42
				+ targetBoost * 0.58,
			speed: FLOW_BASE.speed * (1
				+ (moodCurrent.waveMotion - 1) * 0.9
				+ transitionSurge * 0.25
				+ targetMix * 0.22
				+ targetEnergy * 0.11),
			density: FLOW_BASE.density * (1
				+ (moodCurrent.waveMotion - 1) * 0.45
				+ transitionSurge * 0.14
				+ targetMix * 0.14
				+ targetEnergy * 0.07),
			glowAlpha: clamp01(FLOW_BASE.glowAlpha
				+ moodCurrent.glowStrength * 0.16
				+ transitionSurge * 0.2
				+ targetBoost * 0.22),
		});
	}
	crtScanlinesUniforms.u_strength = (0.42 + moodCurrent.contrast * 0.45) * backgroundSceneQuality.scanlineStrengthScale;
	crtScanlinesUniforms.u_noise = (0.03 + moodCurrent.glowStrength * 0.01) * backgroundSceneQuality.scanlineNoiseScale;
	window.moodCurrent = {
		key: moodState.activeMoodEntry?.key || 'default',
		locked: Boolean(moodState.moodLockTarget),
		targetBackgroundMode: targetReactiveBackgroundRuntime.getMode(),
		targetBackgroundMix: targetMixRaw,
		...moodCurrent,
	};

	return {
		flowAmbienceFrameCounter: nextFlowAmbienceFrameCounter,
	};
}

export function stepLauncherArcadeFrame(context = {}) {
	const {
		dt,
		seconds,
		time,
		app,
		mouse,
		dragEnabled,
		iconIntroProgress,
		ringSpin,
		ringSpinVel,
		ringSpinInput,
		RING_MAX_SPIN_VEL,
		clamp01,
		startSfxLoopSafe,
		updateSfxLoopSafe,
		stopSfxLoopSafe,
		ICON_SFX,
		RING_SPIN_LOOP_KEY,
		layoutSnap = true,
		appLauncher,
		layoutBlogIcon,
		layoutLinkedinIcon,
		layoutReflexIcon,
		layoutWalklatroIcon,
		getCoreScreenPos,
		getCoreControlRadius,
		coreHoverAmount,
		drawSystemCore,
		backgroundSceneQuality,
		ambientDebrisFrameCounter,
		ambientDebris,
		cameraParallax,
		CAMERA_SMOOTHING,
		cameraOffset,
		updateFlowBackground,
		SCENE_SCALE,
		scene,
		cursorContainer,
		lastMouseWorld,
		iconSfxMonitor,
		tennisMode,
		basketballMode,
		targetBackgroundInfluencerCount,
		arcadeLayer,
		arcadePopupUi,
		stopArcadeCountdown,
		arcadeTargetsRuntime,
		arcadeSweepUi,
		tennisState,
		stopTennisMode,
		updateTennisMode,
		getArcadeDividerScreenY,
		arcadeFeedback,
		updateArcadeScoreLabel,
		triggerArcadePopup,
		spawnTargetBackgroundRipple,
		playSfxSafe,
		updateArcadeCountdown,
		arcadeCountdownUi,
		arcadeOverlayUi,
		arcadeState,
		renderTargetReactiveBackground,
	} = context;

	let nextIconIntroProgress = iconIntroProgress;
	let nextRingSpin = ringSpin;
	let nextRingSpinVel = ringSpinVel;
	let nextCoreHoverAmount = coreHoverAmount;
	let nextAmbientDebrisFrameCounter = ambientDebrisFrameCounter;
	let nextLastMouseWorld = lastMouseWorld;
	let nextTargetBackgroundInfluencerCount = targetBackgroundInfluencerCount;
	let launcherUpdateFailed = false;
	if (!Number.isFinite(nextIconIntroProgress)) nextIconIntroProgress = 1;

	const introSpeed = 1.25;
	if (nextIconIntroProgress < 1) {
		nextIconIntroProgress = Math.min(1, nextIconIntroProgress + seconds * introSpeed);
	}

	const ringDragActive = Boolean(ringSpinInput?.isDragging?.());
	if (!ringDragActive) {
		nextRingSpin += nextRingSpinVel * seconds;
		nextRingSpinVel *= Math.pow(0.982, dt);
		if (!Number.isFinite(nextRingSpinVel)) nextRingSpinVel = 0;
		if (!Number.isFinite(nextRingSpin)) nextRingSpin = 0;
		if (Math.abs(nextRingSpinVel) < 0.001) nextRingSpinVel = 0;
	}

	if (!app?.renderer || !Number.isFinite(app.renderer.width) || !Number.isFinite(app.renderer.height)) {
		return {
			iconIntroProgress: nextIconIntroProgress,
			ringSpin: nextRingSpin,
			ringSpinVel: nextRingSpinVel,
			coreHoverAmount: nextCoreHoverAmount,
			ambientDebrisFrameCounter: nextAmbientDebrisFrameCounter,
			lastMouseWorld: nextLastMouseWorld,
			targetBackgroundInfluencerCount: nextTargetBackgroundInfluencerCount,
			mouseWorld: nextLastMouseWorld || { x: 0, y: 0, down: false },
		};
	}

	const spinLoopMix = !dragEnabled
		? Math.max(ringDragActive ? 0.35 : 0, clamp01(Math.abs(nextRingSpinVel) / Math.max(0.001, RING_MAX_SPIN_VEL)))
		: 0;
	if (spinLoopMix > 0.06) {
		startSfxLoopSafe(ICON_SFX.spin, RING_SPIN_LOOP_KEY, {
			volume: 0.05 + spinLoopMix * 0.26,
			rate: 0.88 + spinLoopMix * 0.36,
			fadeIn: 0.04,
		});
		updateSfxLoopSafe(RING_SPIN_LOOP_KEY, {
			volume: 0.05 + spinLoopMix * 0.26,
			rate: 0.88 + spinLoopMix * 0.36,
		});
	} else {
		stopSfxLoopSafe(RING_SPIN_LOOP_KEY, { fadeOut: 0.12 });
	}

	if (appLauncher?.container) {
		appLauncher.container.visible = true;
		appLauncher.container.alpha = 1;
		if (!Number.isFinite(appLauncher.container.zIndex) || appLauncher.container.zIndex < 120) {
			appLauncher.container.zIndex = 120;
		}
	}

	if (!dragEnabled) {
		appLauncher.layout(layoutSnap);
		layoutBlogIcon(layoutSnap);
		layoutLinkedinIcon(layoutSnap);
		layoutReflexIcon(layoutSnap);
		layoutWalklatroIcon(layoutSnap);
	}

	const coreScreen = getCoreScreenPos();
	const coreDist = Math.hypot(mouse.x - coreScreen.x, mouse.y - coreScreen.y);
	const hoverTarget = (!dragEnabled && coreDist <= getCoreControlRadius()) || ringDragActive ? 1 : 0;
	nextCoreHoverAmount += (hoverTarget - nextCoreHoverAmount) * Math.min(1, seconds * 12);
	drawSystemCore(time);

	const mx = (mouse.x / app.renderer.width) * 2 - 1;
	const my = (mouse.y / app.renderer.height) * 2 - 1;
	nextAmbientDebrisFrameCounter = (nextAmbientDebrisFrameCounter + 1) % Math.max(1, backgroundSceneQuality.ambientDebrisUpdateStep);
	if (nextAmbientDebrisFrameCounter === 0) {
		for (const debris of ambientDebris) {
			if (!debris?.panel || !debris.panel.visible) continue;
			if (!Number.isFinite(debris.baseX) || !Number.isFinite(debris.baseY)) continue;
			debris.panel.position.x = debris.baseX + Math.sin(time * 0.34 + debris.phase) * debris.driftX - mx * debris.parallax;
			debris.panel.position.y = debris.baseY + Math.cos(time * 0.29 + debris.phase * 1.2) * debris.driftY - my * (debris.parallax * 0.7);
			debris.panel.rotation = Math.sin(time * 0.18 + debris.phase) * debris.spin;
			debris.panel.alpha = debris.alphaBase + 0.1 * Math.sin(time * 0.42 + debris.phase);
		}
	}

	scene.alpha = 1;
	const nx = (mouse.x / app.renderer.width) * 2 - 1;
	const ny = (mouse.y / app.renderer.height) * 2 - 1;
	const targetX = -nx * cameraParallax;
	const targetY = -ny * cameraParallax;
	cameraOffset.x += (targetX - cameraOffset.x) * CAMERA_SMOOTHING;
	cameraOffset.y += (targetY - cameraOffset.y) * CAMERA_SMOOTHING;
	updateFlowBackground(time, cameraOffset);

	const cx = app.renderer.width / 2;
	const cy = app.renderer.height / 2;
	const screenX = Math.max(0, Math.min(app.renderer.width, mouse.x));
	const screenY = Math.max(0, Math.min(app.renderer.height, mouse.y));
	const mouseWorldX = (screenX - cx - cameraOffset.x) / SCENE_SCALE + cx;
	const mouseWorldY = (screenY - cy - cameraOffset.y) / SCENE_SCALE + cy;
	cursorContainer.position.set(screenX, screenY);
	scene.position.set(
		app.renderer.width / 2 + cameraOffset.x,
		app.renderer.height / 2 + cameraOffset.y,
	);
	const mouseWorld = { x: mouseWorldX, y: mouseWorldY, down: mouse.down };
	nextLastMouseWorld = mouseWorld;
	try {
		appLauncher.update(time, seconds, mouseWorld);
	} catch (error) {
		launcherUpdateFailed = true;
		console.error('[launcher-runtime] app launcher update failed', error);
	}
	try {
		iconSfxMonitor.update();
	} catch (error) {
		console.error('[launcher-runtime] icon sfx monitor update failed', error);
	}

	if (tennisMode && dragEnabled) {
		nextTargetBackgroundInfluencerCount = 0;
		arcadeLayer.visible = false;
		arcadePopupUi.reset();
		stopArcadeCountdown();
		arcadeTargetsRuntime?.clearVisuals?.();
		arcadeSweepUi.reset();
		updateTennisMode(seconds, time);
	} else if (basketballMode && dragEnabled) {
		nextTargetBackgroundInfluencerCount = 0;
		arcadeLayer.visible = true;
		arcadeSweepUi.setEnabled(true);
		const toWorldFromScreen = (sx, sy) => ({
			x: (sx - cx - cameraOffset.x) / SCENE_SCALE + cx,
			y: (sy - cy - cameraOffset.y) / SCENE_SCALE + cy,
		});
		const toWorldSizeWithCamera = (size) => size / SCENE_SCALE;
		const dividerY = getArcadeDividerScreenY();
		const cursorIsAbove = mouse.y <= dividerY;
		if (!arcadeFeedback.cursorWasBlocked && cursorIsAbove) {
			arcadeTargetsRuntime?.resetCombo?.(updateArcadeScoreLabel);
			updateArcadeScoreLabel();
			triggerArcadePopup('TOP SIDE BLOCKED', 1.02, 0xff5f88);
		} else if (arcadeFeedback.cursorWasBlocked && !cursorIsAbove) {
			triggerArcadePopup('BOTTOM SIDE ACTIVE', 0.92, 0x8fffb9);
		}
		arcadeFeedback.cursorWasBlocked = cursorIsAbove;
		arcadeFeedback.noGoVoided = cursorIsAbove;

		arcadeSweepUi.render({
			appWidth: app.renderer.width,
			mouseX: mouse.x,
			mouseY: mouse.y,
			dividerY,
			seconds,
			time,
			toWorldFromScreen,
			toWorldSizeWithCamera,
		});
		updateArcadeCountdown(seconds);
		arcadeCountdownUi.render({
			appWidth: app.renderer.width,
			appHeight: app.renderer.height,
			toWorldFromScreen,
		});

		const countdownActive = arcadeCountdownUi.isActive();
		const arcadeFrame = arcadeTargetsRuntime?.updateAndRender?.({
			seconds,
			time,
			appWidth: app.renderer.width,
			appHeight: app.renderer.height,
			toWorldFromScreen,
			toWorldSizeWithCamera,
			allBodies: context.getAllIconBodies(),
			countdownActive,
			noGoBlocked: arcadeFeedback.noGoVoided,
			playSfxSafe,
			ICON_SFX,
			triggerArcadePopup,
			spawnTargetBackgroundRipple,
			onScoreChange: updateArcadeScoreLabel,
		});
		nextTargetBackgroundInfluencerCount = arcadeFrame?.influencerCount ?? 0;
		const arcadeCombo = arcadeFrame?.combo ?? 0;
		const overlayState = arcadeOverlayUi.render({
			appWidth: app.renderer.width,
			appHeight: app.renderer.height,
			mouseY: mouse.y,
			noGoVoided: arcadeFeedback.noGoVoided,
			countdownActive,
			combo: arcadeCombo,
			time,
			toWorldFromScreen,
			toWorldSizeWithCamera,
		});
		arcadeState.dividerWorldX = overlayState.dividerWorldX;
		arcadeState.dividerWorldY = overlayState.dividerWorldY;

		arcadePopupUi.updateAndRender({
			seconds,
			time,
			combo: arcadeCombo,
			appWidth: app.renderer.width,
			appHeight: app.renderer.height,
			toWorldFromScreen,
			toWorldSizeWithCamera,
		});
	} else {
		nextTargetBackgroundInfluencerCount = 0;
		stopArcadeCountdown();
		arcadeLayer.visible = false;
		arcadePopupUi.reset();
		arcadeTargetsRuntime?.clearVisuals?.();
		arcadeSweepUi.reset();
		if (tennisState.active) {
			stopTennisMode({ restoreIcons: false });
		}
	}

	renderTargetReactiveBackground(seconds);

	return {
		iconIntroProgress: nextIconIntroProgress,
		ringSpin: nextRingSpin,
		ringSpinVel: nextRingSpinVel,
		coreHoverAmount: nextCoreHoverAmount,
		ambientDebrisFrameCounter: nextAmbientDebrisFrameCounter,
		lastMouseWorld: nextLastMouseWorld,
		targetBackgroundInfluencerCount: nextTargetBackgroundInfluencerCount,
		launcherUpdateFailed,
		mouseWorld,
	};
}
