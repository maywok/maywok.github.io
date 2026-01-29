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
			vec4 base = texture2D(uSampler, uv);
			vec3 baseColor = base.rgb;
			float wave = 0.5 + 0.5 * sin(u_time + uv.x * 6.2831);
			float scan = scanPattern(uv * u_resolution) * u_scanStrength;
            
			vec3 glow = u_glowColor * wave * u_intensity;
            
			vec3 color = baseColor * (0.6 + u_brightness) + glow * 0.25 + vec3(scan);
			gl_FragColor = vec4(color, base.a);
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

export function createCRTFisheyeFilter(app, {
	intensity = 0.12,
	brightness = 0.08,
	scanStrength = 0.6,
	curve = 0.12,
	vignette = 0.35,
} = {}) {
	const fragment = `
		precision mediump float;
		varying vec2 vTextureCoord;
		uniform sampler2D uSampler;
		uniform vec2 u_resolution;
		uniform float u_time;
		uniform float u_intensity;
		uniform float u_brightness;
		uniform float u_scanStrength;
		uniform float u_curve;
		uniform float u_vignette;

		vec2 fisheye(vec2 uv) {
			vec2 p = uv * 2.0 - 1.0;
			float r2 = dot(p, p);
			p *= 1.0 + u_curve * r2;
			return (p + 1.0) * 0.5;
		}

		float scanPattern(vec2 uv) {
			return sin(uv.y * 700.0 + u_time * 4.0) * 0.015;
		}

		void main() {
			vec2 uv = fisheye(vTextureCoord);
			if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
				gl_FragColor = vec4(0.0, 0.0, 0.0, 0.0);
				return;
			}
			vec4 base = texture2D(uSampler, uv);
			vec3 baseColor = base.rgb;
			float scan = scanPattern(uv * u_resolution) * u_scanStrength;
			vec2 dv = uv - 0.5;
			float vig = smoothstep(0.8, 0.35, dot(dv, dv));
			vec3 color = baseColor * (1.0 + u_brightness) + vec3(scan) * u_intensity;
			color *= mix(1.0, vig, u_vignette);
			gl_FragColor = vec4(color, base.a);
		}
	`;
	const uniforms = {
		u_resolution: new Float32Array([app.renderer.width, app.renderer.height]),
		u_time: 0,
		u_intensity: intensity,
		u_brightness: brightness,
		u_scanStrength: scanStrength,
		u_curve: curve,
		u_vignette: vignette,
	};
	return { filter: new PIXI.Filter(undefined, fragment, uniforms), uniforms };
}

export function updateCRTFisheyeFilter({ uniforms }, app, dt) {
	uniforms.u_time += dt;
	uniforms.u_resolution[0] = app.renderer.width;
	uniforms.u_resolution[1] = app.renderer.height;
}

export function createCRTScanlinesFilter(app, {
	strength = 0.38,
	speed = 0.25,
	noise = 0.035,
	mask = 0.12,
} = {}) {
	const fragment = `
		precision mediump float;
		varying vec2 vTextureCoord;
		uniform sampler2D uSampler;
		uniform vec2 u_resolution;
		uniform float u_time;
		uniform float u_strength;
		uniform float u_speed;
		uniform float u_noise;
		uniform float u_mask;

		float rand(vec2 co) {
			return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
		}

		void main() {
			vec2 uv = vTextureCoord;
			vec4 base = texture2D(uSampler, uv);
			float y = (uv.y + u_time * u_speed) * u_resolution.y;
			float scan = sin(y * 3.14159);
			float scanMix = mix(1.0 - u_strength, 1.0, 0.5 + 0.5 * scan);
			float n = (rand(vec2(uv.x * u_resolution.x, y)) - 0.5) * u_noise;
			float triad = 0.5 + 0.5 * sin(uv.x * u_resolution.x * 3.14159);
			float maskMix = mix(1.0 - u_mask, 1.0, triad);
			vec3 color = base.rgb * scanMix * maskMix + vec3(n);
			gl_FragColor = vec4(color, base.a);
		}
	`;
	const uniforms = {
		u_resolution: new Float32Array([app.renderer.width, app.renderer.height]),
		u_time: 0,
		u_strength: strength,
		u_speed: speed,
		u_noise: noise,
		u_mask: mask,
	};
	return { filter: new PIXI.Filter(undefined, fragment, uniforms), uniforms };
}

export function updateCRTScanlinesFilter({ uniforms }, app, dt) {
	uniforms.u_time += dt;
	uniforms.u_resolution[0] = app.renderer.width;
	uniforms.u_resolution[1] = app.renderer.height;
}