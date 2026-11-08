import { render, screen } from "@testing-library/react-native";
import { clearLog, getLogEntries } from "@/lib/logger/logger";
import { migrationCopy } from "@/modules/habits/messages";

jest.mock("expo-symbols", () => {
	const { View } = require("react-native");
	return { SymbolView: View };
});
jest.mock("@/utils/use-accessibility-text-size", () => ({
	useAccessibilityTextSize: () => false,
}));
const mockHideSplash = jest.fn();
jest.mock("expo-splash-screen", () => ({ hide: () => mockHideSplash() }));
jest.mock("@/lib/diagnostics/diagnostics", () => ({
	copyDiagnostics: jest.fn(),
}));

import { NewerDatabaseScreen } from "./newer-database-screen";

beforeEach(() => {
	jest.clearAllMocks();
	clearLog();
});

describe("NewerDatabaseScreen", () => {
	it("says the data is from a newer version, offers Copy diagnostics and no Try again", async () => {
		await render(<NewerDatabaseScreen copy={migrationCopy.newer} />);
		expect(
			screen.getByText(
				"This data was made by a newer version of Habits. Update the app to open it.",
			),
		).toBeTruthy();
		expect(screen.getByText("Copy diagnostics")).toBeTruthy();
		expect(screen.queryByText("Try again")).toBeNull();
	});

	it("hides the splash and logs that it blocked", async () => {
		await render(<NewerDatabaseScreen copy={migrationCopy.newer} />);
		expect(mockHideSplash).toHaveBeenCalled();
		expect(getLogEntries().map((e) => e.event)).toContain(
			"database.newer_blocked",
		);
	});
});
