import { fireEvent, render, screen } from "@testing-library/react-native";
import { CompletionGrid, type CompletionGridCell } from "./completion-grid";

const cell = (
	key: string,
	state: CompletionGridCell["state"] = { kind: "missed" },
): CompletionGridCell => ({ key, state, accessibilityLabel: key });

describe("CompletionGrid", () => {
	it("draws the month calendar under a Monday-first weekday axis", async () => {
		await render(
			<CompletionGrid
				layout="month"
				accent={null}
				rows={[
					[null, null, cell("a"), cell("b"), cell("c"), cell("d"), cell("e")],
					[cell("f"), null, null, null, null, null, null],
				]}
			/>,
		);
		expect(screen.getByTestId("completion-grid-month")).toBeTruthy();
		expect(screen.getAllByText(/^[MTWFS]$/)).toHaveLength(7);
		// Days outside the month are blank space, not cells.
		expect(screen.getAllByTestId("heatmap-cell-missed")).toHaveLength(6);
	});

	it("draws Detail's grid without an axis, at 18px with radius 6", async () => {
		await render(
			<CompletionGrid layout="detail" accent={195} rows={[[cell("a")]]} />,
		);
		expect(screen.queryByText("M")).toBeNull();
		expect(screen.getByTestId("heatmap-cell-missed")).toHaveStyle({
			width: 18,
			height: 18,
			borderRadius: 6,
		});
	});

	it("gives the month pills a fixed 16px height and a third-of-height radius", async () => {
		await render(
			<CompletionGrid layout="month" accent={null} rows={[[cell("a")]]} />,
		);
		expect(screen.getByTestId("heatmap-cell-missed")).toHaveStyle({
			height: 16,
			borderRadius: 5,
		});
	});

	it("keeps a tappable cell tappable and the rest read-only", async () => {
		const onPress = jest.fn();
		await render(
			<CompletionGrid
				layout="detail"
				accent={null}
				rows={[[{ ...cell("tap"), onPress }, cell("read")]]}
			/>,
		);
		await fireEvent.press(screen.getByLabelText("tap"));
		expect(onPress).toHaveBeenCalledTimes(1);
		expect(screen.getAllByRole("button")).toHaveLength(1);
	});
});
