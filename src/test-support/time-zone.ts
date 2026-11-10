/**
 * Time-zone helpers for tests (docs/how-to/dev-tooling.md § "Time zones in
 * tests"). Jest's globalSetup pins TZ (America/Los_Angeles unless JEST_TZ says
 * otherwise); these let one test run in another zone and find the days a zone
 * changes its clocks, from Intl rather than from memory.
 */

export const TEST_ZONES = [
	"UTC",
	"Europe/Paris",
	"America/Sao_Paulo",
	"America/Los_Angeles",
	"Pacific/Auckland",
] as const;

export type TestZone = (typeof TEST_ZONES)[number];

type ZoneHooks = {
	__setProcessTimeZone?: (zone: string | undefined) => void;
	__getProcessTimeZone?: () => string | undefined;
};

/**
 * Sets the zone of the real process. A test's `process.env` is Jest's copy, so
 * assigning `process.env.TZ` in a test changes nothing; `jest.environment.js`
 * provides this hook from the outer realm, where Node re-reads TZ on assignment.
 */
function setZone(zone: string | undefined): void {
	const hooks = globalThis as ZoneHooks;
	if (!hooks.__setProcessTimeZone) {
		throw new Error(
			"withTimeZone needs the jest.environment.js test environment (package.json jest.testEnvironment)",
		);
	}
	hooks.__setProcessTimeZone(zone);
}

export function currentTimeZone(): string | undefined {
	return (globalThis as ZoneHooks).__getProcessTimeZone?.();
}

/**
 * Runs `fn` with the process in `zone` (`new Date(y, m, d)`, `getHours()` and
 * date-fns all follow), then puts the previous zone back, also when `fn`
 * throws or its promise rejects. Build every date inside `fn`: a date made
 * before the switch is still the instant of the old zone's midnight.
 */
export function withTimeZone<T>(zone: string, fn: () => T): T {
	const previous = currentTimeZone();
	setZone(zone);
	let result: T;
	try {
		result = fn();
	} catch (error) {
		setZone(previous);
		throw error;
	}
	if (result instanceof Promise) {
		return result.finally(() => setZone(previous)) as T;
	}
	setZone(previous);
	return result;
}

/**
 * For a `describe` body: every test in it runs in `zone`, set before each test
 * and restored after. Build dates inside the tests, not in the describe body.
 */
export function inTimeZoneEachTest(zone: string): void {
	let previous: string | undefined;
	beforeEach(() => {
		previous = currentTimeZone();
		setZone(zone);
	});
	afterEach(() => setZone(previous));
}

function offsetAt(offsets: Intl.DateTimeFormat, instant: number): string {
	return (
		offsets.formatToParts(instant).find((part) => part.type === "timeZoneName")
			?.value ?? ""
	);
}

const HOUR = 3_600_000;

/**
 * The local days ("yyyy-MM-dd") in `year` on which `zone`'s UTC offset changes
 * (a 23 h or 25 h day), read from Intl by scanning the year hour by hour.
 * Empty for a zone without DST that year (UTC, America/Sao_Paulo since 2019).
 */
export function dstTransitionDays(zone: string, year: number): string[] {
	const offsets = new Intl.DateTimeFormat("en-US", {
		timeZone: zone,
		timeZoneName: "longOffset",
	});
	// en-CA formats as yyyy-MM-dd.
	const dayKeys = new Intl.DateTimeFormat("en-CA", {
		timeZone: zone,
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	});
	const days: string[] = [];
	const from = Date.UTC(year, 0, 1) - 14 * HOUR;
	const to = Date.UTC(year + 1, 0, 1) + 14 * HOUR;
	let previous = offsetAt(offsets, from);
	for (let instant = from + HOUR; instant < to; instant += HOUR) {
		const offset = offsetAt(offsets, instant);
		if (offset !== previous) {
			const key = dayKeys.format(instant);
			if (key.startsWith(String(year))) days.push(key);
			previous = offset;
		}
	}
	return days;
}
