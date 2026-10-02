import { pinClockFromUrl } from "./pin-clock.web";

const RealDate = Date;

function withSearch(search: string) {
	Object.defineProperty(globalThis, "location", {
		value: { search },
		configurable: true,
	});
}

describe("pinClockFromUrl (web)", () => {
	afterEach(() => {
		globalThis.Date = RealDate;
		Reflect.deleteProperty(globalThis, "location");
	});

	it("starts 'now' at ?clock= and keeps it ticking", () => {
		withSearch("?fixtures=default&clock=2026-10-01T20:00:00");
		pinClockFromUrl();

		const pinned = new RealDate("2026-10-01T20:00:00").getTime();
		expect(Math.abs(Date.now() - pinned)).toBeLessThan(1000);
		// biome-ignore lint/complexity/useDateNow: the argument-less constructor is what's under test here
		expect(Math.abs(new Date().getTime() - pinned)).toBeLessThan(1000);
	});

	it("leaves explicit dates alone", () => {
		withSearch("?clock=2026-10-01T20:00:00");
		pinClockFromUrl();

		expect(new Date("2025-01-01T00:00:00Z").toISOString()).toBe(
			"2025-01-01T00:00:00.000Z",
		);
		expect(new Date(0).getTime()).toBe(0);
		expect(new Date(2026, 0, 5).getDate()).toBe(5);
		expect(new Date() instanceof RealDate).toBe(true);
	});

	it("does nothing without a valid ?clock=", () => {
		withSearch("?clock=not-a-date");
		pinClockFromUrl();
		expect(Date).toBe(RealDate);

		withSearch("");
		pinClockFromUrl();
		expect(Date).toBe(RealDate);
	});
});
