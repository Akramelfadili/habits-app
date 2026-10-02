import { act, renderHook } from "@testing-library/react-native";
import { Appearance } from "react-native";

const mockSystemScheme: { current: "light" | "dark" } = { current: "light" };
jest.mock("react-native/Libraries/Utilities/useColorScheme", () => ({
	__esModule: true,
	default: () => mockSystemScheme.current,
}));

const mockStored = new Map<string, string>();
jest.mock("@/lib/app-settings/repositories/app-settings-repository", () => ({
	getSetting: async (key: string) => mockStored.get(key) ?? null,
	setSetting: async (key: string, value: string) => {
		mockStored.set(key, value);
	},
}));

import { surfaceColors } from "./theme";
import { loadThemePreference, setThemePreference } from "./theme-preference";
import {
	resolveScheme,
	useThemePreferenceStore,
} from "./theme-preference-store";
import { useTheme } from "./use-theme";

const setColorScheme = jest.spyOn(Appearance, "setColorScheme");

beforeEach(() => {
	mockStored.clear();
	mockSystemScheme.current = "light";
	setColorScheme.mockClear();
	useThemePreferenceStore.setState({ preference: "system", isLoaded: false });
});

describe("resolveScheme", () => {
	it("an explicit choice beats the opposite OS scheme", () => {
		expect(resolveScheme("light", "dark")).toBe("light");
		expect(resolveScheme("dark", "light")).toBe("dark");
	});

	it("system follows the OS, and falls back to light when it says nothing", () => {
		expect(resolveScheme("system", "dark")).toBe("dark");
		expect(resolveScheme("system", "light")).toBe("light");
		expect(resolveScheme("system", undefined)).toBe("light");
	});
});

describe("useTheme", () => {
	it("draws dark tokens for an explicit Dark while the OS is light", async () => {
		useThemePreferenceStore.setState({ preference: "dark" });
		const { result } = await renderHook(() => useTheme());
		expect(result.current.scheme).toBe("dark");
		expect(result.current.colors.bg).toBe(surfaceColors.dark.bg);
	});

	it("draws light tokens for an explicit Light while the OS is dark", async () => {
		mockSystemScheme.current = "dark";
		useThemePreferenceStore.setState({ preference: "light" });
		const { result } = await renderHook(() => useTheme());
		expect(result.current.scheme).toBe("light");
		expect(result.current.colors.bg).toBe(surfaceColors.light.bg);
	});

	it("follows the OS under System", async () => {
		mockSystemScheme.current = "dark";
		const { result } = await renderHook(() => useTheme());
		expect(result.current.scheme).toBe("dark");
	});

	it("switches the moment the choice changes", async () => {
		const { result } = await renderHook(() => useTheme());
		expect(result.current.scheme).toBe("light");
		await act(async () => {
			await setThemePreference("dark");
		});
		expect(result.current.scheme).toBe("dark");
	});
});

describe("loadThemePreference", () => {
	it("applies the stored choice to the native side before reporting loaded", async () => {
		mockStored.set("app.themePreference", "dark");
		await loadThemePreference();
		expect(setColorScheme).toHaveBeenCalledWith("dark");
		expect(useThemePreferenceStore.getState()).toEqual({
			preference: "dark",
			isLoaded: true,
		});
	});

	it("defaults to System, handing control back to iOS", async () => {
		await loadThemePreference();
		expect(setColorScheme).toHaveBeenCalledWith("unspecified");
		expect(useThemePreferenceStore.getState().preference).toBe("system");
	});

	it("ignores a stored value it doesn't recognise", async () => {
		mockStored.set("app.themePreference", "sepia");
		await loadThemePreference();
		expect(useThemePreferenceStore.getState().preference).toBe("system");
	});
});

describe("setThemePreference", () => {
	it("applies natively and persists", async () => {
		await setThemePreference("light");
		expect(setColorScheme).toHaveBeenCalledWith("light");
		expect(mockStored.get("app.themePreference")).toBe("light");
	});
});
