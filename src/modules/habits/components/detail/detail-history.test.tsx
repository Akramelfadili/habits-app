import { render, screen } from "@testing-library/react-native";
import type { HistoryRowView } from "../../presenters/habit-detail-presenter";
import { DetailHistory } from "./detail-history";

const rows: HistoryRowView[] = [
	{
		key: "2026-10-22",
		date: "Thu 22 Oct",
		status: "Done",
		tone: "default",
		accessibilityLabel: "Thursday 22 October, done",
	},
	{
		key: "2026-10-19",
		date: "Mon 19 Oct",
		status: "Done · off-schedule, not counted",
		tone: "default",
		tag: "Bonus",
		accessibilityLabel: "Monday 19 October, done · off-schedule, not counted",
	},
	{
		key: "2026-10-15",
		date: "Thu 15 Oct",
		status: "Frozen · streak kept",
		tone: "frozen",
		accessibilityLabel: "Thursday 15 October, frozen · streak kept",
	},
];

describe("DetailHistory", () => {
	it("is a History heading over one row per day, newest first", async () => {
		await render(<DetailHistory rows={rows} />);
		expect(screen.getByRole("header", { name: "HISTORY" })).toBeTruthy();
		expect(
			screen
				.getAllByTestId("habit-history-row")
				.map((row) => row.props.accessibilityLabel),
		).toEqual([
			"Thursday 22 October, done",
			"Monday 19 October, done · off-schedule, not counted",
			"Thursday 15 October, frozen · streak kept",
		]);
		expect(screen.getByText("Bonus")).toBeTruthy();
	});

	it("D3: with no rows it says how to start and draws no card", async () => {
		await render(<DetailHistory rows={[]} />);
		expect(
			screen.getByText("No logs yet. Tick it on Today to start."),
		).toBeTruthy();
		expect(screen.queryByTestId("habit-history-row")).toBeNull();
	});
});
