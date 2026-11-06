import { fireEvent, render, screen } from "@testing-library/react-native";
import { clearLog, getLogEntries } from "@/lib/logger/logger";
import { migrationCopy } from "@/modules/habits/messages";

const mockHide = jest.fn();
jest.mock("expo-splash-screen", () => ({ hide: () => mockHide() }));
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
				copy={migrationCopy.openFailed}
			/>,
		);

		expect(mockHide).toHaveBeenCalledTimes(1);
		const [entry] = getLogEntries();
		expect(entry).toMatchObject({
			level: "error",
			event: "migration.failure",
		});
		expect(entry.fields?.schemaVersion).toEqual(expect.any(Number));
	});

	it("explains in plain words — no raw error text — and offers Retry", async () => {
		const onRetry = jest.fn();
		await render(
			<DatabaseErrorScreen
				error={new Error("SQLITE_IOERR")}
				onRetry={onRetry}
				copy={migrationCopy.openFailed}
			/>,
		);

		expect(screen.getByText("Couldn\u2019t open your data")).toBeTruthy();
		expect(screen.queryByText(/SQLITE_IOERR/)).toBeNull();
		await fireEvent.press(screen.getByText("Try again"));
		expect(onRetry).toHaveBeenCalledTimes(1);
	});

	it("an update that failed also says why, in a banner (SY4)", async () => {
		await render(
			<DatabaseErrorScreen
				error={new Error("SQLITE_IOERR")}
				onRetry={jest.fn()}
				copy={migrationCopy.updateFailed}
			/>,
		);
		expect(screen.getByText("Update didn’t finish")).toBeTruthy();
		expect(screen.getByText("The update stopped")).toBeTruthy();
		expect(screen.getByRole("alert")).toBeTruthy();
	});
});
