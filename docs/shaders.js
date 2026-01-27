export function createCRTFilter(app, { intensity = 0.8, brightness = 0.35, glowColor = 0x00ff99, scanStrength = 1.0 } = {}) {
	const fragment = `
		precision mediump float;
		varying vec2 vTextureCoord;
		uniform sampler2D uSampler;
		uniform vec2 u_resolution;
		uniform float u_time;
		uniform float u_intensity;
		uniform float u_brightness;
		uniform vec3 u_glowColor;
		uniform float u_scanStrength;
        
		float scanPattern(vec2 uv) {
			return sin(uv.y * 600.0) * 0.02;
		}

		void main() {
			vec2 uv = vTextureCoord;
			vec3 baseColor = texture2D(uSampler, uv).rgb;
			float wave = 0.5 + 0.5 * sin(u_time + uv.x * 6.2831);
			float scan = scanPattern(uv * u_resolution) * u_scanStrength;
            
			vec3 glow = u_glowColor * wave * u_intensity;
            
			vec3 color = baseColor * (0.6 + u_brightness) + glow * 0.25 + vec3(scan);
			gl_FragColor = vec4(color, 1.0);
		}
	`;
	const gc = glowColor;
	const r = ((gc >> 16) & 255) / 255;
	const g = ((gc >> 8) & 255) / 255;
	const b = (gc & 255) / 255;
	const uniforms = {
		u_resolution: new Float32Array([app.renderer.width, app.renderer.height]),
		u_time: 0,
		u_intensity: intensity,
		u_brightness: brightness,
		u_glowColor: new Float32Array([r, g, b]),
		u_scanStrength: scanStrength,
	};
	return { filter: new PIXI.Filter(undefined, fragment, uniforms), uniforms };
}

export function updateCRTFilter({ uniforms }, app, dt) {
	uniforms.u_time += dt;
	uniforms.u_resolution[0] = app.renderer.width;
	uniforms.u_resolution[1] = app.renderer.height;
}