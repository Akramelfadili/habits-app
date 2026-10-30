import { fireEvent, render, screen } from "@testing-library/react-native";
import { StyleSheet, View } from "react-native";
import { surfaceColors } from "@/theme/theme";
import { Toggle } from "./toggle";

describe("Toggle", () => {
	it("is a switch that reports its state and flips on press", async () => {
		const onValueChange = jest.fn();
		await render(
			<Toggle
				value={false}
				onValueChange={onValueChange}
				accessibilityLabel="Reminder at 07:20"
			/>,
		);

		const toggle = screen.getByRole("switch", { name: "Reminder at 07:20" });
		expect(toggle.props.accessibilityState).toMatchObject({ checked: false });

		await fireEvent.press(toggle);
		expect(onValueChange).toHaveBeenCalledWith(true);
	});

	it("shows on, and turns off when pressed", async () => {
		const onValueChange = jest.fn();
		await render(
			<Toggle
				value
				onValueChange={onValueChange}
				accessibilityLabel="Evening review"
			/>,
		);
		const toggle = screen.getByRole("switch", { name: "Evening review" });
		expect(toggle.props.accessibilityState).toMatchObject({ checked: true });
		await fireEvent.press(toggle);
		expect(onValueChange).toHaveBeenCalledWith(false);
	});

	it("draws off as a track with a visible outline, on as an accent fill (T-06)", async () => {
		const { rerender } = await render(
			<Toggle value={false} onValueChange={jest.fn()} accessibilityLabel="x" />,
		);
		const trackStyle = () =>
			StyleSheet.flatten(
				(
					screen.getByRole("switch").children[0] as unknown as {
						props: { style: never };
					}
				).props.style,
			);
		expect(trackStyle()).toMatchObject({
			backgroundColor: surfaceColors.light.track,
			borderColor: surfaceColors.light.outline,
		});
		await rerender(
			<Toggle value onValueChange={jest.fn()} accessibilityLabel="x" />,
		);
		expect(trackStyle()).toMatchObject({
			backgroundColor: surfaceColors.light.accent,
		});
	});

	it("does not fire when disabled", async () => {
		const onValueChange = jest.fn();
		await render(
			<Toggle
				value
				disabled
				onValueChange={onValueChange}
				accessibilityLabel="Evening review"
			/>,
		);
		const toggle = screen.getByRole("switch", { name: "Evening review" });
		expect(toggle.props.accessibilityState).toMatchObject({ disabled: true });
		await fireEvent.press(toggle);
		expect(onValueChange).not.toHaveBeenCalled();
	});

	it("is hidden from the screen reader when decorative", async () => {
		await render(
			<View testID="host">
				<Toggle
					decorative
					value
					onValueChange={jest.fn()}
					accessibilityLabel="x"
				/>
			</View>,
		);
		expect(screen.queryByRole("switch")).toBeNull();
	});
});
