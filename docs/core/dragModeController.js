export function applyDragEnabledMode(context, args = {}) {
	const {
		enabled,
	} = args;
	const {
		dragEnabled,
		basketballMode,
		tennisMode,
		nowMs,
		moodState,
		MOOD_REENABLE_DELAY_MS,
		DRAG_MOOD,
		BASE_MOOD,
		clearMoodSources,
		resolveActiveMood,
		arcadeModeToggles,
		stopTennisMode,
		clearTargetReactiveTransientFx,
		resetTargetReactiveBackground,
		appLauncher,
		blogIconSetDragEnabled,
		linkedinIconSetDragEnabled,
		reflexIconSetDragEnabled,
		walklatroIconSetDragEnabled,
		getCoreWorldPos,
		ringSpinVel,
		blogIconGetBody,
		linkedinIconGetBody,
		reflexIconGetBody,
		walklatroIconGetBody,
		ringSpinInput,
		stopSfxLoopSafe,
		RING_SPIN_LOOP_KEY,
		stopArcadeCountdown,
		resetArcadeRound,
		layoutBlogIcon,
		layoutLinkedinIcon,
		layoutReflexIcon,
		layoutWalklatroIcon,
	} = context;

	const wasTargetGameplayActive = Boolean(dragEnabled && basketballMode);
	const wasTennisActive = Boolean(dragEnabled && tennisMode);
	let nextDragEnabled = Boolean(enabled);
	let nextBasketballMode = basketballMode;
	let nextRingSpinVel = ringSpinVel;
	let nextRingSpin = context.ringSpin;

	if (nextDragEnabled) {
		moodState.moodHoverEnabled = false;
		moodState.moodHoverResumeAtMs = 0;
		clearMoodSources();
		moodState.moodLockTarget = { ...DRAG_MOOD };
		resolveActiveMood();
	} else {
		moodState.moodHoverEnabled = false;
		moodState.moodHoverResumeAtMs = nowMs() + MOOD_REENABLE_DELAY_MS;
		clearMoodSources();
		moodState.moodLockTarget = { ...BASE_MOOD };
		resolveActiveMood();
	}

	const nextLockAnimTarget = nextDragEnabled ? 1 : 0;
	arcadeModeToggles.setDragEnabled(nextDragEnabled);
	if (!nextDragEnabled) nextBasketballMode = false;
	if (!nextDragEnabled && wasTennisActive) {
		stopTennisMode({ restoreIcons: false });
	}

	if (!nextDragEnabled || !nextBasketballMode) {
		clearTargetReactiveTransientFx();
		const exitingTargetViaLock = wasTargetGameplayActive && !nextDragEnabled;
		if (!exitingTargetViaLock) {
			resetTargetReactiveBackground();
		}
	}

	appLauncher.setDragEnabled?.(nextDragEnabled, { preserveMomentum: nextDragEnabled });
	if (blogIconSetDragEnabled) blogIconSetDragEnabled(nextDragEnabled, { preserveMomentum: nextDragEnabled });
	if (linkedinIconSetDragEnabled) linkedinIconSetDragEnabled(nextDragEnabled, { preserveMomentum: nextDragEnabled });
	if (reflexIconSetDragEnabled) reflexIconSetDragEnabled(nextDragEnabled, { preserveMomentum: nextDragEnabled });
	if (walklatroIconSetDragEnabled) walklatroIconSetDragEnabled(nextDragEnabled, { preserveMomentum: nextDragEnabled });

	if (nextDragEnabled) {
		const core = getCoreWorldPos();
		appLauncher.applyOrbitalImpulse?.(core, nextRingSpinVel);
		const externalBodies = [
			blogIconGetBody?.(),
			linkedinIconGetBody?.(),
			reflexIconGetBody?.(),
			walklatroIconGetBody?.(),
		].filter(Boolean);
		for (const body of externalBodies) {
			const st = body?.state;
			const c = body?.container;
			if (!st || !c) continue;
			const dx = c.position.x - core.x;
			const dy = c.position.y - core.y;
			st.vx += -dy * nextRingSpinVel;
			st.vy += dx * nextRingSpinVel;
			st.angVel += nextRingSpinVel * 0.35;
		}
		ringSpinInput?.reset?.();
		stopSfxLoopSafe(RING_SPIN_LOOP_KEY, { fadeOut: 0.08 });
	} else {
		ringSpinInput?.reset?.();
		nextRingSpinVel = 0;
		nextRingSpin = 0;
		stopSfxLoopSafe(RING_SPIN_LOOP_KEY, { fadeOut: 0.08 });
		stopArcadeCountdown();
		resetArcadeRound();
		arcadeModeToggles.resetHover();
		appLauncher.layout(false);
		layoutBlogIcon(false);
		layoutLinkedinIcon(false);
		layoutReflexIcon(false);
		layoutWalklatroIcon(false);
	}

	arcadeModeToggles.redraw();
	return {
		dragEnabled: nextDragEnabled,
		basketballMode: nextBasketballMode,
		lockAnimTarget: nextLockAnimTarget,
		ringSpinVel: nextRingSpinVel,
		ringSpin: nextRingSpin,
		lockNeedsRedraw: true,
	};
}
