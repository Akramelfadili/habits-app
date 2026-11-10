import { fireEvent, render, screen } from "@testing-library/react-native";
import { Try } from "expo-router/build/views/Try";
import { Text } from "react-native";
import { useLiveRows } from "@/lib/db/use-live-rows";
import { clearLog, getLogEntries } from "@/lib/logger/logger";
import { expectConsole } from "@/test-support/console";

let mockQueryFails = true;
// Drizzle keeps one error object in state; React may render the throwing screen twice.
const mockQueryError = new Error("no such table: habits");
jest.mock("drizzle-orm/expo-sqlite", () => ({
	useLiveQuery: () =>
		mockQueryFails
			? { data: [], error: mockQueryError }
			: { data: [{ id: 1 }], updatedAt: new Date(1000) },
}));
jest.mock("@/lib/diagnostics/diagnostics", () => ({
	copyDiagnostics: jest.fn(),
}));
jest.mock("expo-splash-screen", () => ({
	hideAsync: jest.fn(),
	hide: jest.fn(),
}));

import { RootErrorBoundary } from "./root-error-boundary";

function Screen() {
	const { data } = useLiveRows<{ id: number }>({} as never);
	return <Text>{`rows: ${data.length}`}</Text>;
}

beforeEach(() => {
	mockQueryFails = true;
	clearLog();
	// React logs the caught render error; keep the output quiet.
	expectConsole("error");
});
afterEach(() => jest.restoreAllMocks());

describe("RootErrorBoundary", () => {
	it("shows the recovery screen when a screen throws, and logs the error once", async () => {
		await render(
			<Try catch={RootErrorBoundary}>
				<Screen />
			</Try>,
		);

		expect(screen.getByText("Something went wrong")).toBeTruthy();
		expect(screen.getByText("Try again")).toBeTruthy();
		expect(screen.queryByText(/no such table/)).toBeNull();
		// The live-query hook logged it first; the boundary must not log it again.
		const errors = getLogEntries().filter((entry) => entry.level === "error");
		expect(errors).toHaveLength(1);
		expect(errors[0].event).toBe("livequery.failed");
	});

	it("Try again resets the boundary, remounts the screen and re-subscribes", async () => {
		await render(
			<Try catch={RootErrorBoundary}>
				<Screen />
			</Try>,
		);
		expect(screen.getByText("Something went wrong")).toBeTruthy();

		mockQueryFails = false;
		await fireEvent.press(screen.getByText("Try again"));

		expect(await screen.findByText("rows: 1")).toBeTruthy();
		expect(screen.queryByText("Something went wrong")).toBeNull();
	});

	it("Try again that fails again lands back on the recovery screen", async () => {
		await render(
			<Try catch={RootErrorBoundary}>
				<Screen />
			</Try>,
		);

		await fireEvent.press(screen.getByText("Try again"));

		expect(screen.getByText("Something went wrong")).toBeTruthy();
	});

	it("logs a render error that no hook recorded", async () => {
		function Broken(): never {
			throw new Error("render bug");
		}
		await render(
			<Try catch={RootErrorBoundary}>
				<Broken />
			</Try>,
		);

		const errors = getLogEntries().filter((entry) => entry.level === "error");
		expect(errors).toHaveLength(1);
		expect(errors[0]).toMatchObject({ event: "boundary.render_error" });
	});
});
