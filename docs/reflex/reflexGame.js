import { createCrimsonFlowBackground } from '../background.js';

const DEFAULTS = {
	title: 'Reflex',
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
		winStreak: 0,
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

export function createReflexGameOverlay(app, world, options = {}) {
	const config = { ...DEFAULTS, ...options };
	const screenScale = options.screenScale ?? 1;
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

	const screenToWorldX = (screenX) => {
		const cx = app.renderer.width / 2;
		return (screenX - cx) / screenScale + cx;
	};
	const screenToWorldY = (screenY) => {
		const cy = app.renderer.height / 2;
		return (screenY - cy) / screenScale + cy;
	};

	const windowWidth = Math.min(480, app.renderer.width * 0.9);
	const windowHeight = Math.min(320, app.renderer.height * 0.68);
	const headerHeight = 26;
	const padding = 12;

	const container = new PIXI.Container();
	container.visible = false;
	container.eventMode = 'static';
	container.hitArea = new PIXI.Rectangle(0, 0, windowWidth, windowHeight);
	container.zIndex = 50;

	const panelMask = new PIXI.Graphics();
	panelMask.beginFill(0xffffff, 1);
	panelMask.drawRect(0, 0, windowWidth, windowHeight);
	panelMask.endFill();
	panelMask.visible = false;

	const panelFill = new PIXI.Graphics();
	panelFill.beginFill(0xf3deb0, 1);
	panelFill.drawRect(0, 0, windowWidth, windowHeight);
	panelFill.endFill();

	const flow = createCrimsonFlowBackground(app, {
		lineColor: 0x000000,
		glowColor: 0x000000,
		bgColor: 0xf3deb0,
		glowAlpha: 0,
		parallax: 0,
		pixelSize: 6,
		density: 4.2,
		speed: 0.6,
	});
	flow.container.mask = panelMask;
	let flowTime = 0;

	const panelBorder = new PIXI.Graphics();
	panelBorder.lineStyle(2, 0x1b4c92, 1);
	panelBorder.drawRect(0, 0, windowWidth, windowHeight);

	const headerBg = new PIXI.Graphics();
	headerBg.beginFill(0xffffff, 1);
	headerBg.drawRect(0, 0, windowWidth, headerHeight);
	headerBg.endFill();
	headerBg.beginFill(0xe5e5e5, 1);
	headerBg.drawRect(0, headerHeight * 0.52, windowWidth, headerHeight * 0.48);
	headerBg.endFill();
	headerBg.eventMode = 'static';
	headerBg.cursor = 'move';
	headerBg.hitArea = new PIXI.Rectangle(0, 0, windowWidth, headerHeight);

	const title = new PIXI.Text(config.title, {
		fontFamily: 'Tahoma, Segoe UI, sans-serif',
		fontSize: 12,
		fill: 0x7f0020,
		fontWeight: '600',
	});
	title.position.set(10, 6);

	const closeBtn = new PIXI.Graphics();
	closeBtn.beginFill(0xf26b6b, 1);
	closeBtn.lineStyle(1, 0x7f1d1d, 0.6);
	closeBtn.drawRoundedRect(0, 0, 24, 24, 0);
	closeBtn.endFill();
	closeBtn.position.set(windowWidth - 32, 2);
	closeBtn.eventMode = 'static';
	closeBtn.cursor = 'pointer';
	const closeX = new PIXI.Text('✕', {
		fontFamily: 'Tahoma, Segoe UI, sans-serif',
		fontSize: 12,
		fill: 0xffffff,
	});
	closeX.anchor.set(0.5);
	closeX.position.set(12, 12);
	closeBtn.addChild(closeX);

	const status = new PIXI.Text('Press Start to begin.', {
		fontFamily: 'Tahoma, Segoe UI, sans-serif',
		fontSize: 10,
		fill: 0x112044,
	});
	status.position.set(padding, headerHeight + 6);

	const stage = new PIXI.Graphics();
	const stageX = padding;
	const stageY = headerHeight + 26;
	const stageW = windowWidth - padding * 2;
	const stageH = 92;
	stage.beginFill(0xf4f7ff, 0.18);
	stage.lineStyle(2, 0x95a9cf, 1);
	stage.drawRoundedRect(0, 0, stageW, stageH, 0);
	stage.endFill();
	stage.position.set(stageX, stageY);

	const stageMask = new PIXI.Graphics();
	stageMask.beginFill(0xffffff, 1);
	stageMask.drawRect(0, 0, stageW, stageH);
	stageMask.endFill();
	stageMask.position.set(stageX, stageY);
	stageMask.visible = false;

	const stageBgPath = './assets/spritesheet/reflexCity.png';
	const stageBgUrl = (() => {
		try {
			return new URL(stageBgPath, window.location.href).toString();
		} catch (_) {
			return stageBgPath;
		}
	})();
	const stageBg = new PIXI.Sprite(PIXI.Texture.EMPTY);
	PIXI.Assets.load([stageBgUrl]).then(() => {
		stageBg.texture = PIXI.Texture.from(stageBgUrl);
		stageBg.texture.baseTexture.scaleMode = PIXI.SCALE_MODES.NEAREST;
		stageBg.width = stageW;
		stageBg.height = stageH;
	});
	stageBg.width = stageW;
	stageBg.height = stageH;
	stageBg.position.set(stageX, stageY);
	stageBg.alpha = 0.85;
	stageBg.mask = stageMask;

	const actorSize = 34;
	const createActor = (textures) => {
		if (textures && textures.length) {
			const sprite = new PIXI.AnimatedSprite(textures);
			sprite.anchor.set(0.5);
			sprite.animationSpeed = 0.14;
			sprite.play();
			const baseW = textures[0]?.width || 1;
			const baseH = textures[0]?.height || 1;
			const scale = actorSize / Math.max(baseW, baseH);
			sprite.scale.set(scale);
			return sprite;
		}
		const g = new PIXI.Graphics();
		g.beginFill(0x1f2937, 1);
		g.lineStyle(2, 0x0b1120, 1);
		g.drawRect(-actorSize / 2, -actorSize / 2, actorSize, actorSize);
		g.endFill();
		return g;
	};

	const playerActor = createActor(options.playerTextures);
	const cpuActor = createActor(options.cpuTextures);
	playerActor.position.set(stageX + 42, stageY + 38);
	cpuActor.position.set(stageX + stageW - 46, stageY + 38);
	if (cpuActor?.scale) {
		cpuActor.scale.x *= -1;
	}

	const playerLabel = new PIXI.Text('Player', {
		fontFamily: 'Tahoma, Segoe UI, sans-serif',
		fontSize: 9,
		fill: 0x1c2c4b,
	});
	playerLabel.position.set(stageX + 30, stageY + 58);

	const cpuLabel = new PIXI.Text('CPU', {
		fontFamily: 'Tahoma, Segoe UI, sans-serif',
		fontSize: 9,
		fill: 0x1c2c4b,
	});
	cpuLabel.position.set(stageX + stageW - 54, stageY + 58);

	const arrowGroup = new PIXI.Container();
	const arrowStyle = {
		fontFamily: 'Minecraft, monospace',
		fontSize: 16,
		fill: 0x0b0b0b,
		stroke: 0x000000,
		strokeThickness: 1,
	};
	const makeArrowBox = () => {
		const g = new PIXI.Graphics();
		g.beginFill(0x000000, 0.08);
		g.lineStyle(1, 0x1b2b42, 0.4);
		g.drawRoundedRect(0, 0, 22, 22, 4);
		g.endFill();
		return g;
	};
	const arrowUpBox = makeArrowBox();
	const arrowRightBox = makeArrowBox();
	const arrowDownBox = makeArrowBox();
	const arrowLeftBox = makeArrowBox();
	const arrowUp = new PIXI.Text('↑', arrowStyle);
	const arrowRight = new PIXI.Text('→', arrowStyle);
	const arrowDown = new PIXI.Text('↓', arrowStyle);
	const arrowLeft = new PIXI.Text('←', arrowStyle);
	arrowUpBox.position.set(22, 0);
	arrowRightBox.position.set(44, 22);
	arrowDownBox.position.set(22, 44);
	arrowLeftBox.position.set(0, 22);
	arrowUp.position.set(26, 2);
	arrowRight.position.set(48, 24);
	arrowDown.position.set(26, 46);
	arrowLeft.position.set(4, 24);
	arrowGroup.addChild(arrowUpBox, arrowRightBox, arrowDownBox, arrowLeftBox, arrowUp, arrowRight, arrowDown, arrowLeft);
	arrowGroup.position.set(stageX + stageW / 2 - 24, stageY + 18);
	arrowGroup.alpha = 0.35;

	const metrics = new PIXI.Text('Player: -- ms   CPU: -- ms', {
		fontFamily: 'Tahoma, Segoe UI, sans-serif',
		fontSize: 9,
		fill: 0x1d2b49,
	});
	metrics.position.set(padding, stageY + stageH + 8);

	const result = new PIXI.Text('Waiting for round...', {
		fontFamily: 'Tahoma, Segoe UI, sans-serif',
		fontSize: 10,
		fill: 0x10203d,
	});
	result.position.set(padding, stageY + stageH + 22);

	const streakText = new PIXI.Text('Win Streak: 0', {
		fontFamily: 'Tahoma, Segoe UI, sans-serif',
		fontSize: 10,
		fill: 0x1c2c4b,
	});
	streakText.position.set(padding, stageY + stageH + 60);

	const hint = new PIXI.Text('Use arrows or WASD.', {
		fontFamily: 'Tahoma, Segoe UI, sans-serif',
		fontSize: 8,
		fill: 0x2a3b5f,
	});
	hint.position.set(padding, stageY + stageH + 40);

	const difficultyBtn = new PIXI.Graphics();
	const difficultyBtnSize = { w: 200, h: 30 };
	const drawDifficultyBtn = () => {
		difficultyBtn.clear();
		difficultyBtn.beginFill(0xf6ecd1, 1);
		difficultyBtn.lineStyle(1, 0x1b2b42, 0.6);
		difficultyBtn.drawRoundedRect(0, 0, difficultyBtnSize.w, difficultyBtnSize.h, 4);
		difficultyBtn.endFill();
	};
	drawDifficultyBtn();
	difficultyBtn.position.set(windowWidth - padding - difficultyBtnSize.w, stageY + stageH + 34);
	difficultyBtn.eventMode = 'static';
	difficultyBtn.cursor = 'pointer';
	const difficultyText = new PIXI.Text('Difficulty: Normal', {
		fontFamily: 'Tahoma, Segoe UI, sans-serif',
		fontSize: 12,
		fill: 0x1b2b42,
	});
	difficultyText.position.set(10, 7);
	difficultyBtn.addChild(difficultyText);

	const difficultyMenu = new PIXI.Container();
	difficultyMenu.visible = false;
	const difficultyMenuBg = new PIXI.Graphics();
	difficultyMenu.addChild(difficultyMenuBg);
	const difficultyMenuItems = [];

	const startBtn = new PIXI.Graphics();
	const startBtnSize = { w: 120, h: 28 };
	const drawStartBtn = (fill = 0x22c55e) => {
		startBtn.clear();
		startBtn.beginFill(fill, 1);
		startBtn.lineStyle(1, 0x15803d, 1);
		startBtn.drawRoundedRect(0, 0, startBtnSize.w, startBtnSize.h, 5);
		startBtn.endFill();
	};
	drawStartBtn();
	startBtn.position.set(windowWidth - padding - startBtnSize.w, windowHeight - 36);
	startBtn.eventMode = 'static';
	startBtn.cursor = 'pointer';
	const startText = new PIXI.Text('Start', {
		fontFamily: 'Tahoma, Segoe UI, sans-serif',
		fontSize: 12,
		fill: 0xffffff,
	});
	startText.anchor.set(0.5);
	startText.position.set(startBtnSize.w / 2, startBtnSize.h / 2);
	startBtn.addChild(startText);

	const resetCubes = () => {
		playerActor.tint = 0xffffff;
		cpuActor.tint = 0xffffff;
		playerActor.alpha = 1;
		cpuActor.alpha = 1;
	};

	const setLoserTint = (loser) => {
		if (loser === 'player') {
			playerActor.tint = 0xf87171;
		}
		if (loser === 'cpu') {
			cpuActor.tint = 0xf87171;
		}
	};

	const updateMetrics = (playerMs, cpuMs) => {
		const playerText = Number.isFinite(playerMs) ? `${Math.round(playerMs)} ms` : '-- ms';
		const cpuText = Number.isFinite(cpuMs) ? `${Math.round(cpuMs)} ms` : '-- ms';
		metrics.text = `Player: ${playerText}   CPU: ${cpuText}`;
	};

	const updateStreakDisplay = () => {
		const capped = Math.min(state.winStreak, 20);
		const size = 10 + capped * 0.6;
		const intensity = Math.min(1, capped / 10);
		const hue = (capped * 26) % 360;
		const sat = 100 * intensity;
		const light = 20 + 30 * intensity;
		const toRgb = (h, s, l) => {
			const a = s * Math.min(l, 100 - l) / 100;
			const f = (n) => {
				const k = (n + h / 30) % 12;
				const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
				return Math.round(255 * color / 100);
			};
			return (f(0) << 16) | (f(8) << 8) | f(4);
		};
		streakText.text = `Win Streak: ${state.winStreak}`;
		streakText.style.fontSize = Math.min(18, size);
		streakText.style.fill = (state.winStreak <= 0) ? 0x0b0b0b : toRgb(hue, sat, light);
	};

	const setExpectedDirection = (dir) => {
		state.expected = dir;
		hint.text = 'Use arrows or WASD.';
		const resetText = (arrow) => {
			arrow.style.fill = 0x0b0b0b;
			arrow.style.stroke = 0x000000;
			arrow.style.strokeThickness = 1;
		};
		const resetBox = (box) => {
			box.clear();
			box.beginFill(0x000000, 0.08);
			box.lineStyle(1, 0x1b2b42, 0.4);
			box.drawRoundedRect(0, 0, 22, 22, 4);
			box.endFill();
		};
		[arrowUp, arrowRight, arrowDown, arrowLeft].forEach(resetText);
		[arrowUpBox, arrowRightBox, arrowDownBox, arrowLeftBox].forEach(resetBox);
		const setActive = (arrow, box) => {
			arrow.style.fill = 0xfff200;
			arrow.style.stroke = 0x3a2f00;
			arrow.style.strokeThickness = 1.5;
			box.clear();
			box.beginFill(0xfff200, 0.18);
			box.lineStyle(1, 0xfff200, 0.9);
			box.drawRoundedRect(0, 0, 22, 22, 4);
			box.endFill();
		};
		if (dir?.name === 'Up') setActive(arrowUp, arrowUpBox);
		if (dir?.name === 'Right') setActive(arrowRight, arrowRightBox);
		if (dir?.name === 'Down') setActive(arrowDown, arrowDownBox);
		if (dir?.name === 'Left') setActive(arrowLeft, arrowLeftBox);
	};

	const beginRound = () => {
		for (const id of state.timers) window.clearTimeout(id);
		state.timers.clear();
		resetCubes();
		updateMetrics(null, null);
		result.text = '...';
		status.text = 'Get ready...';
		state.phase = 'waiting';
		state.selectedDirection = DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)];
		setExpectedDirection(null);
		arrowGroup.alpha = 0.35;
		drawStartBtn(0x22c55e);
		startText.text = 'Start';

		const delay = clamp(randomBetween(config.minDelayMs, config.maxDelayMs), config.minDelayMs, config.maxDelayMs);
		const timerId = window.setTimeout(() => {
			state.phase = 'active';
			state.startTime = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
			const diff = (config.difficulties && state.difficulty && config.difficulties[state.difficulty]) ? config.difficulties[state.difficulty] : null;
			const cpuMin = diff?.cpuMinMs ?? config.cpuMinMs;
			const cpuMax = diff?.cpuMaxMs ?? config.cpuMaxMs;
			state.cpuTime = clamp(randomBetween(cpuMin, cpuMax), cpuMin, cpuMax);
			status.text = 'Hit the red arrow!';
			setExpectedDirection(state.selectedDirection);
			arrowGroup.alpha = 1;
			const cpuTimer = window.setTimeout(() => {}, state.cpuTime);
			state.timers.add(cpuTimer);
		}, delay);
		state.timers.add(timerId);
	};

	const showResult = (playerMs, cpuMs, message) => {
		for (const id of state.timers) window.clearTimeout(id);
		state.timers.clear();
		updateMetrics(playerMs, cpuMs);
		result.text = message;
		status.text = 'Round complete.';
		state.phase = 'result';
		startText.text = 'Again';
		drawStartBtn(0x22c55e);
	};

	const handlePress = () => {
		if (!state.open) return;
		if (state.phase === 'waiting') {
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
		const playerWins = playerMs <= cpuMs;
		const winnerText = playerWins ? 'Player wins!' : 'CPU wins!';
		showResult(playerMs, cpuMs, winnerText);
		setLoserTint(playerWins ? 'cpu' : 'player');
		startFinisher(playerWins ? 'player' : 'cpu');
		state.winStreak = playerWins ? state.winStreak + 1 : 0;
		updateStreakDisplay();
	};

	const onKeyDown = (event) => {
		if (!state.open) return;
		if (event.code === 'Escape') {
			close();
			return;
		}
		if (!DIRECTIONS.some((dir) => dir.codes.includes(event.code))) return;
		event.preventDefault();
		if (state.phase === 'result') {
			beginRound();
			return;
		}
		const isExpected = Boolean(state.expected?.codes?.includes(event.code));
		if (!isExpected) {
			if (state.phase === 'waiting') {
				showResult(null, null, 'Too soon!');
				setLoserTint('player');
				return;
			}
			if (state.phase === 'active') {
				showResult(null, null, 'Wrong key!');
				setLoserTint('player');
			}
			return;
		}
		handlePress();
	};

	const flash = new PIXI.Graphics();
	flash.beginFill(0x000000, 1);
	flash.drawRoundedRect(0, 0, stageW, stageH, 6);
	flash.endFill();
	flash.position.set(stageX, stageY);
	flash.alpha = 0;

	const slash = new PIXI.Graphics();
	slash.beginFill(0xffffff, 0.0);
	slash.lineStyle(4, 0xff5667, 0.95);
	const slashLen = stageW * 0.75;
	slash.moveTo(-slashLen * 0.5, 0);
	slash.lineTo(slashLen * 0.5, 0);
	slash.position.set(stageX + stageW * 0.5, stageY + stageH * 0.5);
	slash.rotation = -0.2;
	slash.alpha = 0;

	const finisher = {
		active: false,
		time: 0,
		winner: null,
		playerBase: { x: 0, y: 0 },
		cpuBase: { x: 0, y: 0 },
	};

	const startFinisher = (winner) => {
		finisher.active = true;
		finisher.time = 0;
		finisher.winner = winner;
		finisher.playerBase = { x: playerActor.position.x, y: playerActor.position.y };
		finisher.cpuBase = { x: cpuActor.position.x, y: cpuActor.position.y };
		flash.alpha = 0;
		slash.alpha = 0;
	};

	const updateDifficultyText = () => {
		const entry = config.difficulties?.[state.difficulty];
		const label = entry?.label || state.difficulty;
		difficultyText.text = `Difficulty: ${label}`;
	};

	const buildDifficultyMenu = () => {
		for (const item of difficultyMenuItems) item.destroy({ children: true });
		difficultyMenuItems.length = 0;
		const keys = Object.keys(config.difficulties || {});
		const itemH = 26;
		const menuH = Math.max(1, keys.length) * itemH + 6;
		difficultyMenuBg.clear();
		difficultyMenuBg.beginFill(0xf6ecd1, 1);
		difficultyMenuBg.lineStyle(1, 0x1b2b42, 0.6);
			difficultyMenuBg.drawRoundedRect(0, 0, difficultyBtnSize.w, menuH, 4);
		difficultyMenuBg.endFill();
		keys.forEach((key, idx) => {
			const entry = config.difficulties[key];
			const label = entry?.label || key;
			const row = new PIXI.Graphics();
			row.beginFill(0x000000, key === state.difficulty ? 0.08 : 0.0);
			row.drawRect(0, 0, difficultyBtnSize.w, itemH);
			row.endFill();
			row.position.set(0, 3 + idx * itemH);
			row.eventMode = 'static';
			row.cursor = 'pointer';
			const text = new PIXI.Text(label, {
				fontFamily: 'Tahoma, Segoe UI, sans-serif',
				fontSize: 12,
				fill: 0x1b2b42,
			});
			text.position.set(10, 5);
			row.addChild(text);
			row.on('pointertap', (event) => {
				event.stopPropagation();
				state.difficulty = key;
				updateDifficultyText();
				difficultyMenu.visible = false;
			});
			difficultyMenu.addChild(row);
			difficultyMenuItems.push(row);
		});
	};

	difficultyBtn.on('pointertap', (event) => {
		event.stopPropagation();
		buildDifficultyMenu();
		difficultyMenu.visible = !difficultyMenu.visible;
	});

	const addHoverScale = (target, scale = 1.06) => {
		target.on('pointerover', () => { target.scale.set(scale); });
		target.on('pointerout', () => { target.scale.set(1); });
	};
	addHoverScale(startBtn, 1.06);
	addHoverScale(difficultyBtn, 1.04);
	addHoverScale(closeBtn, 1.08);
	startBtn.on('pointertap', beginRound);
	closeBtn.on('pointertap', () => close());
	window.addEventListener('keydown', onKeyDown);

	const dragState = { active: false, offsetX: 0, offsetY: 0 };
	closeBtn.on('pointerdown', (event) => {
		event.stopPropagation();
	});
	headerBg.on('pointerdown', (event) => {
		const pos = event.getLocalPosition(world);
		dragState.active = true;
		dragState.offsetX = pos.x - container.position.x;
		dragState.offsetY = pos.y - container.position.y;
	});
	app.stage.on('pointermove', (event) => {
		if (!dragState.active) return;
		const pos = event.getLocalPosition(world);
		container.position.set(pos.x - dragState.offsetX, pos.y - dragState.offsetY);
	});
	app.stage.on('pointerup', () => { dragState.active = false; });
	app.stage.on('pointerupoutside', () => { dragState.active = false; });
	app.stage.on('pointerdown', (event) => {
		if (!difficultyMenu.visible) return;
		const target = event.target;
		const inMenu = difficultyMenuItems.includes(target) || difficultyMenuItems.includes(target?.parent);
		if (target === difficultyBtn || inMenu) return;
		difficultyMenu.visible = false;
	});

	container.addChild(panelFill, flow.container, panelMask, headerBg, title, closeBtn);
	container.addChild(stageBg, stageMask, stage, flash, slash, playerActor, cpuActor, playerLabel, cpuLabel, arrowGroup, status, metrics, result, hint, streakText, difficultyBtn, difficultyMenu, startBtn, panelBorder);

	const layout = () => {
		const cx = app.renderer.width / 2;
		const cy = app.renderer.height / 2;
		const worldX = screenToWorldX(cx - windowWidth / 2);
		const worldY = screenToWorldY(cy - windowHeight / 2);
		container.position.set(worldX, worldY);
		panelMask.position.set(0, 0);
		panelBorder.position.set(0, 0);
		stageBg.position.set(stageX, stageY);
		stageMask.position.set(stageX, stageY);
		difficultyBtn.position.set((windowWidth - difficultyBtnSize.w) / 2, stageY + stageH + 34);
		difficultyMenu.position.set(difficultyBtn.position.x, difficultyBtn.position.y + difficultyBtnSize.h + 4);
		startBtn.position.set(windowWidth - padding - startBtnSize.w, windowHeight - 36);
		flow.resize?.();
	};

	layout();
	updateDifficultyText();
	world.addChild(container);
	app.ticker.add((dt) => {
		if (!state.open) return;
		flowTime += dt / 60;
		flow.update?.(flowTime, { x: 0, y: 0 });
		if (finisher.active) {
			finisher.time += dt / 60;
			const t = finisher.time;
			flash.alpha = t < 0.1 ? 0.9 : (t < 0.22 ? 0.9 * (1 - (t - 0.1) / 0.12) : 0);
			if (t > 0.18 && t < 0.5) {
				const p = t < 0.3 ? (t - 0.18) / 0.12 : (0.5 - t) / 0.2;
				slash.alpha = Math.max(0, Math.min(1, p));
			} else {
				slash.alpha = 0;
			}
			const winnerIsPlayer = finisher.winner === 'player';
			const winnerCube = winnerIsPlayer ? playerActor : cpuActor;
			const loserCube = winnerIsPlayer ? cpuActor : playerActor;
			const baseWinner = winnerIsPlayer ? finisher.playerBase : finisher.cpuBase;
			const baseLoser = winnerIsPlayer ? finisher.cpuBase : finisher.playerBase;
			const behindOffset = winnerIsPlayer ? 18 : -18;
			if (t < 0.12) {
				winnerCube.alpha = 1 - t / 0.12;
				winnerCube.position.set(baseWinner.x, baseWinner.y);
			} else if (t < 0.28) {
				winnerCube.alpha = 0;
				winnerCube.position.set(baseLoser.x + behindOffset, baseLoser.y);
			} else if (t < 0.36) {
				winnerCube.alpha = (t - 0.28) / 0.08;
				winnerCube.position.set(baseLoser.x + behindOffset, baseLoser.y);
			} else {
				winnerCube.alpha = 1;
			}
			if (t > 0.2) {
				const loss = Math.min(1, (t - 0.2) / 0.15);
				loserCube.alpha = 1 - loss * 0.8;
			} else {
				loserCube.alpha = 1;
			}
			if (t >= 0.75) {
				finisher.active = false;
				playerActor.alpha = 1;
				cpuActor.alpha = 1;
				playerActor.position.set(finisher.playerBase.x, finisher.playerBase.y);
				cpuActor.position.set(finisher.cpuBase.x, finisher.cpuBase.y);
				flash.alpha = 0;
				slash.alpha = 0;
			}
		}
	});

	const open = () => {
		container.visible = true;
		state.open = true;
		startText.text = 'Start';
		difficultyMenu.visible = false;
		layout();
		updateStreakDisplay();
		beginRound();
	};

	const close = () => {
		for (const id of state.timers) window.clearTimeout(id);
		state.timers.clear();
		state.open = false;
		container.visible = false;
		difficultyMenu.visible = false;
		state.phase = 'idle';
		status.text = 'Press Start to begin.';
		result.text = 'Waiting for round...';
		setExpectedDirection(null);
		resetCubes();
		updateMetrics(null, null);
		updateStreakDisplay();
	};

	return { container, open, close, layout };
}
