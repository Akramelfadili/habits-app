import { fireEvent, render, screen } from "@testing-library/react-native";
import { StreakAtRiskSheet } from "./streak-at-risk-sheet";

const TODAY = new Date("2026-09-16T12:00:00Z");

describe("StreakAtRiskSheet", () => {
	it("shows the missed-yesterday headline and interpolates the streak at stake", async () => {
		await render(
			<StreakAtRiskSheet
				visible
				currentStreak={24}
				freezesRemaining={2}
				today={TODAY}
				onUseFreeze={jest.fn()}
				onReset={jest.fn()}
			/>,
		);
		expect(screen.getByText("You missed yesterday")).toBeTruthy();
		expect(
			screen.getByText(
				"Use a freeze to keep your 24-day streak, or let it reset and start again today. Either is fine.",
			),
		).toBeTruthy();
	});

	it("shows the plural freeze count and next month's reset date", async () => {
		await render(
			<StreakAtRiskSheet
				visible
				currentStreak={5}
				freezesRemaining={2}
				today={TODAY}
				onUseFreeze={jest.fn()}
				onReset={jest.fn()}
			/>,
		);
		expect(screen.getByText("2 freezes left")).toBeTruthy();
		expect(screen.getByText("Resets on 1 October")).toBeTruthy();
	});

	it("uses the singular form for exactly one freeze left", async () => {
		await render(
			<StreakAtRiskSheet
				visible
				currentStreak={5}
				freezesRemaining={1}
				today={TODAY}
				onUseFreeze={jest.fn()}
				onReset={jest.fn()}
			/>,
		);
		expect(screen.getByText("1 freeze left")).toBeTruthy();
	});

	it("Use a freeze calls onUseFreeze", async () => {
		const onUseFreeze = jest.fn();
		await render(
			<StreakAtRiskSheet
				visible
				currentStreak={5}
				freezesRemaining={2}
				today={TODAY}
				onUseFreeze={onUseFreeze}
				onReset={jest.fn()}
			/>,
		);
		await fireEvent.press(screen.getByText("Use a freeze"));
		expect(onUseFreeze).toHaveBeenCalledTimes(1);
	});

	it("Reset and start today calls onReset", async () => {
		const onReset = jest.fn();
		await render(
			<StreakAtRiskSheet
				visible
				currentStreak={5}
				freezesRemaining={2}
				today={TODAY}
				onUseFreeze={jest.fn()}
				onReset={onReset}
			/>,
		);
		await fireEvent.press(screen.getByText("Reset and start today"));
		expect(onReset).toHaveBeenCalledTimes(1);
	});

	it("disables the scrim dismiss — this decision can't be swiped away", async () => {
		const onReset = jest.fn();
		const onUseFreeze = jest.fn();
		await render(
			<StreakAtRiskSheet
				visible
				currentStreak={5}
				freezesRemaining={2}
				today={TODAY}
				onUseFreeze={onUseFreeze}
				onReset={onReset}
			/>,
		);
		await fireEvent.press(screen.getByLabelText("Dismiss"));
		expect(onReset).not.toHaveBeenCalled();
		expect(onUseFreeze).not.toHaveBeenCalled();
	});
});
