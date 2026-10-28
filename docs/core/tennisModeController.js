export function createTennisModeController(options = {}) {
	const {
		tennisState,
		tennisScoreText,
		tennisStatusText,
		getAllIconBodies = () => [],
	} = options;

	const captureBodySnapshot = (body) => {
		if (!body?.container || !body?.state) return null;
		const container = body.container;
		const state = body.state;
		return {
			x: container.position.x,
			y: container.position.y,
			scaleX: container.scale.x,
			scaleY: container.scale.y,
			rotation: container.rotation,
			zIndex: container.zIndex,
			visible: container.visible,
			vx: Number.isFinite(state.vx) ? state.vx : 0,
			vy: Number.isFinite(state.vy) ? state.vy : 0,
			angVel: Number.isFinite(state.angVel) ? state.angVel : 0,
			freeX: Number.isFinite(state.free?.x) ? state.free.x : container.position.x,
			freeY: Number.isFinite(state.free?.y) ? state.free.y : container.position.y,
		};
	};

	const applyBodySnapshot = (body, snapshot) => {
		if (!body?.container || !body?.state || !snapshot) return;
		const container = body.container;
		const state = body.state;
		container.position.set(snapshot.x, snapshot.y);
		container.scale.set(snapshot.scaleX, snapshot.scaleY);
		container.rotation = snapshot.rotation;
		container.zIndex = snapshot.zIndex;
		container.visible = snapshot.visible;
		state.vx = snapshot.vx;
		state.vy = snapshot.vy;
		state.angVel = snapshot.angVel;
		if (state.free) {
			state.free.x = snapshot.freeX;
			state.free.y = snapshot.freeY;
		}
		state.tennisScaleOverride = null;
	};

	const clearRoleAssignments = ({ restoreSnapshots = true } = {}) => {
		const allBodies = [
			...tennisState.selectionBodies,
			tennisState.playerBody,
			tennisState.opponentBody,
			tennisState.ballBody,
			...tennisState.spectators,
		].filter(Boolean);
		if (restoreSnapshots) {
			const uniq = new Set(allBodies);
			for (const body of uniq) {
				const snapshot = tennisState.snapshots.get(body);
				applyBodySnapshot(body, snapshot);
				if (body?.state) body.state.tennisScaleOverride = null;
			}
		} else {
			for (const body of allBodies) {
				if (body?.state) body.state.tennisScaleOverride = null;
			}
		}
		tennisState.selectionBodies = [];
		tennisState.playerBody = null;
		tennisState.opponentBody = null;
		tennisState.ballBody = null;
		tennisState.spectators = [];
		tennisState.snapshots.clear();
	};

	const updateScoreUi = () => {
		tennisScoreText.text = `${tennisState.playerScore} - ${tennisState.opponentScore}`;
	};

	const buildSelectionLineup = () => {
		const bodies = getAllIconBodies().filter((body) => body?.container && body?.state);
		if (bodies.length < 3) return false;
		clearRoleAssignments({ restoreSnapshots: true });
		tennisState.selectionBodies = [...bodies];
		for (const body of tennisState.selectionBodies) {
			tennisState.snapshots.set(body, captureBodySnapshot(body));
			body.state.dragging = false;
			body.state.grabbed = false;
			body.state.vx = 0;
			body.state.vy = 0;
			body.state.angVel = 0;
			body.state.tennisScaleOverride = null;
			body.container.visible = true;
		}
		return true;
	};

	const assignRolesFromPlayer = (playerBody) => {
		if (!playerBody) return false;
		const remaining = tennisState.selectionBodies.filter((body) => body !== playerBody);
		if (remaining.length < 2) return false;
		const opponentIndex = Math.floor(Math.random() * remaining.length);
		const opponentBody = remaining[opponentIndex];
		const afterOpponent = remaining.filter((body) => body !== opponentBody);
		const ballIndex = Math.floor(Math.random() * afterOpponent.length);
		const ballBody = afterOpponent[ballIndex];
		tennisState.playerBody = playerBody;
		tennisState.opponentBody = opponentBody;
		tennisState.ballBody = ballBody;
		tennisState.spectators = afterOpponent.filter((body) => body !== ballBody);
		return true;
	};

	const beginRound = (serveTowardOpponent = true) => {
		tennisState.serveTowardOpponent = Boolean(serveTowardOpponent);
		tennisState.roundDelay = 0.46;
		tennisState.roundActive = false;
		tennisState.rallyCount = 0;
		tennisState.ballVX = 0;
		tennisState.ballVY = 0;
		tennisState.paddleContact.player = false;
		tennisState.paddleContact.opponent = false;
		tennisState.stuckTimer = 0;
	};

	const resetMatch = () => {
		tennisState.playerScore = 0;
		tennisState.opponentScore = 0;
		tennisState.pointFlash = 0;
		tennisState.winner = null;
		tennisState.playerHoldTime = 0;
		tennisState.playerSwingVX = 0;
		tennisState.aiSwingVX = 0;
		tennisState.aiDecisionTimer = 0;
		tennisState.aiMistakeTimer = 0;
		tennisState.aiBiasX = 0;
		tennisState.aiBiasY = 0;
		tennisState.stuckTimer = 0;
		tennisState.lastPuckHitSfxAt = -999;
		updateScoreUi();
		tennisStatusText.text = 'CHOOSE YOUR CHARACTER';
	};

	return {
		captureBodySnapshot,
		applyBodySnapshot,
		clearRoleAssignments,
		updateScoreUi,
		buildSelectionLineup,
		assignRolesFromPlayer,
		beginRound,
		resetMatch,
	};
}