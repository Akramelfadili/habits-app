import { fireEvent, render, screen } from "@testing-library/react-native";
import { Text } from "react-native";
import { migrationCopy } from "@/modules/habits/messages";

const mockHideSplash = jest.fn();
jest.mock("expo-splash-screen", () => ({ hide: () => mockHideSplash() }));
jest.mock("expo-symbols", () => {
	const { View } = require("react-native");
	return { SymbolView: View };
});
jest.mock("@/utils/use-accessibility-text-size", () => ({
	useAccessibilityTextSize: () => false,
}));
jest.mock("@/lib/diagnostics/diagnostics", () => ({
	copyDiagnostics: jest.fn(),
}));

import { DatabaseProvider } from "./database-provider.web";

function withScenario(scenario: string | null) {
	const search = scenario ? `?fixtures=${scenario}` : "";
	Object.defineProperty(globalThis, "location", {
		value: { search },
		configurable: true,
	});
}

beforeEach(() => {
	jest.clearAllMocks();
	withScenario(null);
});

const app = (
	<DatabaseProvider copy={migrationCopy}>
		<Text>App</Text>
	</DatabaseProvider>
);

describe("DatabaseProvider (web)", () => {
	it("renders the app when nothing is simulated", async () => {
		await render(app);
		expect(screen.getByText("App")).toBeTruthy();
	});

	it("stays on the update screen for ?fixtures=migration-running (SY3)", async () => {
		withScenario("migration-running");
		await render(app);
		expect(screen.getByText("Updating your data")).toBeTruthy();
		expect(screen.queryByText("App")).toBeNull();
	});

	it("shows the update-failed screen for ?fixtures=migration-fails (SY4), and hides the splash", async () => {
		withScenario("migration-fails");
		await render(app);
		expect(screen.getByText("Update didn’t finish")).toBeTruthy();
		expect(mockHideSplash).toHaveBeenCalled();
	});

	it("shows the plain open failure for ?fixtures=migration-fails-first-open", async () => {
		withScenario("migration-fails-first-open");
		await render(app);
		expect(screen.getByText("Couldn't open your data")).toBeTruthy();
	});

	it("Retry keeps failing when the failure is permanent", async () => {
		withScenario("migration-fails");
		await render(app);
		await fireEvent.press(screen.getByText("Try again"));
		expect(screen.getByText("Update didn’t finish")).toBeTruthy();
	});

	it("Retry recovers when the failure was transient (?fixtures=migration-fails-once)", async () => {
		withScenario("migration-fails-once");
		await render(app);
		expect(screen.getByText("Update didn’t finish")).toBeTruthy();

		await fireEvent.press(screen.getByText("Try again"));

		expect(screen.getByText("App")).toBeTruthy();
	});
});
