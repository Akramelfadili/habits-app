import { fireEvent, render, screen } from "@testing-library/react-native";
import { Toast } from "./toast";

describe("Toast", () => {
	it("renders the message", async () => {
		await render(<Toast message="Marked 'Upper body' complete" />);
		expect(screen.getByText("Marked 'Upper body' complete")).toBeTruthy();
	});

	it("omits the action when none is given", async () => {
		await render(<Toast message="Marked 'Upper body' complete" />);
		expect(screen.queryByText("Undo")).toBeNull();
	});

	it("fires onAction when the action is pressed", async () => {
		const onAction = jest.fn();
		await render(
			<Toast
				message="Marked 'Upper body' complete"
				actionLabel="Undo"
				onAction={onAction}
			/>,
		);
		await fireEvent.press(screen.getByText("Undo"));
		expect(onAction).toHaveBeenCalledTimes(1);
	});
});
