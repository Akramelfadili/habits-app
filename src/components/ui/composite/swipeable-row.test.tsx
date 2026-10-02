import { fireEvent, render, screen } from "@testing-library/react-native";
import { Text } from "react-native";
import { SwipeableRow } from "./swipeable-row";

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
