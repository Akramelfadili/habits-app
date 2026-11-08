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
const mockCopyDiagnostics = jest.fn();
jest.mock("@/lib/diagnostics/diagnostics", () => ({
	copyDiagnostics: () => mockCopyDiagnostics(),
}));

import { Linking } from "react-native";
import { useToastStore } from "@/store/toast-store";
import { PRIVACY_POLICY_URL } from "../constants";
import { SettingsAboutScreen } from "./settings-about-screen";

beforeEach(() => {
	jest.clearAllMocks();
	useToastStore.setState({ toast: null });
	mockQueries = base();
});

describe("SettingsAboutScreen (S6)", () => {
	it("has a heading, shows the version and build as read-only text, and builds no feedback row", async () => {
		await render(<SettingsAboutScreen />);
		expect(screen.getByRole("header", { name: "About" })).toBeTruthy();
		expect(screen.getByText("3.0 (412)")).toBeTruthy();
		expect(screen.queryByRole("button", { name: /^Version/ })).toBeNull();
		expect(screen.queryByText("Send feedback")).toBeNull();
	});

	it("says under Copy diagnostics what it holds", async () => {
		await render(<SettingsAboutScreen />);
		expect(screen.getByText("Contains no habit names or notes.")).toBeTruthy();
	});

	it("the Privacy policy row opens the hosted policy", async () => {
		const open = jest.spyOn(Linking, "openURL").mockResolvedValue();
		await render(<SettingsAboutScreen />);
		await fireEvent.press(
			screen.getByRole("button", { name: /^Privacy policy/ }),
		);
		expect(open).toHaveBeenCalledTimes(1);
		expect(open).toHaveBeenCalledWith(PRIVACY_POLICY_URL);
		open.mockRestore();
	});

	it.each([
		["copied", "Diagnostics copied"],
		["shared", "Diagnostics ready to share"],
		["failed", "Couldn’t copy diagnostics. Try again."],
	] as const)(
		"Copy diagnostics (%s) confirms with a toast and no Undo",
		async (result, message) => {
			mockCopyDiagnostics.mockResolvedValue(result);
			await render(<SettingsAboutScreen />);
			await fireEvent.press(
				screen.getByRole("button", { name: /^Copy diagnostics/ }),
			);
			await screen.findByText("Copy");
			const toast = useToastStore.getState().toast;
			expect(toast?.message).toBe(message);
			expect(toast?.actionLabel).toBeUndefined();
		},
	);
});
