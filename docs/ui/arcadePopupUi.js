export function createArcadePopupUi(options = {}) {
	const { PIXI } = options;
	if (!PIXI) throw new Error('createArcadePopupUi requires PIXI');

	const text = new PIXI.Text('', {
		fontFamily: 'Minecraft, monospace',
		fontSize: 22,
		fill: 0xffffff,
		stroke: 0x061017,
		strokeThickness: 5,
		align: 'center',
		letterSpacing: 1,
	});
	text.anchor.set(0.5, 0.5);
	text.visible = false;

	const popupPalette = [0xff5f9c, 0x5fffd2, 0x6bd3ff, 0xffc14b, 0xb37aff, 0x7aff6d, 0xff7a5c];
	const state = {
		timer: 999,
		duration: 1.05,
		baseScale: 1,
		color: 0xffffff,
		lastColor: null,
	};

	const pickColor = () => {
		if (!popupPalette.length) return 0xffffff;
		let color = popupPalette[Math.floor(Math.random() * popupPalette.length)];
		if (popupPalette.length > 1 && color === state.lastColor) {
			color = popupPalette[(popupPalette.indexOf(color) + 1 + Math.floor(Math.random() * (popupPalette.length - 1))) % popupPalette.length];
		}
		state.lastColor = color;
		return color;
	};

	const reset = () => {
		state.timer = 999;
		text.visible = false;
	};

	const trigger = (message, baseScale = 1, color = null) => {
		text.text = message;
		state.baseScale = baseScale;
		state.color = color ?? pickColor();
		text.tint = state.color;
		state.timer = 0;
		text.visible = true;
	};

	const updateAndRender = ({
		seconds,
		time,
		combo,
		appWidth,
		appHeight,
		toWorldFromScreen,
		toWorldSizeWithCamera,
	}) => {
		if (state.timer >= state.duration) {
			text.visible = false;
			return;
		}
		state.timer += seconds;
		const tPopup = Math.max(0, Math.min(1, state.timer / state.duration));
		const out = 1 - tPopup;
		const shake = toWorldSizeWithCamera((3 + Math.min(10, combo * 1.2)) * out);
		const shakeX = Math.sin(time * 54) * shake;
		const shakeY = Math.cos(time * 47) * shake * 0.5;
		text.visible = true;
		text.alpha = 0.22 + out * 0.78;
		text.scale.set(state.baseScale * (1 + out * 0.14));
		const popupBase = toWorldFromScreen(appWidth * 0.5, appHeight * 0.74);
		text.position.set(popupBase.x + shakeX, popupBase.y + shakeY);
	};

	return {
		text,
		reset,
		trigger,
		updateAndRender,
	};
}
