export function createArcadeOverlayUi(options = {}) {
	const { PIXI } = options;
	if (!PIXI) throw new Error('createArcadeOverlayUi requires PIXI');

	const dividerGlow = new PIXI.Graphics();
	const hintText = new PIXI.Text('THROW MODE: HIT TARGETS (1 / 3 / 5)', {
		fontFamily: 'Minecraft, monospace',
		fontSize: 11,
		fill: 0xbde9ff,
		align: 'left',
		letterSpacing: 1,
	});
	hintText.anchor.set(0, 0);
	hintText.alpha = 0.82;

	const scoreText = new PIXI.Text('SCORE 0', {
		fontFamily: 'Minecraft, monospace',
		fontSize: 20,
		fill: 0xffffff,
		stroke: 0x0b1e2b,
		strokeThickness: 5,
		align: 'left',
		letterSpacing: 1,
	});
	scoreText.anchor.set(0.5, 0);
	scoreText.alpha = 0.92;

	const ARCADE_DIVIDER_Y_RATIO = 0.2;
	let dividerWorldX = 0;
	let dividerWorldY = 0;

	const getDividerScreenY = (appHeight) => appHeight * ARCADE_DIVIDER_Y_RATIO;

	const setScore = (score, combo) => {
		const comboSuffix = combo > 1 ? `  x${combo}` : '';
		scoreText.text = `SCORE ${score}${comboSuffix}`;
	};

	const render = ({
		appWidth,
		appHeight,
		mouseY,
		noGoVoided,
		countdownActive,
		combo,
		time,
		toWorldFromScreen,
		toWorldSizeWithCamera,
	}) => {
		const dividerY = getDividerScreenY(appHeight);
		const dividerNear = Math.max(0, Math.min(1, 1 - Math.abs(mouseY - dividerY) / 130));
		const dividerLeft = appWidth * 0.04;
		const dividerRight = appWidth * 0.96;
		const dividerCenter = toWorldFromScreen(appWidth * 0.5, dividerY);
		const dividerWidth = toWorldSizeWithCamera(dividerRight - dividerLeft);
		const dividerHeight = toWorldSizeWithCamera(15);
		dividerWorldX = dividerCenter.x;
		dividerWorldY = dividerCenter.y;

		dividerGlow.clear();
		dividerGlow.beginFill(noGoVoided ? 0xff5f88 : 0x7fd8ff, dividerNear * (noGoVoided ? 0.62 : 0.48));
		dividerGlow.drawRoundedRect(
			dividerCenter.x - dividerWidth * 0.5,
			dividerCenter.y - dividerHeight * 0.5,
			dividerWidth,
			dividerHeight,
			dividerHeight * 0.6,
		);
		dividerGlow.endFill();

		hintText.text = countdownActive
			? 'TARGET TEST STARTING...'
			: (noGoVoided
				? 'TOP SIDE BLOCKED: CURSOR BELOW TO SCORE'
				: 'THROW MODE: HIT TARGETS (1 / 3 / 5)');
		const hintPos = toWorldFromScreen(24, 18);
		hintText.position.set(hintPos.x, hintPos.y);

		const scorePulse = 1 + Math.min(0.24, combo * 0.035) + Math.sin(time * 5.2) * 0.02;
		const scorePos = toWorldFromScreen(appWidth * 0.5, appHeight - 58);
		scoreText.position.set(scorePos.x, scorePos.y);
		scoreText.scale.set(scorePulse);
		scoreText.tint = noGoVoided ? 0xff8fab : 0xffffff;

		return {
			dividerY,
			dividerWorldX,
			dividerWorldY,
		};
	};

	return {
		dividerGlow,
		hintText,
		scoreText,
		setScore,
		getDividerScreenY,
		render,
	};
}
