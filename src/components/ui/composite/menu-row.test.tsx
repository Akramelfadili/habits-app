import { fireEvent, render, screen } from "@testing-library/react-native";

jest.mock("expo-symbols", () => {
	const { View } = require("react-native");
	return { SymbolView: (props: object) => <View testID="symbol" {...props} /> };
});

import { MenuRow } from "./menu-row";

describe("MenuRow", () => {
	it("shows the title and live context, and navigates on press", async () => {
		const onPress = jest.fn();
		await render(
			<MenuRow
				symbol="list.bullet"
				title="Manage & archive"
				subline="7 active · 2 archived"
				onPress={onPress}
			/>,
		);
		expect(screen.getByText("7 active · 2 archived")).toBeTruthy();
		await fireEvent.press(screen.getByText("Manage & archive"));
		expect(onPress).toHaveBeenCalledTimes(1);
		// Row glyph + chevron.
		expect(screen.getAllByTestId("symbol")).toHaveLength(2);
	});

	it("is at least 44pt tall", async () => {
		await render(
			<MenuRow
				symbol="calendar"
				title="Monthly"
				subline="x"
				onPress={jest.fn()}
			/>,
		);
		expect(screen.getByRole("button")).toHaveStyle({ minHeight: 44 });
	});

	describe("disabled with a reason", () => {
		it("shows the reason instead of the subline, drops the chevron, and ignores presses", async () => {
			const onPress = jest.fn();
			await render(
				<MenuRow
					symbol="calendar"
					title="Monthly"
					subline="August · 80%"
					disabledReason="After your first month"
					onPress={onPress}
				/>,
			);
			expect(screen.getByText("After your first month")).toBeTruthy();
			expect(screen.queryByText("August · 80%")).toBeNull();
			expect(screen.getAllByTestId("symbol")).toHaveLength(1);
			expect(screen.getByRole("button").props.accessibilityState).toMatchObject(
				{
					disabled: true,
				},
			);
			await fireEvent.press(screen.getByText("Monthly"));
			expect(onPress).not.toHaveBeenCalled();
		});
	});
});
