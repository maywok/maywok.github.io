// Shaders module placeholder (no external forwards)
export function createCRTFilter(app, { intensity = 0.8, brightness = 0.35 } = {}) {
	// Return a simple time-varying filter compatible with PIXI.Filter
	const fragment = `
		precision mediump float;
		uniform vec2 u_resolution;
		uniform float u_time;
		uniform float u_intensity;
		uniform float u_brightness;
		void main() {
			vec2 uv = gl_FragCoord.xy / u_resolution;
			float scan = sin(uv.y * 600.0) * 0.02;
			float wave = 0.5 + 0.5 * sin(u_time + uv.x * 6.2831);
			vec3 base = vec3(0.06, 0.18, 0.12) * (u_brightness * 2.0);
			vec3 glow = vec3(0.0, 1.0, 0.6) * wave * u_intensity;
			vec3 color = base + glow + vec3(scan);
			gl_FragColor = vec4(color, 1.0);
		}
	`;
	const vertex = `
		precision mediump float;
		attribute vec2 aVertexPosition;
		uniform mat3 projectionMatrix;
		void main() {
			gl_Position = vec4((projectionMatrix * vec3(aVertexPosition, 1.0)).xy, 0.0, 1.0);
		}
	`;
	const uniforms = {
		u_resolution: new Float32Array([app.renderer.width, app.renderer.height]),
		u_time: 0,
		u_intensity: intensity,
		u_brightness: brightness,
	};
	return { filter: new PIXI.Filter(vertex, fragment, uniforms), uniforms };
}

export function updateCRTFilter({ uniforms }, app, dt) {
	uniforms.u_time += dt;
	uniforms.u_resolution[0] = app.renderer.width;
	uniforms.u_resolution[1] = app.renderer.height;
}