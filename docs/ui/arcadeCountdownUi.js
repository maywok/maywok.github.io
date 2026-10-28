export function createArcadeCountdownUi(options = {}) {
	const {
		PIXI,
		playSfxSafe,
		ICON_SFX,
	} = options;
	if (!PIXI) throw new Error('createArcadeCountdownUi requires PIXI');
	if (!playSfxSafe) throw new Error('createArcadeCountdownUi requires playSfxSafe');
	if (!ICON_SFX) throw new Error('createArcadeCountdownUi requires ICON_SFX');

	const text = new PIXI.Text('3', {
		fontFamily: 'Minecraft, monospace',
		fontSize: 132,
		fill: 0xe8faff,
		stroke: 0x07111a,
		strokeThickness: 14,
		dropShadow: true,
		dropShadowColor: 0x04080d,
		dropShadowBlur: 0,
		dropShadowAngle: Math.PI / 3,
		dropShadowDistance: 10,
		align: 'center',
		letterSpacing: 2,
	});
	text.anchor.set(0.5, 0.5);
	text.visible = false;

	const steps = [
		{ label: '3', rate: 1.0, tint: 0xe8faff },
		{ label: '2', rate: 1.0, tint: 0xe8faff },
		{ label: '1', rate: 1.0, tint: 0xe8faff },
		{ label: 'GO', rate: 1.15, tint: 0x93ffd9 },
	];

	const state = {
		active: false,
		stepIndex: -1,
		stepElapsed: 0,
		stepDuration: 0.74,
	};

	const stop = () => {
		state.active = false;
		state.stepIndex = -1;
		state.stepElapsed = 0;
		text.visible = false;
	};

	const triggerStep = () => {
		state.stepIndex += 1;
		state.stepElapsed = 0;
		if (state.stepIndex >= steps.length) {
			stop();
			return;
		}
		const step = steps[state.stepIndex];
		text.text = step.label;
		text.tint = step.tint;
		text.visible = true;
		playSfxSafe(ICON_SFX.countdown, {
			volume: step.label === 'GO' ? 0.8 : 0.66,
			rate: step.rate,
		});
	};

	const start = () => {
		state.active = true;
		state.stepIndex = -1;
		state.stepElapsed = 0;
		triggerStep();
	};

	const update = (dtSeconds) => {
		if (!state.active) return;
		state.stepElapsed += dtSeconds;
		if (state.stepElapsed >= state.stepDuration) {
			triggerStep();
		}
	};

	const render = ({ appWidth, appHeight, toWorldFromScreen }) => {
		if (!state.active) {
			if (text.visible) text.visible = false;
			return;
		}
		const tStep = Math.max(0, Math.min(1, state.stepElapsed / state.stepDuration));
		const popT = Math.max(0, Math.min(1, tStep / 0.26));
		const popEase = 1 - Math.pow(1 - popT, 3);
		const stepScale = 1 + (1 - popEase) * 0.58;
		const fadeIn = Math.max(0, Math.min(1, tStep / 0.08));
		const fadeOut = tStep > 0.58 ? Math.max(0, 1 - (tStep - 0.58) / 0.42) : 1;
		const alpha = Math.max(0, Math.min(1, fadeIn * fadeOut));
		const center = toWorldFromScreen(appWidth * 0.5, appHeight * 0.5);
		text.visible = true;
		text.position.set(center.x, center.y);
		text.scale.set(stepScale);
		text.alpha = 0.15 + alpha * 0.85;
	};

	return {
		text,
		start,
		stop,
		update,
		isActive: () => state.active,
		render,
	};
}
