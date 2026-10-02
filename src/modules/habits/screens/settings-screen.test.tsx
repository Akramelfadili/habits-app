import { fireEvent, render, screen } from "@testing-library/react-native";
import type { ExportSummary } from "../services/export-data";

jest.mock("expo-symbols", () => {
	const { View } = require("react-native");
	return { SymbolView: View };
});
const mockPush = jest.fn();
jest.mock("expo-router", () => ({
	useRouter: () => ({ push: mockPush }),
}));

const summary: ExportSummary = {
	activeHabits: 7,
	archivedHabits: 2,
	logs: 1284,
	notes: 212,
	range: { from: "2026-03-03", to: "2026-09-16" },
};
let mockQueries = {
	themePreference: "system" as "light" | "dark" | "system",
	resolvedScheme: "light" as "light" | "dark",
	eveningReviewEnabled: false,
	notificationsDenied: false,
	lastExport: "Never",
	exportSummary: summary,
};
jest.mock("../hooks/use-settings-queries", () => ({
	useSettingsQueries: () => mockQueries,
}));
const mockSetTheme = jest.fn();
const mockSetEvening = jest.fn();
jest.mock("../hooks/use-settings-actions", () => ({
	useSettingsActions: () => ({
		setThemePreference: mockSetTheme,
		setEveningReview: mockSetEvening,
	}),
}));
jest.mock("../components/export-sheet", () => ({
	ExportSheet: ({ visible }: { visible: boolean }) => {
		const { Text } = require("react-native");
		return visible ? <Text>export sheet open</Text> : null;
	},
}));
const mockOpenSettings = jest.fn();
jest
	.spyOn(require("react-native").Linking, "openSettings")
	.mockImplementation(() => mockOpenSettings());

import { SettingsScreen } from "./settings-screen";

beforeEach(() => {
	jest.clearAllMocks();
	mockQueries = {
		themePreference: "system",
		resolvedScheme: "light",
		eveningReviewEnabled: false,
		notificationsDenied: false,
		lastExport: "Never",
		exportSummary: summary,
	};
});

describe("SettingsScreen (HAB-15)", () => {
	it("applies an Appearance choice when tapped", async () => {
		await render(<SettingsScreen />);
		await fireEvent.press(screen.getByText("Dark"));
		expect(mockSetTheme).toHaveBeenCalledWith("dark");
	});

	it("System's caption reports what it resolves to on this device", async () => {
		mockQueries.resolvedScheme = "dark";
		await render(<SettingsScreen />);
		expect(
			screen.getByText(
				"Matches your iPhone — currently dark. Switches whenever iOS does.",
			),
		).toBeTruthy();
	});

	it("shows the Evening review with its All habits scope, and toggles it", async () => {
		await render(<SettingsScreen />);
		expect(screen.getByText("Evening review")).toBeTruthy();
		expect(screen.getByText("All habits")).toBeTruthy();
		await fireEvent(
			screen.getByLabelText("Evening review"),
			"valueChange",
			true,
		);
		expect(mockSetEvening).toHaveBeenCalledWith(true);
	});

	it("explains why nothing will arrive when iOS notifications are off, keeping the toggle on", async () => {
		mockQueries.eveningReviewEnabled = true;
		mockQueries.notificationsDenied = true;
		await render(<SettingsScreen />);
		expect(
			screen.getByText(/Notifications are off for Habits in iOS/),
		).toBeTruthy();
		expect(screen.getByLabelText("Evening review").props.value).toBe(true);
		await fireEvent.press(screen.getByText("Open iOS Settings →"));
		expect(mockOpenSettings).toHaveBeenCalled();
	});

	it("has no notice while notifications are allowed", async () => {
		await render(<SettingsScreen />);
		expect(screen.queryByText(/Notifications are off/)).toBeNull();
	});

	it("has a plain Categories row that navigates to Manage Categories", async () => {
		await render(<SettingsScreen />);
		await fireEvent.press(screen.getByText("Categories"));
		expect(mockPush).toHaveBeenCalledWith("/habits/categories");
	});

	it("summarizes the export and shows the last export", async () => {
		mockQueries.lastExport = "2 August";
		await render(<SettingsScreen />);
		expect(
			screen.getByText("One file · 9 habits · 1,284 entries"),
		).toBeTruthy();
		expect(screen.getByText("2 August")).toBeTruthy();
	});

	it("opens the export sheet from the Export row", async () => {
		await render(<SettingsScreen />);
		expect(screen.queryByText("export sheet open")).toBeNull();
		await fireEvent.press(screen.getByText("Export all data"));
		expect(screen.getByText("export sheet open")).toBeTruthy();
	});
});
