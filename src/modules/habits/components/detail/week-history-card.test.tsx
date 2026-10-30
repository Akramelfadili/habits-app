import { fireEvent, render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import type { WeekRow } from "../../presenters/habit-detail-presenter";
import { WeekHistoryCard } from "./week-history-card";

jest.mock("expo-symbols", () => {
	const { View } = require("react-native");
	return { SymbolView: View };
});

function week(key: string, label: string, target: Date | null): WeekRow {
	return {
		key,
		label,
		targetDate: target,
		cells: Array.from({ length: 7 }, (_, index) => ({
			key: `${key}-${index}`,
			state: { kind: "not-due" as const },
			hidden: true,
		})),
	};
}

const rows: WeekRow[] = [
	week("2026-09-21", "Week of 21 September: before start", null),
	week(
		"2026-10-19",
		"Week of 19 October: Monday bonus, Tuesday done, Thursday not logged yet",
		new Date(2026, 9, 22),
	),
];

function renderCard(
	props: Partial<React.ComponentProps<typeof WeekHistoryCard>> = {},
) {
	const onEditDay = jest.fn();
	return render(
		<WeekHistoryCard
			rangeLabel="Tue, Thu"
			rows={rows}
			legend={[{ state: { kind: "level", level: 3 }, label: "Done" }]}
			notice={null}
			onEditDay={onEditDay}
			{...props}
		/>,
	).then(() => onEditDay);
}

describe("WeekHistoryCard", () => {
	it("titles the card 'Last 5 weeks' with the cadence at its right, and heads the columns Monday first", async () => {
		await renderCard();
		expect(screen.getByRole("header", { name: "Last 5 weeks" })).toBeTruthy();
		expect(screen.getByText("Tue, Thu")).toBeTruthy();
		expect(
			screen
				.getAllByText(/^[MTWFS]$/, { hidden: true })
				.map((node) => node.props.children),
		).toEqual(["M", "T", "W", "T", "F", "S", "S"]);
	});

	it("each editable week is ONE button of at least 44 pt that reads the whole week", async () => {
		await renderCard();
		const week = screen.getByRole("button", {
			name: "Week of 19 October: Monday bonus, Tuesday done, Thursday not logged yet",
		});
		expect(
			StyleSheet.flatten(week.props.style).minHeight,
		).toBeGreaterThanOrEqual(44);
		expect(week.props.accessibilityHint).toBe("Opens Edit this day.");
		expect(screen.getAllByRole("button")).toHaveLength(1);
	});

	it("pressing a week opens Edit this day for its target day", async () => {
		const onEditDay = await renderCard();
		await fireEvent.press(
			screen.getByRole("button", { name: /^Week of 19 October/ }),
		);
		expect(onEditDay).toHaveBeenCalledWith(new Date(2026, 9, 22));
	});

	it("a week with nothing to edit is read, not pressed", async () => {
		await renderCard();
		expect(
			screen.getByLabelText("Week of 21 September: before start"),
		).toBeTruthy();
		expect(
			screen.queryByRole("button", { name: /^Week of 21 September/ }),
		).toBeNull();
	});

	it("draws seven decorative 24 pt cells per week", async () => {
		await renderCard();
		const cells = screen.getAllByTestId("completion-cell-not-due", {
			hidden: true,
		});
		expect(cells).toHaveLength(14);
		expect(StyleSheet.flatten(cells[0].props.style)).toMatchObject({
			width: 24,
			height: 24,
		});
	});

	it("shows the legend, and the reset notice only when there is one", async () => {
		await renderCard({
			notice: "Streak reset on Wed 14 Oct — no freezes were left.",
		});
		expect(screen.getByText("Done")).toBeTruthy();
		expect(
			screen.getByText("Streak reset on Wed 14 Oct — no freezes were left."),
		).toBeTruthy();
	});

	it("no legend at all for an empty list", async () => {
		await renderCard({ legend: [] });
		expect(screen.queryByTestId("completion-legend")).toBeNull();
	});
});
