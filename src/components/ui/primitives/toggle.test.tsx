import { fireEvent, render, screen } from "@testing-library/react-native";
import { Toggle } from "./toggle";

describe("Toggle", () => {
	it("reports its on/off state and flips on press", async () => {
		const onValueChange = jest.fn();
		await render(
			<Toggle
				value={false}
				onValueChange={onValueChange}
				accessibilityLabel="Reminder at 07:20"
			/>,
		);

		const toggle = screen.getByLabelText("Reminder at 07:20");
		expect(toggle.props.value).toBe(false);

		await fireEvent(toggle, "valueChange", true);
		expect(onValueChange).toHaveBeenCalledWith(true);
	});

	it("shows on", async () => {
		await render(
			<Toggle
				value
				onValueChange={jest.fn()}
				accessibilityLabel="Evening review"
			/>,
		);
		expect(screen.getByLabelText("Evening review").props.value).toBe(true);
	});

	it("passes disabled through to the switch", async () => {
		await render(
			<Toggle
				value
				disabled
				onValueChange={jest.fn()}
				accessibilityLabel="Evening review"
			/>,
		);
		expect(screen.getByLabelText("Evening review").props.disabled).toBe(true);
	});
});
