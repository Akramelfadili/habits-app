const RealDate = Date;

/**
 * Makes "now" start at `value` (a local date-time like `2026-10-01T20:00:00`)
 * and keep ticking from there; `null` puts the real clock back. Shared by the
 * web `?clock=` pin and the device-validation build's `dev-state` link.
 *
 * Only argument-less construction and `Date.now()` read "now" — every other
 * form (a timestamp, an ISO string, y/m/d parts) is passed through as-is.
 */
export function shiftClockTo(value: string | null): boolean {
	if (value === null) {
		globalThis.Date = RealDate;
		return true;
	}
	const pinned = new RealDate(value).getTime();
	if (Number.isNaN(pinned)) return false;
	const offset = pinned - RealDate.now();

	class ShiftedDate extends RealDate {
		constructor(...args: unknown[]) {
			if (args.length === 0) {
				super(RealDate.now() + offset);
			} else {
				super(...(args as [string | number | Date]));
			}
		}

		static now(): number {
			return RealDate.now() + offset;
		}
	}
	globalThis.Date = ShiftedDate as DateConstructor;
	return true;
}
