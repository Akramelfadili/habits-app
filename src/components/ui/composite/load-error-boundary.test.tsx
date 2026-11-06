import { fireEvent, render, screen } from "@testing-library/react-native";
import { Pressable, Text } from "react-native";
import { clearLog, getLogEntries } from "@/lib/logger/logger";
import { expectConsole } from "@/test-support/console";
import { LoadErrorBoundary } from "./load-error-boundary";

let mockShouldThrow = true;
let mounts = 0;

function Child() {
	mounts += 1;
	if (mockShouldThrow) throw new Error("query failed");
	return <Text>loaded</Text>;
}

function renderBoundary() {
	return render(
		<LoadErrorBoundary
			scope="today"
			fallback={(retry) => (
				<Pressable onPress={retry}>
					<Text>failed, retry</Text>
				</Pressable>
			)}
		>
			<Child />
		</LoadErrorBoundary>,
	);
}

beforeEach(() => {
	mockShouldThrow = true;
	mounts = 0;
	clearLog();
	// React logs the caught render error; keep the output quiet.
	expectConsole("error");
});
afterEach(() => jest.restoreAllMocks());

describe("LoadErrorBoundary", () => {
	it("draws its children when nothing throws", async () => {
		mockShouldThrow = false;
		await renderBoundary();
		expect(screen.getByText("loaded")).toBeTruthy();
	});

	it("draws the fallback instead of letting the error reach the root, and logs it once", async () => {
		await renderBoundary();
		expect(screen.getByText("failed, retry")).toBeTruthy();
		const entries = getLogEntries().filter((e) => e.fields?.scope === "today");
		expect(entries).toHaveLength(1);
		expect(entries[0].level).toBe("warn");
	});

	it("retry mounts the children afresh, and a fixed cause then shows the screen", async () => {
		await renderBoundary();
		mockShouldThrow = false;
		await fireEvent.press(screen.getByText("failed, retry"));
		expect(screen.getByText("loaded")).toBeTruthy();
		expect(screen.queryByText("failed, retry")).toBeNull();
	});

	it("retry that fails again returns to the fallback", async () => {
		await renderBoundary();
		const before = mounts;
		await fireEvent.press(screen.getByText("failed, retry"));
		expect(mounts).toBeGreaterThan(before);
		expect(screen.getByText("failed, retry")).toBeTruthy();
	});
});
