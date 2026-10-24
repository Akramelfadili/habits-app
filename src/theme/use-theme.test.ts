import { act, renderHook } from "@testing-library/react-native";
import * as ReactNative from "react-native";
import { elevation, semanticColors, surfaceColors } from "./theme";
import { useThemePreferenceStore } from "./theme-preference-store";
import { useTheme } from "./use-theme";

let systemScheme: "light" | "dark" = "light";

beforeEach(() => {
	systemScheme = "light";
	jest
		.spyOn(ReactNative, "useColorScheme")
		.mockImplementation(() => systemScheme);
	useThemePreferenceStore.setState({ preference: "system", isLoaded: true });
});

afterEach(() => {
	jest.restoreAllMocks();
});

describe("useTheme", () => {
	it("follows the OS scheme on 'system'", async () => {
		systemScheme = "dark";
		const { result } = await renderHook(() => useTheme());

		expect(result.current.scheme).toBe("dark");
		expect(result.current.colors).toEqual({
			...surfaceColors.dark,
			...semanticColors.dark,
		});
		expect(result.current.elevation).toBe(elevation.dark);
	});

	it("lets an explicit preference override the OS", async () => {
		systemScheme = "dark";
		useThemePreferenceStore.setState({ preference: "light" });
		const { result } = await renderHook(() => useTheme());

		expect(result.current.scheme).toBe("light");
		expect(result.current.colors.bg).toBe(surfaceColors.light.bg);
	});

	it("re-renders when the preference changes", async () => {
		const { result } = await renderHook(() => useTheme());
		expect(result.current.scheme).toBe("light");

		await act(async () => {
			useThemePreferenceStore.setState({ preference: "dark" });
		});

		expect(result.current.scheme).toBe("dark");
	});
});
