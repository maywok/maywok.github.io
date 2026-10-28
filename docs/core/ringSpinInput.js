export function createRingSpinInputController(options = {}) {
	const {
		toRendererPoint = () => null,
		getCoreScreenPos = () => ({ x: 0, y: 0 }),
		getCoreControlRadius = () => 0,
		isBlocked = () => false,
		onSpin = () => {},
		onLayout = () => {},
		ringThrowBoost = 1.7,
		ringMaxSpinVel = 10.5,
	} = options;

	const drag = {
		active: false,
		lastAngle: 0,
		lastTime: 0,
	};
	const candidate = {
		active: false,
		startX: 0,
		startY: 0,
	};

	const normalizeAngle = (angle) => {
		let value = angle;
		while (value > Math.PI) value -= Math.PI * 2;
		while (value < -Math.PI) value += Math.PI * 2;
		return value;
	};

	const reset = () => {
		drag.active = false;
		candidate.active = false;
	};

	const handlePointerDown = (event) => {
		if (isBlocked()) return;
		const point = toRendererPoint(event);
		if (!point) return;
		const core = getCoreScreenPos();
		const dx = point.x - core.x;
		const dy = point.y - core.y;
		const distance = Math.hypot(dx, dy);
		if (distance > getCoreControlRadius()) return;
		candidate.active = true;
		candidate.startX = point.x;
		candidate.startY = point.y;
		drag.lastAngle = Math.atan2(dy, dx);
		drag.lastTime = performance.now ? performance.now() : Date.now();
	};

	const handlePointerMove = (event) => {
		if (isBlocked() || !candidate.active) return;
		const point = toRendererPoint(event);
		if (!point) return;
		const moveDx = point.x - candidate.startX;
		const moveDy = point.y - candidate.startY;
		if (!drag.active && Math.hypot(moveDx, moveDy) < 7) return;
		drag.active = true;
		const core = getCoreScreenPos();
		const angle = Math.atan2(point.y - core.y, point.x - core.x);
		const now = performance.now ? performance.now() : Date.now();
		const dtMs = Math.max(1, now - drag.lastTime);
		const delta = normalizeAngle(angle - drag.lastAngle);
		const nextSpinVel = Math.max(
			-ringMaxSpinVel,
			Math.min(ringMaxSpinVel, (delta / (dtMs / 1000)) * ringThrowBoost),
		);
		onSpin(delta, nextSpinVel);
		drag.lastAngle = angle;
		drag.lastTime = now;
		onLayout();
	};

	window.addEventListener('pointerdown', handlePointerDown);
	window.addEventListener('pointermove', handlePointerMove);
	window.addEventListener('pointerup', reset);
	window.addEventListener('pointercancel', reset);
	window.addEventListener('blur', reset);

	return {
		isDragging: () => drag.active,
		reset,
		destroy: () => {
			window.removeEventListener('pointerdown', handlePointerDown);
			window.removeEventListener('pointermove', handlePointerMove);
			window.removeEventListener('pointerup', reset);
			window.removeEventListener('pointercancel', reset);
			window.removeEventListener('blur', reset);
		},
	};
}