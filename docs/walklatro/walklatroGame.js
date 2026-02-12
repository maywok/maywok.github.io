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

	const windowWidth = Math.min(480, app.renderer.width * 0.9);
	const windowHeight = Math.min(320, app.renderer.height * 0.68);
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
	handArea.position.set(padding, headerHeight + 74);

	const shopArea = new PIXI.Container();
	shopArea.position.set(padding, headerHeight + 176);

	const actionColors = {
		fill: 0x0b1418,
		border: colors.teal,
		text: colors.white,
		alpha: 0.9,
	};

	const playBtn = createButton('Play Hand', 110, 24, actionColors);
	const discardBtn = createButton('Discard', 86, 20, {
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

	playBtn.position.set(windowWidth - padding - 110, headerHeight + 32);
	discardBtn.position.set(windowWidth - padding - 86, headerHeight + 60);
	nextBtn.position.set(windowWidth - padding - 110, headerHeight + 32);
	skipBtn.position.set(windowWidth - padding - 100, headerHeight + 60);
	rerollBtn.position.set(windowWidth - padding - 76, headerHeight + 88);
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

	const drawCard = (card, index) => {
		const cardW = 64;
		const cardH = 84;
		const container = new PIXI.Container();
		const bg = new PIXI.Graphics();
		const drawBg = (selected) => {
			bg.clear();
			bg.beginFill(0x030508, 1);
			bg.lineStyle(2, selected ? colors.teal : card.suit.color, selected ? 1 : 0.9);
			bg.drawRoundedRect(0, 0, cardW, cardH, 6);
			bg.endFill();
		};
		drawBg(false);
		const rank = new PIXI.Text(card.rank.id, {
			fontFamily: 'Minecraft, monospace',
			fontSize: 14,
			fill: card.suit.color,
		});
		rank.position.set(8, 6);
		const suit = new PIXI.Text(card.suit.label, {
			fontFamily: 'Minecraft, monospace',
			fontSize: 18,
			fill: card.suit.color,
		});
		suit.anchor.set(0.5);
		suit.position.set(cardW / 2, cardH / 2 + 6);
		const footer = new PIXI.Text(card.rank.id, {
			fontFamily: 'Minecraft, monospace',
			fontSize: 12,
			fill: card.suit.color,
		});
		footer.anchor.set(1, 1);
		footer.position.set(cardW - 6, cardH - 6);
		container.addChild(bg, rank, suit, footer);
		container.eventMode = 'static';
		container.cursor = 'pointer';
		container.hitArea = new PIXI.Rectangle(0, 0, cardW, cardH);
		container._index = index;
		container._setSelected = (selected) => drawBg(selected);
		container._size = { width: cardW, height: cardH };
		return container;
	};

	const drawHand = () => {
		handArea.removeChildren();
		const cards = state.hand;
		if (!cards.length) return;
		const cardW = 64;
		const cardH = 84;
		const gap = 12;
		const totalW = cards.length * cardW + (cards.length - 1) * gap;
		const startX = (windowWidth - padding * 2 - totalW) / 2;
		cards.forEach((card, idx) => {
			const cardSprite = drawCard(card, idx);
			cardSprite.position.set(startX + idx * (cardW + gap), 0);
			cardSprite.on('pointertap', () => {
				if (state.phase !== 'hand') return;
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
		playBtn.setEnabled(state.phase === 'hand' && state.selected.size === 5);
		discardBtn.setEnabled(state.phase === 'hand' && state.discardsLeft > 0 && state.selected.size > 0);
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
		if (state.selected.size !== 5) return;
		const selectedCards = Array.from(state.selected).map((idx) => state.hand[idx]).filter(Boolean);
		if (!selectedCards.length) return;
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
		state.playsLeft = Math.max(0, state.playsLeft - 1);
		const replaceIndices = Array.from(state.selected).sort((a, b) => b - a);
		state.selected.clear();
		for (const idx of replaceIndices) {
			const [card] = state.hand.splice(idx, 1);
			if (card) state.discardPile.push(card);
			const [next] = drawFromDeck(1);
			if (next) state.hand.splice(idx, 0, next);
		}
		drawHand();
		refreshSelection();
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

	const handleDiscard = () => {
		if (state.discardsLeft <= 0) return;
		if (!state.selected.size) return;
		const replaceIndices = Array.from(state.selected).sort((a, b) => b - a);
		state.selected.clear();
		for (const idx of replaceIndices) {
			const [card] = state.hand.splice(idx, 1);
			if (card) state.discardPile.push(card);
			const [next] = drawFromDeck(1);
			if (next) state.hand.splice(idx, 0, next);
		}
		state.discardsLeft = Math.max(0, state.discardsLeft - 1);
		drawHand();
		refreshSelection();
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

	container.addChild(
		panelFill,
		panelBorder,
		headerBg,
		title,
		closeBtn,
		statsText,
		playsText,
		targetText,
		resultText,
		handArea,
		shopArea,
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
