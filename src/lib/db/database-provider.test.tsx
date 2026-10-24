import { fireEvent, render, screen } from "@testing-library/react-native";
import { Text } from "react-native";
import { clearLog, getLogEntries } from "@/lib/logger/logger";

type MigrationState = { success: boolean; error?: Error };

const mockUseMigrations = jest.fn<MigrationState, []>();
jest.mock("drizzle-orm/expo-sqlite/migrator", () => ({
	useMigrations: () => mockUseMigrations(),
}));
jest.mock("expo-drizzle-studio-plugin", () => ({
	useDrizzleStudio: jest.fn(),
}));
jest.mock("./client", () => ({ db: {}, expoDb: {} }));
jest.mock("./migrations/migrations", () => ({ __esModule: true, default: {} }));
const mockHideSplash = jest.fn();
jest.mock("expo-splash-screen", () => ({ hide: () => mockHideSplash() }));
const mockCopyDiagnostics = jest.fn();
jest.mock("@/lib/diagnostics/diagnostics", () => ({
	copyDiagnostics: () => mockCopyDiagnostics(),
}));

import { DatabaseProvider } from "./database-provider";

beforeEach(() => {
	jest.clearAllMocks();
	clearLog();
});

describe("DatabaseProvider", () => {
	it("shows the app once migrations succeed", async () => {
		mockUseMigrations.mockReturnValue({ success: true });
		await render(
			<DatabaseProvider>
				<Text>App</Text>
			</DatabaseProvider>,
		);
		expect(screen.getByText("App")).toBeTruthy();
		expect(mockHideSplash).not.toHaveBeenCalled();
	});

	it("holds on a loading view while migrating", async () => {
		mockUseMigrations.mockReturnValue({ success: false });
		await render(
			<DatabaseProvider>
				<Text>App</Text>
			</DatabaseProvider>,
		);
		expect(screen.getByText("Loading…")).toBeTruthy();
		expect(screen.queryByText("App")).toBeNull();
	});

	it("on failure: hides the splash, logs it, and shows the error screen — no raw message", async () => {
		mockUseMigrations.mockReturnValue({
			success: false,
			error: new Error("SQLITE_CORRUPT: database disk image is malformed"),
		});
		await render(
			<DatabaseProvider>
				<Text>App</Text>
			</DatabaseProvider>,
		);

		expect(screen.getByText("Couldn't open your data")).toBeTruthy();
		expect(screen.queryByText(/SQLITE_CORRUPT/)).toBeNull();
		expect(screen.queryByText("App")).toBeNull();
		expect(mockHideSplash).toHaveBeenCalled();
		expect(getLogEntries().map((e) => [e.level, e.message])).toEqual([
			["error", "migration failed"],
		]);
	});

	it("Retry re-runs the migration on a fresh mount and recovers", async () => {
		mockUseMigrations
			.mockReturnValueOnce({ success: false, error: new Error("transient") })
			.mockReturnValue({ success: true });
		await render(
			<DatabaseProvider>
				<Text>App</Text>
			</DatabaseProvider>,
		);
		const callsBeforeRetry = mockUseMigrations.mock.calls.length;

		await fireEvent.press(screen.getByText("Try again"));

		expect(screen.getByText("App")).toBeTruthy();
		expect(mockUseMigrations.mock.calls.length).toBeGreaterThan(
			callsBeforeRetry,
		);
		expect(screen.queryByText("Couldn't open your data")).toBeNull();
	});

	it("Retry that fails again keeps the error screen", async () => {
		mockUseMigrations.mockReturnValue({
			success: false,
			error: new Error("still broken"),
		});
		await render(
			<DatabaseProvider>
				<Text>App</Text>
			</DatabaseProvider>,
		);
		await fireEvent.press(screen.getByText("Try again"));
		expect(screen.getByText("Couldn't open your data")).toBeTruthy();
	});

	it("Copy diagnostics is offered on the error screen", async () => {
		mockCopyDiagnostics.mockResolvedValue("copied");
		mockUseMigrations.mockReturnValue({
			success: false,
			error: new Error("x"),
		});
		await render(
			<DatabaseProvider>
				<Text>App</Text>
			</DatabaseProvider>,
		);

		await fireEvent.press(screen.getByText("Copy diagnostics"));

		expect(mockCopyDiagnostics).toHaveBeenCalledTimes(1);
		expect(await screen.findByText("Diagnostics copied.")).toBeTruthy();
	});
});
