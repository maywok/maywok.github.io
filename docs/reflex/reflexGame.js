const DEFAULTS = {
	title: 'Ninja Reflex',
	minDelayMs: 1000,
	maxDelayMs: 4000,
	cpuMinMs: 180,
	cpuMaxMs: 520,
};

const DIRECTIONS = [
	{ name: 'Up', label: '↑ / W', codes: ['ArrowUp', 'KeyW'] },
	{ name: 'Right', label: '→ / D', codes: ['ArrowRight', 'KeyD'] },
	{ name: 'Down', label: '↓ / S', codes: ['ArrowDown', 'KeyS'] },
	{ name: 'Left', label: '← / A', codes: ['ArrowLeft', 'KeyA'] },
];

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
		expected: null,
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
	playerColumn.classList.add('reflex-player-col');
	const playerCube = document.createElement('div');
	playerCube.className = 'reflex-cube reflex-player';
	const playerLabel = document.createElement('div');
	playerLabel.className = 'reflex-label';
	playerLabel.textContent = 'Player';
	playerColumn.append(playerCube, playerLabel);

	const prompt = document.createElement('div');
	prompt.className = 'reflex-prompt';
	const arrowUp = document.createElement('span');
	arrowUp.className = 'reflex-arrow reflex-arrow-up';
	arrowUp.textContent = '↑';
	const arrowRight = document.createElement('span');
	arrowRight.className = 'reflex-arrow reflex-arrow-right';
	arrowRight.textContent = '→';
	const arrowDown = document.createElement('span');
	arrowDown.className = 'reflex-arrow reflex-arrow-down';
	arrowDown.textContent = '↓';
	const arrowLeft = document.createElement('span');
	arrowLeft.className = 'reflex-arrow reflex-arrow-left';
	arrowLeft.textContent = '←';
	prompt.append(arrowUp, arrowRight, arrowDown, arrowLeft);

	const cpuColumn = document.createElement('div');
	cpuColumn.className = 'reflex-column';
	cpuColumn.classList.add('reflex-cpu-col');
	const cpuCube = document.createElement('div');
	cpuCube.className = 'reflex-cube reflex-cpu';
	const cpuLabel = document.createElement('div');
	cpuLabel.className = 'reflex-label';
	cpuLabel.textContent = 'CPU';
	cpuColumn.append(cpuCube, cpuLabel);

	const fxLayer = document.createElement('div');
	fxLayer.className = 'reflex-fx';
	const flash = document.createElement('div');
	flash.className = 'reflex-flash';
	const slash = document.createElement('div');
	slash.className = 'reflex-slash';
	fxLayer.append(flash, slash);

	stage.append(playerColumn, prompt, cpuColumn, fxLayer);

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
	hint.textContent = 'Press the shown direction when prompted.';
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

	const isControlKey = (code) => DIRECTIONS.some((dir) => dir.codes.includes(code));

	const setExpectedDirection = (dir) => {
		state.expected = dir;
		hint.textContent = `Press ${dir.label} when prompted.`;
		arrowUp.classList.toggle('is-hot', dir?.name === 'Up');
		arrowRight.classList.toggle('is-hot', dir?.name === 'Right');
		arrowDown.classList.toggle('is-hot', dir?.name === 'Down');
		arrowLeft.classList.toggle('is-hot', dir?.name === 'Left');
	};

	const resetCubes = () => {
		playerCube.classList.remove('is-active');
		cpuCube.classList.remove('is-active');
	};

	const resetFinisher = () => {
		stage.classList.remove('finisher-play', 'finisher-player', 'finisher-cpu');
	};

	const playFinisher = (winner) => {
		if (!winner) return;
		resetFinisher();
		void stage.offsetWidth;
		stage.classList.add('finisher-play', winner === 'player' ? 'finisher-player' : 'finisher-cpu');
		const cleanup = window.setTimeout(() => {
			resetFinisher();
		}, 700);
		state.timers.add(cleanup);
	};

	const setPhase = (phase) => {
		state.phase = phase;
	};

	const beginRound = () => {
		clearTimers();
		resetCubes();
		resetFinisher();
		setPromptVisible(false);
		updateMetrics(null, null);
		result.textContent = '...';
		status.textContent = 'Get ready...';
		setPhase('waiting');
		setExpectedDirection(DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)]);

		const delay = clamp(randomBetween(config.minDelayMs, config.maxDelayMs), config.minDelayMs, config.maxDelayMs);
		const timerId = window.setTimeout(() => {
			setPhase('active');
			state.startTime = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
			state.cpuTime = clamp(randomBetween(config.cpuMinMs, config.cpuMaxMs), config.cpuMinMs, config.cpuMaxMs);
			status.textContent = 'Hit the red arrow!';
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
		const playerWins = playerMs <= cpuMs;
		const winnerText = playerWins ? 'Player wins!' : 'CPU wins!';
		showResult(playerMs, cpuMs, winnerText);
		playFinisher(playerWins ? 'player' : 'cpu');
	};

	const onKeyDown = (event) => {
		if (!state.open) return;
		if (!isControlKey(event.code)) return;
		event.preventDefault();
		if (state.phase === 'result') {
			beginRound();
			return;
		}
		const isExpected = Boolean(state.expected?.codes?.includes(event.code));
		if (!isExpected) {
			if (state.phase === 'waiting') {
				clearTimers();
				showResult(null, null, 'Too soon!');
				return;
			}
			if (state.phase === 'active') {
				showResult(null, null, 'Wrong key!');
			}
			return;
		}
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
		resetFinisher();
		updateMetrics(null, null);
	};

	closeBtn.addEventListener('click', close);
	startBtn.addEventListener('click', beginRound);
	window.addEventListener('keydown', onKeyDown);

	return { open, close, element: win };
}
