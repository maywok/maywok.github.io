const SUITS = [
	{ id: 'red', label: '♥', color: 0xff5667 },
	{ id: 'green', label: '♣', color: 0x37ff7a },
	{ id: 'white', label: '♠', color: 0xf4f7ff },
	{ id: 'teal', label: '♦', color: 0x22f3c8 },
];

const RANKS = [
	{ id: '2', value: 2 },
	{ id: '3', value: 3 },
	{ id: '4', value: 4 },
	{ id: '5', value: 5 },
	{ id: '6', value: 6 },
	{ id: '7', value: 7 },
	{ id: '8', value: 8 },
	{ id: '9', value: 9 },
	{ id: '10', value: 10 },
	{ id: 'J', value: 11 },
	{ id: 'Q', value: 12 },
	{ id: 'K', value: 13 },
	{ id: 'A', value: 14 },
];

const UPGRADE_LIBRARY = [
	{ id: 'neon_tip', name: 'Neon Tip', baseCost: 4, desc: '+10 score', apply: (mods) => { mods.flat += 10; } },
	{ id: 'double_glow', name: 'Double Glow', baseCost: 7, desc: '+0.2x mult', apply: (mods) => { mods.mult += 0.2; } },
	{ id: 'pair_bounty', name: 'Pair Bounty', baseCost: 5, desc: '+20 if pair+', apply: (mods) => { mods.pairBonus += 20; } },
	{ id: 'straight_shot', name: 'Straight Shot', baseCost: 6, desc: '+25 if straight', apply: (mods) => { mods.straightBonus += 25; } },
	{ id: 'flush_bloom', name: 'Flush Bloom', baseCost: 6, desc: '+25 if flush', apply: (mods) => { mods.flushBonus += 25; } },
	{ id: 'boss_breaker', name: 'Boss Breaker', baseCost: 8, desc: '+30 on boss', apply: (mods) => { mods.bossBonus += 30; } },
	{ id: 'reroll_chip', name: 'Reroll Chip', baseCost: 5, desc: '+1 shop reroll', apply: (mods) => { mods.shopRerolls += 1; } },
	{ id: 'coin_siphon', name: 'Coin Siphon', baseCost: 6, desc: '+3 coins', apply: (mods) => { mods.coinBonus += 3; } },
];

function shuffle(array) {
	for (let i = array.length - 1; i > 0; i -= 1) {
		const j = Math.floor(Math.random() * (i + 1));
		[array[i], array[j]] = [array[j], array[i]];
	}
	return array;
}

function createDeck() {
	const deck = [];
	for (const suit of SUITS) {
		for (const rank of RANKS) {
			deck.push({ suit, rank });
		}
	}
	return shuffle(deck);
}

function evaluateHand(cards) {
	const rankCounts = new Map();
	const suitCounts = new Map();
	let highest = 0;
	for (const card of cards) {
		rankCounts.set(card.rank.value, (rankCounts.get(card.rank.value) || 0) + 1);
		suitCounts.set(card.suit.id, (suitCounts.get(card.suit.id) || 0) + 1);
		if (card.rank.value > highest) highest = card.rank.value;
	}
	const counts = Array.from(rankCounts.values()).sort((a, b) => b - a);
	const isFlush = suitCounts.size === 1;
	const uniqueRanks = Array.from(rankCounts.keys()).sort((a, b) => a - b);
	const isStraight = uniqueRanks.length === 5 && (
		(uniqueRanks[4] - uniqueRanks[0] === 4) ||
		(uniqueRanks[0] === 2 && uniqueRanks[1] === 3 && uniqueRanks[2] === 4 && uniqueRanks[3] === 5 && uniqueRanks[4] === 14)
	);
	const isFour = counts[0] === 4;
	const isThree = counts[0] === 3;
	const isPair = counts[0] === 2;
	const isTwoPair = counts[0] === 2 && counts[1] === 2;
	const isFullHouse = counts[0] === 3 && counts[1] === 2;
	const isStraightFlush = isStraight && isFlush;
	let name = 'High Card';
	let mult = 1;
	if (isStraightFlush) { name = 'Straight Flush'; mult = 9; }
	else if (isFour) { name = 'Four of a Kind'; mult = 7; }
	else if (isFullHouse) { name = 'Full House'; mult = 5; }
	else if (isFlush) { name = 'Flush'; mult = 4; }
	else if (isStraight) { name = 'Straight'; mult = 4; }
	else if (isThree) { name = 'Three of a Kind'; mult = 3; }
	else if (isTwoPair) { name = 'Two Pair'; mult = 2; }
	else if (isPair) { name = 'Pair'; mult = 1.5; }
	const baseScore = 10 + Math.floor(highest / 2);
	return {
		name,
		baseScore,
		mult,
		highest,
		isFlush,
		isStraight,
		isPairPlus: isPair || isTwoPair || isThree || isFullHouse || isFour || isStraight || isFlush,
	};
}

function clamp(value, min, max) {
	return Math.min(max, Math.max(min, value));
}

function hsvToRgb(h, s, v) {
	const c = v * s;
	const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
	const m = v - c;
	let r = 0;
	let g = 0;
	let b = 0;
	if (h < 60) { r = c; g = x; }
	else if (h < 120) { r = x; g = c; }
	else if (h < 180) { g = c; b = x; }
	else if (h < 240) { g = x; b = c; }
	else if (h < 300) { r = x; b = c; }
	else { r = c; b = x; }
	return ((Math.round((r + m) * 255) << 16)
		| (Math.round((g + m) * 255) << 8)
		| Math.round((b + m) * 255));
}

function createButton(label, width, height, colors) {
	const container = new PIXI.Container();
	const bg = new PIXI.Graphics();
	const text = new PIXI.Text(label, {
		fontFamily: 'Minecraft, monospace',
		fontSize: 10,
		fill: colors.text,
	});
	text.anchor.set(0.5);
	text.position.set(width / 2, height / 2 + 1);
	bg.beginFill(colors.fill, colors.alpha ?? 1);
	bg.lineStyle(1, colors.border, 0.85);
	bg.drawRoundedRect(0, 0, width, height, 4);
	bg.endFill();
	container.addChild(bg, text);
	container.eventMode = 'static';
	container.cursor = 'pointer';
	container.hitArea = new PIXI.Rectangle(0, 0, width, height);
	container._bg = bg;
	container._label = text;
	container._size = { width, height };
	container._enabled = true;
	container.setEnabled = (enabled) => {
		container._enabled = Boolean(enabled);
		container.alpha = enabled ? 1 : 0.45;
		container.eventMode = enabled ? 'static' : 'none';
		container.cursor = enabled ? 'pointer' : 'default';
	};
	container.setLabel = (next) => {
		text.text = next;
	};
	return container;
}

function createSwirlTexture(colors) {
	const size = 512;
	const canvas = document.createElement('canvas');
	canvas.width = size;
	canvas.height = size;
	const ctx = canvas.getContext('2d');
	if (!ctx) return PIXI.Texture.WHITE;
	ctx.clearRect(0, 0, size, size);
	const base = ctx.createRadialGradient(size * 0.35, size * 0.35, 0, size * 0.5, size * 0.5, size * 0.9);
	base.addColorStop(0, 'rgba(4,6,10,0.85)');
	base.addColorStop(1, 'rgba(4,6,10,1)');
	ctx.fillStyle = base;
	ctx.fillRect(0, 0, size, size);
	const red = colors.red;
	const blue = colors.blue;
	const redGrad = ctx.createRadialGradient(size * 0.18, size * 0.22, 20, size * 0.18, size * 0.22, size * 1.1);
	redGrad.addColorStop(0, `rgba(${(red >> 16) & 255}, ${(red >> 8) & 255}, ${red & 255}, 0.8)`);
	redGrad.addColorStop(1, 'rgba(0,0,0,0)');
	ctx.fillStyle = redGrad;
	ctx.fillRect(0, 0, size, size);
	const blueGrad = ctx.createRadialGradient(size * 0.78, size * 0.6, 20, size * 0.78, size * 0.6, size * 1.1);
	blueGrad.addColorStop(0, `rgba(${(blue >> 16) & 255}, ${(blue >> 8) & 255}, ${blue & 255}, 0.78)`);
	blueGrad.addColorStop(1, 'rgba(0,0,0,0)');
	ctx.fillStyle = blueGrad;
	ctx.fillRect(0, 0, size, size);
	ctx.translate(size / 2, size / 2);
	ctx.rotate(-0.35);
	ctx.strokeStyle = `rgba(${(red >> 16) & 255}, ${(red >> 8) & 255}, ${red & 255}, 0.32)`;
	ctx.lineWidth = 18;
	ctx.beginPath();
	for (let t = 0; t < Math.PI * 5; t += 0.09) {
		const r = 12 + t * 16;
		const x = Math.cos(t) * r;
		const y = Math.sin(t) * r;
		if (t === 0) ctx.moveTo(x, y);
		else ctx.lineTo(x, y);
	}
	ctx.stroke();
	ctx.setTransform(1, 0, 0, 1, 0, 0);
	return PIXI.Texture.from(canvas);
}

function createNoiseTexture() {
	const size = 128;
	const canvas = document.createElement('canvas');
	canvas.width = size;
	canvas.height = size;
	const ctx = canvas.getContext('2d');
	if (!ctx) return PIXI.Texture.WHITE;
	const image = ctx.createImageData(size, size);
	for (let i = 0; i < image.data.length; i += 4) {
		const v = Math.floor(Math.random() * 255);
		image.data[i] = v;
		image.data[i + 1] = v;
		image.data[i + 2] = v;
		image.data[i + 3] = 255;
	}
	ctx.putImageData(image, 0, 0);
	return PIXI.Texture.from(canvas);
}

export function createWalklatroOverlay(app, world, options = {}) {
	const screenScale = options.screenScale ?? 1;
	const colors = {
		bg: 0x07090c,
		panel: 0x0b0f13,
		panelBorder: 0x1a1f27,
		header: 0x0f141a,
		headerEdge: 0x1c2430,
		text: 0xf4f7ff,
		muted: 0xa3b2c4,
		red: 0xff5667,
		blue: 0x2b6fff,
		green: 0x37ff7a,
		white: 0xf4f7ff,
		teal: 0x22f3c8,
	};
	const state = {
		open: false,
		round: 1,
		ante: 1,
		coins: 0,
		phase: 'hand',
		boss: false,
		target: 0,
		roundScore: 0,
		animating: false,
		animTimer: 0,
		scoring: false,
		deck: [],
		discardPile: [],
		hand: [],
		selected: new Set(),
		playsLeft: 3,
		discardsLeft: 3,
		lastScore: 0,
		lastHandName: '',
		shop: [],
		upgrades: [],
		mods: {
			flat: 0,
			mult: 1,
			pairBonus: 0,
			straightBonus: 0,
			flushBonus: 0,
			bossBonus: 0,
			shopRerolls: 0,
			coinBonus: 0,
		},
		shopRerollsRemaining: 0,
	};

	const screenToWorldX = (screenX) => {
		const cx = app.renderer.width / 2;
		return (screenX - cx) / screenScale + cx;
	};
	const screenToWorldY = (screenY) => {
		const cy = app.renderer.height / 2;
		return (screenY - cy) / screenScale + cy;
	};
	const screenToWorldSize = (screenSize) => screenSize / screenScale;

	const windowWidth = Math.min(720, app.renderer.width * 0.95);
	const windowHeight = Math.min(460, app.renderer.height * 0.85);
	const headerHeight = 26;
	const padding = 12;

	const container = new PIXI.Container();
	container.visible = false;
	container.eventMode = 'static';
	container.hitArea = new PIXI.Rectangle(0, 0, windowWidth, windowHeight);
	container.zIndex = 55;

	const panelFill = new PIXI.Graphics();
	panelFill.beginFill(colors.panel, 0.98);
	panelFill.drawRect(0, 0, windowWidth, windowHeight);
	panelFill.endFill();

	const panelBorder = new PIXI.Graphics();
	panelBorder.lineStyle(2, colors.panelBorder, 1);
	panelBorder.drawRect(0, 0, windowWidth, windowHeight);

	const panelMask = new PIXI.Graphics();
	panelMask.beginFill(0xffffff, 1);
	panelMask.drawRect(0, 0, windowWidth, windowHeight);
	panelMask.endFill();
	panelMask.renderable = false;

	const headerBg = new PIXI.Graphics();
	headerBg.beginFill(colors.header, 1);
	headerBg.drawRect(0, 0, windowWidth, headerHeight);
	headerBg.endFill();
	headerBg.beginFill(colors.headerEdge, 1);
	headerBg.drawRect(0, headerHeight - 6, windowWidth, 6);
	headerBg.endFill();
	headerBg.eventMode = 'static';
	headerBg.cursor = 'move';
	headerBg.hitArea = new PIXI.Rectangle(0, 0, windowWidth, headerHeight);

	const title = new PIXI.Text('Walklatro', {
		fontFamily: 'Minecraft, monospace',
		fontSize: 12,
		fill: colors.teal,
	});
	title.position.set(10, 6);

	const closeBtn = new PIXI.Graphics();
	closeBtn.beginFill(colors.red, 1);
	closeBtn.lineStyle(1, 0x000000, 0.6);
	closeBtn.drawRoundedRect(0, 0, 24, 20, 4);
	closeBtn.endFill();
	closeBtn.position.set(windowWidth - 34, 3);
	closeBtn.eventMode = 'static';
	closeBtn.cursor = 'pointer';
	const closeX = new PIXI.Text('X', {
		fontFamily: 'Minecraft, monospace',
		fontSize: 10,
		fill: colors.white,
	});
	closeX.anchor.set(0.5);
	closeX.position.set(12, 10);
	closeBtn.addChild(closeX);

	const statsText = new PIXI.Text('', {
		fontFamily: 'Minecraft, monospace',
		fontSize: 10,
		fill: colors.white,
	});
	statsText.position.set(padding, headerHeight + 6);

	const playsText = new PIXI.Text('', {
		fontFamily: 'Minecraft, monospace',
		fontSize: 9,
		fill: colors.muted,
	});
	playsText.position.set(padding, headerHeight + 22);

	const targetText = new PIXI.Text('', {
		fontFamily: 'Minecraft, monospace',
		fontSize: 9,
		fill: colors.red,
	});
	targetText.position.set(padding, headerHeight + 36);

	const resultText = new PIXI.Text('', {
		fontFamily: 'Minecraft, monospace',
		fontSize: 10,
		fill: colors.muted,
	});
	resultText.position.set(padding, headerHeight + 52);

	const handArea = new PIXI.Container();
	handArea.position.set(padding, headerHeight + 82);
	const animLayer = new PIXI.Container();
	animLayer.position.set(padding, headerHeight + 82);
	animLayer.eventMode = 'none';
	animLayer.visible = false;
	const scoreLayer = new PIXI.Container();
	scoreLayer.position.set(padding, headerHeight + 82);
	scoreLayer.eventMode = 'none';

	const shopArea = new PIXI.Container();
	shopArea.position.set(padding, headerHeight + 210);

	const actionColors = {
		fill: 0x0b1418,
		border: colors.teal,
		text: colors.white,
		alpha: 0.9,
	};

	const playBtn = createButton('Play Hand', 150, 32, actionColors);
	const discardBtn = createButton('Discard', 120, 28, {
		fill: 0x0b1418,
		border: colors.white,
		text: colors.white,
		alpha: 0.7,
	});
	const nextBtn = createButton('Next Round', 110, 24, actionColors);
	const skipBtn = createButton('Skip Shop', 100, 20, {
		fill: 0x0b1418,
		border: colors.white,
		text: colors.white,
		alpha: 0.7,
	});
	const rerollBtn = createButton('Reroll', 76, 20, {
		fill: 0x0b1418,
		border: colors.green,
		text: colors.green,
		alpha: 0.8,
	});
	const restartBtn = createButton('New Run', 110, 24, {
		fill: 0x0b1418,
		border: colors.red,
		text: colors.white,
		alpha: 0.9,
	});

	const actionBar = new PIXI.Graphics();
	const actionBarHeight = 48;
	actionBar.beginFill(0x0b0f13, 0.78);
	actionBar.lineStyle(1, colors.panelBorder, 0.6);
	actionBar.drawRect(0, windowHeight - actionBarHeight - padding + 6, windowWidth, actionBarHeight);
	actionBar.endFill();

	const bottomY = windowHeight - padding - 32;
	const actionRightX = windowWidth - padding - 150;
	const actionLeftX = actionRightX - 130;
	const actionMidX = actionLeftX - 96;
	playBtn.position.set(actionRightX, bottomY);
	discardBtn.position.set(actionLeftX, bottomY + 2);
	rerollBtn.position.set(actionMidX, bottomY + 4);
	nextBtn.position.set(actionRightX, bottomY);
	skipBtn.position.set(actionLeftX, bottomY + 2);
	restartBtn.position.set(windowWidth - padding - 110, headerHeight + 32);

	const upgradeTitle = new PIXI.Text('Shop', {
		fontFamily: 'Minecraft, monospace',
		fontSize: 10,
		fill: colors.teal,
	});
	upgradeTitle.position.set(0, 0);
	shopArea.addChild(upgradeTitle);

	const upgradeRows = [];
	const shopRowHeight = 24;
	const shopRowWidth = windowWidth - padding * 2 - 120;

	const createStaticCard = (card, cardW, cardH) => {
		const container = new PIXI.Container();
		const bg = new PIXI.Graphics();
		const border = new PIXI.Graphics();
		bg.beginFill(0x030508, 1);
		bg.drawRoundedRect(0, 0, cardW, cardH, 6);
		bg.endFill();
		border.lineStyle(2, card.suit.color, 0.95);
		border.drawRoundedRect(0, 0, cardW, cardH, 6);
		const rank = new PIXI.Text(card.rank.id, {
			fontFamily: 'Minecraft, monospace',
			fontSize: 16,
			fill: card.suit.color,
		});
		rank.position.set(8, 6);
		const suit = new PIXI.Text(card.suit.label, {
			fontFamily: 'Minecraft, monospace',
			fontSize: 22,
			fill: card.suit.color,
		});
		suit.anchor.set(0.5);
		suit.position.set(cardW / 2, cardH / 2 + 8);
		const footer = new PIXI.Text(card.rank.id, {
			fontFamily: 'Minecraft, monospace',
			fontSize: 14,
			fill: card.suit.color,
		});
		footer.anchor.set(1, 1);
		footer.position.set(cardW - 6, cardH - 6);
		container.addChild(bg, border, rank, suit, footer);
		return container;
	};

	const drawCard = (card, index) => {
		const cardW = 78;
		const cardH = 104;
		const container = new PIXI.Container();
		const bg = new PIXI.Graphics();
		const border = new PIXI.Graphics();
		const glow = new PIXI.Graphics();
		const drawBg = () => {
			bg.clear();
			bg.beginFill(0x030508, 1);
			bg.drawRoundedRect(0, 0, cardW, cardH, 6);
			bg.endFill();
			border.clear();
			border.lineStyle(2, card.suit.color, 0.95);
			border.drawRoundedRect(0, 0, cardW, cardH, 6);
		};
		drawBg();
		glow.visible = false;
		const rank = new PIXI.Text(card.rank.id, {
			fontFamily: 'Minecraft, monospace',
			fontSize: 16,
			fill: card.suit.color,
		});
		rank.position.set(8, 6);
		const suit = new PIXI.Text(card.suit.label, {
			fontFamily: 'Minecraft, monospace',
			fontSize: 22,
			fill: card.suit.color,
		});
		suit.anchor.set(0.5);
		suit.position.set(cardW / 2, cardH / 2 + 8);
		const footer = new PIXI.Text(card.rank.id, {
			fontFamily: 'Minecraft, monospace',
			fontSize: 14,
			fill: card.suit.color,
		});
		footer.anchor.set(1, 1);
		footer.position.set(cardW - 6, cardH - 6);
		container.addChild(glow, bg, border, rank, suit, footer);
		container.eventMode = 'static';
		container.cursor = 'pointer';
		container.hitArea = new PIXI.Rectangle(0, 0, cardW, cardH);
		container._index = index;
		container._setSelected = (selected) => {
			container._selected = Boolean(selected);
			glow.visible = selected;
		};
		container._glow = glow;
		container._border = border;
		container._size = { width: cardW, height: cardH };
		container._base = { x: 0, y: 0 };
		container._selected = false;
		container._hovered = false;
		container._tilt = { x: 0, y: 0 };
		container._tiltTarget = { x: 0, y: 0 };
		container._lift = 0;
		container._liftTarget = 0;
		container._size = { width: cardW, height: cardH };
		container.on('pointerover', () => {
			container._hovered = true;
		});
		container.on('pointerout', () => {
			container._hovered = false;
			container._tiltTarget.x = 0;
			container._tiltTarget.y = 0;
		});
		container.on('pointermove', (event) => {
			const local = event.getLocalPosition(container);
			const nx = clamp((local.x / cardW) * 2 - 1, -1, 1);
			const ny = clamp((local.y / cardH) * 2 - 1, -1, 1);
			container._tiltTarget.x = -ny * 0.12;
			container._tiltTarget.y = nx * 0.12;
		});
		return container;
	};

	const drawHand = () => {
		handArea.removeChildren();
		state.handSprites = [];
		const cards = state.hand;
		if (!cards.length) return;
		const cardW = 78;
		const cardH = 104;
		const gap = 14;
		const totalW = cards.length * cardW + (cards.length - 1) * gap;
		const startX = (windowWidth - padding * 2 - totalW) / 2;
		state.handLayout = { startX, cardW, cardH, gap };
		cards.forEach((card, idx) => {
			const cardSprite = drawCard(card, idx);
			cardSprite.position.set(startX + idx * (cardW + gap), 0);
			cardSprite._base.x = cardSprite.position.x;
			cardSprite._base.y = cardSprite.position.y;
			cardSprite.on('pointertap', () => {
				if (state.phase !== 'hand' || state.animating) return;
				if (state.selected.has(idx)) {
					state.selected.delete(idx);
					cardSprite._setSelected(false);
					updatePhaseUI();
					return;
				}
				if (state.selected.size >= 5) return;
				state.selected.add(idx);
				cardSprite._setSelected(true);
				updatePhaseUI();
			});
			handArea.addChild(cardSprite);
			state.handSprites[idx] = cardSprite;
		});
	};

	const refreshSelection = () => {
		for (const child of handArea.children) {
			const idx = child._index;
			if (typeof child._setSelected === 'function') {
				child._setSelected(state.selected.has(idx));
			}
		}
	};

	const updateStats = () => {
		statsText.text = `Round ${state.round}  Ante ${state.ante}  Coins ${state.coins}`;
		playsText.text = `Plays ${state.playsLeft}  Discards ${state.discardsLeft}`;
		if (state.boss) {
			targetText.text = `Boss target ${state.target}  Score ${state.roundScore}`;
			targetText.visible = true;
		} else {
			targetText.text = `Score ${state.roundScore}`;
			targetText.visible = true;
		}
	};

	const updatePhaseUI = () => {
		playBtn.visible = state.phase === 'hand';
		discardBtn.visible = state.phase === 'hand';
		nextBtn.visible = state.phase === 'shop';
		skipBtn.visible = state.phase === 'shop';
		rerollBtn.visible = state.phase === 'shop' && state.shopRerollsRemaining > 0;
		restartBtn.visible = state.phase === 'gameover';
		shopArea.visible = state.phase === 'shop';
		playBtn.setEnabled(state.phase === 'hand' && !state.animating && state.selected.size > 0);
		discardBtn.setEnabled(state.phase === 'hand' && !state.animating && state.discardsLeft > 0 && state.selected.size > 0);
		nextBtn.setEnabled(state.phase === 'shop');
		skipBtn.setEnabled(state.phase === 'shop');
		rerollBtn.setEnabled(state.phase === 'shop' && state.shopRerollsRemaining > 0);
		restartBtn.setEnabled(state.phase === 'gameover');
	};

	const drawFromDeck = (count) => {
		const drawn = [];
		for (let i = 0; i < count; i += 1) {
			if (!state.deck.length && state.discardPile.length) {
				state.deck = shuffle(state.discardPile.splice(0));
			}
			const card = state.deck.pop();
			if (!card) break;
			drawn.push(card);
		}
		return drawn;
	};

	const animations = [];
	const scoreAnimations = [];
	const queueScoreAnimation = (indices, perCardScore, onDone) => {
		if (!indices.length) {
			onDone?.();
			return;
		}
		state.scoring = true;
		scoreLayer.removeChildren();
		scoreAnimations.length = 0;
		indices.forEach((idx, order) => {
			const sprite = state.handSprites?.[idx];
			if (!sprite) return;
			const baseX = sprite._base?.x ?? sprite.position.x;
			const baseY = sprite._base?.y ?? sprite.position.y;
			const text = new PIXI.Text(`+${perCardScore}`, {
				fontFamily: 'Minecraft, monospace',
				fontSize: 12,
				fill: colors.teal,
			});
			text.anchor.set(0.5, 1);
			text.position.set(baseX + 39, baseY - 4);
			scoreLayer.addChild(text);
			scoreAnimations.push({
				sprite,
				text,
				baseX,
				baseY,
				delay: order * 0.06,
				duration: 0.18,
				elapsed: 0,
			});
		});
		state.scoreDone = onDone;
	};
	const queueSwapAnimation = (oldHand, newHand, replaceIndices) => {
		const layout = state.handLayout;
		if (!layout) return;
		const { startX, cardW, cardH, gap } = layout;
		if (!replaceIndices.length) return;
		state.animating = true;
		state.animTimer = 0;
		animLayer.removeChildren();
		animLayer.visible = true;
		replaceIndices.forEach((idx) => {
			const slotX = startX + idx * (cardW + gap);
			const slotY = 0;
			const oldCard = oldHand[idx];
			const newCard = newHand[idx];
			const existing = state.handSprites?.[idx];
			if (existing) {
				existing.visible = false;
				existing.eventMode = 'none';
				existing.cursor = 'default';
			}
			if (oldCard) {
				const oldSprite = createStaticCard(oldCard, cardW, cardH);
				oldSprite.position.set(slotX, slotY);
				animLayer.addChild(oldSprite);
				animations.push({
					sprite: oldSprite,
					from: { x: slotX, y: slotY },
					to: { x: slotX + 50, y: slotY - 40 },
					duration: 0.18,
					elapsed: 0,
					fadeOut: true,
				});
			}
			if (newCard) {
				const newSprite = createStaticCard(newCard, cardW, cardH);
				newSprite.position.set(slotX, slotY + 40);
				newSprite.alpha = 0;
				animLayer.addChild(newSprite);
				animations.push({
					sprite: newSprite,
					from: { x: slotX, y: slotY + 40 },
					to: { x: slotX, y: slotY },
					duration: 0.2,
					elapsed: 0,
					fadeIn: true,
				});
			}
		});
	};


	const getUpgradeCost = (upgrade) => upgrade.baseCost + Math.max(0, state.ante - 1);

	const renderShop = () => {
		for (const row of upgradeRows) row.destroy({ children: true });
		upgradeRows.length = 0;
		const items = state.shop;
		items.forEach((upgrade, idx) => {
			const row = new PIXI.Container();
			const bg = new PIXI.Graphics();
			bg.beginFill(0x0b0f13, 0.85);
			bg.lineStyle(1, colors.panelBorder, 0.9);
			bg.drawRoundedRect(0, 0, shopRowWidth, shopRowHeight, 4);
			bg.endFill();
			const label = new PIXI.Text(`${upgrade.name} - ${upgrade.desc}`, {
				fontFamily: 'Minecraft, monospace',
				fontSize: 9,
				fill: colors.white,
			});
			label.position.set(6, 6);
			const cost = getUpgradeCost(upgrade);
			const buyBtn = createButton(`Buy ${cost}`, 60, 18, {
				fill: 0x0b1418,
				border: colors.teal,
				text: colors.teal,
				alpha: 0.9,
			});
			buyBtn.position.set(shopRowWidth + 10, 3);
			buyBtn.setEnabled(state.coins >= cost);
			buyBtn.on('pointertap', () => {
				if (state.coins < cost) return;
				state.coins -= cost;
				state.upgrades.push(upgrade.id);
				upgrade.apply(state.mods);
				state.shop = [];
				renderShop();
				updateStats();
			});
			row.position.set(0, 18 + idx * (shopRowHeight + 6));
			row.addChild(bg, label, buyBtn);
			shopArea.addChild(row);
			upgradeRows.push(row);
		});
	};

	const buildShop = () => {
		const available = UPGRADE_LIBRARY.filter((u) => !state.upgrades.includes(u.id));
		shuffle(available);
		state.shop = available.slice(0, 3);
		renderShop();
	};

	const calculateTarget = () => {
		const base = 80 + state.ante * 25;
		return Math.round(state.boss ? base * 1.5 : base);
	};

	const drawHandRound = () => {
		state.deck = createDeck();
		state.discardPile = [];
		state.hand = drawFromDeck(7);
		drawHand();
		refreshSelection();
	};

	const beginRound = () => {
		state.boss = (state.round % 3 === 0);
		state.target = calculateTarget();
		state.phase = 'hand';
		state.shop = [];
		state.shopRerollsRemaining = state.mods.shopRerolls;
		state.playsLeft = 3;
		state.discardsLeft = 3;
		state.roundScore = 0;
		state.lastScore = 0;
		state.lastHandName = '';
		state.selected.clear();
		resultText.text = 'Select cards to play or discard.';
		drawHandRound();
		updateStats();
		updatePhaseUI();
	};

	const handlePlay = () => {
		if (!state.selected.size) return;
		if (state.scoring || state.animating) return;
		const selectedCards = Array.from(state.selected).map((idx) => state.hand[idx]).filter(Boolean);
		if (!selectedCards.length) return;
		const oldHand = state.hand.slice();
		const handInfo = evaluateHand(selectedCards);
		let score = handInfo.baseScore * handInfo.mult + state.mods.flat;
		if (handInfo.isPairPlus) score += state.mods.pairBonus;
		if (handInfo.isStraight) score += state.mods.straightBonus;
		if (handInfo.isFlush) score += state.mods.flushBonus;
		if (state.boss) score += state.mods.bossBonus;
		score = Math.round(score * state.mods.mult);
		const coinGain = Math.max(1, Math.round(score / 10) + state.mods.coinBonus);
		state.coins += coinGain;
		state.lastScore = score;
		state.lastHandName = handInfo.name;
		state.roundScore += score;
		resultText.text = `${handInfo.name} x${handInfo.mult} - Score ${score} (+${coinGain} coins)`;
		const replaceIndices = Array.from(state.selected).sort((a, b) => b - a);
		const sweepIndices = Array.from(state.selected).sort((a, b) => a - b);
		const perCardScore = Math.max(1, Math.round(score / sweepIndices.length));
		const finishPlay = () => {
			state.scoring = false;
			state.playsLeft = Math.max(0, state.playsLeft - 1);
			state.selected.clear();
			for (const idx of replaceIndices) {
				const [card] = state.hand.splice(idx, 1);
				if (card) state.discardPile.push(card);
				const [next] = drawFromDeck(1);
				if (next) state.hand.splice(idx, 0, next);
			}
			const newHand = state.hand.slice();
			queueSwapAnimation(oldHand, newHand, replaceIndices);
			if (state.boss && state.roundScore >= state.target) {
				state.phase = 'shop';
				buildShop();
				updateStats();
				updatePhaseUI();
				return;
			}
			if (state.playsLeft <= 0) {
				if (state.boss && state.roundScore < state.target) {
					state.phase = 'gameover';
					resultText.text = `Boss failed. Score ${state.roundScore} / ${state.target}`;
					updateStats();
					updatePhaseUI();
					return;
				}
				state.phase = 'shop';
				buildShop();
			}
			updateStats();
			updatePhaseUI();
		};
		queueScoreAnimation(sweepIndices, perCardScore, finishPlay);
	};

	const handleDiscard = () => {
		if (state.discardsLeft <= 0) return;
		if (!state.selected.size) return;
		const oldHand = state.hand.slice();
		const replaceIndices = Array.from(state.selected).sort((a, b) => b - a);
		state.selected.clear();
		for (const idx of replaceIndices) {
			const [card] = state.hand.splice(idx, 1);
			if (card) state.discardPile.push(card);
			const [next] = drawFromDeck(1);
			if (next) state.hand.splice(idx, 0, next);
		}
		state.discardsLeft = Math.max(0, state.discardsLeft - 1);
		const newHand = state.hand.slice();
		queueSwapAnimation(oldHand, newHand, replaceIndices);
		updateStats();
		updatePhaseUI();
	};

	const handleNextRound = () => {
		state.round += 1;
		if (state.round % 3 === 1) state.ante += 1;
		beginRound();
	};

	const handleReroll = () => {
		if (state.shopRerollsRemaining <= 0) return;
		state.shopRerollsRemaining -= 1;
		buildShop();
		updatePhaseUI();
	};

	const resetRun = () => {
		state.round = 1;
		state.ante = 1;
		state.coins = 0;
		state.upgrades = [];
		state.roundScore = 0;
		state.mods = {
			flat: 0,
			mult: 1,
			pairBonus: 0,
			straightBonus: 0,
			flushBonus: 0,
			bossBonus: 0,
			shopRerolls: 0,
			coinBonus: 0,
		};
		beginRound();
	};

	playBtn.on('pointertap', handlePlay);
	discardBtn.on('pointertap', handleDiscard);
	nextBtn.on('pointertap', handleNextRound);
	skipBtn.on('pointertap', handleNextRound);
	rerollBtn.on('pointertap', handleReroll);
	restartBtn.on('pointertap', resetRun);
	closeBtn.on('pointertap', () => close());

	const dragState = { active: false, offsetX: 0, offsetY: 0 };
	if (app?.stage) {
		app.stage.eventMode = 'static';
		app.stage.hitArea = app.screen;
	}
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

	let glowTime = 0;
	let swirlTime = 0;
	const updateSelectionGlow = (time) => {
		if (!state.selected.size) return;
		const hue = (time * 90) % 360;
		const color = hsvToRgb(hue, 1, 1);
		for (const child of handArea.children) {
			if (!child?._glow) continue;
			const selected = state.selected.has(child._index);
			if (!selected) {
				child._glow.visible = false;
				continue;
			}
			const w = child._size?.width ?? 78;
			const h = child._size?.height ?? 104;
			child._glow.visible = true;
			child._glow.clear();
			child._glow.lineStyle(4, color, 1);
			child._glow.drawRoundedRect(-3, -3, w + 6, h + 6, 9);
			child._glow.lineStyle(2, color, 0.65);
			child._glow.drawRoundedRect(-1, -1, w + 2, h + 2, 7);
		}
	};

	const swirlSprite = new PIXI.Sprite(createSwirlTexture(colors));
	swirlSprite.alpha = 0.34;
	swirlSprite.width = windowWidth;
	swirlSprite.height = windowHeight;
	swirlSprite.position.set(0, 0);

	const swirlDisplace = new PIXI.Sprite(createNoiseTexture());
	swirlDisplace.width = windowWidth;
	swirlDisplace.height = windowHeight;
	swirlDisplace.alpha = 0;
	swirlDisplace.visible = true;
	swirlDisplace.renderable = true;
	if (swirlDisplace.texture?.baseTexture) {
		swirlDisplace.texture.baseTexture.wrapMode = PIXI.WRAP_MODES.REPEAT;
	}
	const swirlFilter = new PIXI.filters.DisplacementFilter(swirlDisplace);
	swirlFilter.scale.set(28, 20);
	swirlSprite.filters = [swirlFilter];
	swirlSprite.mask = panelMask;

	container.addChild(
		panelFill,
		swirlDisplace,
		swirlSprite,
		panelMask,
		panelBorder,
		headerBg,
		title,
		closeBtn,
		statsText,
		playsText,
		targetText,
		resultText,
		handArea,
		scoreLayer,
		animLayer,
		shopArea,
		actionBar,
		playBtn,
		discardBtn,
		nextBtn,
		skipBtn,
		rerollBtn,
		restartBtn,
	);

	const layout = () => {
		const cx = app.renderer.width / 2;
		const cy = app.renderer.height / 2;
		const worldX = screenToWorldX(cx - windowWidth / 2);
		const worldY = screenToWorldY(cy - windowHeight / 2);
		container.position.set(worldX, worldY);
	};
	layout();
	world.addChild(container);

	app.ticker.add((dt) => {
		if (!state.open) return;
		glowTime += dt / 60;
		swirlTime += dt / 60;
		swirlDisplace.x = swirlTime * 24;
		swirlDisplace.y = swirlTime * 18;
		swirlSprite.rotation = Math.sin(swirlTime * 0.22) * 0.03;
		swirlSprite.alpha = 0.34 + Math.sin(swirlTime * 0.25) * 0.05;
		updateSelectionGlow(glowTime);
		if (state.scoring) {
			let active = 0;
			for (const anim of scoreAnimations) {
				anim.elapsed += dt / 60;
				const t = anim.elapsed - anim.delay;
				if (t < 0) continue;
				active += 1;
				const p = Math.min(1, t / anim.duration);
				const shake = Math.sin(p * 20) * (1 - p) * 2;
				anim.sprite.position.x = anim.baseX + shake;
				anim.sprite.position.y = anim.baseY - (1 - Math.cos(p * Math.PI)) * 2;
				anim.text.alpha = 1 - p;
				anim.text.position.y = anim.baseY - 8 - p * 10;
				if (p >= 1) {
					anim.sprite.position.x = anim.baseX;
					anim.sprite.position.y = anim.baseY;
				}
			}
			if (active === 0) {
				scoreLayer.removeChildren();
				scoreAnimations.length = 0;
				state.scoring = false;
				state.scoreDone?.();
				state.scoreDone = null;
			}
		}
		for (let i = animations.length - 1; i >= 0; i -= 1) {
			const anim = animations[i];
			anim.elapsed += dt / 60;
			const t = Math.min(1, anim.elapsed / anim.duration);
			const ease = 1 - Math.pow(1 - t, 3);
			anim.sprite.position.set(
				anim.from.x + (anim.to.x - anim.from.x) * ease,
				anim.from.y + (anim.to.y - anim.from.y) * ease,
			);
			if (anim.fadeOut) anim.sprite.alpha = 1 - ease;
			if (anim.fadeIn) anim.sprite.alpha = ease;
			if (t >= 1) {
				anim.sprite.destroy({ children: true });
				animations.splice(i, 1);
			}
		}
		if (state.animating) {
			state.animTimer += dt / 60;
			if (state.animTimer > 0.4 && animations.length > 0) {
				for (const anim of animations) {
					anim.sprite.destroy({ children: true });
				}
				animations.length = 0;
			}
		}
		if (state.animating && animations.length === 0) {
			state.animating = false;
			animLayer.removeChildren();
			animLayer.visible = false;
			drawHand();
			refreshSelection();
			updatePhaseUI();
		}
		const ease = 0.18;
		for (const child of handArea.children) {
			if (!child?._tilt) continue;
			child._tilt.x += (child._tiltTarget.x - child._tilt.x) * ease;
			child._tilt.y += (child._tiltTarget.y - child._tilt.y) * ease;
			child.skew.set(child._tilt.x, child._tilt.y);
			const baseLift = child._selected ? 10 : 0;
			const hoverLift = child._hovered ? 6 : 0;
			child._liftTarget = baseLift + hoverLift;
			child._lift += (child._liftTarget - child._lift) * ease;
			const baseY = child._base?.y ?? child.position.y;
			child.position.y = baseY - child._lift;
			const targetScale = child._hovered ? 1.05 : 1;
			child.scale.x += (targetScale - child.scale.x) * ease;
			child.scale.y += (targetScale - child.scale.y) * ease;
		}
	});

	const open = () => {
		container.visible = true;
		state.open = true;
		resetRun();
		layout();
	};

	const close = () => {
		state.open = false;
		container.visible = false;
	};

	return { open, close, container };
}
