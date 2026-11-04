import { render, screen } from "@testing-library/react-native";

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

import { SettingsFreezesScreen } from "./settings-freezes-screen";

beforeEach(() => {
	jest.clearAllMocks();
	mockQueries = base();
});

describe("SettingsFreezesScreen (S4)", () => {
	it("shows two stat cards, Left and Used this month, and no Saved card", async () => {
		await render(<SettingsFreezesScreen />);
		expect(screen.getByRole("header", { name: "Freezes" })).toBeTruthy();
		expect(screen.getByLabelText("Left: 1, freeze")).toBeTruthy();
		expect(screen.getByLabelText("Used: 1, this month")).toBeTruthy();
		expect(screen.queryByText(/saved/i)).toBeNull();
		expect(screen.queryByText(/auto-use/i)).toBeNull();
	});

	it("says the rule in plain words and how to use a freeze", async () => {
		await render(<SettingsFreezesScreen />);
		expect(
			screen.getByText(
				"2 freezes a month, shared by all habits. They don’t roll over.",
			),
		).toBeTruthy();
		expect(
			screen.getByText(/You use one from the streak-at-risk sheet/),
		).toBeTruthy();
	});

	it("pluralises, and never shows a negative count if more were used than the pool", async () => {
		mockQueries.freezePool = { size: 3, usedThisMonth: 0 };
		await render(<SettingsFreezesScreen />);
		expect(screen.getByLabelText("Left: 3, freezes")).toBeTruthy();
	});

	it("clamps Left at zero", async () => {
		mockQueries.freezePool = { size: 2, usedThisMonth: 3 };
		await render(<SettingsFreezesScreen />);
		expect(screen.getByLabelText("Left: 0, freezes")).toBeTruthy();
	});
});
