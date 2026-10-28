import { act, render, screen } from "@testing-library/react-native";
import { AccessibilityInfo } from "react-native";
import { TodayAllDoneCard } from "./today-all-done-card";

describe("TodayAllDoneCard (T8)", () => {
	beforeEach(() => jest.useFakeTimers());
	afterEach(() => jest.useRealTimers());

	it("says it plainly, as one VoiceOver stop", async () => {
		await render(
			<TodayAllDoneCard
				title="All done for today"
				body="5 of 5 · Meditate is on a 13-day streak"
			/>,
		);
		expect(
			screen.getByLabelText(
				"All done for today. 5 of 5 · Meditate is on a 13-day streak",
			),
		).toBeTruthy();
	});

	it("draws its check once over 600 ms", async () => {
		await render(<TodayAllDoneCard title="All done for today" body="5 of 5" />);
		const start = screen.getByTestId("today-all-done-check").props.style;
		expect(JSON.stringify(start)).toContain('"width":0');
		await act(() => jest.advanceTimersByTime(700));
		expect(
			JSON.stringify(screen.getByTestId("today-all-done-check").props.style),
		).toContain('"width":14');
	});

	it("is static with Reduce Motion: the check is whole from the first frame", async () => {
		jest
			.spyOn(AccessibilityInfo, "isReduceMotionEnabled")
			.mockResolvedValue(true);
		await render(<TodayAllDoneCard title="All done for today" body="5 of 5" />);
		await act(async () => {});
		expect(
			JSON.stringify(screen.getByTestId("today-all-done-check").props.style),
		).toContain('"width":14');
	});
});
