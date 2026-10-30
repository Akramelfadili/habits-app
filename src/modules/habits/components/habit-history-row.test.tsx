import { render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import { semanticColors, surfaceColors } from "@/theme/theme";
import { HabitHistoryRow } from "./habit-history-row";

let mockAccessibilityText = false;
jest.mock("@/utils/use-accessibility-text-size", () => ({
	useAccessibilityTextSize: () => mockAccessibilityText,
}));

beforeEach(() => {
	mockAccessibilityText = false;
});

function row(
	props: Partial<React.ComponentProps<typeof HabitHistoryRow>> = {},
) {
	return render(
		<HabitHistoryRow
			date="Thu 22 Oct"
			status="Done"
			accessibilityLabel="Thursday 22 October, done"
			{...props}
		/>,
	);
}

describe("HabitHistoryRow", () => {
	it("done: the date over the status, no tag", async () => {
		await row();
		expect(screen.getByText("Thu 22 Oct")).toBeTruthy();
		expect(screen.getByText("Done")).toHaveStyle({
			color: surfaceColors.light.sub,
		});
		expect(screen.queryByTestId("habit-history-tag")).toBeNull();
	});

	it("missed: says missed in words, in the same secondary ink", async () => {
		await row({
			date: "Tue 6 Oct",
			status: "Missed",
			accessibilityLabel: "Tuesday 6 October, missed",
		});
		expect(screen.getByText("Missed")).toHaveStyle({
			color: surfaceColors.light.sub,
		});
	});

	it("frozen: the violet ink, with the words 'Frozen · streak kept' beside it", async () => {
		await row({ status: "Frozen · streak kept", tone: "frozen" });
		expect(screen.getByText("Frozen · streak kept")).toHaveStyle({
			color: semanticColors.light.frozenInk,
		});
	});

	it("bonus: says it isn't counted, and carries the Bonus tag", async () => {
		await row({
			date: "Mon 19 Oct",
			status: "Done · off-schedule, not counted",
			tag: "Bonus",
			accessibilityLabel: "Monday 19 October, done off-schedule, not counted",
		});
		expect(screen.getByText("Done · off-schedule, not counted")).toBeTruthy();
		expect(screen.getByText("Bonus")).toBeTruthy();
		expect(screen.getByTestId("habit-history-tag")).toHaveStyle({
			backgroundColor: surfaceColors.light.inner,
		});
	});

	it("shows the day's note under the status", async () => {
		await row({ note: "Easy day" });
		expect(screen.getByText("Easy day")).toBeTruthy();
	});

	it("is one VoiceOver stop with the spelled-out label, and shows no time", async () => {
		await row();
		const stop = screen.getByLabelText("Thursday 22 October, done");
		expect(stop.props.accessible).toBe(true);
		expect(screen.queryByText(/\d\d:\d\d/)).toBeNull();
	});

	it("is at least 60 pt tall", async () => {
		await row();
		expect(
			StyleSheet.flatten(screen.getByTestId("habit-history-row").props.style)
				.minHeight,
		).toBe(60);
	});

	it("accessibility sizes stack the tag under the text", async () => {
		mockAccessibilityText = true;
		await row({ tag: "Bonus", status: "Done · off-schedule, not counted" });
		expect(
			StyleSheet.flatten(screen.getByTestId("habit-history-row").props.style)
				.flexDirection,
		).toBe("column");
	});
});
