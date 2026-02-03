const DEFAULTS = {
	title: 'Ninja Reflex',
	keyCode: 'Space',
	keyLabel: 'Space',
	minDelayMs: 1000,
	maxDelayMs: 4000,
	cpuMinMs: 180,
	cpuMaxMs: 520,
};

function clamp(value, min, max) {
	return Math.min(max, Math.max(min, value));
}

function randomBetween(min, max) {
	return Math.random() * (max - min) + min;
}

export function createReflexGameWindow(options = {}) {
	const config = { ...DEFAULTS, ...options };
	const root = options.root || document.body;
	const state = {
		open: false,
		phase: 'idle',
		startTime: 0,
		cpuTime: 0,
		timers: new Set(),
	};

	const win = document.createElement('div');
	win.className = 'reflex-window';
	win.setAttribute('role', 'dialog');
	win.setAttribute('aria-modal', 'false');
	win.setAttribute('aria-hidden', 'true');
	win.style.display = 'none';

	const header = document.createElement('div');
	header.className = 'reflex-header';
	const title = document.createElement('div');
	title.className = 'reflex-title';
	title.textContent = config.title;
	const closeBtn = document.createElement('button');
	closeBtn.className = 'reflex-close';
	closeBtn.type = 'button';
	closeBtn.setAttribute('aria-label', 'Close');
	closeBtn.textContent = '✕';
	header.append(title, closeBtn);

	const body = document.createElement('div');
	body.className = 'reflex-body';

	const status = document.createElement('div');
	status.className = 'reflex-status';
	status.textContent = 'Press Start to begin.';

	const stage = document.createElement('div');
	stage.className = 'reflex-stage';
	const playerColumn = document.createElement('div');
	playerColumn.className = 'reflex-column';
	const playerCube = document.createElement('div');
	playerCube.className = 'reflex-cube reflex-player';
	const playerLabel = document.createElement('div');
	playerLabel.className = 'reflex-label';
	playerLabel.textContent = 'Player';
	playerColumn.append(playerCube, playerLabel);

	const prompt = document.createElement('div');
	prompt.className = 'reflex-prompt';
	prompt.textContent = 'PRESS!';

	const cpuColumn = document.createElement('div');
	cpuColumn.className = 'reflex-column';
	const cpuCube = document.createElement('div');
	cpuCube.className = 'reflex-cube reflex-cpu';
	const cpuLabel = document.createElement('div');
	cpuLabel.className = 'reflex-label';
	cpuLabel.textContent = 'CPU';
	cpuColumn.append(cpuCube, cpuLabel);

	stage.append(playerColumn, prompt, cpuColumn);

	const metrics = document.createElement('div');
	metrics.className = 'reflex-metrics';
	metrics.innerHTML = '<span>Player: -- ms</span><span>CPU: -- ms</span>';

	const result = document.createElement('div');
	result.className = 'reflex-result';
	result.textContent = 'Waiting for round...';

	const footer = document.createElement('div');
	footer.className = 'reflex-footer';
	const hint = document.createElement('div');
	hint.className = 'reflex-hint';
	hint.textContent = `Press ${config.keyLabel} when prompted.`;
	const startBtn = document.createElement('button');
	startBtn.type = 'button';
	startBtn.className = 'reflex-button';
	startBtn.textContent = 'Start Round';
	footer.append(hint, startBtn);

	body.append(status, stage, metrics, result, footer);
	win.append(header, body);

	const clearTimers = () => {
		for (const id of state.timers) {
			window.clearTimeout(id);
		}
		state.timers.clear();
	};

	const updateMetrics = (playerMs, cpuMs) => {
		const playerText = Number.isFinite(playerMs) ? `${Math.round(playerMs)} ms` : '-- ms';
		const cpuText = Number.isFinite(cpuMs) ? `${Math.round(cpuMs)} ms` : '-- ms';
		metrics.innerHTML = `<span>Player: ${playerText}</span><span>CPU: ${cpuText}</span>`;
	};

	const setPromptVisible = (visible) => {
		prompt.classList.toggle('is-active', visible);
	};

	const resetCubes = () => {
		playerCube.classList.remove('is-active');
		cpuCube.classList.remove('is-active');
	};

	const setPhase = (phase) => {
		state.phase = phase;
	};

	const beginRound = () => {
		clearTimers();
		resetCubes();
		setPromptVisible(false);
		updateMetrics(null, null);
		result.textContent = '...';
		status.textContent = 'Get ready...';
		setPhase('waiting');

		const delay = clamp(randomBetween(config.minDelayMs, config.maxDelayMs), config.minDelayMs, config.maxDelayMs);
		const timerId = window.setTimeout(() => {
			setPhase('active');
			state.startTime = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
			state.cpuTime = clamp(randomBetween(config.cpuMinMs, config.cpuMaxMs), config.cpuMinMs, config.cpuMaxMs);
			status.textContent = 'PRESS!';
			setPromptVisible(true);

			const cpuTimer = window.setTimeout(() => {
				cpuCube.classList.add('is-active');
			}, state.cpuTime);
			state.timers.add(cpuTimer);
		}, delay);
		state.timers.add(timerId);
	};

	const showResult = (playerMs, cpuMs, message) => {
		clearTimers();
		updateMetrics(playerMs, cpuMs);
		result.textContent = message;
		status.textContent = 'Round complete.';
		setPromptVisible(false);
		setPhase('result');
		startBtn.textContent = 'Play Again';
	};

	const handlePress = () => {
		if (!state.open) return;
		if (state.phase === 'waiting') {
			clearTimers();
			showResult(null, null, 'Too soon!');
			return;
		}
		if (state.phase === 'result') {
			beginRound();
			return;
		}
		if (state.phase !== 'active') return;

		const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
		const playerMs = now - state.startTime;
		const cpuMs = state.cpuTime;
		playerCube.classList.add('is-active');
		const winner = playerMs <= cpuMs ? 'Player wins!' : 'CPU wins!';
		showResult(playerMs, cpuMs, winner);
	};

	const onKeyDown = (event) => {
		if (!state.open) return;
		if (event.code !== config.keyCode) return;
		event.preventDefault();
		handlePress();
	};

	const open = () => {
		if (!win.isConnected) {
			root.appendChild(win);
		}
		win.style.display = 'block';
		win.setAttribute('aria-hidden', 'false');
		state.open = true;
		startBtn.textContent = 'Start Round';
		beginRound();
	};

	const close = () => {
		clearTimers();
		state.open = false;
		win.style.display = 'none';
		win.setAttribute('aria-hidden', 'true');
		setPhase('idle');
		status.textContent = 'Press Start to begin.';
		result.textContent = 'Waiting for round...';
		setPromptVisible(false);
		resetCubes();
		updateMetrics(null, null);
	};

	closeBtn.addEventListener('click', close);
	startBtn.addEventListener('click', beginRound);
	window.addEventListener('keydown', onKeyDown);

	return { open, close, element: win };
}
