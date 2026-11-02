import {
	formatEveningReviewTime,
	parseEveningReviewTime,
} from "./evening-review-time";

describe("evening review time", () => {
	it("reads a stored time", () => {
		expect(parseEveningReviewTime("07:05")).toEqual({ hour: 7, minute: 5 });
	});

	it.each([null, undefined, "", "9:5", "24:00", "12:60", "noon"])(
		"falls back to 21:30 for %p",
		(stored) => {
			expect(parseEveningReviewTime(stored)).toEqual({ hour: 21, minute: 30 });
		},
	);

	it("writes a time zero-padded, and reads it back", () => {
		const text = formatEveningReviewTime({ hour: 6, minute: 0 });
		expect(text).toBe("06:00");
		expect(parseEveningReviewTime(text)).toEqual({ hour: 6, minute: 0 });
	});
});
