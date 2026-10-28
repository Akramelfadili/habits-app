import { fireEvent, render, screen } from "@testing-library/react-native";
import { StreakAtRiskSheet } from "./streak-at-risk-sheet";

const TODAY = new Date("2026-09-16T12:00:00Z");

async function renderSheet(
	overrides: Partial<Parameters<typeof StreakAtRiskSheet>[0]> = {},
) {
	const onUseFreeze = jest.fn();
	const onNotNow = jest.fn();
	const view = await render(
		<StreakAtRiskSheet
			visible
			habitName="Read"
			currentStreak={24}
			freezesRemaining={2}
			today={TODAY}
			onUseFreeze={onUseFreeze}
			onNotNow={onNotNow}
			{...overrides}
		/>,
	);
	return { view, onUseFreeze, onNotNow };
}

describe("StreakAtRiskSheet", () => {
	describe("with a freeze left (SR1)", () => {
		it("asks to keep the habit's streak and interpolates what is at stake", async () => {
			await renderSheet();
			expect(screen.getByText("Keep your Read streak?")).toBeTruthy();
			expect(
				screen.getByText(
					"You missed yesterday. Use a freeze to keep your 24-day streak, or let it go: it restarts with your next log.",
				),
			).toBeTruthy();
		});

		it("shows the plural freeze count and next month's reset date", async () => {
			await renderSheet({ currentStreak: 5 });
			expect(screen.getByText("2 freezes left")).toBeTruthy();
			expect(screen.getByText("Resets on 1 October")).toBeTruthy();
		});

		it("uses the singular form for exactly one freeze left", async () => {
			await renderSheet({ freezesRemaining: 1 });
			expect(screen.getByText("1 freeze left")).toBeTruthy();
		});

		it("Use a freeze calls onUseFreeze", async () => {
			const { onUseFreeze, onNotNow } = await renderSheet();
			await fireEvent.press(screen.getByText("Use a freeze"));
			expect(onUseFreeze).toHaveBeenCalledTimes(1);
			expect(onNotNow).not.toHaveBeenCalled();
		});

		it("offers 'Not now', not 'Reset streak', and it only closes", async () => {
			const { onUseFreeze, onNotNow } = await renderSheet();
			expect(screen.queryByText(/reset (and start|streak)/i)).toBeNull();
			await fireEvent.press(screen.getByText("Not now"));
			expect(onNotNow).toHaveBeenCalledTimes(1);
			expect(onUseFreeze).not.toHaveBeenCalled();
		});

		it("disables Not now while the freeze is being applied", async () => {
			const { onNotNow } = await renderSheet({ isApplyingFreeze: true });
			await fireEvent.press(screen.getByText("Not now"));
			expect(onNotNow).not.toHaveBeenCalled();
		});
	});

	describe("with none left (SR3)", () => {
		it("explains it in one button, and says the longest streak is kept", async () => {
			const { onNotNow } = await renderSheet({ freezesRemaining: 0 });
			expect(screen.getByText("No freezes left this month")).toBeTruthy();
			expect(screen.getByText(/Your longest streak is kept\./)).toBeTruthy();
			expect(screen.getByText(/Freezes come back on 1 October\./)).toBeTruthy();
			expect(screen.getByText("0 freezes left")).toBeTruthy();
			expect(screen.queryByText("Use a freeze")).toBeNull();
			expect(screen.queryByText("Not now")).toBeNull();
			await fireEvent.press(screen.getByText("Got it"));
			expect(onNotNow).toHaveBeenCalledTimes(1);
		});
	});
});

describe("StreakAtRiskSheet — VoiceOver (08.3)", () => {
	it("reads the question as a heading with the freezes left", async () => {
		await render(
			<StreakAtRiskSheet
				visible
				habitName="Meditate"
				currentStreak={13}
				freezesRemaining={1}
				today={new Date(2026, 9, 23)}
				onUseFreeze={jest.fn()}
				onNotNow={jest.fn()}
			/>,
		);
		expect(
			screen.getByRole("header", {
				name: "Keep your Meditate streak?. 1 freeze left.",
			}),
		).toBeTruthy();
	});
});
