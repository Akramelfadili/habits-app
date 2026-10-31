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
	notificationsDenied: boolean;
	notificationPermission: "granted" | "denied" | "undetermined" | undefined;
	notificationImpact: { times: number; habits: number };
	lastExport: string;
	exportSummary: unknown;
	freezePool: { size: number; usedThisMonth: number };
	about: { version: string; build: string; schemaVersion: number };
};
const base = (): Queries => ({
	themePreference: "system",
	resolvedScheme: "light",
	eveningReviewEnabled: false,
	notificationsDenied: false,
	notificationPermission: "granted",
	notificationImpact: { times: 4, habits: 3 },
	lastExport: "Never",
	exportSummary: {},
	freezePool: { size: 2, usedThisMonth: 1 },
	about: { version: "3.0", build: "412", schemaVersion: 12 },
});
let mockQueries: Queries = base();
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

const mockCopyDiagnostics = jest.fn();
jest.mock("@/lib/diagnostics/diagnostics", () => ({
	copyDiagnostics: () => mockCopyDiagnostics(),
}));

import { useToastStore } from "@/store/toast-store";
import { SettingsScreen } from "./settings-screen";

beforeEach(() => {
	jest.clearAllMocks();
	useToastStore.setState({ toast: null });
	mockQueries = base();
});

describe("SettingsScreen — Appearance (S2)", () => {
	it("has a heading, and Light, Dark and System as radios with the current one picked", async () => {
		await render(<SettingsScreen />);
		expect(screen.getByRole("header", { name: "Settings" })).toBeTruthy();
		const radios = screen.getAllByRole("radio");
		expect(radios).toHaveLength(3);
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
		await render(<SettingsScreen />);
		await fireEvent.press(screen.getByRole("radio", { name: "Dark" }));
		expect(mockSetTheme).toHaveBeenCalledWith("dark");
	});

	it("System says what it resolves to right now", async () => {
		mockQueries.resolvedScheme = "dark";
		await render(<SettingsScreen />);
		expect(screen.getByText("Follows iOS · now dark")).toBeTruthy();
	});

	it("explains that weeks start on Monday and text size follows iOS — and offers no control for either", async () => {
		await render(<SettingsScreen />);
		expect(
			screen.getByText(
				"Weeks start on Monday. Text size follows iOS Settings › Display & Text Size.",
			),
		).toBeTruthy();
		expect(screen.queryByText(/first weekday/i)).toBeNull();
	});
});

describe("SettingsScreen — Reminders (S3, SY6)", () => {
	it("shows the evening review as one switch with its time, and the rule for when it is sent", async () => {
		await render(<SettingsScreen />);
		expect(
			screen.getByRole("switch", {
				name: "Evening review, A nudge if anything is still open",
			}),
		).toBeTruthy();
		expect(screen.getByText("21:30")).toBeTruthy();
		expect(
			screen.getByText("Sent only on days with open habits."),
		).toBeTruthy();
		expect(screen.getByText("Allowed")).toBeTruthy();
	});

	it("toggles the evening review", async () => {
		await render(<SettingsScreen />);
		await fireEvent.press(screen.getByRole("switch"));
		expect(mockSetEvening).toHaveBeenCalledWith(true);
	});

	it("has no banner while notifications are allowed", async () => {
		await render(<SettingsScreen />);
		expect(screen.queryByText("Notifications are off")).toBeNull();
		expect(screen.queryByText("AFFECTED")).toBeNull();
	});

	it("with notifications off, one banner says what will not arrive and offers Open Settings, keeping the switch on", async () => {
		mockQueries.notificationsDenied = true;
		mockQueries.notificationPermission = "denied";
		mockQueries.eveningReviewEnabled = true;
		await render(<SettingsScreen />);
		expect(screen.getByText("Notifications are off")).toBeTruthy();
		expect(
			screen.getByText(
				"Reminders and the evening review won’t arrive until you allow them in iOS Settings.",
			),
		).toBeTruthy();
		await fireEvent.press(screen.getByText("Open Settings"));
		expect(mockOpenSettings).toHaveBeenCalledTimes(1);
		expect(screen.getByRole("switch").props.accessibilityState.checked).toBe(
			true,
		);
	});

	it("summarises what is affected: '4 times on 3 habits', and the evening review's state", async () => {
		mockQueries.notificationsDenied = true;
		mockQueries.notificationPermission = "denied";
		mockQueries.eveningReviewEnabled = true;
		await render(<SettingsScreen />);
		expect(screen.getByText("AFFECTED")).toBeTruthy();
		expect(screen.getByText("4 times on 3 habits")).toBeTruthy();
		expect(
			screen.getByText(
				"Times stay editable while notifications are off. Nothing is deleted.",
			),
		).toBeTruthy();
	});

	it("says 'No reminders set' when nothing is held back, and 'Off' for an evening review that is off", async () => {
		mockQueries.notificationsDenied = true;
		mockQueries.notificationPermission = "denied";
		mockQueries.notificationImpact = { times: 0, habits: 0 };
		await render(<SettingsScreen />);
		expect(screen.getByText("No reminders set")).toBeTruthy();
		expect(screen.getAllByText("Off").length).toBeGreaterThan(0);
	});
});

describe("SettingsScreen — Streaks (S4)", () => {
	it("says the rule in plain words and how many are left and used this month", async () => {
		await render(<SettingsScreen />);
		expect(
			screen.getByText(
				"2 freezes a month, shared by all habits. They don’t roll over.",
			),
		).toBeTruthy();
		expect(screen.getByText("1 of 2")).toBeTruthy();
		expect(screen.getByText("Used this month")).toBeTruthy();
	});

	it("never shows a negative count if more were used than the pool", async () => {
		mockQueries.freezePool = { size: 2, usedThisMonth: 3 };
		await render(<SettingsScreen />);
		expect(screen.getByText("0 of 2")).toBeTruthy();
	});
});

describe("SettingsScreen — Data and About (S5, S6)", () => {
	it("opens the export sheet from Export data, and builds no backup row", async () => {
		await render(<SettingsScreen />);
		expect(screen.getByText("JSON, CSV")).toBeTruthy();
		expect(screen.queryByText("export sheet open")).toBeNull();
		await fireEvent.press(screen.getByText("Export data"));
		expect(screen.getByText("export sheet open")).toBeTruthy();
		expect(screen.queryByText(/backup/i)).toBeNull();
	});

	it("shows the version and build", async () => {
		await render(<SettingsScreen />);
		expect(screen.getByText("3.0 (build 412)")).toBeTruthy();
	});

	it.each([
		["copied", "Diagnostics copied"],
		["shared", "Diagnostics ready to share"],
		["failed", "Couldn’t copy diagnostics. Try again."],
	] as const)(
		"Copy diagnostics (%s) confirms with a toast and no Undo",
		async (result, message) => {
			mockCopyDiagnostics.mockResolvedValue(result);
			await render(<SettingsScreen />);
			await fireEvent.press(screen.getByText("Copy diagnostics"));
			await screen.findByText("Copy");
			const toast = useToastStore.getState().toast;
			expect(toast?.message).toBe(message);
			expect(toast?.actionLabel).toBeUndefined();
		},
	);
});
