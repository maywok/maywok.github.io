import { createCrimsonFlowBackground } from '../background.js';

const DEFAULTS = {
	title: 'Ninja Reflex',
	minDelayMs: 1000,
	maxDelayMs: 4000,
	cpuMinMs: 180,
	cpuMaxMs: 520,
	 difficulties: {
		easy: { label: 'Easy', cpuMinMs: 260, cpuMaxMs: 600 },
		normal: { label: 'Normal', cpuMinMs: 180, cpuMaxMs: 520 },
		hard: { label: 'Hard', cpuMinMs: 120, cpuMaxMs: 380 },
		insane: { label: 'Insane', cpuMinMs: 80, cpuMaxMs: 260 },
	 },
	 defaultDifficulty: 'normal',
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
	const root = options.root || document.getElementById('game-root') || document.body;
	const state = {
		open: false,
		phase: 'idle',
		startTime: 0,
		cpuTime: 0,
		expected: null,
		selectedDirection: null,
		difficulty: config.defaultDifficulty,
		timers: new Set(),
	};

	const win = document.createElement('div');
	win.className = 'reflex-window';
	win.setAttribute('role', 'dialog');
	win.setAttribute('aria-modal', 'false');
	win.setAttribute('aria-hidden', 'true');
	win.style.display = 'none';

	const flowLayer = document.createElement('div');
	flowLayer.className = 'reflex-flow-layer';
	const flowCanvas = document.createElement('canvas');
	flowCanvas.className = 'reflex-flow-canvas';
	flowLayer.appendChild(flowCanvas);

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
	const difficulty = document.createElement('div');
	difficulty.className = 'reflex-difficulty';
	const difficultyLabel = document.createElement('label');
	difficultyLabel.className = 'reflex-difficulty-label';
	difficultyLabel.textContent = 'Difficulty';
	const difficultySelect = document.createElement('select');
	difficultySelect.className = 'reflex-difficulty-select';
	Object.entries(config.difficulties || {}).forEach(([key, entry]) => {
		const option = document.createElement('option');
		option.value = key;
		option.textContent = entry.label || key;
		difficultySelect.appendChild(option);
	});
	if (state.difficulty && difficultySelect.querySelector(`option[value="${state.difficulty}"]`)) {
		difficultySelect.value = state.difficulty;
	}
	difficultySelect.addEventListener('change', () => {
		state.difficulty = difficultySelect.value;
	});
	difficulty.append(difficultyLabel, difficultySelect);
	const startBtn = document.createElement('button');
	startBtn.type = 'button';
	startBtn.className = 'reflex-button';
	startBtn.textContent = 'Start Round';
	footer.append(hint, difficulty, startBtn);

	body.append(status, stage, metrics, result, footer);
	win.append(flowLayer, header, body);

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
		hint.textContent = dir ? `Press ${dir.label} when prompted.` : 'Press the shown direction when prompted.';
		arrowUp.classList.toggle('is-hot', Boolean(dir) && dir?.name === 'Up');
		arrowRight.classList.toggle('is-hot', Boolean(dir) && dir?.name === 'Right');
		arrowDown.classList.toggle('is-hot', Boolean(dir) && dir?.name === 'Down');
		arrowLeft.classList.toggle('is-hot', Boolean(dir) && dir?.name === 'Left');
	};

	const setArrowIdle = () => {
		setExpectedDirection(null);
		arrowUp.classList.remove('is-hot');
		arrowRight.classList.remove('is-hot');
		arrowDown.classList.remove('is-hot');
		arrowLeft.classList.remove('is-hot');
	};

	const setArrowActive = (dir) => {
		arrowUp.classList.remove('is-idle');
		arrowRight.classList.remove('is-idle');
		arrowDown.classList.remove('is-idle');
		arrowLeft.classList.remove('is-idle');
		setExpectedDirection(dir);
	};

	const resetCubes = () => {
		playerCube.classList.remove('is-active');
		cpuCube.classList.remove('is-active');
	};

	let flowApp = null;
	let flowUpdate = null;
	let flowResize = null;
	let flowTime = 0;
	let flowObserver = null;

	const ensureFlow = () => {
		if (flowApp || typeof PIXI === 'undefined') return;
		const rect = win.getBoundingClientRect();
		flowApp = new PIXI.Application({
			view: flowCanvas,
			width: Math.max(1, rect.width),
			height: Math.max(1, rect.height),
			backgroundAlpha: 0,
			antialias: false,
			resolution: 1,
			autoStart: true,
		});
		flowApp.stage.roundPixels = true;
		flowApp.renderer.roundPixels = true;
		const flow = createCrimsonFlowBackground(flowApp, {
			lineColor: 0x000000,
			glowColor: 0x000000,
			bgColor: 0xf3deb0,
			glowAlpha: 0,
			parallax: 0,
			pixelSize: 6,
			density: 4.2,
			speed: 0.6,
		});
		flowUpdate = flow.update;
		flowResize = flow.resize;
		flowApp.stage.addChild(flow.container);
		flowTime = 0;
		flowApp.ticker.add((dt) => {
			flowTime += dt / 60;
			flowUpdate?.(flowTime, { x: 0, y: 0 });
		});
		if (typeof ResizeObserver !== 'undefined') {
			flowObserver = new ResizeObserver(() => {
				if (!flowApp) return;
				const next = win.getBoundingClientRect();
				flowApp.renderer.resize(Math.max(1, next.width), Math.max(1, next.height));
				flowResize?.();
			});
			flowObserver.observe(win);
		}
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
		state.selectedDirection = DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)];
		setArrowIdle();

		const delay = clamp(randomBetween(config.minDelayMs, config.maxDelayMs), config.minDelayMs, config.maxDelayMs);
		const timerId = window.setTimeout(() => {
			setPhase('active');
			state.startTime = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
			const diff = (config.difficulties && state.difficulty && config.difficulties[state.difficulty]) ? config.difficulties[state.difficulty] : null;
			const cpuMin = diff?.cpuMinMs ?? config.cpuMinMs;
			const cpuMax = diff?.cpuMaxMs ?? config.cpuMaxMs;
			state.cpuTime = clamp(randomBetween(cpuMin, cpuMax), cpuMin, cpuMax);
			status.textContent = 'Hit the red arrow!';
			setArrowActive(state.selectedDirection);
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
		win.style.left = '50%';
		win.style.top = '50%';
		win.style.transform = 'translate(-50%, -50%)';
		ensureFlow();
		flowApp?.ticker?.start?.();
		root.classList?.add('reflex-open');
		difficultySelect.value = state.difficulty;
		beginRound();
	};

	const close = () => {
		clearTimers();
		state.open = false;
		win.style.display = 'none';
		win.setAttribute('aria-hidden', 'true');
		flowApp?.ticker?.stop?.();
		root.classList?.remove('reflex-open');
		setPhase('idle');
		status.textContent = 'Press Start to begin.';
		result.textContent = 'Waiting for round...';
		setPromptVisible(false);
		resetCubes();
		resetFinisher();
		setArrowIdle();
		updateMetrics(null, null);
	};

	const dragState = { active: false, offsetX: 0, offsetY: 0 };
	const startDrag = (event) => {
		if (event.target === closeBtn) return;
		const rect = win.getBoundingClientRect();
		dragState.active = true;
		dragState.offsetX = event.clientX - rect.left;
		dragState.offsetY = event.clientY - rect.top;
		win.style.transform = 'translate(0, 0)';
		win.style.left = `${rect.left}px`;
		win.style.top = `${rect.top}px`;
	};
	const onDragMove = (event) => {
		if (!dragState.active) return;
		win.style.left = `${event.clientX - dragState.offsetX}px`;
		win.style.top = `${event.clientY - dragState.offsetY}px`;
	};
	const stopDrag = () => {
		dragState.active = false;
	};
	header.addEventListener('pointerdown', startDrag);
	window.addEventListener('pointermove', onDragMove);
	window.addEventListener('pointerup', stopDrag);

	closeBtn.addEventListener('click', close);
	startBtn.addEventListener('click', beginRound);
	window.addEventListener('keydown', onKeyDown);

	return { open, close, element: win };
}
