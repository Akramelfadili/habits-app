import { getAppInfo } from "./app-info";

describe("getAppInfo", () => {
	it("reports version, build, schema and device facts, never undefined", () => {
		const info = getAppInfo();
		expect(info.version).toEqual(expect.any(String));
		expect(info.build).toEqual(expect.any(String));
		expect(info.schemaVersion).toBeGreaterThan(0);
		expect(info.platform).toEqual(expect.any(String));
		expect(info.osVersion).toEqual(expect.any(String));
		expect(info.device).toEqual(expect.any(String));
	});
});
