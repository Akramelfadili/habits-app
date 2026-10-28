import { fireEvent, render, screen } from "@testing-library/react-native";
import { TodayDevButtons } from "./today-dev-buttons";

const none = {
	clearAll: undefined,
	isClearingAll: false,
	seedStreakAtRisk: undefined,
	isSeedingStreakAtRisk: false,
	seedHistory: undefined,
	isSeedingHistory: false,
	resetFirstRun: undefined,
	isResetting: false,
};

describe("TodayDevButtons", () => {
	it("renders nothing when no dev action exists (production)", async () => {
		await render(<TodayDevButtons dev={none} withClearAll />);
		expect(screen.queryAllByRole("button")).toHaveLength(0);
	});

	it("renders a button per available action and calls it", async () => {
		const seedStreakAtRisk = jest.fn();
		await render(
			<TodayDevButtons
				dev={{ ...none, seedStreakAtRisk, clearAll: jest.fn() }}
			/>,
		);
		await fireEvent.press(screen.getByText("Seed streak-at-risk habit (dev)"));
		expect(seedStreakAtRisk).toHaveBeenCalledTimes(1);
		// Clear all is only offered once habits exist.
		expect(screen.queryByText("Clear all habits (dev)")).toBeNull();
	});

	it("offers Clear all when asked to", async () => {
		await render(
			<TodayDevButtons dev={{ ...none, clearAll: jest.fn() }} withClearAll />,
		);
		expect(screen.getByText("Clear all habits (dev)")).toBeTruthy();
	});
});
