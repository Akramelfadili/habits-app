import { fireEvent, render, screen } from "@testing-library/react-native";
import { FIRST_RUN_QUICK_PICK_IDS, findSuggestion } from "../../suggestions";
import { QuickPicks } from "./quick-picks";

describe("QuickPicks (FR2)", () => {
	it("offers the five quick picks and reads the one in the name field as picked", async () => {
		const first = findSuggestion(FIRST_RUN_QUICK_PICK_IDS[0]);
		await render(
			<QuickPicks selectedName={first?.name ?? ""} onPick={() => {}} />,
		);
		for (const id of FIRST_RUN_QUICK_PICK_IDS) {
			expect(screen.getByText(findSuggestion(id)?.name ?? "")).toBeTruthy();
		}
		expect(
			screen.getByRole("button", { name: first?.name }).props.accessibilityState
				.selected,
		).toBe(true);
	});

	it("hands the tapped suggestion back", async () => {
		const onPick = jest.fn();
		await render(<QuickPicks selectedName="" onPick={onPick} />);
		const second = findSuggestion(FIRST_RUN_QUICK_PICK_IDS[1]);
		fireEvent.press(screen.getByText(second?.name ?? ""));
		expect(onPick).toHaveBeenCalledWith(second);
	});
});
