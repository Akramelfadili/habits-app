import { fireEvent, render, screen } from "@testing-library/react-native";

jest.mock("expo-symbols", () => {
	const { View } = require("react-native");
	return { SymbolView: View };
});
jest.mock("@/utils/use-accessibility-text-size", () => ({
	useAccessibilityTextSize: () => false,
}));

type Queries = {
	hideHabitNames: boolean;
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
	hideHabitNames: true,
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
const mockSetHideHabitNames = jest.fn();
jest.mock("../hooks/use-settings-actions", () => ({
	useSettingsActions: () => ({ setHideHabitNames: mockSetHideHabitNames }),
}));
const mockPush = jest.fn();
jest.mock("expo-router", () => ({
	useRouter: () => ({ push: mockPush }),
}));
const mockOpenSettings = jest.fn();
jest
	.spyOn(require("react-native").Linking, "openSettings")
	.mockImplementation(() => mockOpenSettings());

import { SettingsNotificationsScreen } from "./settings-notifications-screen";

beforeEach(() => {
	jest.clearAllMocks();
	mockQueries = base();
});

describe("SettingsNotificationsScreen (SY6)", () => {
	const denied = () => {
		mockQueries.notificationsDenied = true;
		mockQueries.notificationPermission = "denied";
	};

	it("with notifications off: one banner with Open Settings, then what is affected, once", async () => {
		denied();
		mockQueries.eveningReviewEnabled = true;
		await render(<SettingsNotificationsScreen />);
		expect(screen.getByRole("header", { name: "Notifications" })).toBeTruthy();
		expect(screen.getAllByText("Notifications are off")).toHaveLength(1);
		expect(
			screen.getByText(
				"Reminders and the evening review won’t arrive until you allow them in iOS Settings.",
			),
		).toBeTruthy();
		expect(screen.getByText("AFFECTED")).toBeTruthy();
		expect(screen.getByText("4 times on 3 habits")).toBeTruthy();
		expect(screen.getByText("21:30")).toBeTruthy();
		expect(
			screen.getByText(
				"Times stay editable while notifications are off. Nothing is deleted.",
			),
		).toBeTruthy();
		await fireEvent.press(screen.getByText("Open Settings"));
		expect(mockOpenSettings).toHaveBeenCalledTimes(1);
	});

	it("the evening review row opens its page", async () => {
		denied();
		await render(<SettingsNotificationsScreen />);
		await fireEvent.press(
			screen.getByRole("button", { name: /^Evening review/ }),
		);
		expect(mockPush).toHaveBeenCalledWith("/settings/evening-review");
	});

	it("says 'No reminders set' when nothing is held back, and 'Off' for an evening review that is off", async () => {
		denied();
		mockQueries.notificationImpact = { times: 0, habits: 0 };
		await render(<SettingsNotificationsScreen />);
		expect(screen.getByText("No reminders set")).toBeTruthy();
		expect(screen.getByText("Off")).toBeTruthy();
	});

	it("with notifications allowed: no banner and no Affected group, the state in words and a way to iOS Settings", async () => {
		await render(<SettingsNotificationsScreen />);
		expect(screen.queryByText("Notifications are off")).toBeNull();
		expect(screen.queryByText("AFFECTED")).toBeNull();
		expect(screen.getByText("Allowed")).toBeTruthy();
		await fireEvent.press(
			screen.getByRole("button", { name: /Open Settings/ }),
		);
		expect(mockOpenSettings).toHaveBeenCalledTimes(1);
	});

	it("says 'Not asked yet' before iOS has been asked", async () => {
		mockQueries.notificationPermission = "undetermined";
		await render(<SettingsNotificationsScreen />);
		expect(screen.getByText("Not asked yet")).toBeTruthy();
	});
	describe("Hide habit names", () => {
		it.each([
			["allowed", () => {}],
			[
				"off",
				() => {
					mockQueries.notificationsDenied = true;
					mockQueries.notificationPermission = "denied";
				},
			],
		])(
			"shows the switch on by default, with its hint, when notifications are %s",
			async (_, arrange) => {
				arrange();
				await render(<SettingsNotificationsScreen />);
				const toggle = screen.getByRole("switch", {
					name: /^Hide habit names/,
				});
				expect(toggle.props.accessibilityState.checked).toBe(true);
				expect(
					screen.getByText(
						"The lock screen can also hide previews: iOS Settings › Notifications › Show Previews.",
					),
				).toBeTruthy();
			},
		);

		it("reads its state aloud and flips it with one tap", async () => {
			mockQueries.hideHabitNames = false;
			await render(<SettingsNotificationsScreen />);
			const toggle = screen.getByRole("switch", { name: /^Hide habit names/ });
			expect(toggle.props.accessibilityState.checked).toBe(false);
			await fireEvent.press(toggle);
			expect(mockSetHideHabitNames).toHaveBeenCalledWith(true);
		});
	});
});
