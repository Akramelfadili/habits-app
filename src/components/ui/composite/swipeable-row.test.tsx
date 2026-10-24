import { fireEvent, render, screen } from "@testing-library/react-native";
import { Text } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { ReduceMotion } from "react-native-reanimated";
import { SwipeableRow, swipeAnimationOptions } from "./swipeable-row";

describe("SwipeableRow", () => {
	// Jest can't swipe: since gesture handler 3 the pan runs through Reanimated
	// worklet events that fireGestureHandler can't reach. The swipe itself is on
	// the phone checklist; Manage's test archives through the VoiceOver action.
	it("renders its row with the action behind it, untappable until swiped open", async () => {
		const onAction = jest.fn();
		await render(
			<SwipeableRow actionLabel="Archive" onAction={onAction}>
				<Text>Meditate</Text>
			</SwipeableRow>,
			{ wrapper: GestureHandlerRootView },
		);

		expect(screen.getByText("Meditate")).toBeTruthy();
		expect(screen.getByText("Archive")).toBeTruthy();
		await fireEvent.press(screen.getByText("Archive"));
		expect(onAction).not.toHaveBeenCalled();
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
