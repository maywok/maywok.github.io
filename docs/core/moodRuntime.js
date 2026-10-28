export function createMoodRuntime(options = {}) {
	const {
		baseMood = {},
		moodMap = {},
		getMoodProfile = () => baseMood,
		hoverMoodDebounceMs = 110,
		nowMs = () => Date.now(),
	} = options;

	const hoverMoodSources = new Map();
	const pendingMoodSources = new Map();

	const state = {
		activeMoodEntry: null,
		moodTarget: { ...baseMood },
		moodCurrent: { ...baseMood },
		moodHoverEnabled: true,
		moodLockTarget: null,
		moodHoverResumeAtMs: 0,
	};

	const publishMoodTarget = (key, locked) => {
		if (typeof window === 'undefined') return;
		window.moodTarget = {
			key,
			locked,
			...state.moodTarget,
		};
	};

	const resolveActiveMood = () => {
		if (state.moodLockTarget) {
			state.activeMoodEntry = null;
			state.moodTarget = { ...state.moodLockTarget };
			publishMoodTarget('default', true);
			return;
		}
		let last = null;
		for (const entry of hoverMoodSources.values()) last = entry;
		state.activeMoodEntry = last;
		state.moodTarget = { ...getMoodProfile(last?.key || 'default') };
		publishMoodTarget(last?.key || 'default', false);
	};

	const setMoodHover = (key, hovered, container) => {
		if (!container) return;
		if (container.__hoverBaseZ == null) {
			container.__hoverBaseZ = Number.isFinite(container.zIndex) ? container.zIndex : 0;
		}
		container.zIndex = hovered ? 2200 : container.__hoverBaseZ;
		container.parent?.sortChildren?.();

		const moodKey = getMoodProfile(key) === moodMap.default && key !== 'default' ? 'default' : key;
		if (hovered) {
			if (!state.moodHoverEnabled || state.moodLockTarget) return;
			hoverMoodSources.delete(container);
			pendingMoodSources.set(container, {
				key: moodKey,
				container,
				activateAt: nowMs() + hoverMoodDebounceMs,
			});
		} else {
			pendingMoodSources.delete(container);
			hoverMoodSources.delete(container);
			resolveActiveMood();
		}
	};

	const flushPendingMoodSources = (timeMs) => {
		if (!state.moodHoverEnabled || state.moodLockTarget) {
			if (pendingMoodSources.size) pendingMoodSources.clear();
			return;
		}
		let changed = false;
		for (const [container, pending] of pendingMoodSources.entries()) {
			if (timeMs < pending.activateAt) continue;
			pendingMoodSources.delete(container);
			hoverMoodSources.delete(container);
			hoverMoodSources.set(container, { key: pending.key, container });
			changed = true;
		}
		if (changed) resolveActiveMood();
	};

	const clearMoodSources = () => {
		pendingMoodSources.clear();
		hoverMoodSources.clear();
	};

	return {
		state,
		resolveActiveMood,
		setMoodHover,
		flushPendingMoodSources,
		clearMoodSources,
	};
}
