export function createLivingRoomTapeNode(options = {}) {
	const {
		PIXI,
		tape,
		index = 0,
		PORTFOLIO_LEFT_TITLE_FONT_FAMILY,
		VIEW_TV_AREA,
		livingRoomState,
		playCartridgeHoverSfx,
		playCartridgeSelectSfx,
		applyWipSpriteTexture,
		getTapeCoverForProject,
		getProjectForTape,
		onPlayTape = () => {},
	} = options;

	const node = new PIXI.Container();
	const aura = new PIXI.Graphics();
	const shadow = new PIXI.Graphics();
	const body = new PIXI.Graphics();
	const notch = new PIXI.Graphics();
	const shellHighlight = new PIXI.Graphics();
	const shellShadow = new PIXI.Graphics();
	const screws = new PIXI.Graphics();
	const badge = new PIXI.Graphics();
	const badgeSpec = new PIXI.Graphics();
	const art = new PIXI.Sprite(PIXI.Texture.WHITE);
	art.anchor.set(0.5);
	const labelStrip = new PIXI.Graphics();
	const title = new PIXI.Text('EMPTY', {
		fontFamily: PORTFOLIO_LEFT_TITLE_FONT_FAMILY,
		fontSize: 13,
		fill: 0xf2fbff,
		stroke: 0x0a1320,
		strokeThickness: 2,
		letterSpacing: 1,
	});
	title.anchor.set(0.5, 0.5);
	title.text = tape.label;
	applyWipSpriteTexture(art, getTapeCoverForProject(getProjectForTape(tape)));
	art.alpha = 0.6;
	node.addChild(aura, shadow, body, notch, labelStrip, badge, art, badgeSpec, screws, shellHighlight, shellShadow, title);
	node.eventMode = 'static';
	node.cursor = 'pointer';
	node.on('pointerover', () => {
		if (livingRoomState.viewMode !== VIEW_TV_AREA || livingRoomState.inserting || livingRoomState.targetBlend < 1) return;
		if (livingRoomState.hoverIndex !== index) {
			playCartridgeHoverSfx();
		}
		livingRoomState.hoverIndex = index;
	});
	node.on('pointerout', () => {
		if (livingRoomState.hoverIndex === index) livingRoomState.hoverIndex = -1;
	});
	node.on('pointertap', () => {
		if (livingRoomState.inserting || livingRoomState.blend < 0.98) return;
		if (livingRoomState.viewMode !== VIEW_TV_AREA) return;
		playCartridgeSelectSfx();
		onPlayTape(tape.id);
	});
	return {
		tape,
		node,
		aura,
		shadow,
		body,
		notch,
		shellHighlight,
		shellShadow,
		screws,
		badge,
		badgeSpec,
		art,
		labelStrip,
		title,
		side: 'left',
		hoverMix: 0,
		baseX: 0,
		baseY: 0,
	};
}
