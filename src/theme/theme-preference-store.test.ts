import { Appearance } from "react-native";
import {
	applyNativeScheme,
	DEFAULT_THEME_PREFERENCE,
	isThemePreference,
	resolveScheme,
	useThemePreferenceStore,
} from "./theme-preference-store";

describe("isThemePreference", () => {
	it.each(["light", "dark", "system"])("accepts %s", (value) => {
		expect(isThemePreference(value)).toBe(true);
	});

	it.each([null, "", "auto", "Dark"])("rejects %p", (value) => {
		expect(isThemePreference(value)).toBe(false);
	});
});

describe("resolveScheme", () => {
	it("lets an explicit choice win over the OS", () => {
		expect(resolveScheme("light", "dark")).toBe("light");
		expect(resolveScheme("dark", "light")).toBe("dark");
	});

	it("follows the OS for 'system', falling back to light", () => {
		expect(resolveScheme("system", "dark")).toBe("dark");
		expect(resolveScheme("system", "light")).toBe("light");
		expect(resolveScheme("system", "unspecified")).toBe("light");
		expect(resolveScheme("system", undefined)).toBe("light");
	});
});

describe("applyNativeScheme", () => {
	let spy: jest.SpyInstance;
	beforeEach(() => {
		spy = jest.spyOn(Appearance, "setColorScheme").mockImplementation(() => {});
	});
	afterEach(() => spy.mockRestore());

	it("hands control back to the OS for 'system'", () => {
		applyNativeScheme("system");
		expect(spy).toHaveBeenCalledWith("unspecified");
	});

	it("pushes an explicit choice to the native side", () => {
		applyNativeScheme("dark");
		expect(spy).toHaveBeenCalledWith("dark");
	});

	it("swallows a runtime that can't override the scheme", () => {
		spy.mockImplementation(() => {
			throw new Error("unsupported");
		});
		expect(() => applyNativeScheme("light")).not.toThrow();
	});
});

describe("useThemePreferenceStore", () => {
	it("starts on system and not loaded", () => {
		expect(useThemePreferenceStore.getState()).toEqual({
			preference: DEFAULT_THEME_PREFERENCE,
			isLoaded: false,
		});
	});
});
