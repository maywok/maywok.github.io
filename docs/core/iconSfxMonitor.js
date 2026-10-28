export function createIconSfxMonitor(options = {}) {
	const {
		getAllIconBodies = () => [],
		nowMs = () => Date.now(),
		clamp01 = (value) => Math.max(0, Math.min(1, value)),
		SCENE_SCALE = 1,
		isTennisModeActive = () => false,
		playSfxSafe = () => {},
		ICON_SFX = {},
	} = options;

	const iconSfxState = new WeakMap();

	const playThrowBySpeed = (speed) => {
		const throwMin = 170 / SCENE_SCALE;
		const throwMax = 1100 / SCENE_SCALE;
		const mix = clamp01((speed - throwMin) / Math.max(1, throwMax - throwMin));
		if (mix <= 0) return;
		playSfxSafe(ICON_SFX.throw, {
			volume: 0.18 + mix * 0.72,
			rate: 0.88 + mix * 0.46,
		});
	};

	const update = () => {
		const bodies = getAllIconBodies();
		const now = nowMs();
		const velocityEpsilon = 26 / SCENE_SCALE;
		const wallThreshold = 190 / SCENE_SCALE;
		const wallCooldownMs = 60;
		const tennisMode = Boolean(isTennisModeActive());

		for (const body of bodies) {
			if (!body?.container || !body?.state) continue;
			const container = body.container;
			const st = body.state;
			const hovered = Boolean(st.hovered);
			const dragLike = Boolean(st.dragging || st.grabbed);
			const vx = Number.isFinite(st.vx) ? st.vx : 0;
			const vy = Number.isFinite(st.vy) ? st.vy : 0;
			let prev = iconSfxState.get(container);
			if (!prev) {
				iconSfxState.set(container, {
					hovered,
					dragLike,
					vx,
					vy,
					lastWallAt: -999,
				});
				continue;
			}

			if (!prev.hovered && hovered) {
				playSfxSafe(ICON_SFX.hover, {
					volume: 0.34 + Math.random() * 0.14,
					rate: 0.96 + Math.random() * 0.08,
				});
			}
			if (!prev.dragLike && dragLike) {
				playSfxSafe(ICON_SFX.grab, {
					volume: 0.5,
					rate: 0.95 + Math.random() * 0.12,
				});
			}
			if (prev.dragLike && !dragLike) {
				const releaseSpeed = Math.hypot(vx, vy);
				playSfxSafe(ICON_SFX.release, {
					volume: 0.38,
					rate: 0.94 + Math.random() * 0.1,
				});
				playThrowBySpeed(releaseSpeed);
			}

			if (!dragLike && !prev.dragLike) {
				const hitX = Math.abs(prev.vx) > velocityEpsilon
					&& Math.abs(vx) > velocityEpsilon
					&& Math.sign(prev.vx) !== Math.sign(vx)
					&& Math.abs(vx - prev.vx) > wallThreshold;
				const hitY = Math.abs(prev.vy) > velocityEpsilon
					&& Math.abs(vy) > velocityEpsilon
					&& Math.sign(prev.vy) !== Math.sign(vy)
					&& Math.abs(vy - prev.vy) > wallThreshold;
				if (!tennisMode && (hitX || hitY) && now - prev.lastWallAt > wallCooldownMs) {
					const impact = Math.max(Math.abs(vx - prev.vx), Math.abs(vy - prev.vy));
					const impactMix = clamp01((impact - (180 / SCENE_SCALE)) / (1050 / SCENE_SCALE));
					playSfxSafe(ICON_SFX.wallHit, {
						volume: 0.14 + impactMix * 0.58,
						rate: 0.92 + impactMix * 0.22,
					});
					prev.lastWallAt = now;
				}
			}

			prev.hovered = hovered;
			prev.dragLike = dragLike;
			prev.vx = vx;
			prev.vy = vy;
		}
	};

	return {
		update,
	};
}