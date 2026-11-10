import { fireEvent, render, screen } from "@testing-library/react-native";

jest.mock("expo-symbols", () => {
	const { View } = require("react-native");
	return { SymbolView: View };
});
jest.mock("@/utils/use-accessibility-text-size", () => ({
	useAccessibilityTextSize: () => false,
}));

type Queries = {
	themePreference: "light" | "dark" | "system";
	hapticsEnabled: boolean;
	resolvedScheme: "light" | "dark";
	eveningReviewEnabled: boolean;
	eveningReviewTime: { hour: number; minute: number };
	notificationsDenied: boolean;
	notificationPermission: "granted" | "denied" | "undetermined" | undefined;
	notificationImpact: { times: number; habits: number };
	freezePool: { size: number; usedThisMonth: number };
	about: { version: string; build: string; schemaVersion: number };
};
const base = (): Queries => ({
	themePreference: "system",
	hapticsEnabled: true,
	resolvedScheme: "light",
	eveningReviewEnabled: false,
	eveningReviewTime: { hour: 21, minute: 30 },
	notificationsDenied: false,
	notificationPermission: "granted",
	notificationImpact: { times: 4, habits: 3 },
	freezePool: { size: 2, usedThisMonth: 1 },
	about: { version: "3.0", build: "412", schemaVersion: 12 },
});
let mockQueries: Queries = base();
jest.mock("../hooks/use-settings-queries", () => ({
	useSettingsQueries: () => mockQueries,
}));
const mockPush = jest.fn();
jest.mock("expo-router", () => ({
	useRouter: () => ({ push: mockPush }),
}));
const mockSetTheme = jest.fn();
const mockSetHaptics = jest.fn();
const mockSetEvening = jest.fn();
const mockSetEveningTime = jest.fn();
jest.mock("../hooks/use-settings-actions", () => ({
	useSettingsActions: () => ({
		setThemePreference: mockSetTheme,
		setHaptics: mockSetHaptics,
		setEveningReview: mockSetEvening,
		setEveningReviewTime: mockSetEveningTime,
	}),
}));

import { SettingsAppearanceScreen } from "./settings-appearance-screen";

beforeEach(() => {
	jest.clearAllMocks();
	mockQueries = base();
});

describe("SettingsAppearanceScreen (S2)", () => {
	it("has a heading, and Light, Dark and System as radios with the current one picked", async () => {
		await render(<SettingsAppearanceScreen />);
		expect(screen.getByRole("header", { name: "Appearance" })).toBeTruthy();
		expect(screen.getAllByRole("radio")).toHaveLength(3);
		expect(
			screen.getByRole("radio", { name: /^System/ }).props.accessibilityState
				.selected,
		).toBe(true);
		expect(
			screen.getByRole("radio", { name: "Dark" }).props.accessibilityState
				.selected,
		).toBe(false);
	});

	it("applies a choice when tapped", async () => {
		await render(<SettingsAppearanceScreen />);
		await fireEvent.press(screen.getByRole("radio", { name: "Dark" }));
		expect(mockSetTheme).toHaveBeenCalledWith("dark");
	});

	it("has a Haptics switch, on by default, labelled for VoiceOver, that turns it off", async () => {
		await render(<SettingsAppearanceScreen />);
		const row = screen.getByRole("switch", {
			name: "Haptics, A light tap when you complete a habit",
		});
		expect(row.props.accessibilityState.checked).toBe(true);
		await fireEvent.press(row);
		expect(mockSetHaptics).toHaveBeenCalledWith(false);
	});

	it("shows the switch off when haptics are off", async () => {
		mockQueries = { ...base(), hapticsEnabled: false };
		await render(<SettingsAppearanceScreen />);
		expect(
			screen.getByRole("switch", { name: /^Haptics/ }).props.accessibilityState
				.checked,
		).toBe(false);
	});

	it("System says it follows iOS", async () => {
		await render(<SettingsAppearanceScreen />);
		expect(screen.getByText("Follows iOS")).toBeTruthy();
	});

	it("explains that weeks start on Monday and text size follows iOS — and offers no control for either", async () => {
		await render(<SettingsAppearanceScreen />);
		expect(
			screen.getByText(
				"Weeks start on Monday. Text size follows iOS Settings › Display & Text Size.",
			),
		).toBeTruthy();
		expect(screen.queryByText(/first weekday/i)).toBeNull();
	});
});
