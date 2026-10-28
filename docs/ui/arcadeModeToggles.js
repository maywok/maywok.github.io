export function createArcadeModeToggles(options = {}) {
	const {
		PIXI,
		world,
	} = options;
	if (!PIXI) throw new Error('createArcadeModeToggles requires PIXI');
	if (!world) throw new Error('createArcadeModeToggles requires world');

	const buttonSize = 46;
	const basketballToggle = new PIXI.Container();
	const basketballBg = new PIXI.Graphics();
	const basketballGlow = new PIXI.Graphics();
	const basketballGlyph = new PIXI.Graphics();
	let basketballHoverTarget = 0;
	let basketballHover = 0;

	const tennisToggle = new PIXI.Container();
	const tennisBg = new PIXI.Graphics();
	const tennisGlow = new PIXI.Graphics();
	const tennisGlyph = new PIXI.Graphics();
	let tennisHoverTarget = 0;
	let tennisHover = 0;

	basketballToggle.eventMode = 'none';
	basketballToggle.cursor = 'pointer';
	basketballToggle.addChild(basketballGlow, basketballBg, basketballGlyph);
	basketballToggle.zIndex = 150;
	basketballToggle.visible = false;
	world.addChild(basketballToggle);

	tennisToggle.eventMode = 'none';
	tennisToggle.cursor = 'pointer';
	tennisToggle.addChild(tennisGlow, tennisBg, tennisGlyph);
	tennisToggle.zIndex = 150;
	tennisToggle.visible = false;
	world.addChild(tennisToggle);

	const drawBasketballToggle = () => {
		const hover = Math.max(0, Math.min(1, basketballHover));
		basketballGlow.clear();
		basketballGlow.beginFill(0x89d6ff, 0.08 + hover * 0.24);
		basketballGlow.drawRoundedRect(-3, -3, buttonSize + 6, buttonSize + 6, 12);
		basketballGlow.endFill();

		basketballBg.clear();
		basketballBg.beginFill(0x081526, 0.86);
		basketballBg.lineStyle(1, 0x89d6ff, 0.5 + hover * 0.35);
		basketballBg.drawRoundedRect(0, 0, buttonSize, buttonSize, 11);
		basketballBg.endFill();

		const cx = buttonSize * 0.5;
		const cy = buttonSize * 0.5;
		const r = buttonSize * 0.29;
		basketballGlyph.clear();
		basketballGlyph.beginFill(0x1a2538, 0.96);
		basketballGlyph.drawCircle(cx, cy, r);
		basketballGlyph.endFill();
		basketballGlyph.lineStyle(1.5, 0x98ddff, 0.95);
		basketballGlyph.drawCircle(cx, cy, r * 0.72);
		basketballGlyph.lineStyle(1.5, 0xffd36f, 0.98);
		basketballGlyph.drawCircle(cx, cy, r * 0.36);
		basketballGlyph.lineStyle(1.3, 0x98ddff, 0.92);
		basketballGlyph.moveTo(cx - r * 1.05, cy);
		basketballGlyph.lineTo(cx + r * 1.05, cy);
		basketballGlyph.moveTo(cx, cy - r * 1.05);
		basketballGlyph.lineTo(cx, cy + r * 1.05);

		basketballToggle.scale.set(1 + hover * 0.04);
		basketballToggle.pivot.set((buttonSize * basketballToggle.scale.x - buttonSize) * 0.5, (buttonSize * basketballToggle.scale.y - buttonSize) * 0.5);
	};

	const drawTennisToggle = () => {
		const hover = Math.max(0, Math.min(1, tennisHover));
		tennisGlow.clear();
		tennisGlow.beginFill(0x8dff7b, 0.08 + hover * 0.24);
		tennisGlow.drawRoundedRect(-3, -3, buttonSize + 6, buttonSize + 6, 12);
		tennisGlow.endFill();

		tennisBg.clear();
		tennisBg.beginFill(0x0f1f13, 0.86);
		tennisBg.lineStyle(1, 0x8dff7b, 0.5 + hover * 0.35);
		tennisBg.drawRoundedRect(0, 0, buttonSize, buttonSize, 11);
		tennisBg.endFill();

		const cx = buttonSize * 0.5;
		const cy = buttonSize * 0.5;
		const r = buttonSize * 0.28;
		tennisGlyph.clear();
		tennisGlyph.beginFill(0x1b2a1d, 0.96);
		tennisGlyph.drawCircle(cx, cy, r);
		tennisGlyph.endFill();
		tennisGlyph.lineStyle(1.5, 0xa6ff95, 0.95);
		tennisGlyph.drawCircle(cx, cy, r * 0.92);
		tennisGlyph.lineStyle(1.3, 0xe6ffd8, 0.92);
		tennisGlyph.arc(cx - r * 0.2, cy, r * 0.66, -1.15, 1.15);
		tennisGlyph.arc(cx + r * 0.2, cy, r * 0.66, Math.PI - 1.15, Math.PI + 1.15);

		tennisToggle.scale.set(1 + hover * 0.04);
		tennisToggle.pivot.set((buttonSize * tennisToggle.scale.x - buttonSize) * 0.5, (buttonSize * tennisToggle.scale.y - buttonSize) * 0.5);
	};

	const redraw = () => {
		drawBasketballToggle();
		drawTennisToggle();
	};

	const setDragEnabled = (enabled) => {
		const active = Boolean(enabled);
		basketballToggle.visible = active;
		basketballToggle.eventMode = active ? 'static' : 'none';
		// Tennis toggle stays hidden until TENNIS_MODE_ENABLED is turned back on.
		tennisToggle.visible = false;
		tennisToggle.eventMode = 'none';
	};

	const setBasketballHoverTarget = (target) => {
		basketballHoverTarget = target ? 1 : 0;
	};

	const setTennisHoverTarget = (target) => {
		tennisHoverTarget = target ? 1 : 0;
	};

	const resetHover = () => {
		basketballHoverTarget = 0;
		basketballHover = 0;
		tennisHoverTarget = 0;
		tennisHover = 0;
		redraw();
	};

	const place = ({ rendererWidth, rendererHeight, lockButtonSize, screenToWorldX, screenToWorldY }) => {
		const bx = screenToWorldX(rendererWidth - lockButtonSize - buttonSize - 26);
		const by = screenToWorldY(rendererHeight - buttonSize - 19);
		basketballToggle.position.set(bx, by);
		const tx = screenToWorldX(rendererWidth - lockButtonSize - buttonSize - buttonSize - 34);
		const ty = screenToWorldY(rendererHeight - buttonSize - 19);
		tennisToggle.position.set(tx, ty);
	};

	const update = (seconds) => {
		const ease = Math.min(1, seconds * 14);
		const prevBHover = basketballHover;
		basketballHover += (basketballHoverTarget - basketballHover) * ease;
		if (Math.abs(basketballHover - prevBHover) > 0.001) {
			drawBasketballToggle();
		}

		const prevTHover = tennisHover;
		tennisHover += (tennisHoverTarget - tennisHover) * ease;
		if (Math.abs(tennisHover - prevTHover) > 0.001) {
			drawTennisToggle();
		}
	};

	redraw();

	return {
		basketballToggle,
		tennisToggle,
		setDragEnabled,
		setBasketballHoverTarget,
		setTennisHoverTarget,
		resetHover,
		place,
		redraw,
		update,
	};
}
