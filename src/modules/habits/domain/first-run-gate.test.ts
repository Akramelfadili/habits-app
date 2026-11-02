import { firstRunGate, shouldMarkSeen } from "./first-run-gate";

describe("firstRunGate", () => {
	it("waits while the flag is being read", () => {
		expect(firstRunGate({ seenFlag: undefined, habitCount: 0 })).toBe(
			"loading",
		);
	});

	it("waits while the habit list loads and the flag is unset", () => {
		expect(firstRunGate({ seenFlag: null, habitCount: undefined })).toBe(
			"loading",
		);
	});

	it("shows first run only with no habits and no flag", () => {
		expect(firstRunGate({ seenFlag: null, habitCount: 0 })).toBe("first-run");
	});

	it("never returns once the flag is set, even with every habit deleted", () => {
		expect(firstRunGate({ seenFlag: "true", habitCount: 0 })).toBe("done");
	});

	it("does not wait for habits once the flag says seen", () => {
		expect(firstRunGate({ seenFlag: "true", habitCount: undefined })).toBe(
			"done",
		);
	});

	it("skips first run for an install that already has habits", () => {
		expect(firstRunGate({ seenFlag: null, habitCount: 3 })).toBe("done");
	});
});

describe("shouldMarkSeen", () => {
	it("marks an install with habits and no flag, so deleting them all later stays quiet", () => {
		expect(shouldMarkSeen({ seenFlag: null, habitCount: 2 })).toBe(true);
	});

	it("does not mark while loading, on an empty install or when already marked", () => {
		expect(shouldMarkSeen({ seenFlag: null, habitCount: undefined })).toBe(
			false,
		);
		expect(shouldMarkSeen({ seenFlag: null, habitCount: 0 })).toBe(false);
		expect(shouldMarkSeen({ seenFlag: "true", habitCount: 2 })).toBe(false);
		expect(shouldMarkSeen({ seenFlag: undefined, habitCount: 2 })).toBe(false);
	});
});
