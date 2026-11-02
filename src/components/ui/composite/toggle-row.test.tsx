import { fireEvent, render, screen } from "@testing-library/react-native";
import { ToggleRow } from "./toggle-row";

describe("ToggleRow", () => {
	it("is one switch: pressing anywhere on the row flips it", async () => {
		const onValueChange = jest.fn();
		await render(
			<ToggleRow
				title="Evening review"
				subtitle="Nudge if anything is still open"
				value={false}
				onValueChange={onValueChange}
			/>,
		);
		const row = screen.getByRole("switch", {
			name: "Evening review, Nudge if anything is still open",
		});
		expect(row.props.accessibilityState).toMatchObject({ checked: false });
		await fireEvent.press(screen.getByText("Evening review"));
		expect(onValueChange).toHaveBeenCalledWith(true);
	});

	it("exposes exactly one switch to the screen reader", async () => {
		await render(
			<ToggleRow title="Evening review" value onValueChange={jest.fn()} />,
		);
		expect(screen.getAllByRole("switch")).toHaveLength(1);
	});

	it("does nothing when disabled", async () => {
		const onValueChange = jest.fn();
		await render(
			<ToggleRow
				title="Evening review"
				value
				disabled
				onValueChange={onValueChange}
			/>,
		);
		await fireEvent.press(screen.getByText("Evening review"));
		expect(onValueChange).not.toHaveBeenCalled();
	});
});
