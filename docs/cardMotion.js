export function createCardMotion(container, options = {}) {
	const {
		width = 1,
		height = 1,
		tiltAmount = 0.12,
		layers = [],
	} = options;

	function clamp(v, min, max) {
		return Math.max(min, Math.min(max, v));
	}

	function onPointerMove(event) {
		const local = event.getLocalPosition(container);
		const nx = clamp(local.x / ((width / 2) || 1), -1, 1);
		const ny = clamp(local.y / ((height / 2) || 1), -1, 1);

		for (const layer of layers) {
			if (!layer?.target) continue;
			const strength = layer.strength ?? 0;
			const invert = layer.invert ?? false;
			const dx = (invert ? -nx : nx) * strength;
			const dy = (invert ? -ny : ny) * strength;
			layer.target.position.set(dx, dy);
		}

		container.skew.set(-ny * tiltAmount, nx * tiltAmount);
	}

	function reset() {
		for (const layer of layers) {
			if (!layer?.target) continue;
			layer.target.position.set(0, 0);
		}
		container.skew.set(0, 0);
	}

	return { onPointerMove, reset };
}
