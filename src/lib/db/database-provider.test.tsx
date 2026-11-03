import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { Text } from "react-native";
import { clearLog, getLogEntries } from "@/lib/logger/logger";
import { migrationCopy } from "@/modules/habits/messages";

type MigrationState = { success: boolean; error?: Error };

const mockUseMigrations = jest.fn<MigrationState, []>();
jest.mock("drizzle-orm/expo-sqlite/migrator", () => ({
	useMigrations: () => mockUseMigrations(),
}));
jest.mock("expo-drizzle-studio-plugin", () => ({
	useDrizzleStudio: jest.fn(),
}));
jest.mock("expo-symbols", () => {
	const { View } = require("react-native");
	return { SymbolView: View };
});
jest.mock("@/utils/use-accessibility-text-size", () => ({
	useAccessibilityTextSize: () => false,
}));
jest.mock("./client", () => ({ db: {}, expoDb: {} }));
jest.mock("./migrations/migrations", () => ({
	__esModule: true,
	default: { journal: { entries: [{ when: 100 }, { when: 500 }] } },
}));
let mockPlan: "fresh" | "current" | "upgrade" = "current";
jest.mock("./migration-plan", () => ({
	...jest.requireActual("./migration-plan"),
	planMigrations: () => mockPlan,
}));
const mockHideSplash = jest.fn();
jest.mock("expo-splash-screen", () => ({ hide: () => mockHideSplash() }));
const mockCopyDiagnostics = jest.fn();
jest.mock("@/lib/diagnostics/diagnostics", () => ({
	copyDiagnostics: () => mockCopyDiagnostics(),
}));

import { DatabaseProvider } from "./database-provider";
import { MIGRATION_SCREEN_PAINT_MS } from "./migration-plan";

const app = (
	<DatabaseProvider copy={migrationCopy}>
		<Text>App</Text>
	</DatabaseProvider>
);

beforeEach(() => {
	jest.clearAllMocks();
	clearLog();
	mockPlan = "current";
});

describe("DatabaseProvider", () => {
	it("shows the app once migrations succeed", async () => {
		mockUseMigrations.mockReturnValue({ success: true });
		await render(app);
		expect(screen.getByText("App")).toBeTruthy();
		expect(mockHideSplash).not.toHaveBeenCalled();
	});

	it("shows nothing while a launch with nothing to update is migrating: the splash covers it", async () => {
		mockUseMigrations.mockReturnValue({ success: false });
		await render(app);
		expect(screen.queryByText("App")).toBeNull();
		expect(screen.queryByTestId("migration-screen")).toBeNull();
		expect(screen.queryByText("Updating your data")).toBeNull();
	});

	it("shows nothing on a fresh install either: there is no update to explain", async () => {
		mockPlan = "fresh";
		mockUseMigrations.mockReturnValue({ success: false });
		await render(app);
		expect(screen.queryByText("Updating your data")).toBeNull();
	});

	describe("after an update (SY3)", () => {
		beforeEach(() => {
			mockPlan = "upgrade";
			jest.useFakeTimers();
		});
		afterEach(() => jest.useRealTimers());

		it("puts the update screen up and drops the splash before the migrator starts", async () => {
			mockUseMigrations.mockReturnValue({ success: false });
			await render(app);
			expect(screen.getByText("Updating your data")).toBeTruthy();
			expect(mockHideSplash).toHaveBeenCalled();
			expect(mockUseMigrations).not.toHaveBeenCalled();
		});

		it("starts the migrator one paint later, and keeps the update screen up while it runs", async () => {
			mockUseMigrations.mockReturnValue({ success: false });
			await render(app);
			await act(() => jest.advanceTimersByTime(MIGRATION_SCREEN_PAINT_MS));
			expect(mockUseMigrations).toHaveBeenCalled();
			expect(screen.getByText("Updating your data")).toBeTruthy();
			expect(screen.queryByText("App")).toBeNull();
		});

		it("says what is true: no step, no count, no percentage, no cancel", async () => {
			mockUseMigrations.mockReturnValue({ success: false });
			await render(app);
			expect(
				screen.getByText(
					"This version stores habits in a new format. It usually takes under a minute.",
				),
			).toBeTruthy();
			expect(
				screen.getByText(
					"Keep the app open. No habits or history are deleted.",
				),
			).toBeTruthy();
			expect(screen.queryByText(/Step \d/)).toBeNull();
			expect(screen.queryByText(/%/)).toBeNull();
			expect(screen.queryByText(/cancel/i)).toBeNull();
			expect(screen.queryAllByRole("button")).toHaveLength(0);
		});

		it("shows the app when the update succeeds", async () => {
			mockUseMigrations.mockReturnValue({ success: true });
			await render(app);
			await act(() => jest.advanceTimersByTime(MIGRATION_SCREEN_PAINT_MS));
			expect(screen.getByText("App")).toBeTruthy();
			expect(screen.queryByText("Updating your data")).toBeNull();
		});

		it("a failed update shows SY4: as they were, nothing changed, and no raw error text", async () => {
			mockUseMigrations.mockReturnValue({
				success: false,
				error: new Error("SQLITE_CORRUPT: database disk image is malformed"),
			});
			await render(app);
			await act(() => jest.advanceTimersByTime(MIGRATION_SCREEN_PAINT_MS));

			expect(screen.getByText("Update didn’t finish")).toBeTruthy();
			expect(
				screen.getByText("Your habits are as they were before the update."),
			).toBeTruthy();
			expect(screen.getByText("The update stopped")).toBeTruthy();
			expect(
				screen.getByText(
					"Nothing was changed. Try again, or copy diagnostics for support.",
				),
			).toBeTruthy();
			expect(screen.queryByText(/SQLITE_CORRUPT/)).toBeNull();
			expect(screen.queryByText(/Stopped at step/)).toBeNull();
			expect(getLogEntries().map((e) => [e.level, e.message])).toEqual([
				["error", "migration failed"],
			]);
		});

		it("Try again re-runs the update from its screen and recovers", async () => {
			mockUseMigrations
				.mockReturnValueOnce({ success: false, error: new Error("transient") })
				.mockReturnValue({ success: true });
			await render(app);
			await act(() => jest.advanceTimersByTime(MIGRATION_SCREEN_PAINT_MS));

			await fireEvent.press(screen.getByText("Try again"));
			await act(() => jest.advanceTimersByTime(MIGRATION_SCREEN_PAINT_MS));

			expect(screen.getByText("App")).toBeTruthy();
			expect(screen.queryByText("Update didn’t finish")).toBeNull();
		});

		it("Copy diagnostics is offered on SY4", async () => {
			mockCopyDiagnostics.mockResolvedValue("copied");
			mockUseMigrations.mockReturnValue({
				success: false,
				error: new Error("x"),
			});
			await render(app);
			await act(() => jest.advanceTimersByTime(MIGRATION_SCREEN_PAINT_MS));

			await fireEvent.press(screen.getByText("Copy diagnostics"));

			expect(mockCopyDiagnostics).toHaveBeenCalledTimes(1);
		});
	});

	describe("when there was nothing to update", () => {
		it("a failure keeps the plain open-failure words, not the update ones", async () => {
			mockUseMigrations.mockReturnValue({
				success: false,
				error: new Error("SQLITE_CORRUPT: database disk image is malformed"),
			});
			await render(app);

			expect(screen.getByText("Couldn\u2019t open your data")).toBeTruthy();
			expect(screen.queryByText("Update didn’t finish")).toBeNull();
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
			await render(app);
			const callsBeforeRetry = mockUseMigrations.mock.calls.length;

			await fireEvent.press(screen.getByText("Try again"));

			expect(screen.getByText("App")).toBeTruthy();
			expect(mockUseMigrations.mock.calls.length).toBeGreaterThan(
				callsBeforeRetry,
			);
		});

		it("Retry that fails again keeps the error screen", async () => {
			mockUseMigrations.mockReturnValue({
				success: false,
				error: new Error("still broken"),
			});
			await render(app);
			await fireEvent.press(screen.getByText("Try again"));
			expect(screen.getByText("Couldn\u2019t open your data")).toBeTruthy();
		});

		it("Copy diagnostics is offered on the error screen", async () => {
			mockCopyDiagnostics.mockResolvedValue("copied");
			mockUseMigrations.mockReturnValue({
				success: false,
				error: new Error("x"),
			});
			await render(app);

			await fireEvent.press(screen.getByText("Copy diagnostics"));

			expect(mockCopyDiagnostics).toHaveBeenCalledTimes(1);
			expect(await screen.findByText("Diagnostics copied.")).toBeTruthy();
		});
	});
});
