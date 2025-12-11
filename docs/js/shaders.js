// Basic CRT-like filter using PIXI.Filter
// Adds scanlines, slight vignette, and subtle barrel distortion

export function createCRTFilter(app) {
  const frag = `
  precision mediump float;
  varying vec2 vTextureCoord;
  uniform sampler2D uSampler;
  uniform float time;
  uniform vec2 resolution;

  // Barrel distortion
  vec2 barrel(vec2 uv, float amount) {
    vec2 cc = uv - 0.5;
    float dist = dot(cc, cc);
    return uv + cc * dist * amount;
  }

  void main() {
    vec2 uv = vTextureCoord;
    // Subtle distortion
    uv = barrel(uv, 0.05);

    vec3 color = texture2D(uSampler, uv).rgb;

    // Scanlines
    float scan = 0.95 + 0.05 * sin((uv.y * resolution.y) * 3.14159);
    color *= scan;

    // Horizontal glitch shimmer
    float shimmer = 0.985 + 0.015 * sin(time * 0.8 + uv.y * 27.0);
    color *= shimmer;

    // Vignette
    float dist = distance(uv, vec2(0.5));
    float vignette = smoothstep(0.9, 0.3, dist);
    color *= vignette;

    gl_FragColor = vec4(color, 1.0);
  }`;

  const filter = new PIXI.Filter(undefined, frag, {
    time: 0,
    resolution: new Float32Array([app.renderer.width, app.renderer.height])
  });
  return filter;
}

export function updateCRTFilter(filter, app, dt) {
  filter.uniforms.time += dt;
  const w = app.renderer.width;
  const h = app.renderer.height;
  filter.uniforms.resolution[0] = w;
  filter.uniforms.resolution[1] = h;
}
