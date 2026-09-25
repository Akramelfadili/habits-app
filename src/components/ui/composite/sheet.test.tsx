import { fireEvent, render, screen } from "@testing-library/react-native";
import { Text } from "react-native";
import { Sheet } from "./sheet";

describe("Sheet", () => {
	it("renders its content when visible", async () => {
		await render(
			<Sheet visible onDismiss={jest.fn()}>
				<Text>Sheet body</Text>
			</Sheet>,
		);
		expect(screen.getByText("Sheet body")).toBeTruthy();
	});

	it("renders nothing when not visible", async () => {
		await render(
			<Sheet visible={false} onDismiss={jest.fn()}>
				<Text>Sheet body</Text>
			</Sheet>,
		);
		expect(screen.queryByText("Sheet body")).toBeNull();
	});

	it("dismisses on scrim tap", async () => {
		const onDismiss = jest.fn();
		await render(
			<Sheet visible onDismiss={onDismiss}>
				<Text>Sheet body</Text>
			</Sheet>,
		);
		await fireEvent.press(screen.getByLabelText("Dismiss"));
		expect(onDismiss).toHaveBeenCalledTimes(1);
	});

	it("ignores scrim taps when not dismissible", async () => {
		const onDismiss = jest.fn();
		await render(
			<Sheet visible dismissible={false} onDismiss={onDismiss}>
				<Text>Sheet body</Text>
			</Sheet>,
		);
		await fireEvent.press(screen.getByLabelText("Dismiss"));
		expect(onDismiss).not.toHaveBeenCalled();
	});
});
