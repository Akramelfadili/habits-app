import { installLogging } from "./install";

describe("installLogging", () => {
	it("is idempotent and never throws", () => {
		expect(() => {
			installLogging();
			installLogging();
		}).not.toThrow();
	});
});
