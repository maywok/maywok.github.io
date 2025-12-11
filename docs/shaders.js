// Shaders module placeholder (no external forwards)
export function createCRTFilter(app, { intensity = 0.8, brightness = 0.35 } = {}) {
	// CRT overlay that samples the input texture, then adds scanlines and glow
	const fragment = `
		precision mediump float;
		varying vec2 vTextureCoord;
		uniform sampler2D uSampler;
		uniform vec2 u_resolution;
		uniform float u_time;
		uniform float u_intensity;
		uniform float u_brightness;
        
		float scanPattern(vec2 uv) {
			return sin(uv.y * 600.0) * 0.02; // thin horizontal lines
		}

		void main() {
			vec2 uv = vTextureCoord;
			vec3 baseColor = texture2D(uSampler, uv).rgb;
			float wave = 0.5 + 0.5 * sin(u_time + uv.x * 6.2831);
			float scan = scanPattern(uv * u_resolution);
            
			// Glow tint
			vec3 glow = vec3(0.0, 1.0, 0.6) * wave * u_intensity;
            
			// Apply brightness and blend glow + scanlines over the sampled color
			vec3 color = baseColor * (0.6 + u_brightness) + glow * 0.25 + vec3(scan);
			gl_FragColor = vec4(color, 1.0);
		}
	`;
	const uniforms = {
		u_resolution: new Float32Array([app.renderer.width, app.renderer.height]),
		u_time: 0,
		u_intensity: intensity,
		u_brightness: brightness,
	};
	// Use default PIXI filter vertex that provides vTextureCoord
	return { filter: new PIXI.Filter(undefined, fragment, uniforms), uniforms };
}

export function updateCRTFilter({ uniforms }, app, dt) {
	uniforms.u_time += dt;
	uniforms.u_resolution[0] = app.renderer.width;
	uniforms.u_resolution[1] = app.renderer.height;
}