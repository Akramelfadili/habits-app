import { fireEvent, render, screen } from "@testing-library/react-native";
import { CompletionRows } from "./completion-rows";

describe("CompletionRows", () => {
	it("draws each row's cells at the given size and leaves blanks empty", async () => {
		await render(
			<CompletionRows
				size={24}
				rows={[
					[
						{ key: "a", state: { kind: "level", level: 3 } },
						null,
						{ key: "b", state: { kind: "level", level: 0 } },
					],
				]}
			/>,
		);
		const cells = screen.getAllByTestId("completion-cell-level");
		expect(cells).toHaveLength(2);
		expect(cells[0]).toHaveStyle({ width: 24, height: 24 });
	});

	it("passes the day number, the label and the press through to the cell", async () => {
		const onPress = jest.fn();
		await render(
			<CompletionRows
				size={40}
				rows={[
					[
						{
							key: "a",
							state: { kind: "level", level: 3 },
							text: "14",
							accessibilityLabel: "Tuesday 14 July",
							onPress,
						},
					],
				]}
			/>,
		);
		expect(screen.getByText("14")).toBeTruthy();
		await fireEvent.press(
			screen.getByRole("button", { name: "Tuesday 14 July" }),
		);
		expect(onPress).toHaveBeenCalledTimes(1);
	});

	it("hides a cell from VoiceOver when asked", async () => {
		await render(
			<CompletionRows
				size={16}
				rows={[
					[
						{
							key: "a",
							state: { kind: "level", level: 3 },
							hidden: true,
							accessibilityLabel: "silent",
						},
					],
				]}
			/>,
		);
		expect(screen.queryByLabelText("silent")).toBeNull();
	});
});
