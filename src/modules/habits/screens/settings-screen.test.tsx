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
jest.mock("../components/export-sheet", () => ({
	ExportSheet: ({ visible }: { visible: boolean }) => {
		const { Text } = require("react-native");
		return visible ? <Text>export sheet open</Text> : null;
	},
}));

import { SettingsScreen } from "./settings-screen";

beforeEach(() => {
	jest.clearAllMocks();
	mockQueries = base();
});

describe("SettingsScreen — the hub (S1)", () => {
	it("has a heading and the five groups, one row per page, each with its current value", async () => {
		await render(<SettingsScreen />);
		expect(screen.getByRole("header", { name: "Settings" })).toBeTruthy();
		for (const group of [
			"Appearance",
			"Reminders",
			"Streaks",
			"Data",
			"About",
		]) {
			expect(screen.getByText(group.toUpperCase())).toBeTruthy();
		}
		const row = (name: RegExp) => screen.getByRole("button", { name });
		expect(row(/^Theme/)).toBeTruthy();
		expect(screen.getByText("System")).toBeTruthy();
		expect(screen.getByText("Off")).toBeTruthy(); // evening review is off
		expect(screen.getByText("Allowed")).toBeTruthy();
		expect(screen.getByText("1 left")).toBeTruthy();
		expect(screen.getByText("JSON, CSV")).toBeTruthy();
		expect(screen.getByText("3.0 (412)")).toBeTruthy();
	});

	it("shows the real evening time when the review is on, and the real choices elsewhere", async () => {
		mockQueries.eveningReviewEnabled = true;
		mockQueries.eveningReviewTime = { hour: 20, minute: 5 };
		mockQueries.themePreference = "dark";
		mockQueries.notificationPermission = "denied";
		mockQueries.freezePool = { size: 2, usedThisMonth: 2 };
		await render(<SettingsScreen />);
		expect(screen.getByText("20:05")).toBeTruthy();
		expect(screen.getByText("Dark")).toBeTruthy();
		expect(screen.getByText("Off")).toBeTruthy();
		expect(screen.getByText("0 left")).toBeTruthy();
	});

	it("never shows a negative freeze count if more were used than the pool", async () => {
		mockQueries.freezePool = { size: 2, usedThisMonth: 3 };
		await render(<SettingsScreen />);
		expect(screen.getByText("0 left")).toBeTruthy();
	});

	it.each([
		["Theme", "/settings/appearance"],
		["Evening review", "/settings/evening-review"],
		["Notifications", "/settings/notifications"],
		["Freezes", "/settings/freezes"],
		["About", "/settings/about"],
	])("%s opens its page", async (name, href) => {
		await render(<SettingsScreen />);
		await fireEvent.press(
			screen.getByRole("button", { name: new RegExp(`^${name}`) }),
		);
		expect(mockPush).toHaveBeenCalledWith(href);
	});

	it("opens the export sheet from Export data, and builds no backup or auto-use row", async () => {
		await render(<SettingsScreen />);
		expect(screen.queryByText("export sheet open")).toBeNull();
		await fireEvent.press(screen.getByRole("button", { name: /^Export data/ }));
		expect(screen.getByText("export sheet open")).toBeTruthy();
		expect(screen.queryByText(/backup/i)).toBeNull();
		expect(screen.queryByText(/auto-use/i)).toBeNull();
	});

	it("carries no banner, and none of the sub-pages' controls", async () => {
		mockQueries.notificationsDenied = true;
		mockQueries.notificationPermission = "denied";
		await render(<SettingsScreen />);
		expect(screen.queryByText("Notifications are off")).toBeNull();
		expect(screen.queryByRole("radio")).toBeNull();
		expect(screen.queryByRole("switch")).toBeNull();
	});
});
