export function createPortfolioTransitionController(options = {}) {
	const {
		storageKey = 'mw_portfolio_seen',
		storage = null,
	} = options;

	let showFirstHint = true;
	try {
		if (storage && typeof storage.getItem === 'function') {
			showFirstHint = storage.getItem(storageKey) !== '1';
		}
	} catch (_) {
		showFirstHint = true;
	}

	let snapTimer = 0;
	const state = {
		active: false,
		phase: 0,
		duration: 0.32,
		surge: 0,
		direction: 1,
		actionTriggered: false,
		action: null,
	};

	const startExit = ({
		isLivingRoomActive,
		onStartSfx,
		onClose,
		onDrawWipe,
	} = {}) => {
		if (!isLivingRoomActive || state.active) return false;
		onStartSfx?.();
		state.active = true;
		state.phase = 0;
		state.duration = 0.3;
		state.surge = 1;
		state.direction = -1;
		state.actionTriggered = false;
		state.action = () => {
			onClose?.();
		};
		onDrawWipe?.(0.01);
		return true;
	};

	const startEntry = ({
		isLivingRoomActive,
		onBeforeStart,
		onOpen,
		onDrawWipe,
	} = {}) => {
		if (isLivingRoomActive || state.active) return false;
		onBeforeStart?.();
		state.active = true;
		state.phase = 0;
		state.duration = 0.28;
		state.surge = 1;
		state.direction = 1;
		state.actionTriggered = false;
		state.action = () => {
			onOpen?.();
			showFirstHint = false;
			try {
				if (storage && typeof storage.setItem === 'function') {
					storage.setItem(storageKey, '1');
				}
			} catch (_) {
			}
			snapTimer = 0.16;
		};
		onDrawWipe?.(0.01);
		return true;
	};

	const consumeSnapTimer = (seconds, isLivingRoomActive) => {
		if (snapTimer > 0 && isLivingRoomActive) {
			snapTimer = Math.max(0, snapTimer - seconds);
		}
		return snapTimer;
	};

	const step = (seconds, { isLivingRoomVisible = false } = {}) => {
		state.surge = Math.max(0, state.surge - seconds / 0.32);
		let wipePhase = 0;
		let keepJitter = false;
		let jitterX = 0;
		let entryFinished = false;

		if (state.active) {
			state.phase += seconds / state.duration;
			const triggerAt = state.direction > 0 ? 0.78 : 0.16;
			if (!state.actionTriggered && state.phase >= triggerAt) {
				state.action?.();
				state.actionTriggered = true;
			}
			wipePhase = Math.max(wipePhase, state.phase);
			if (state.direction > 0 && state.actionTriggered && isLivingRoomVisible) {
				const jitterScale = Math.max(0, 1 - state.phase);
				jitterX = (Math.random() - 0.5) * 6 * jitterScale;
				keepJitter = true;
			}
			if (state.phase >= 1) {
				state.active = false;
				if (!state.actionTriggered) {
					state.action?.();
				}
				state.actionTriggered = false;
				state.action = null;
				if (state.direction > 0) {
					entryFinished = true;
				}
				state.phase = 0;
			}
		}

		return {
			wipePhase,
			keepJitter,
			jitterX,
			entryFinished,
		};
	};

	return {
		state,
		startExit,
		startEntry,
		consumeSnapTimer,
		step,
		getShowFirstHint: () => showFirstHint,
	};
}
