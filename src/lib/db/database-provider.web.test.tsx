import { fireEvent, render, screen } from "@testing-library/react-native";
import { Text } from "react-native";

const mockHideSplash = jest.fn();
jest.mock("expo-splash-screen", () => ({ hide: () => mockHideSplash() }));
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
	<DatabaseProvider>
		<Text>App</Text>
	</DatabaseProvider>
);

describe("DatabaseProvider (web)", () => {
	it("renders the app when nothing is simulated", async () => {
		await render(app);
		expect(screen.getByText("App")).toBeTruthy();
	});

	it("shows the error screen for ?fixtures=migration-fails, and hides the splash", async () => {
		withScenario("migration-fails");
		await render(app);
		expect(screen.getByText("Couldn't open your data")).toBeTruthy();
		expect(mockHideSplash).toHaveBeenCalled();
	});

	it("Retry keeps failing when the failure is permanent", async () => {
		withScenario("migration-fails");
		await render(app);
		await fireEvent.press(screen.getByText("Try again"));
		expect(screen.getByText("Couldn't open your data")).toBeTruthy();
	});

	it("Retry recovers when the failure was transient (?fixtures=migration-fails-once)", async () => {
		withScenario("migration-fails-once");
		await render(app);
		expect(screen.getByText("Couldn't open your data")).toBeTruthy();

		await fireEvent.press(screen.getByText("Try again"));

		expect(screen.getByText("App")).toBeTruthy();
	});
});
