import { failureMessage } from "./failure-message";

describe("failureMessage", () => {
	it("builds the shared wording", () => {
		expect(failureMessage("archive", "this habit")).toBe(
			"Couldn't archive this habit. Try again.",
		);
	});
});
