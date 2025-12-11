// Pixelation filter: quantizes sampling to a lower-resolution grid
// Apply to a container: container.filters = [filter]
export function createPixelateFilter(app, { pixelSize = 4 } = {}) {
  const fragment = `
    precision mediump float;
    varying vec2 vTextureCoord;
    uniform sampler2D uSampler;
    uniform vec2 u_resolution;
    uniform float u_pixel;
    void main() {
      vec2 step = vec2(u_pixel) / u_resolution;
      vec2 uv = floor(vTextureCoord / step) * step;
      gl_FragColor = texture2D(uSampler, uv);
    }
  `;

  // Use the default PIXI vertex that provides vTextureCoord
  const uniforms = {
    u_resolution: new Float32Array([app.renderer.width, app.renderer.height]),
    u_pixel: pixelSize,
  };

  const filter = new PIXI.Filter(undefined, fragment, uniforms);

  function update() {
    uniforms.u_resolution[0] = app.renderer.width;
    uniforms.u_resolution[1] = app.renderer.height;
  }

  return { filter, update };
}
