import { shiftClockTo } from "./shift-clock";

const RealDate = Date;
afterEach(() => {
	globalThis.Date = RealDate;
});

describe("shiftClockTo", () => {
	it("starts now at the given moment and puts the real clock back on null", () => {
		expect(shiftClockTo("2026-10-23T09:00:00")).toBe(true);
		const pinned = new RealDate("2026-10-23T09:00:00").getTime();
		expect(Math.abs(Date.now() - pinned)).toBeLessThan(1000);
		expect(shiftClockTo(null)).toBe(true);
		expect(Math.abs(Date.now() - RealDate.now())).toBeLessThan(1000);
	});

	it("re-pinning does not stack offsets", () => {
		shiftClockTo("2026-10-23T09:00:00");
		shiftClockTo("2026-10-24T09:00:00");
		const pinned = new RealDate("2026-10-24T09:00:00").getTime();
		expect(Math.abs(Date.now() - pinned)).toBeLessThan(1000);
	});

	it("rejects an invalid moment and leaves the clock alone", () => {
		expect(shiftClockTo("not a date")).toBe(false);
		expect(Math.abs(Date.now() - RealDate.now())).toBeLessThan(1000);
	});
});
