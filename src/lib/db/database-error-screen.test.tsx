import { fireEvent, render, screen } from "@testing-library/react-native";
import { clearLog, getLogEntries } from "@/lib/logger/logger";

const mockHide = jest.fn();
jest.mock("expo-splash-screen", () => ({ hide: () => mockHide() }));
jest.mock("@/lib/diagnostics/diagnostics", () => ({
	copyDiagnostics: jest.fn(),
}));

import { DatabaseErrorScreen } from "./database-error-screen";

beforeEach(() => {
	jest.clearAllMocks();
	clearLog();
});

describe("DatabaseErrorScreen", () => {
	it("hides the splash and logs the failure with the schema version", async () => {
		await render(
			<DatabaseErrorScreen
				error={new Error("disk I/O error")}
				onRetry={jest.fn()}
			/>,
		);

		expect(mockHide).toHaveBeenCalledTimes(1);
		const [entry] = getLogEntries();
		expect(entry).toMatchObject({
			level: "error",
			scope: "db",
			message: "migration failed",
		});
		expect(entry.context?.schemaVersion).toEqual(expect.any(Number));
	});

	it("explains in plain words — no raw error text — and offers Retry", async () => {
		const onRetry = jest.fn();
		await render(
			<DatabaseErrorScreen
				error={new Error("SQLITE_IOERR")}
				onRetry={onRetry}
			/>,
		);

		expect(screen.getByText("Couldn't open your data")).toBeTruthy();
		expect(screen.queryByText(/SQLITE_IOERR/)).toBeNull();
		await fireEvent.press(screen.getByText("Try again"));
		expect(onRetry).toHaveBeenCalledTimes(1);
	});
});
