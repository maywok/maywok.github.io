export function updateTennisModeFrame(context) {
  const {
    TENNIS_PHASE,
    TENNIS_WIN_SCORE,
    tennisMode,
    dragEnabled,
    tennisState,
    app,
    world,
    mouse,
    cameraOffset,
    SCENE_SCALE,
    screenToWorldSize,
    clamp01,
    nowMs,
    playSfxSafe,
    ICON_SFX,
    tennisLayer,
    tennisCourt,
    tennisNet,
    tennisScoreText,
    tennisStatusText,
    assignTennisRolesFromPlayer,
    beginTennisRound,
    updateTennisScoreUi,
    dtSeconds,
    timeSeconds,
  } = context;
  if (!tennisMode || !dragEnabled || !tennisState.active) {
    tennisLayer.visible = false;
    return;
  }
  tennisLayer.visible = true;
  const dt = Math.max(1 / 180, Math.min(0.05, Math.max(0, dtSeconds || 0)));
  tennisState.selectionPulse += dt;
  tennisState.pointFlash = Math.max(0, tennisState.pointFlash - dt * 1.9);
  const sw = app.renderer.width;
  const sh = app.renderer.height;
  const cx = sw * 0.5;
  const cy = sh * 0.5;
  const toWorldFromScreen = (sx, sy, out = { x: 0, y: 0 }) => {
    out.x = (sx - cx - cameraOffset.x) / SCENE_SCALE + cx;
    out.y = (sy - cy - cameraOffset.y) / SCENE_SCALE + cy;
    return out;
  };
  const mouseWorld = toWorldFromScreen(mouse.x, mouse.y);
  const wallLeftPx = sw * 0.03;
  const wallRightPx = sw * 0.97;
  const wallTopPx = sh * 0.03;
  const wallBottomPx = sh * 0.97;
  const midLinePx = sh * 0.5;
  const goalHalfWidthPx = Math.max(
    96,
    Math.min(236, (wallRightPx - wallLeftPx) * 0.28),
  );
  const goalLeftPx = sw * 0.5 - goalHalfWidthPx;
  const goalRightPx = sw * 0.5 + goalHalfWidthPx;
  const cornerRadiusPx = Math.max(
    30,
    Math.min(64, (wallRightPx - wallLeftPx) * 0.08),
  );
  const wallPadPx = Math.max(24, Math.min(42, sw * 0.028));
  const paddleRadiusPx = Math.max(22, Math.min(34, sw * 0.024));
  const hitRangePx = Math.max(32, Math.min(52, sw * 0.036));
  const leftWorld = toWorldFromScreen(wallLeftPx, 0).x;
  const rightWorld = toWorldFromScreen(wallRightPx, 0).x;
  const topWorld = toWorldFromScreen(0, wallTopPx).y;
  const bottomWorld = toWorldFromScreen(0, wallBottomPx).y;
  const midWorldY = toWorldFromScreen(0, midLinePx).y;
  const goalLeftWorld = toWorldFromScreen(goalLeftPx, 0).x;
  const goalRightWorld = toWorldFromScreen(goalRightPx, 0).x;
  const wallPadWorld = screenToWorldSize(wallPadPx);
  const cornerRadiusWorld = screenToWorldSize(cornerRadiusPx);
  const paddleRadiusWorld = screenToWorldSize(paddleRadiusPx);
  const hitRangeWorld = screenToWorldSize(hitRangePx);
  const ballRadius = screenToWorldSize(14);
  const malletRadius = paddleRadiusWorld + hitRangeWorld * 0.28;
  const puckScaleTarget = 0.72;
  const spectatorScaleTarget = 0.42;
  const WALL_RESTITUTION = 0.9;
  const PUCK_LINEAR_DAMPING = 0.16;
  const PADDLE_LINEAR_DAMPING = 4.2;
  const PADDLE_TANGENTIAL_TRANSFER = 0.1;
  const PADDLE_CARRY = 0.22;
  const MIN_SEPARATION_SPEED = screenToWorldSize(96);
  const MIN_CORNER_BOUNCE_SPEED = screenToWorldSize(110);
  const MIN_PUCK_SPEED = screenToWorldSize(140);
  const PADDLE_CONTACT_RELEASE_MARGIN = screenToWorldSize(14);
  const PADDLE_CONTACT_EPSILON = screenToWorldSize(2);
  const PADDLE_CONTACT_APPROACH_THRESHOLD = screenToWorldSize(12);
  const PADDLE_RESTITUTION = 0.68;
  const MAX_PUCK_SPEED = screenToWorldSize(860);
  const MAX_SUBSTEPS = 14;
  const STUCK_SPEED = screenToWorldSize(48);
  const STUCK_TIME_LIMIT = 1.15;
  const midlinePaddleBuffer =
    paddleRadiusWorld + ballRadius + screenToWorldSize(24);
  const playerMinY = Math.min(
    bottomWorld - wallPadWorld,
    Math.max(midWorldY + wallPadWorld, midWorldY + midlinePaddleBuffer),
  );
  const playerMaxY = bottomWorld - wallPadWorld;
  const opponentMinY = topWorld + wallPadWorld;
  const opponentMaxY = Math.max(
    topWorld + wallPadWorld,
    Math.min(midWorldY - wallPadWorld, midWorldY - midlinePaddleBuffer),
  );
  const innerLeftX = leftWorld + cornerRadiusWorld;
  const innerRightX = rightWorld - cornerRadiusWorld;
  const innerTopY = topWorld + cornerRadiusWorld;
  const innerBottomY = bottomWorld - cornerRadiusWorld;
  tennisCourt.clear();
  tennisCourt.lineStyle(
    2.2 / SCENE_SCALE,
    0xffffff,
    0.88 + tennisState.pointFlash * 0.08,
  );
  tennisCourt.moveTo(leftWorld, innerTopY);
  tennisCourt.lineTo(leftWorld, innerBottomY);
  tennisCourt.moveTo(rightWorld, innerTopY);
  tennisCourt.lineTo(rightWorld, innerBottomY);
  tennisCourt.moveTo(innerLeftX, topWorld);
  tennisCourt.lineTo(goalLeftWorld, topWorld);
  tennisCourt.moveTo(goalRightWorld, topWorld);
  tennisCourt.lineTo(innerRightX, topWorld);
  tennisCourt.moveTo(innerLeftX, bottomWorld);
  tennisCourt.lineTo(goalLeftWorld, bottomWorld);
  tennisCourt.moveTo(goalRightWorld, bottomWorld);
  tennisCourt.lineTo(innerRightX, bottomWorld);
  tennisCourt.moveTo(leftWorld, innerTopY);
  tennisCourt.arc(
    innerLeftX,
    innerTopY,
    cornerRadiusWorld,
    Math.PI,
    Math.PI * 1.5,
  );
  tennisCourt.moveTo(innerRightX, topWorld);
  tennisCourt.arc(
    innerRightX,
    innerTopY,
    cornerRadiusWorld,
    Math.PI * 1.5,
    Math.PI * 2,
  );
  tennisCourt.moveTo(rightWorld, innerBottomY);
  tennisCourt.arc(
    innerRightX,
    innerBottomY,
    cornerRadiusWorld,
    0,
    Math.PI * 0.5,
  );
  tennisCourt.moveTo(innerLeftX, bottomWorld);
  tennisCourt.arc(
    innerLeftX,
    innerBottomY,
    cornerRadiusWorld,
    Math.PI * 0.5,
    Math.PI,
  );
  tennisCourt.lineStyle(
    2.6 / SCENE_SCALE,
    0xffffff,
    0.94 + tennisState.pointFlash * 0.06,
  );
  tennisCourt.moveTo(
    toWorldFromScreen(wallLeftPx, midLinePx).x,
    toWorldFromScreen(wallLeftPx, midLinePx).y,
  );
  tennisCourt.lineTo(
    toWorldFromScreen(wallRightPx, midLinePx).x,
    toWorldFromScreen(wallRightPx, midLinePx).y,
  );
  tennisNet.clear();
  tennisNet.lineStyle(
    1.2 / SCENE_SCALE,
    0xffffff,
    0.28 + tennisState.pointFlash * 0.12,
  );
  tennisNet.moveTo(
    toWorldFromScreen(wallLeftPx, midLinePx - 2).x,
    toWorldFromScreen(wallLeftPx, midLinePx - 2).y,
  );
  tennisNet.lineTo(
    toWorldFromScreen(wallRightPx, midLinePx - 2).x,
    toWorldFromScreen(wallRightPx, midLinePx - 2).y,
  );
  tennisScoreText.visible = tennisState.phase !== TENNIS_PHASE.SELECT;
  tennisScoreText.position.set(
    (cx - cx - cameraOffset.x) / SCENE_SCALE + cx,
    (wallTopPx + 6 - cy - cameraOffset.y) / SCENE_SCALE + cy,
  );
  if (tennisState.phase === TENNIS_PHASE.SELECT) {
    tennisStatusText.style.fontSize = 54;
    tennisStatusText.style.fill = 0xe8faff;
    tennisStatusText.style.stroke = 0x07111a;
    tennisStatusText.style.strokeThickness = 10;
    tennisStatusText.style.letterSpacing = 2;
    tennisStatusText.alpha = 0.9 + Math.sin(timeSeconds * 3.6) * 0.1;
    tennisStatusText.scale.set(1 + Math.sin(timeSeconds * 4.2) * 0.04);
  } else {
    tennisStatusText.style.fontSize = 12;
    tennisStatusText.style.fill = 0xbde9ff;
    tennisStatusText.style.stroke = 0x000000;
    tennisStatusText.style.strokeThickness = 0;
    tennisStatusText.style.letterSpacing = 1;
    tennisStatusText.alpha = 1;
    tennisStatusText.scale.set(1);
  }
  const moveBodySmooth = (
    body,
    targetX,
    targetY,
    scale = 0.8,
    response = 11,
  ) => {
    if (!body?.container || !body?.state) return;
    body.container.position.x +=
      (targetX - body.container.position.x) * Math.min(1, dt * response);
    body.container.position.y +=
      (targetY - body.container.position.y) * Math.min(1, dt * response);
    const scaleLerp = Math.min(1, dt * Math.max(8, response));
    const nextScaleX =
      body.container.scale.x + (scale - body.container.scale.x) * scaleLerp;
    const nextScaleY =
      body.container.scale.y + (scale - body.container.scale.y) * scaleLerp;
    body.container.scale.set(nextScaleX, nextScaleY);
    body.state.tennisScaleOverride = scale;
    body.state.vx = 0;
    body.state.vy = 0;
    body.state.angVel = 0;
  };
  const smoothBodyScale = (body, targetScale, response = 12) => {
    if (!body?.container) return;
    const t = Math.min(1, dt * response);
    const sx =
      body.container.scale.x + (targetScale - body.container.scale.x) * t;
    const sy =
      body.container.scale.y + (targetScale - body.container.scale.y) * t;
    body.container.scale.set(sx, sy);
    if (body?.state) body.state.tennisScaleOverride = targetScale;
  };
  const playPuckHitSfx = (impactSpeed) => {
    const now = nowMs();
    if (now - tennisState.lastPuckHitSfxAt < 46) return;
    const minImpact = screenToWorldSize(28);
    const maxImpact = screenToWorldSize(880);
    const mix = clamp01(
      (impactSpeed - minImpact) / Math.max(1, maxImpact - minImpact),
    );
    if (mix <= 0.01) return;
    tennisState.lastPuckHitSfxAt = now;
    playSfxSafe(ICON_SFX.hockeyHit, {
      volume: 0.12 + mix * 0.88,
      rate: 0.9 + mix * 0.22,
    });
  };
  const reflectXIntoCourt = (x, radius) => {
    const minX = leftWorld + radius;
    const maxX = rightWorld - radius;
    if (maxX <= minX) return minX;
    let reflected = x;
    let guard = 0;
    while ((reflected < minX || reflected > maxX) && guard < 8) {
      if (reflected < minX) reflected = minX + (minX - reflected);
      else if (reflected > maxX) reflected = maxX - (reflected - maxX);
      guard += 1;
    }
    return Math.max(minX, Math.min(maxX, reflected));
  };
  const projectBallXAtY = (targetY, radius, maxTime = 1.5) => {
    const vy = tennisState.ballVY;
    if (!tennisState.roundActive || Math.abs(vy) < screenToWorldSize(20))
      return tennisState.ballX;
    const t = (targetY - tennisState.ballY) / vy;
    if (t <= 0 || t > maxTime)
      return reflectXIntoCourt(
        tennisState.ballX +
          tennisState.ballVX * Math.max(0, Math.min(maxTime, t)),
        radius,
      );
    const projected = tennisState.ballX + tennisState.ballVX * t;
    return reflectXIntoCourt(projected, radius);
  };
  const closestPointOnSegment = (ax, ay, bx, by, px, py) => {
    const abx = bx - ax;
    const aby = by - ay;
    const abLen2 = abx * abx + aby * aby;
    if (abLen2 <= 0.000001) return { x: ax, y: ay, t: 0 };
    const t = Math.max(
      0,
      Math.min(1, ((px - ax) * abx + (py - ay) * aby) / abLen2),
    );
    return { x: ax + abx * t, y: ay + aby * t, t };
  };
  const sanitizeAndClampPuck = () => {
    if (
      !Number.isFinite(tennisState.ballX) ||
      !Number.isFinite(tennisState.ballY)
    ) {
      tennisState.ballX = centerWorldX;
      tennisState.ballY = midWorldY;
    }
    if (
      !Number.isFinite(tennisState.ballVX) ||
      !Number.isFinite(tennisState.ballVY)
    ) {
      tennisState.ballVX = 0;
      tennisState.ballVY = 0;
    }
    const speed = Math.hypot(tennisState.ballVX, tennisState.ballVY);
    if (speed > MAX_PUCK_SPEED && speed > 0.0001) {
      const scale = MAX_PUCK_SPEED / speed;
      tennisState.ballVX *= scale;
      tennisState.ballVY *= scale;
    }
  };
  const placeSpectators = (wobbleAmount = 0) => {
    const maxSpectators = sw < 720 ? 4 : 8;
    for (let i = 0; i < tennisState.spectators.length; i++) {
      const spectator = tennisState.spectators[i];
      if (!spectator?.container || !spectator?.state) continue;
      if (i >= maxSpectators) {
        spectator.container.visible = false;
        continue;
      }
      spectator.container.visible = true;
      const side = i % 2 === 0 ? -1 : 1;
      const row = Math.floor(i / 2);
      const laneY =
        wallTopPx +
        48 +
        row *
          ((wallBottomPx - wallTopPx - 96) /
            Math.max(1, Math.ceil(maxSpectators / 2) - 1));
      const laneXBase =
        side < 0 ? wallLeftPx - 18 - row * 4 : wallRightPx + 18 + row * 4;
      const laneX = Math.max(16, Math.min(sw - 16, laneXBase));
      const wobble = Math.sin(timeSeconds * 2.1 + i * 0.8) * wobbleAmount;
      const p = toWorldFromScreen(laneX, laneY + wobble);
      moveBodySmooth(
        spectator,
        p.x,
        p.y,
        spectatorScaleTarget + tennisState.pointFlash * 0.02,
        7.4,
      );
      spectator.container.rotation = Math.sin(timeSeconds * 1.8 + i) * 0.03;
      spectator.container.zIndex = 150;
    }
  };
  if (tennisState.phase === TENNIS_PHASE.SELECT) {
    const lineBodies = tennisState.selectionBodies;
    const count = Math.max(1, lineBodies.length);
    const maxCols = Math.max(3, Math.floor((sw * 0.88) / 152));
    const cols = Math.max(1, Math.min(maxCols, count));
    const rows = Math.ceil(count / cols);
    const spacingX = Math.max(
      122,
      Math.min(164, (sw * 0.82) / Math.max(1, cols - 1 || 1)),
    );
    const spacingY = Math.max(92, Math.min(124, sh * 0.155));
    const startX = sw * 0.5 - spacingX * (cols - 1) * 0.5;
    const startY = sh * 0.65 - spacingY * (rows - 1) * 0.5;
    let hoveredBody = null;
    let hoveredDist = Number.POSITIVE_INFINITY;
    for (let i = 0; i < lineBodies.length; i++) {
      const body = lineBodies[i];
      if (!body?.container || !body?.state) continue;
      body.container.visible = true;
      const row = Math.floor(i / cols);
      const col = i % cols;
      const sx = startX + spacingX * col;
      const sy = startY + spacingY * row;
      const target = toWorldFromScreen(sx, sy);
      const dist = Math.hypot(
        body.container.position.x - mouseWorld.x,
        body.container.position.y - mouseWorld.y,
      );
      if (dist < hoveredDist) {
        hoveredDist = dist;
        hoveredBody = body;
      }
      const pulse =
        1.0 + Math.sin(tennisState.selectionPulse * 4.4 + i * 0.55) * 0.02;
      moveBodySmooth(body, target.x, target.y, pulse, 10);
      body.container.rotation +=
        (0 - body.container.rotation) * Math.min(1, dt * 12);
      body.state.angle = body.container.rotation;
      body.state.angVel *= Math.pow(0.5, dt * 60);
      body.container.zIndex = 164;
    }
    if (hoveredBody && hoveredDist <= screenToWorldSize(56)) {
      smoothBodyScale(
        hoveredBody,
        1.08 + Math.sin(tennisState.selectionPulse * 6.3) * 0.015,
        16,
      );
      hoveredBody.container.rotation +=
        (0 - hoveredBody.container.rotation) * Math.min(1, dt * 14);
      hoveredBody.state.angle = hoveredBody.container.rotation;
      hoveredBody.container.zIndex = 170;
    }
    tennisStatusText.text = "CHOOSE YOUR CHARACTER";
    tennisStatusText.position.set(
      (cx - cx - cameraOffset.x) / SCENE_SCALE + cx,
      (midLinePx - 56 - cy - cameraOffset.y) / SCENE_SCALE + cy,
    );
    if (
      mouse.down &&
      !tennisState.pointerWasDown &&
      hoveredBody &&
      hoveredDist <= screenToWorldSize(58)
    ) {
      if (assignTennisRolesFromPlayer(hoveredBody)) {
        tennisState.phase = TENNIS_PHASE.DROP;
        tennisState.dropTimer = 0;
        tennisState.playerDropVel = 0;
        tennisState.playerHoldTime = 0;
        tennisState.playerSwingVX = 0;
        tennisState.aiSwingVX = 0;
        beginTennisRound(true);
        tennisStatusText.text = "DROPPING IN...";
      }
    }
    tennisState.pointerWasDown = Boolean(mouse.down);
    world.sortChildren?.();
    return;
  }
  const playerBody = tennisState.playerBody;
  const opponentBody = tennisState.opponentBody;
  const ballBody = tennisState.ballBody;
  if (!playerBody || !opponentBody || !ballBody) {
    tennisState.phase = TENNIS_PHASE.SELECT;
    return;
  }
  const centerWorldX = toWorldFromScreen(sw * 0.5, 0).x;
  const aiAnchorY = opponentMinY + (opponentMaxY - opponentMinY) * 0.38;
  const nonPlayerBodies = [opponentBody, ballBody, ...tennisState.spectators];
  for (const body of nonPlayerBodies) {
    if (!body?.state) continue;
    body.state.grabbed = false;
    body.state.dragging = false;
  }
  if (
    !Number.isFinite(tennisState.ballX) ||
    !Number.isFinite(tennisState.ballY)
  ) {
    tennisState.ballX = ballBody.container.position.x;
    tennisState.ballY = ballBody.container.position.y;
  }
  if (!Number.isFinite(tennisState.ballVX)) tennisState.ballVX = 0;
  if (!Number.isFinite(tennisState.ballVY)) tennisState.ballVY = 0;
  tennisState.aiDecisionTimer -= dt;
  tennisState.aiMistakeTimer = Math.max(0, tennisState.aiMistakeTimer - dt);
  if (!Number.isFinite(tennisState.stuckTimer)) tennisState.stuckTimer = 0;
  const currentBallSpeed = Math.hypot(tennisState.ballVX, tennisState.ballVY);
  if (tennisState.aiDecisionTimer <= 0) {
    const pressure = clamp01(
      (currentBallSpeed - screenToWorldSize(140)) / screenToWorldSize(320),
    );
    const scoreLead = tennisState.opponentScore - tennisState.playerScore;
    const missChance = 0.2 + pressure * 0.2 + Math.max(0, scoreLead) * 0.04;
    if (Math.random() < missChance) {
      tennisState.aiMistakeTimer = 0.28 + Math.random() * 0.42;
    }
    const biasSpreadX = tennisState.aiMistakeTimer > 0 ? 120 : 56;
    const biasSpreadY = tennisState.aiMistakeTimer > 0 ? 78 : 40;
    tennisState.aiBiasX = screenToWorldSize(
      (Math.random() * 2 - 1) * biasSpreadX,
    );
    tennisState.aiBiasY = screenToWorldSize(
      (Math.random() * 2 - 1) * biasSpreadY,
    );
    tennisState.aiDecisionTimer =
      0.16 + Math.random() * 0.3 + tennisState.aiMistakeTimer * 0.22;
  }
  const aiTrackBlend = tennisState.aiMistakeTimer > 0 ? 0.22 : 0.52;
  const ballOnCpuHalf = tennisState.ballY <= midWorldY;
  const ballApproachingCpu =
    tennisState.roundActive && tennisState.ballVY < -screenToWorldSize(40);
  const predictedX = projectBallXAtY(
    opponentBody.container.position.y + screenToWorldSize(8),
    screenToWorldSize(16),
    1.05,
  );
  const aiTrackX = !tennisState.roundActive
    ? centerWorldX
    : ballOnCpuHalf || ballApproachingCpu
      ? predictedX
      : centerWorldX +
        (tennisState.ballX - centerWorldX) * 0.28;
  const aiTrackY = !tennisState.roundActive
    ? aiAnchorY
    : ballOnCpuHalf && ballApproachingCpu
      ? tennisState.ballY + screenToWorldSize(18)
      : aiAnchorY;
  const opponentTargetX = Math.max(
    leftWorld + paddleRadiusWorld,
    Math.min(
      rightWorld - paddleRadiusWorld,
      opponentBody.container.position.x * (1 - aiTrackBlend) +
        aiTrackX * aiTrackBlend +
        tennisState.aiBiasX +
        Math.sin(timeSeconds * 1.7 + tennisState.opponentScore * 0.4) *
          screenToWorldSize(14),
    ),
  );
  const opponentTargetY = Math.max(
    opponentMinY,
    Math.min(
      opponentMaxY,
      opponentBody.container.position.y * (1 - aiTrackBlend) +
        aiTrackY * aiTrackBlend +
        tennisState.aiBiasY,
    ),
  );
  tennisStatusText.position.set(
    (cx - cx - cameraOffset.x) / SCENE_SCALE + cx,
    (wallBottomPx + 14 - cy - cameraOffset.y) / SCENE_SCALE + cy,
  );
  if (tennisState.phase === TENNIS_PHASE.DROP) {
    tennisState.dropTimer += dt;
    tennisState.playerDropVel += screenToWorldSize(1100) * dt;
    const dropTarget = toWorldFromScreen(sw * 0.5, sh * 0.76);
    playerBody.container.position.x +=
      (dropTarget.x - playerBody.container.position.x) * Math.min(1, dt * 7.5);
    playerBody.container.position.y = Math.min(
      playerMaxY,
      playerBody.container.position.y + tennisState.playerDropVel * dt,
    );
    smoothBodyScale(playerBody, 0.88, 12);
    playerBody.container.zIndex = 167;
    playerBody.state.vx = 0;
    playerBody.state.vy = 0;
    playerBody.state.angVel = 0;
    moveBodySmooth(opponentBody, opponentTargetX, aiAnchorY, 0.86, 8);
    opponentBody.container.zIndex = 166;
    const ballTarget = toWorldFromScreen(sw * 0.5, sh * 0.5);
    moveBodySmooth(ballBody, ballTarget.x, ballTarget.y, puckScaleTarget, 9);
    ballBody.container.zIndex = 168;
    placeSpectators(0.5);
    if (
      playerBody.container.position.y >= dropTarget.y - screenToWorldSize(2) &&
      tennisState.dropTimer >= 0.35
    ) {
      tennisState.phase = TENNIS_PHASE.PLAY;
      tennisState.roundDelay = Math.max(tennisState.roundDelay, 0.4);
      tennisState.roundActive = false;
      tennisStatusText.text = "GRAB AND SWING TO HIT";
    }
    world.sortChildren?.();
    return;
  }
  const prevPlayerX = playerBody.container.position.x;
  const prevPlayerY = playerBody.container.position.y;
  if (playerBody.state.grabbed || playerBody.state.dragging) {
    playerBody.container.position.x = Math.max(
      leftWorld + paddleRadiusWorld,
      Math.min(rightWorld - paddleRadiusWorld, mouseWorld.x),
    );
    playerBody.container.position.y = Math.max(
      playerMinY,
      Math.min(playerMaxY, mouseWorld.y),
    );
    playerBody.state.vx =
      (playerBody.container.position.x - prevPlayerX) / Math.max(1 / 120, dt);
    playerBody.state.vy =
      (playerBody.container.position.y - prevPlayerY) / Math.max(1 / 120, dt);
  }
  const playerHitVx = Number.isFinite(playerBody.state.vx)
    ? playerBody.state.vx
    : (playerBody.container.position.x - prevPlayerX) / Math.max(1 / 120, dt);
  const playerHitVy = Number.isFinite(playerBody.state.vy)
    ? playerBody.state.vy
    : (playerBody.container.position.y - prevPlayerY) / Math.max(1 / 120, dt);
  const paddleDrag = Math.exp(-PADDLE_LINEAR_DAMPING * dt);
  playerBody.state.vx *= paddleDrag;
  playerBody.state.vy *= paddleDrag;
  if (playerBody.container.position.x < leftWorld + paddleRadiusWorld) {
    playerBody.container.position.x = leftWorld + paddleRadiusWorld;
    if (playerBody.state.vx < 0) playerBody.state.vx *= -0.22;
  }
  if (playerBody.container.position.x > rightWorld - paddleRadiusWorld) {
    playerBody.container.position.x = rightWorld - paddleRadiusWorld;
    if (playerBody.state.vx > 0) playerBody.state.vx *= -0.22;
  }
  if (playerBody.container.position.y < playerMinY) {
    playerBody.container.position.y = playerMinY;
    if (playerBody.state.vy < 0) playerBody.state.vy *= -0.2;
  }
  if (playerBody.container.position.y > playerMaxY) {
    playerBody.container.position.y = playerMaxY;
    if (playerBody.state.vy > 0) playerBody.state.vy *= -0.2;
  }
  const playerSpeed = Math.hypot(
    Number.isFinite(playerBody.state.vx) ? playerBody.state.vx : 0,
    Number.isFinite(playerBody.state.vy) ? playerBody.state.vy : 0,
  );
  smoothBodyScale(
    playerBody,
    0.98 + Math.min(0.1, playerSpeed / screenToWorldSize(1300)),
    12,
  );
  if (playerBody.state.grabbed || playerBody.state.dragging) {
    playerBody.container.rotation +=
      (0 - playerBody.container.rotation) * Math.min(1, dt * 18);
    playerBody.state.angle = playerBody.container.rotation;
    playerBody.state.angVel *= Math.pow(0.2, dt * 60);
  }
  playerBody.container.zIndex = 167;
  tennisState.playerSwingVX = playerHitVx;
  tennisState.playerHoldTime = Math.max(
    0,
    tennisState.playerHoldTime - dt * 1.5,
  );
  const prevOppX = opponentBody.container.position.x;
  const prevOppY = opponentBody.container.position.y;
  const aiCatchUp = Math.max(
    0,
    Math.min(18, (tennisState.playerScore - tennisState.opponentScore) * 10),
  );
  const aiStep =
    (screenToWorldSize(250 + aiCatchUp) +
      currentBallSpeed * (tennisState.aiMistakeTimer > 0 ? 0.12 : 0.28)) *
    dt;
  opponentBody.container.position.x += Math.max(
    -aiStep,
    Math.min(aiStep, opponentTargetX - opponentBody.container.position.x),
  );
  opponentBody.container.position.y += Math.max(
    -aiStep,
    Math.min(aiStep, opponentTargetY - opponentBody.container.position.y),
  );
  opponentBody.container.position.x = Math.max(
    leftWorld + paddleRadiusWorld,
    Math.min(rightWorld - paddleRadiusWorld, opponentBody.container.position.x),
  );
  opponentBody.container.position.y = Math.max(
    opponentMinY,
    Math.min(opponentMaxY, opponentBody.container.position.y),
  );
  smoothBodyScale(opponentBody, 0.88, 11);
  opponentBody.container.zIndex = 166;
  tennisState.aiSwingVX =
    (opponentBody.container.position.x - prevOppX) / Math.max(1 / 120, dt);
  let aiSwingVY =
    (opponentBody.container.position.y - prevOppY) / Math.max(1 / 120, dt);
  tennisState.aiSwingVX *= paddleDrag;
  aiSwingVY *= paddleDrag;
  opponentBody.state.vx = 0;
  opponentBody.state.vy = 0;
  opponentBody.state.angVel = 0;
  if (tennisState.winner) {
    tennisState.roundActive = false;
    tennisStatusText.text =
      tennisState.winner === "player"
        ? "YOU WIN! TAP TENNIS ICON TO EXIT"
        : "YOU LOSE! TAP TENNIS ICON TO EXIT";
  }
  if (!tennisState.winner && tennisState.roundDelay > 0) {
    tennisState.roundDelay = Math.max(0, tennisState.roundDelay - dt);
    const serverBody = tennisState.serveTowardOpponent
      ? playerBody
      : opponentBody;
    const serveOffset = paddleRadiusWorld + ballRadius + screenToWorldSize(24);
    tennisState.ballX = serverBody.container.position.x;
    tennisState.ballY =
      serverBody.container.position.y +
      (tennisState.serveTowardOpponent ? -serveOffset : serveOffset);
    ballBody.container.position.set(tennisState.ballX, tennisState.ballY);
    ballBody.state.vx = 0;
    ballBody.state.vy = 0;
    if (tennisState.roundDelay <= 0) {
      tennisState.roundActive = true;
      const serveSpeed = screenToWorldSize(280 + Math.random() * 70);
      tennisState.ballVX = screenToWorldSize((Math.random() * 2 - 1) * 90);
      tennisState.ballVY = tennisState.serveTowardOpponent
        ? -serveSpeed
        : serveSpeed;
      ballBody.state.vx = tennisState.ballVX;
      ballBody.state.vy = tennisState.ballVY;
      tennisStatusText.text = "GRAB AND SWING TO HIT";
    }
  }
  if (tennisState.roundActive) {
    const paddleHitRadius = malletRadius;
    const speedSteps = Math.ceil(
      Math.hypot(tennisState.ballVX, tennisState.ballVY) /
        screenToWorldSize(140),
    );
    const maxSubSteps = Math.min(
      MAX_SUBSTEPS,
      Math.max(5, Math.max(Math.ceil(dt * 60), speedSteps)),
    );
    const stepDt = dt / maxSubSteps;
    const cornerInnerRadius = Math.max(
      screenToWorldSize(2),
      cornerRadiusWorld - ballRadius,
    );
    const goalInset = ballRadius * 0.35;
    let goalForPlayer = false;
    let goalForOpponent = false;
    const resolvePaddleCollision = (
      paddle,
      paddleVx,
      paddleVy,
      sideSign,
      paddleKey,
      stepPrevX,
      stepPrevY,
    ) => {
      const minDist = paddleHitRadius + ballRadius;
      const closest = closestPointOnSegment(
        stepPrevX,
        stepPrevY,
        tennisState.ballX,
        tennisState.ballY,
        paddle.container.position.x,
        paddle.container.position.y,
      );
      const closestDx = closest.x - paddle.container.position.x;
      const closestDy = closest.y - paddle.container.position.y;
      const closestDist = Math.hypot(closestDx, closestDy);
      const relativeSpeed = Math.hypot(
        tennisState.ballVX - paddleVx,
        tennisState.ballVY - paddleVy,
      );
      const sweepSlack = relativeSpeed * stepDt * 0.55 + screenToWorldSize(2);
      const wasContact = Boolean(tennisState.paddleContact[paddleKey]);
      if (closestDist > minDist + sweepSlack) {
        if (
          wasContact &&
          closestDist > minDist + PADDLE_CONTACT_RELEASE_MARGIN
        ) {
          tennisState.paddleContact[paddleKey] = false;
        }
        return false;
      }
      let nx = tennisState.ballX - paddle.container.position.x;
      let ny = tennisState.ballY - paddle.container.position.y;
      let liveDist = Math.hypot(nx, ny);
      if (nx * nx + ny * ny >= minDist * minDist) {
        nx = closestDx;
        ny = closestDy;
        liveDist = closestDist;
        if (liveDist <= 0.0001 || liveDist > minDist + sweepSlack) return false;
        tennisState.ballX = closest.x;
        tennisState.ballY = closest.y;
      }
      if (liveDist <= 0.0001) {
        nx = 0;
        ny = sideSign;
        liveDist = 1;
      }
      nx /= liveDist;
      ny /= liveDist;
      const overlap = Math.max(0, minDist - liveDist) + PADDLE_CONTACT_EPSILON;
      tennisState.ballX += nx * overlap;
      tennisState.ballY += ny * overlap;
      tennisState.paddleContact[paddleKey] = true;
      const rvx = tennisState.ballVX - paddleVx;
      const rvy = tennisState.ballVY - paddleVy;
      const relNormal = rvx * nx + rvy * ny;
      const paddleSpeed = Math.hypot(paddleVx, paddleVy);
      const shouldResolveImpact =
        relNormal < -PADDLE_CONTACT_APPROACH_THRESHOLD ||
        (!wasContact && (relNormal < 0 || paddleSpeed > screenToWorldSize(40)));
      let didHit = false;
      if (shouldResolveImpact) {
        // Single clean bounce: reflect relative velocity, then blend a bit of paddle motion.
        const reflectedNx = rvx - (1 + PADDLE_RESTITUTION) * relNormal * nx;
        const reflectedNy = rvy - (1 + PADDLE_RESTITUTION) * relNormal * ny;
        const tx = -ny;
        const ty = nx;
        const tanSpeed = reflectedNx * tx + reflectedNy * ty;
        const paddleTan = paddleVx * tx + paddleVy * ty;
        const blendedTan =
          tanSpeed * (1 - PADDLE_TANGENTIAL_TRANSFER) +
          paddleTan * PADDLE_TANGENTIAL_TRANSFER;
        const normalSpeed = reflectedNx * nx + reflectedNy * ny;
        tennisState.ballVX =
          nx * Math.max(normalSpeed, MIN_SEPARATION_SPEED) +
          tx * blendedTan +
          paddleVx * PADDLE_CARRY;
        tennisState.ballVY =
          ny * Math.max(normalSpeed, MIN_SEPARATION_SPEED) +
          ty * blendedTan +
          paddleVy * PADDLE_CARRY;
        playPuckHitSfx(Math.max(-relNormal, paddleSpeed * 0.72));
        didHit = true;
      } else {
        const postRelNormal =
          (tennisState.ballVX - paddleVx) * nx +
          (tennisState.ballVY - paddleVy) * ny;
        if (postRelNormal < screenToWorldSize(18)) {
          const boost = screenToWorldSize(18) - postRelNormal;
          tennisState.ballVX += nx * boost;
          tennisState.ballVY += ny * boost;
        }
      }
      return didHit;
    };
    const resolveCornerCollision = (cx, cy, fallbackNX, fallbackNY) => {
      let dx = tennisState.ballX - cx;
      let dy = tennisState.ballY - cy;
      let dist = Math.hypot(dx, dy);
      if (dist >= cornerInnerRadius) return;
      let nx;
      let ny;
      if (dist <= 0.0001) {
        const flen = Math.hypot(fallbackNX, fallbackNY) || 1;
        nx = fallbackNX / flen;
        ny = fallbackNY / flen;
      } else {
        nx = dx / dist;
        ny = dy / dist;
      }
      tennisState.ballX = cx + nx * cornerInnerRadius;
      tennisState.ballY = cy + ny * cornerInnerRadius;
      const rel = tennisState.ballVX * nx + tennisState.ballVY * ny;
      if (rel < 0) {
        const impulse = -(1 + WALL_RESTITUTION) * rel;
        tennisState.ballVX += impulse * nx;
        tennisState.ballVY += impulse * ny;
      }
      const outSpeed = tennisState.ballVX * nx + tennisState.ballVY * ny;
      if (outSpeed < MIN_CORNER_BOUNCE_SPEED) {
        const boost = MIN_CORNER_BOUNCE_SPEED - outSpeed;
        tennisState.ballVX += nx * boost;
        tennisState.ballVY += ny * boost;
      }
    };
    const containPuckInArena = () => {
      // Rounded-rect containment after paddle pushes so the puck cannot escape.
      if (tennisState.ballX < innerLeftX && tennisState.ballY < innerTopY) {
        resolveCornerCollision(innerLeftX, innerTopY, 1, 1);
      } else if (
        tennisState.ballX > innerRightX &&
        tennisState.ballY < innerTopY
      ) {
        resolveCornerCollision(innerRightX, innerTopY, -1, 1);
      } else if (
        tennisState.ballX > innerRightX &&
        tennisState.ballY > innerBottomY
      ) {
        resolveCornerCollision(innerRightX, innerBottomY, -1, -1);
      } else if (
        tennisState.ballX < innerLeftX &&
        tennisState.ballY > innerBottomY
      ) {
        resolveCornerCollision(innerLeftX, innerBottomY, 1, -1);
      }

      if (
        tennisState.ballY >= innerTopY &&
        tennisState.ballY <= innerBottomY
      ) {
        if (tennisState.ballX < leftWorld + ballRadius) {
          tennisState.ballX = leftWorld + ballRadius;
          if (tennisState.ballVX < 0) {
            tennisState.ballVX = Math.abs(tennisState.ballVX) * WALL_RESTITUTION;
          }
        } else if (tennisState.ballX > rightWorld - ballRadius) {
          tennisState.ballX = rightWorld - ballRadius;
          if (tennisState.ballVX > 0) {
            tennisState.ballVX =
              -Math.abs(tennisState.ballVX) * WALL_RESTITUTION;
          }
        }
      }

      const inGoalMouth =
        tennisState.ballX >= goalLeftWorld + goalInset &&
        tennisState.ballX <= goalRightWorld - goalInset;
      const onTopRail =
        tennisState.ballX >= innerLeftX && tennisState.ballX <= innerRightX;
      const onBottomRail =
        tennisState.ballX >= innerLeftX && tennisState.ballX <= innerRightX;

      if (tennisState.ballY - ballRadius <= topWorld) {
        if (inGoalMouth) return "player";
        if (onTopRail || !inGoalMouth) {
          tennisState.ballY = topWorld + ballRadius;
          if (tennisState.ballVY < 0) {
            tennisState.ballVY = Math.abs(tennisState.ballVY) * WALL_RESTITUTION;
          }
          // Nudge away from the goal posts so the puck cannot wedge there.
          if (
            tennisState.ballX > goalLeftWorld - ballRadius &&
            tennisState.ballX < goalLeftWorld + goalInset
          ) {
            tennisState.ballX = goalLeftWorld - ballRadius;
            tennisState.ballVX = -Math.abs(tennisState.ballVX || MIN_SEPARATION_SPEED);
          } else if (
            tennisState.ballX < goalRightWorld + ballRadius &&
            tennisState.ballX > goalRightWorld - goalInset
          ) {
            tennisState.ballX = goalRightWorld + ballRadius;
            tennisState.ballVX = Math.abs(tennisState.ballVX || MIN_SEPARATION_SPEED);
          }
        }
      }

      if (tennisState.ballY + ballRadius >= bottomWorld) {
        if (inGoalMouth) return "opponent";
        if (onBottomRail || !inGoalMouth) {
          tennisState.ballY = bottomWorld - ballRadius;
          if (tennisState.ballVY > 0) {
            tennisState.ballVY =
              -Math.abs(tennisState.ballVY) * WALL_RESTITUTION;
          }
          if (
            tennisState.ballX > goalLeftWorld - ballRadius &&
            tennisState.ballX < goalLeftWorld + goalInset
          ) {
            tennisState.ballX = goalLeftWorld - ballRadius;
            tennisState.ballVX = -Math.abs(tennisState.ballVX || MIN_SEPARATION_SPEED);
          } else if (
            tennisState.ballX < goalRightWorld + ballRadius &&
            tennisState.ballX > goalRightWorld - goalInset
          ) {
            tennisState.ballX = goalRightWorld + ballRadius;
            tennisState.ballVX = Math.abs(tennisState.ballVX || MIN_SEPARATION_SPEED);
          }
        }
      }

      // Absolute safety net: if somehow outside the outer AABB, pull back in.
      const hardMinX = leftWorld + ballRadius;
      const hardMaxX = rightWorld - ballRadius;
      const hardMinY = topWorld + ballRadius;
      const hardMaxY = bottomWorld - ballRadius;
      const deeplyOutside =
        tennisState.ballX < hardMinX - ballRadius * 2 ||
        tennisState.ballX > hardMaxX + ballRadius * 2 ||
        tennisState.ballY < hardMinY - ballRadius * 2 ||
        tennisState.ballY > hardMaxY + ballRadius * 2;
      if (deeplyOutside) {
        tennisState.ballX = Math.max(
          hardMinX,
          Math.min(hardMaxX, tennisState.ballX),
        );
        tennisState.ballY = Math.max(
          hardMinY,
          Math.min(hardMaxY, tennisState.ballY),
        );
        tennisState.ballVX *= 0.4;
        tennisState.ballVY *= 0.4;
      }
      return null;
    };
    for (let step = 0; step < maxSubSteps; step++) {
      sanitizeAndClampPuck();
      tennisState.rallyCount += stepDt;
      const stepPrevX = tennisState.ballX;
      const stepPrevY = tennisState.ballY;
      tennisState.ballX += tennisState.ballVX * stepDt;
      tennisState.ballY += tennisState.ballVY * stepDt;
      if (
        resolvePaddleCollision(
          playerBody,
          tennisState.playerSwingVX,
          playerHitVy,
          -1,
          "player",
          stepPrevX,
          stepPrevY,
        )
      ) {
        tennisState.pointFlash = Math.max(tennisState.pointFlash, 0.24);
      }
      const aiMissRoll =
        Math.random() <
        (0.08 + tennisState.aiMistakeTimer * 0.45) * stepDt * 60;
      if (
        !aiMissRoll &&
        resolvePaddleCollision(
          opponentBody,
          tennisState.aiSwingVX,
          aiSwingVY,
          1,
          "opponent",
          stepPrevX,
          stepPrevY,
        )
      ) {
        tennisState.pointFlash = Math.max(tennisState.pointFlash, 0.16);
      }
      const puckDrag = Math.exp(-PUCK_LINEAR_DAMPING * stepDt);
      tennisState.ballVX *= puckDrag;
      tennisState.ballVY *= puckDrag;
      const scoredBy = containPuckInArena();
      if (scoredBy === "player") {
        goalForPlayer = true;
        break;
      }
      if (scoredBy === "opponent") {
        goalForOpponent = true;
        break;
      }
      sanitizeAndClampPuck();
    }

    // Unstick slow / wedged pucks so rallies keep moving.
    const liveSpeed = Math.hypot(tennisState.ballVX, tennisState.ballVY);
    if (liveSpeed < STUCK_SPEED) {
      tennisState.stuckTimer += dt;
    } else {
      tennisState.stuckTimer = 0;
    }
    if (tennisState.stuckTimer >= STUCK_TIME_LIMIT) {
      const awayY =
        tennisState.ballY <= midWorldY
          ? MIN_PUCK_SPEED
          : -MIN_PUCK_SPEED;
      const awayX =
        (centerWorldX - tennisState.ballX) * 0.35 +
        screenToWorldSize((Math.random() * 2 - 1) * 80);
      tennisState.ballVX = awayX;
      tennisState.ballVY = awayY;
      tennisState.stuckTimer = 0;
      tennisState.paddleContact.player = false;
      tennisState.paddleContact.opponent = false;
    } else if (liveSpeed > 0.0001 && liveSpeed < MIN_PUCK_SPEED * 0.45) {
      const boost = MIN_PUCK_SPEED * 0.45 / liveSpeed;
      tennisState.ballVX *= boost;
      tennisState.ballVY *= boost;
    }

    ballBody.container.position.set(tennisState.ballX, tennisState.ballY);
    ballBody.state.vx = tennisState.ballVX;
    ballBody.state.vy = tennisState.ballVY;
    if (goalForOpponent) {
      tennisState.opponentScore += 1;
      updateTennisScoreUi();
      tennisState.pointFlash = 1;
      tennisState.roundActive = false;
      tennisState.playerHoldTime = 0;
      tennisState.stuckTimer = 0;
      if (tennisState.opponentScore >= TENNIS_WIN_SCORE)
        tennisState.winner = "opponent";
      else beginTennisRound(false);
    }
    if (goalForPlayer) {
      tennisState.playerScore += 1;
      updateTennisScoreUi();
      tennisState.pointFlash = 1;
      tennisState.roundActive = false;
      tennisState.playerHoldTime = 0;
      tennisState.stuckTimer = 0;
      if (tennisState.playerScore >= TENNIS_WIN_SCORE)
        tennisState.winner = "player";
      else beginTennisRound(true);
    }
  } else {
    tennisState.stuckTimer = 0;
  }
  ballBody.container.position.set(tennisState.ballX, tennisState.ballY);
  smoothBodyScale(ballBody, puckScaleTarget, 14);
  ballBody.container.rotation +=
    (tennisState.ballVX / Math.max(0.0001, screenToWorldSize(740))) * dt * 8;
  ballBody.container.zIndex = 168;
  ballBody.state.vx = tennisState.ballVX;
  ballBody.state.vy = tennisState.ballVY;
  ballBody.state.angVel = 0;
  placeSpectators(2 + tennisState.pointFlash * 6);
  world.sortChildren?.();
}
