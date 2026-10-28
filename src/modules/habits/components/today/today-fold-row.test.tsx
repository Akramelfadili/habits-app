import { fireEvent, render, screen } from "@testing-library/react-native";
import { TodayFoldRow } from "./today-fold-row";

describe("TodayFoldRow", () => {
	it("reads as one button: the summary, then Show", async () => {
		const onToggle = jest.fn();
		await render(
			<TodayFoldRow
				summary="1 not due today · Upper body"
				expanded={false}
				onToggle={onToggle}
			/>,
		);
		const button = screen.getByRole("button", {
			name: "1 not due today · Upper body. Show",
		});
		await fireEvent.press(button);
		expect(onToggle).toHaveBeenCalledTimes(1);
	});

	it("says Hide once expanded", async () => {
		await render(
			<TodayFoldRow
				summary="1 not due today · Upper body"
				expanded
				onToggle={jest.fn()}
			/>,
		);
		expect(screen.getByText("Hide")).toBeTruthy();
		expect(screen.getByRole("button").props.accessibilityState.expanded).toBe(
			true,
		);
	});
});
