import { fireEvent, render, screen } from "@testing-library/react-native";
import { Text } from "react-native";
import { ReduceMotion } from "react-native-reanimated";
import { SwipeableRow, swipeAnimationOptions } from "./swipeable-row";

describe("SwipeableRow", () => {
	it("renders its row and runs the revealed action", async () => {
		const onAction = jest.fn();
		await render(
			<SwipeableRow actionLabel="Archive" onAction={onAction}>
				<Text>Meditate</Text>
			</SwipeableRow>,
		);

		expect(screen.getByText("Meditate")).toBeTruthy();
		await fireEvent.press(screen.getByText("Archive"));
		expect(onAction).toHaveBeenCalledTimes(1);
	});
});

describe("swipeAnimationOptions", () => {
	it("leaves the spring alone, and snaps it with Reduce Motion on", () => {
		expect(swipeAnimationOptions(false)).toBeUndefined();
		expect(swipeAnimationOptions(true)).toEqual({
			reduceMotion: ReduceMotion.Always,
		});
	});
});
