import { render, screen } from "@testing-library/react-native";
import { PROGRESS_TODAY, weekView } from "../../test-support/progress-views";
import { WeekSummaryCard, weekBarColumns } from "./week-summary-card";

function ready() {
	const view = weekView();
	if (view.state !== "ready") throw new Error("expected a ready week");
	return view;
}

describe("weekBarColumns (P1)", () => {
	const columns = weekBarColumns(ready().summary, PROGRESS_TODAY);

	it("draws Monday to Sunday with the day's whole-number % under its letter", () => {
		expect(columns.map((column) => column.label)).toEqual([
			"M",
			"T",
			"W",
			"T",
			"F",
			"S",
			"S",
		]);
		expect(columns[0].valueLabel).toBe("100%");
		expect(columns[0].accessibilityLabel).toBe("Monday, 100 percent");
	});

	it("marks today as the running column and the days ahead as future", () => {
		expect(columns[4].state).toBe("current");
		expect(columns[5].state).toBe("future");
		expect(columns[5].valueLabel).toBeUndefined();
		expect(columns[5].accessibilityLabel).toBe("Saturday, upcoming");
		expect(columns[0].state).toBe("complete");
	});
});

describe("WeekSummaryCard", () => {
	it("summarises the chart for VoiceOver and lists perfect days, freezes and bonus logs", async () => {
		await render(
			<WeekSummaryCard summary={ready().summary} today={PROGRESS_TODAY} />,
		);
		expect(screen.getByRole("header", { name: "Week summary" })).toBeTruthy();
		expect(screen.getByText("Due habits done per day")).toBeTruthy();
		expect(
			screen.getByLabelText(/^Due habits done per day, best /),
		).toBeTruthy();
		expect(screen.getByText("Perfect days")).toBeTruthy();
		expect(screen.getByText("Freezes used")).toBeTruthy();
		expect(screen.getByText("Bonus logs")).toBeTruthy();
	});
});
