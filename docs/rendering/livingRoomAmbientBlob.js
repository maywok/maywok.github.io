export function createAmbientBlobTexture(size = 256) {
	if (typeof document === 'undefined') return PIXI.Texture.WHITE;
	const canvas = document.createElement('canvas');
	canvas.width = size;
	canvas.height = size;
	const ctx = canvas.getContext('2d');
	if (!ctx) return PIXI.Texture.WHITE;
	const image = ctx.createImageData(size, size);
	const data = image.data;
	const smoothstep = (edge0, edge1, x) => {
		const t = Math.max(0, Math.min(1, (x - edge0) / Math.max(0.0001, edge1 - edge0)));
		return t * t * (3 - 2 * t);
	};
	const hash = (x, y) => {
		const v = Math.sin(x * 127.1 + y * 311.7 + 73.2) * 43758.5453;
		return v - Math.floor(v);
	};
	for (let y = 0; y < size; y++) {
		for (let x = 0; x < size; x++) {
			const nx = ((x + 0.5) / size) * 2 - 1;
			const ny = ((y + 0.5) / size) * 2 - 1;
			const radius = Math.hypot(nx, ny);
			const angle = Math.atan2(ny, nx);
			const edgeRadius = 0.72
				+ Math.sin(angle * 2.9 + 0.7) * 0.06
				+ Math.sin(angle * 5.3 - 1.2) * 0.04
				+ Math.sin(angle * 8.1 + 1.4) * 0.018;
			const edgeMask = 1 - smoothstep(edgeRadius - 0.14, edgeRadius + 0.02, radius);
			const mask = edgeMask * edgeMask;
			if (mask <= 0.001) continue;
			const marblingA = Math.sin(nx * 8.2 + ny * 5.1 + radius * 7.6 + hash(x * 0.56, y * 0.44) * 2.8);
			const marblingB = Math.sin(nx * 12.3 - ny * 9.1 + hash(x * 0.92, y * 0.76) * 3.6);
			const marbling = (marblingA * 0.58 + marblingB * 0.42) * 0.5 + 0.5;
			const cloud = (Math.sin(nx * 4.6 - ny * 3.9 + hash(x * 0.32, y * 0.28) * 4.0) * 0.5 + 0.5);
			const core = 1 - Math.max(0, Math.min(1, radius / Math.max(0.1, edgeRadius)));
			const rim = smoothstep(0.54, 0.98, radius / Math.max(0.16, edgeRadius));
			const tone = Math.max(0, Math.min(1,
				0.56
				+ core * 0.24
				+ marbling * 0.14
				+ cloud * 0.08
				+ rim * (0.07 + marbling * 0.06)
			));
			const alpha = mask * (0.62 + core * 0.24) * (0.88 + marbling * 0.12);
			const idx = (y * size + x) * 4;
			const value = Math.max(0, Math.min(255, Math.round(tone * 255)));
			data[idx] = value;
			data[idx + 1] = value;
			data[idx + 2] = value;
			data[idx + 3] = Math.max(0, Math.min(255, Math.round(alpha * 255)));
		}
	}
	ctx.putImageData(image, 0, 0);
	return PIXI.Texture.from(canvas);
}
