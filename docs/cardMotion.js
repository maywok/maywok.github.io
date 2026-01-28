export function createCardMotion(container, options = {}) {
	const {
		width = 1,
		height = 1,
		tiltAmount = 0.12,
		smoothing = 0.12,
		layers = [],
	} = options;

	function clamp(v, min, max) {
		return Math.max(min, Math.min(max, v));
	}

	const state = {
		nx: 0,
		ny: 0,
	};

	function onPointerMove(event) {
		const local = event.getLocalPosition(container);
		state.nx = clamp(local.x / ((width / 2) || 1), -1, 1);
		state.ny = clamp(local.y / ((height / 2) || 1), -1, 1);
	}

	function reset() {
		state.nx = 0;
		state.ny = 0;
	}

	function update() {
		for (const layer of layers) {
			if (!layer?.target) continue;
			const strength = layer.strength ?? 0;
			const invert = layer.invert ?? false;
			const dx = (invert ? -state.nx : state.nx) * strength;
			const dy = (invert ? -state.ny : state.ny) * strength;
			layer.target.position.x += (dx - layer.target.position.x) * smoothing;
			layer.target.position.y += (dy - layer.target.position.y) * smoothing;
		}
		const targetSkewX = -state.ny * tiltAmount;
		const targetSkewY = state.nx * tiltAmount;
		container.skew.x += (targetSkewX - container.skew.x) * smoothing;
		container.skew.y += (targetSkewY - container.skew.y) * smoothing;
	}

	return { onPointerMove, reset, update };
}
