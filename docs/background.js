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

function writeColorToVec3(target, color) {
  if (!target || target.length < 3) return;
  target[0] = ((color >> 16) & 255) / 255;
  target[1] = ((color >> 8) & 255) / 255;
  target[2] = (color & 255) / 255;
}

const FLOW_QUALITY_MODE = Object.freeze({
  FULL: 'full',
  REDUCED: 'reduced',
});

export const FLOW_BACKGROUND_QUALITY_PRESETS = Object.freeze({
  [FLOW_QUALITY_MODE.FULL]: {
    coreFilterResolution: 1,
    glowFilterResolution: 1,
    updateStep: 1,
    enableGlowLayer: true,
    ambienceScale: {
      mistStrength: 1,
      sparkStrength: 1,
      glowStrength: 1,
      speed: 1,
      density: 1,
      glowAlpha: 1,
    },
  },
  [FLOW_QUALITY_MODE.REDUCED]: {
    coreFilterResolution: 0.85,
    glowFilterResolution: 0.7,
    updateStep: 2,
    enableGlowLayer: false,
    ambienceScale: {
      mistStrength: 0.75,
      sparkStrength: 0.5,
      glowStrength: 0.78,
      speed: 0.94,
      density: 0.9,
      glowAlpha: 0.55,
    },
  },
});

function normalizeQualityMode(mode) {
  return mode === FLOW_QUALITY_MODE.REDUCED ? FLOW_QUALITY_MODE.REDUCED : FLOW_QUALITY_MODE.FULL;
}

function mergeQualityPreset(basePreset, overridePreset) {
  const base = basePreset || {};
  const extra = overridePreset || {};
  return {
    ...base,
    ...extra,
    ambienceScale: {
      ...(base.ambienceScale || {}),
      ...(extra.ambienceScale || {}),
    },
  };
}

function createFlowFilter(app, options = {}) {
  const {
    lineColor = 0x7f0020,
    bgColor = 0x000000,
    mistColorA = 0x180f16,
    mistColorB = 0x0d1824,
    mistColorC = 0x22152a,
    mistStrength = 0.26,
    sparkStrength = 0.14,
    lineWidth = 0.13,
    glowWidth = 0.4,
    glowStrength = 0.45,
    speed = 0.45,
    density = 3.2,
    pixelSize = 4,
    filterResolution = 1,
  } = options;

  const fragment = `
    precision mediump float;
    varying vec2 vTextureCoord;
    uniform vec2 u_resolution;
    uniform float u_time;
    uniform vec2 u_offset;
    uniform vec3 u_lineColor;
    uniform vec3 u_bgColor;
    uniform vec3 u_mistColorA;
    uniform vec3 u_mistColorB;
    uniform vec3 u_mistColorC;
    uniform float u_mistStrength;
    uniform float u_sparkStrength;
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

      // Dark moving mist that lives behind the line field.
      float mistFieldA = fbm(p * 0.85 + vec2(t * 0.03, -t * 0.02));
      float mistFieldB = fbm(p * 1.45 + vec2(-t * 0.025, t * 0.018));
      float mistMaskA = smoothstep(0.34, 0.88, mistFieldA);
      float mistMaskB = smoothstep(0.42, 0.93, mistFieldB);
      float mistMask = mistMaskA * 0.62 + mistMaskB * 0.38;
      vec3 mistColor = mix(u_mistColorA, u_mistColorB, mistFieldA);
      mistColor = mix(mistColor, u_mistColorC, mistFieldB * 0.75);
      vec3 mist = mistColor * mistMask * u_mistStrength;

      // Sparse colored sparks drifting through the void.
      float sparkField = fbm(p * 6.6 + vec2(t * 0.11, -t * 0.09));
      float sparkScatter = fbm(p * 11.5 + vec2(-t * 0.16, t * 0.13));
      float spark = smoothstep(0.83, 0.97, sparkField) * (0.35 + 0.65 * sparkScatter);
      vec3 sparkColor = mix(u_mistColorB, u_mistColorC, sparkScatter);
      vec3 sparkGlow = sparkColor * spark * u_sparkStrength;

      float field = p.y * u_density + n * 1.4 + w * 1.1;
      float wave = abs(sin(field * 3.14159));
      float line = smoothstep(u_lineWidth, 0.0, wave);
      float glow = smoothstep(u_glowWidth, 0.0, wave);
      vec3 color = u_bgColor + mist + sparkGlow + u_lineColor * line + u_lineColor * glow * u_glowStrength;
      gl_FragColor = vec4(color, 1.0);
    }
  `;

  const uniforms = {
    u_resolution: new Float32Array([app.renderer.width, app.renderer.height]),
    u_time: 0,
    u_offset: new Float32Array([0, 0]),
    u_lineColor: colorToVec3(lineColor),
    u_bgColor: colorToVec3(bgColor),
    u_mistColorA: colorToVec3(mistColorA),
    u_mistColorB: colorToVec3(mistColorB),
    u_mistColorC: colorToVec3(mistColorC),
    u_mistStrength: mistStrength,
    u_sparkStrength: sparkStrength,
    u_lineWidth: lineWidth,
    u_glowWidth: glowWidth,
    u_glowStrength: glowStrength,
    u_speed: speed,
    u_density: density,
    u_pixelSize: pixelSize,
  };

  const filter = new PIXI.Filter(undefined, fragment, uniforms);
  filter.resolution = Math.max(0.5, filterResolution);
  return { filter, uniforms };
}

export function createCrimsonFlowBackground(app, options = {}) {
  const {
    lineColor = 0x7f0020,
    glowColor = 0xb1002a,
    bgColor = 0x000000,
    mistColorA = 0x180f16,
    mistColorB = 0x0d1824,
    mistColorC = 0x22152a,
    mistStrength = 0.26,
    sparkStrength = 0.14,
    glowAlpha = 0.65,
    parallax = 0.035,
    pixelSize = 4,
    density = 4.2,
    speed = 0.62,
    autoTick = true,
    qualityMode = FLOW_QUALITY_MODE.FULL,
    qualityPresets = {},
  } = options;

  const baseConfig = {
    lineColor,
    glowColor,
    mistColorA,
    mistColorB,
    mistColorC,
    mistStrength,
    sparkStrength,
    glowAlpha,
    speed,
    density,
  };

  const container = new PIXI.Container();
  const baseTexture = PIXI.Texture.WHITE;

  const core = new PIXI.Sprite(baseTexture);
  core.width = app.renderer.width;
  core.height = app.renderer.height;
  const { filter: coreFilter, uniforms: coreUniforms } = createFlowFilter(app, {
    lineColor,
    bgColor,
    mistColorA,
    mistColorB,
    mistColorC,
    mistStrength,
    sparkStrength,
    lineWidth: 0.12,
    glowWidth: 0.34,
    glowStrength: 0.35,
    speed,
    density,
    pixelSize,
    filterResolution: 1,
  });
  core.filters = [coreFilter];

  const glow = new PIXI.Sprite(baseTexture);
  glow.width = app.renderer.width;
  glow.height = app.renderer.height;
  glow.alpha = glowAlpha;
  glow.blendMode = PIXI.BLEND_MODES.ADD;
  const { filter: glowFilter, uniforms: glowUniforms } = createFlowFilter(app, {
    lineColor: glowColor,
    bgColor: 0x000000,
    mistStrength: 0.0,
    sparkStrength: 0.0,
    lineWidth: 0.22,
    glowWidth: 0.6,
    glowStrength: 0.9,
    speed,
    density,
    pixelSize,
    filterResolution: 1,
  });
  glow.filters = [glowFilter];

  container.addChild(core);
  container.addChild(glow);

  const state = {
    internalTime: 0,
    lastExternalUpdate: 0,
    lastOffset: { x: 0, y: 0 },
    tickerFn: null,
    qualityMode: FLOW_QUALITY_MODE.FULL,
    qualityPreset: FLOW_BACKGROUND_QUALITY_PRESETS[FLOW_QUALITY_MODE.FULL],
    updateStep: 1,
    frameStepCounter: 0,
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

  const resolvedQualityPresets = {
    [FLOW_QUALITY_MODE.FULL]: mergeQualityPreset(
      FLOW_BACKGROUND_QUALITY_PRESETS[FLOW_QUALITY_MODE.FULL],
      qualityPresets?.[FLOW_QUALITY_MODE.FULL],
    ),
    [FLOW_QUALITY_MODE.REDUCED]: mergeQualityPreset(
      FLOW_BACKGROUND_QUALITY_PRESETS[FLOW_QUALITY_MODE.REDUCED],
      qualityPresets?.[FLOW_QUALITY_MODE.REDUCED],
    ),
  };

  function getActiveAmbienceScale() {
    return state.qualityPreset?.ambienceScale || FLOW_BACKGROUND_QUALITY_PRESETS[FLOW_QUALITY_MODE.FULL].ambienceScale;
  }

  function shouldApplyFrame() {
    if (state.updateStep <= 1) return true;
    state.frameStepCounter = (state.frameStepCounter + 1) % state.updateStep;
    return state.frameStepCounter === 0;
  }

  function applyQualityPreset(mode) {
    state.qualityMode = normalizeQualityMode(mode);
    state.qualityPreset = resolvedQualityPresets[state.qualityMode] || resolvedQualityPresets[FLOW_QUALITY_MODE.FULL];
    state.updateStep = Math.max(1, Math.round(state.qualityPreset.updateStep || 1));
    state.frameStepCounter = 0;

    coreFilter.resolution = Math.max(0.5, state.qualityPreset.coreFilterResolution || 1);
    glowFilter.resolution = Math.max(0.5, state.qualityPreset.glowFilterResolution || 1);

    const glowEnabled = state.qualityPreset.enableGlowLayer !== false;
    glow.visible = glowEnabled;
    glow.renderable = glowEnabled;
  }

  function update(time, offset = { x: 0, y: 0 }) {
    state.lastExternalUpdate = nowMs();
    state.lastOffset = offset || state.lastOffset;
    if (Number.isFinite(time)) state.internalTime = time;
    if (!shouldApplyFrame()) return;
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

  function setAmbience(config = {}) {
    const next = config || {};
    const ambienceScale = getActiveAmbienceScale();
    const scaleValue = (value, scaleKey) => value * (Number.isFinite(ambienceScale?.[scaleKey]) ? ambienceScale[scaleKey] : 1);
    if (typeof next.lineColor === 'number') {
      writeColorToVec3(coreUniforms.u_lineColor, next.lineColor);
    }
    if (typeof next.glowColor === 'number') {
      writeColorToVec3(glowUniforms.u_lineColor, next.glowColor);
    }
    if (typeof next.bgColor === 'number') {
      writeColorToVec3(coreUniforms.u_bgColor, next.bgColor);
    }
    if (typeof next.mistColorA === 'number') {
      writeColorToVec3(coreUniforms.u_mistColorA, next.mistColorA);
    }
    if (typeof next.mistColorB === 'number') {
      writeColorToVec3(coreUniforms.u_mistColorB, next.mistColorB);
    }
    if (typeof next.mistColorC === 'number') {
      writeColorToVec3(coreUniforms.u_mistColorC, next.mistColorC);
    }
    if (Number.isFinite(next.mistStrength)) {
      coreUniforms.u_mistStrength = Math.max(0, scaleValue(next.mistStrength, 'mistStrength'));
    }
    if (Number.isFinite(next.sparkStrength)) {
      coreUniforms.u_sparkStrength = Math.max(0, scaleValue(next.sparkStrength, 'sparkStrength'));
    }
    if (Number.isFinite(next.glowStrength)) {
      const scaledGlowStrength = Math.max(0, scaleValue(next.glowStrength, 'glowStrength'));
      coreUniforms.u_glowStrength = scaledGlowStrength;
      glowUniforms.u_glowStrength = Math.max(0, scaledGlowStrength + 0.35);
    }
    if (Number.isFinite(next.speed)) {
      const scaledSpeed = Math.max(0.01, scaleValue(next.speed, 'speed'));
      coreUniforms.u_speed = scaledSpeed;
      glowUniforms.u_speed = scaledSpeed;
    }
    if (Number.isFinite(next.density)) {
      const scaledDensity = Math.max(0.1, scaleValue(next.density, 'density'));
      coreUniforms.u_density = scaledDensity;
      glowUniforms.u_density = scaledDensity;
    }
    if (Number.isFinite(next.glowAlpha)) {
      glow.alpha = Math.max(0, Math.min(1, scaleValue(next.glowAlpha, 'glowAlpha')));
    }
  }

  function resetAmbience() {
    setAmbience(baseConfig);
  }

  function setQualityMode(mode) {
    const normalized = normalizeQualityMode(mode);
    if (state.qualityMode === normalized) return false;
    applyQualityPreset(normalized);
    resetAmbience();
    return true;
  }

  function getQualityMode() {
    return state.qualityMode;
  }

  applyQualityPreset(qualityMode);
  resetAmbience();

  if (autoTick && app?.ticker?.add) {
    state.lastExternalUpdate = nowMs();
    state.tickerFn = (dt) => {
      const seconds = Number.isFinite(dt) ? dt / 60 : 1 / 60;
      state.internalTime += seconds;
      if (nowMs() - state.lastExternalUpdate > 200) {
        if (!shouldApplyFrame()) return;
        applyUniforms(state.internalTime, state.lastOffset);
      }
    };
    app.ticker.add(state.tickerFn);
  }

  return {
    container,
    update,
    resize,
    destroy,
    setAmbience,
    resetAmbience,
    setQualityMode,
    getQualityMode,
  };
}
