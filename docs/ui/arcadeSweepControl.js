export function createArcadeSweepControl(options = {}) {
	const { PIXI } = options;
	if (!PIXI) throw new Error('createArcadeSweepControl requires PIXI');

	const graphics = new PIXI.Graphics();
	graphics.eventMode = 'none';
	graphics.cursor = 'pointer';

	let hoverTarget = 0;
	let hover = 0;

	graphics.on('pointerover', () => {
		hoverTarget = 1;
	});
	graphics.on('pointerout', () => {
		hoverTarget = 0;
	});

	const setEnabled = (enabled) => {
		const active = Boolean(enabled);
		graphics.visible = active;
		graphics.eventMode = active ? 'static' : 'none';
	};

	const reset = () => {
		setEnabled(false);
		hoverTarget = 0;
		hover = 0;
		graphics.clear();
	};

	const render = ({
		appWidth,
		mouseX,
		mouseY,
		dividerY,
		seconds,
		time,
		toWorldFromScreen,
		toWorldSizeWithCamera,
	}) => {
		hover += (hoverTarget - hover) * Math.min(1, seconds * 14);
		const sweepAnchorX = appWidth * 0.94;
		const sweepAnchorY = Math.max(28, dividerY - 24);
		const sweepNear = Math.max(0, Math.min(1, 1 - Math.hypot(mouseX - sweepAnchorX, mouseY - sweepAnchorY) / 170));
		const sweepBoost = Math.max(hover, sweepNear * 0.75);
		const sweepPos = toWorldFromScreen(sweepAnchorX, sweepAnchorY);
		const sweepW = toWorldSizeWithCamera(24);
		const sweepH = toWorldSizeWithCamera(16);
		const sway = Math.sin(time * 4.2) * toWorldSizeWithCamera(2.4) * (0.35 + sweepBoost);
		const p0x = sweepPos.x - sweepW * 0.72 + sway;
		const p0y = sweepPos.y - sweepH * 0.55;
		const p1x = sweepPos.x + sweepW * 0.72 + sway;
		const p1y = sweepPos.y - sweepH * 0.55;
		const p2x = sweepPos.x + sway;
		const p2y = sweepPos.y + sweepH * 0.8;

		graphics.clear();
		graphics.beginFill(0x8fdcff, 0.14 + sweepBoost * 0.24);
		graphics.drawPolygon([p0x, p0y, p1x, p1y, p2x, p2y]);
		graphics.endFill();
		graphics.lineStyle(1.5, 0xd8f5ff, 0.45 + sweepBoost * 0.45);
		graphics.drawPolygon([p0x, p0y, p1x, p1y, p2x, p2y]);
		graphics.hitArea = new PIXI.Polygon([p0x, p0y, p1x, p1y, p2x, p2y]);
	};

	return {
		graphics,
		setEnabled,
		reset,
		render,
	};
}
