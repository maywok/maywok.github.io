export const TENNIS_WIN_SCORE = 5;

// Temporarily inaccessible while tennis physics/AI are being reworked.
export const TENNIS_MODE_ENABLED = false;

export const TENNIS_PHASE = Object.freeze({
	IDLE: 'idle',
	SELECT: 'select',
	DROP: 'drop',
	PLAY: 'play',
});

export function createInitialTennisState() {
	return {
		active: false,
		phase: TENNIS_PHASE.IDLE,
		selectionBodies: [],
		playerBody: null,
		opponentBody: null,
		ballBody: null,
		spectators: [],
		snapshots: new Map(),
		playerScore: 0,
		opponentScore: 0,
		roundActive: false,
		roundDelay: 0,
		serveTowardOpponent: true,
		ballX: 0,
		ballY: 0,
		ballVX: 0,
		ballVY: 0,
		rallyCount: 0,
		winner: null,
		pointFlash: 0,
		pointerWasDown: false,
		selectionPulse: 0,
		playerDropVel: 0,
		dropTimer: 0,
		playerHoldTime: 0,
		playerSwingVX: 0,
		aiSwingVX: 0,
		aiDecisionTimer: 0,
		aiMistakeTimer: 0,
		aiBiasX: 0,
		aiBiasY: 0,
		stuckTimer: 0,
		lastPuckHitSfxAt: -999,
		paddleContact: {
			player: false,
			opponent: false,
		},
	};
}

export function createTennisModeOrchestrator(options = {}) {
	const {
		tennisController,
		tennisState,
		tennisStatusText,
		tennisLayer,
		getDragEnabled,
		getMouseDown,
		setTennisMode,
		setBasketballMode,
		setArcadeLayerVisible,
		stopArcadeCountdown,
		resetArcadePopup,
		clearTargetReactiveTransientFx,
		syncMusicTrack,
	} = options;

	if (!tennisController) throw new Error('createTennisModeOrchestrator requires tennisController');
	if (!tennisState) throw new Error('createTennisModeOrchestrator requires tennisState');
	if (!tennisStatusText) throw new Error('createTennisModeOrchestrator requires tennisStatusText');
	if (!tennisLayer) throw new Error('createTennisModeOrchestrator requires tennisLayer');
	if (typeof getDragEnabled !== 'function') throw new Error('createTennisModeOrchestrator requires getDragEnabled');
	if (typeof getMouseDown !== 'function') throw new Error('createTennisModeOrchestrator requires getMouseDown');
	if (typeof setTennisMode !== 'function') throw new Error('createTennisModeOrchestrator requires setTennisMode');
	if (typeof setBasketballMode !== 'function') throw new Error('createTennisModeOrchestrator requires setBasketballMode');
	if (typeof setArcadeLayerVisible !== 'function') throw new Error('createTennisModeOrchestrator requires setArcadeLayerVisible');
	if (typeof stopArcadeCountdown !== 'function') throw new Error('createTennisModeOrchestrator requires stopArcadeCountdown');
	if (typeof resetArcadePopup !== 'function') throw new Error('createTennisModeOrchestrator requires resetArcadePopup');
	if (typeof clearTargetReactiveTransientFx !== 'function') throw new Error('createTennisModeOrchestrator requires clearTargetReactiveTransientFx');
	if (typeof syncMusicTrack !== 'function') throw new Error('createTennisModeOrchestrator requires syncMusicTrack');

	const startMode = () => {
		if (!TENNIS_MODE_ENABLED) return false;
		if (!getDragEnabled()) return false;
		if (!tennisController.buildSelectionLineup()) {
			tennisStatusText.text = 'UNLOCK MORE ICONS TO PLAY TENNIS';
			return false;
		}
		setTennisMode(true);
		setBasketballMode(false);
		setArcadeLayerVisible(false);
		stopArcadeCountdown();
		resetArcadePopup();
		clearTargetReactiveTransientFx();
		tennisLayer.visible = true;
		tennisState.active = true;
		tennisState.phase = TENNIS_PHASE.SELECT;
		tennisState.pointerWasDown = Boolean(getMouseDown());
		tennisState.selectionPulse = 0;
		tennisState.dropTimer = 0;
		tennisState.playerDropVel = 0;
		tennisController.resetMatch();
		syncMusicTrack();
		return true;
	};

	const stopMode = ({ restoreIcons = false } = {}) => {
		setTennisMode(false);
		tennisLayer.visible = false;
		tennisState.active = false;
		tennisState.phase = TENNIS_PHASE.IDLE;
		tennisState.pointFlash = 0;
		tennisController.clearRoleAssignments({ restoreSnapshots: restoreIcons });
		syncMusicTrack();
	};

	return {
		startMode,
		stopMode,
	};
}
