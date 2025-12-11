// Shaders module placeholder (no external forwards)
export function createCRTFilter(app) {
	// Return a simple time-varying filter compatible with PIXI.Filter
	const fragment = `
		precision mediump float;
		uniform vec2 u_resolution;
		uniform float u_time;
		void main() {
			vec2 uv = gl_FragCoord.xy / u_resolution;
			float scan = sin(uv.y * 600.0);
			float v = 0.5 + 0.5 * sin(u_time + uv.x * 6.2831) * 0.8 + scan * 0.02;
			vec3 color = vec3(uv.x * 0.3, v, 0.6 - uv.y * 0.3);
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
	};
	return { filter: new PIXI.Filter(vertex, fragment, uniforms), uniforms };
}

export function updateCRTFilter({ uniforms }, app, dt) {
	uniforms.u_time += dt;
	uniforms.u_resolution[0] = app.renderer.width;
	uniforms.u_resolution[1] = app.renderer.height;
}