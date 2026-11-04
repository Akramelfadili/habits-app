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
const mockSetEvening = jest.fn();
const mockSetEveningTime = jest.fn();
jest.mock("../hooks/use-settings-actions", () => ({
	useSettingsActions: () => ({
		setThemePreference: mockSetTheme,
		setEveningReview: mockSetEvening,
		setEveningReviewTime: mockSetEveningTime,
	}),
}));
const mockOpenSettings = jest.fn();
jest
	.spyOn(require("react-native").Linking, "openSettings")
	.mockImplementation(() => mockOpenSettings());

import { SettingsEveningReviewScreen } from "./settings-evening-review-screen";

beforeEach(() => {
	jest.clearAllMocks();
	mockQueries = base();
});

describe("SettingsEveningReviewScreen (S3)", () => {
	it("has a heading, one switch with its time, and the rule for when it is sent", async () => {
		await render(<SettingsEveningReviewScreen />);
		expect(screen.getByRole("header", { name: "Evening review" })).toBeTruthy();
		expect(
			screen.getByRole("switch", {
				name: "Evening review, A nudge if anything is still open",
			}),
		).toBeTruthy();
		expect(screen.getByText("21:30")).toBeTruthy();
		expect(
			screen.getByText("Sent only on days with open habits."),
		).toBeTruthy();
	});

	it("toggles the evening review", async () => {
		await render(<SettingsEveningReviewScreen />);
		await fireEvent.press(screen.getByRole("switch"));
		expect(mockSetEvening).toHaveBeenCalledWith(true);
	});

	it("opens a time sheet without a days picker, and saves the picked time", async () => {
		mockQueries.eveningReviewTime = { hour: 20, minute: 5 };
		await render(<SettingsEveningReviewScreen />);
		await fireEvent.press(screen.getByRole("button", { name: /^Time/ }));
		expect(screen.getByText("Evening review time")).toBeTruthy();
		expect(screen.queryByText("Repeat on")).toBeNull();
		await fireEvent.press(screen.getByRole("button", { name: "Save time" }));
		expect(mockSetEveningTime).toHaveBeenCalledWith({ hour: 20, minute: 5 });
		expect(screen.queryByText("Evening review time")).toBeNull();
	});

	it("has no banner while notifications are allowed", async () => {
		await render(<SettingsEveningReviewScreen />);
		expect(screen.queryByText("Notifications are off")).toBeNull();
	});

	it("with notifications off, the banner comes first, says only the evening review is held back, and keeps the switch on", async () => {
		mockQueries.notificationsDenied = true;
		mockQueries.notificationPermission = "denied";
		mockQueries.eveningReviewEnabled = true;
		await render(<SettingsEveningReviewScreen />);
		expect(screen.getByText("Notifications are off")).toBeTruthy();
		expect(
			screen.getByText(
				"The evening review can’t arrive until you allow notifications.",
			),
		).toBeTruthy();
		await fireEvent.press(screen.getByText("Open Settings"));
		expect(mockOpenSettings).toHaveBeenCalledTimes(1);
		expect(screen.getByRole("switch").props.accessibilityState.checked).toBe(
			true,
		);
	});

	it("the Time row is a button and the notice a link-bearing banner", async () => {
		mockQueries.notificationsDenied = true;
		await render(<SettingsEveningReviewScreen />);
		expect(screen.getByRole("button", { name: /^Time/ })).toBeTruthy();
		expect(screen.getByRole("link", { name: /Open/ })).toBeTruthy();
	});
});
