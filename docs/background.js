export function createParallaxBackground(app, theme) {
  const container = new PIXI.Container();

  const t = theme || {
    bg: 0x102a3f,
    dot: 0x0e2233,
    stripe: 0x143247,
    farAlpha: 0.10,
    midAlpha: 0.14,
    nearAlpha: 0.18,
  };

  function makeDotsTexture() {
    const g = new PIXI.Graphics();
  g.beginFill(t.dot, 0.25);
    const size = 128;
    for (let y = 4; y < size; y += 8) {
      for (let x = 4; x < size; x += 8) {
        g.drawCircle(x, y, 0.8);
      }
    }
    g.endFill();
    return app.renderer.generateTexture(g, { scaleMode: PIXI.SCALE_MODES.NEAREST });
  }

  function makeStripesTexture() {
    const g = new PIXI.Graphics();
    const size = 128;
  g.lineStyle(2, t.stripe, 0.35);
    for (let i = -size; i < size * 2; i += 12) {
      g.moveTo(i, -8);
      g.lineTo(i + size, size + 8);
    }
    return app.renderer.generateTexture(g, { scaleMode: PIXI.SCALE_MODES.NEAREST });
  }

  const texDots = makeDotsTexture();
  const texStripes = makeStripesTexture();

  const width = app.renderer.width;
  const height = app.renderer.height;

  const far = new PIXI.TilingSprite(texDots, width, height);
  far.alpha = t.farAlpha;

  const mid = new PIXI.TilingSprite(texStripes, width, height);
  mid.alpha = t.midAlpha;

  const near = new PIXI.TilingSprite(texDots, width, height);
  near.alpha = t.nearAlpha;

  container.addChild(far);
  container.addChild(mid);
  container.addChild(near);

  function update(time) {
    far.tilePosition.x = -time * 8;
    far.tilePosition.y = time * 2;
    mid.tilePosition.x = -time * 18;
    mid.tilePosition.y = time * 4;
    near.tilePosition.x = -time * 32;
    near.tilePosition.y = time * 6;
  }

  function resize() {
    far.width = mid.width = near.width = app.renderer.width;
    far.height = mid.height = near.height = app.renderer.height;
  }

  function destroy() {
    texDots?.destroy?.(true);
    texStripes?.destroy?.(true);
    container.destroy({ children: true });
  }

  return { container, update, resize, destroy };
}

function colorToVec3(color) {
  const r = ((color >> 16) & 255) / 255;
  const g = ((color >> 8) & 255) / 255;
  const b = (color & 255) / 255;
  return new Float32Array([r, g, b]);
}

function createFlowFilter(app, options = {}) {
  const {
    lineColor = 0x7f0020,
    bgColor = 0x000000,
    lineWidth = 0.13,
    glowWidth = 0.4,
    glowStrength = 0.45,
    speed = 0.45,
    density = 3.2,
    pixelSize = 4,
  } = options;

  const fragment = `
    precision mediump float;
    varying vec2 vTextureCoord;
    uniform vec2 u_resolution;
    uniform float u_time;
    uniform vec2 u_offset;
    uniform vec3 u_lineColor;
    uniform vec3 u_bgColor;
    uniform float u_lineWidth;
    uniform float u_glowWidth;
    uniform float u_glowStrength;
    uniform float u_speed;
    uniform float u_density;
    uniform float u_pixelSize;

    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
    }

    float noise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      float a = hash(i);
      float b = hash(i + vec2(1.0, 0.0));
      float c = hash(i + vec2(0.0, 1.0));
      float d = hash(i + vec2(1.0, 1.0));
      vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
    }

    float fbm(vec2 p) {
      float v = 0.0;
      float a = 0.5;
      for (int i = 0; i < 5; i++) {
        v += a * noise(p);
        p *= 2.0;
        a *= 0.5;
      }
      return v;
    }

    void main() {
      vec2 uv = vTextureCoord;
      vec2 pixelUV = floor(uv * u_resolution / u_pixelSize) * u_pixelSize / u_resolution;
      vec2 aspect = vec2(u_resolution.x / u_resolution.y, 1.0);
      vec2 p = (uv - 0.5) * aspect;
      p = (pixelUV - 0.5) * aspect;
      p += u_offset;
      float t = u_time * u_speed;
      float n = fbm(p * 1.2 + vec2(t * 0.12, -t * 0.09));
      float w = fbm(p * 2.4 + vec2(-t * 0.08, t * 0.05));
      float field = p.y * u_density + n * 1.4 + w * 1.1;
      float wave = abs(sin(field * 3.14159));
      float line = smoothstep(u_lineWidth, 0.0, wave);
      float glow = smoothstep(u_glowWidth, 0.0, wave);
      vec3 color = u_bgColor + u_lineColor * line + u_lineColor * glow * u_glowStrength;
      gl_FragColor = vec4(color, 1.0);
    }
  `;

  const uniforms = {
    u_resolution: new Float32Array([app.renderer.width, app.renderer.height]),
    u_time: 0,
    u_offset: new Float32Array([0, 0]),
    u_lineColor: colorToVec3(lineColor),
    u_bgColor: colorToVec3(bgColor),
    u_lineWidth: lineWidth,
    u_glowWidth: glowWidth,
    u_glowStrength: glowStrength,
    u_speed: speed,
    u_density: density,
    u_pixelSize: pixelSize,
  };

  return { filter: new PIXI.Filter(undefined, fragment, uniforms), uniforms };
}

export function createCrimsonFlowBackground(app, options = {}) {
  const {
    lineColor = 0x7f0020,
    glowColor = 0xb1002a,
    bgColor = 0x000000,
    glowAlpha = 0.65,
    parallax = 0.035,
    pixelSize = 4,
    density = 4.2,
    speed = 0.62,
    autoTick = true,
  } = options;

  const container = new PIXI.Container();
  const baseTexture = PIXI.Texture.WHITE;

  const core = new PIXI.Sprite(baseTexture);
  core.width = app.renderer.width;
  core.height = app.renderer.height;
  const { filter: coreFilter, uniforms: coreUniforms } = createFlowFilter(app, {
    lineColor,
    bgColor,
    lineWidth: 0.12,
    glowWidth: 0.34,
    glowStrength: 0.35,
    speed,
    density,
    pixelSize,
  });
  core.filters = [coreFilter];

  const glow = new PIXI.Sprite(baseTexture);
  glow.width = app.renderer.width;
  glow.height = app.renderer.height;
  glow.alpha = glowAlpha;
  glow.blendMode = PIXI.BLEND_MODES.ADD;
  const { filter: glowFilter, uniforms: glowUniforms } = createFlowFilter(app, {
    lineColor: glowColor,
    bgColor,
    lineWidth: 0.22,
    glowWidth: 0.6,
    glowStrength: 0.9,
    speed,
    density,
    pixelSize,
  });
  glow.filters = [glowFilter];

  container.addChild(core);
  container.addChild(glow);

  const state = {
    internalTime: 0,
    lastExternalUpdate: 0,
    lastOffset: { x: 0, y: 0 },
    tickerFn: null,
  };

  const nowMs = () => (typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now());

  function applyUniforms(time, offset) {
    coreUniforms.u_time = time;
    glowUniforms.u_time = time;
    const ox = offset.x * parallax / Math.max(1, app.renderer.width);
    const oy = offset.y * parallax / Math.max(1, app.renderer.height);
    coreUniforms.u_offset[0] = ox;
    coreUniforms.u_offset[1] = oy;
    glowUniforms.u_offset[0] = ox;
    glowUniforms.u_offset[1] = oy;
  }

  function update(time, offset = { x: 0, y: 0 }) {
    state.lastExternalUpdate = nowMs();
    state.lastOffset = offset || state.lastOffset;
    if (Number.isFinite(time)) state.internalTime = time;
    applyUniforms(state.internalTime, state.lastOffset);
  }

  function resize() {
    core.width = app.renderer.width;
    core.height = app.renderer.height;
    glow.width = app.renderer.width;
    glow.height = app.renderer.height;
    coreUniforms.u_resolution[0] = app.renderer.width;
    coreUniforms.u_resolution[1] = app.renderer.height;
    glowUniforms.u_resolution[0] = app.renderer.width;
    glowUniforms.u_resolution[1] = app.renderer.height;
  }

  function destroy() {
    if (state.tickerFn) app.ticker.remove(state.tickerFn);
    container.destroy({ children: true });
  }

  if (autoTick && app?.ticker?.add) {
    state.lastExternalUpdate = nowMs();
    state.tickerFn = (dt) => {
      const seconds = Number.isFinite(dt) ? dt / 60 : 1 / 60;
      state.internalTime += seconds;
      if (nowMs() - state.lastExternalUpdate > 200) {
        applyUniforms(state.internalTime, state.lastOffset);
      }
    };
    app.ticker.add(state.tickerFn);
  }

  return { container, update, resize, destroy };
}
