import { isDeviceValidationBuild } from "./enabled";

describe("isDeviceValidationBuild", () => {
	const original = process.env.EXPO_PUBLIC_DEVICE_VALIDATION;
	afterEach(() => {
		if (original === undefined)
			delete process.env.EXPO_PUBLIC_DEVICE_VALIDATION;
		else process.env.EXPO_PUBLIC_DEVICE_VALIDATION = original;
	});

	it("is true only for the exact value 1", () => {
		process.env.EXPO_PUBLIC_DEVICE_VALIDATION = "1";
		expect(isDeviceValidationBuild()).toBe(true);
		process.env.EXPO_PUBLIC_DEVICE_VALIDATION = "true";
		expect(isDeviceValidationBuild()).toBe(false);
		delete process.env.EXPO_PUBLIC_DEVICE_VALIDATION;
		expect(isDeviceValidationBuild()).toBe(false);
	});
});
