import { parseStarterProfile } from "./starter-profile";

describe("parseStarterProfile", () => {
	it("is absent for an unset or blank variable", () => {
		expect(parseStarterProfile(undefined)).toEqual({ status: "absent" });
		expect(parseStarterProfile("")).toEqual({ status: "absent" });
	});

	it("reports a code, never the content", () => {
		expect(parseStarterProfile("{secret")).toEqual({
			status: "invalid",
			reason: "invalid_json",
		});
		expect(
			parseStarterProfile(JSON.stringify({ version: 0, habits: [] })),
		).toEqual({ status: "invalid", reason: "invalid_shape" });
	});

	it("rejects names over the app's limit and out-of-range targets", () => {
		const tooLong = "x".repeat(33);
		expect(
			parseStarterProfile(
				JSON.stringify({
					version: 1,
					habits: [{ name: tooLong, category: "Health" }],
				}),
			).status,
		).toBe("invalid");
		expect(
			parseStarterProfile(
				JSON.stringify({
					version: 1,
					habits: [{ name: "A", category: "Health", perWeek: 8 }],
				}),
			).status,
		).toBe("invalid");
	});

	it("accepts a minimal valid profile", () => {
		const result = parseStarterProfile(
			JSON.stringify({
				version: 1,
				habits: [{ name: "Alpha", category: "Health" }],
			}),
		);
		expect(result.status).toBe("ok");
	});
});
