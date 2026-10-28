function drawPixelArrow(graphics, size, fillColor) {
	const px = Math.max(1, Math.round(size / 6));
	const grid = [
		[0, 0, 1, 0, 0],
		[0, 1, 1, 0, 0],
		[1, 1, 1, 1, 1],
		[0, 1, 1, 0, 0],
		[0, 0, 1, 0, 0],
	];
	graphics.beginFill(fillColor, 0.95);
	for (let y = 0; y < grid.length; y++) {
		for (let x = 0; x < grid[y].length; x++) {
			if (grid[y][x]) graphics.drawRect(x * px, y * px, px, px);
		}
	}
	graphics.endFill();
	const w = grid[0].length * px;
	const h = grid.length * px;
	graphics.pivot.set(w / 2, h / 2);
}

export function layoutLeftPortalUi(context) {
	const {
		PIXI,
		app,
		screenToWorldX,
		screenToWorldY,
		screenToWorldSize,
		leftPortal,
		leftGlowSoft,
		leftGlow,
		leftArrow,
		leftPortalHitZone,
		leftPortalLabel,
		leftPortalHint,
	} = context;

	const leftPortalWidth = Math.max(56, Math.min(110, app.renderer.width * 0.095));
	const h = app.renderer.height;
	const portalW = screenToWorldSize(leftPortalWidth);
	const portalH = screenToWorldSize(h);
	const leftPortalShownX = screenToWorldX(0);
	const leftPortalY = screenToWorldY(0);
	const leftPortalHiddenX = leftPortalShownX - portalW * 0.62;
	leftPortal.position.set(leftPortalHiddenX, leftPortalY);

	const bulge = portalW * 0.65;
	const midY = portalH * 0.5;
	const curveX = portalW + bulge;
	const edgeX = portalW * 0.55;

	leftGlowSoft.clear();
	leftGlowSoft.beginFill(0x2a0d0d, 0.2);
	leftGlowSoft.moveTo(0, 0);
	leftGlowSoft.lineTo(edgeX, 0);
	leftGlowSoft.quadraticCurveTo(curveX, midY, edgeX, portalH);
	leftGlowSoft.lineTo(0, portalH);
	leftGlowSoft.closePath();
	leftGlowSoft.endFill();

	leftGlow.clear();
	leftGlow.beginFill(0xa5271a, 0.22);
	leftGlow.moveTo(0, 0);
	leftGlow.lineTo(portalW * 0.45, 0);
	leftGlow.quadraticCurveTo(portalW + bulge * 0.35, midY, portalW * 0.45, portalH);
	leftGlow.lineTo(0, portalH);
	leftGlow.closePath();
	leftGlow.endFill();

	const arrowSize = screenToWorldSize(Math.max(16, Math.min(26, app.renderer.height * 0.038)));
	leftArrow.clear();
	drawPixelArrow(leftArrow, arrowSize, 0xf3e0c0);
	leftArrow.position.set(portalW * 0.52, portalH * 0.5);
	leftArrow.hitArea = new PIXI.Circle(0, 0, arrowSize * 1.2);

	leftPortalHitZone.clear();
	leftPortalHitZone.beginFill(0xffffff, 0.001);
	leftPortalHitZone.drawRect(0, 0, portalW * 0.88, portalH);
	leftPortalHitZone.endFill();

	leftPortalLabel.style.fontSize = Math.max(10, Math.round(screenToWorldSize(12)));
	leftPortalLabel.position.set(portalW * 0.98, portalH * 0.34);
	leftPortalHint.style.fontSize = Math.max(9, Math.round(screenToWorldSize(10)));
	leftPortalHint.position.set(portalW * 1.02, portalH * 0.48);

	return {
		leftPortalWidth,
		leftPortalShownX,
		leftPortalHiddenX,
		leftPortalY,
	};
}
