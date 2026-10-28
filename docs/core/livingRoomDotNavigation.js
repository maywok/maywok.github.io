export function redrawLivingRoomDotsView(options = {}) {
	const {
		dotNodes = [],
		livingRoomSlideIndex = 0,
		getActiveAccentColor = () => 0x6ec6f7,
		tintColor = (color) => color,
	} = options;
	const accent = getActiveAccentColor();
	const activeColor = tintColor(accent, 1.22);
	const inactiveColor = tintColor(accent, 0.5);
	const ringColor = tintColor(accent, 1.45);
	for (let i = 0; i < dotNodes.length; i++) {
		const dot = dotNodes[i];
		const active = i === livingRoomSlideIndex;
		dot.clear();
		dot.beginFill(active ? activeColor : inactiveColor, active ? 0.96 : (0.45 + dot.__hover * 0.35));
		dot.drawCircle(0, 0, active ? 4.1 : 3.1);
		dot.endFill();
		if (active) {
			dot.lineStyle(1, ringColor, 0.9);
			dot.drawCircle(0, 0, 6);
		}
	}
}

export function rebuildLivingRoomDotsView(options = {}) {
	const {
		PIXI,
		tvSlideDotNav,
		destroyContainerChildren,
		getSlidesForProject,
		getActiveProject,
		onDotSelected = () => {},
		onRedraw = () => {},
	} = options;

	destroyContainerChildren(tvSlideDotNav);
	const dotNodes = [];
	const slides = getSlidesForProject(getActiveProject());
	const count = slides.length;
	if (!count) return dotNodes;
	const spacing = 15;
	const totalW = (count - 1) * spacing;
	for (let i = 0; i < count; i++) {
		const dot = new PIXI.Graphics();
		dot.position.set(i * spacing - totalW * 0.5, 0);
		dot.eventMode = 'static';
		dot.cursor = 'pointer';
		dot.__hover = 0;
		dot.on('pointerover', () => {
			dot.__hover = 1;
			onRedraw();
		});
		dot.on('pointerout', () => {
			dot.__hover = 0;
			onRedraw();
		});
		dot.on('pointertap', () => {
			onDotSelected(i);
		});
		tvSlideDotNav.addChild(dot);
		dotNodes.push(dot);
	}
	return dotNodes;
}
