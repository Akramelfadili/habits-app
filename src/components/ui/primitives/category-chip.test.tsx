import { fireEvent, render, screen } from "@testing-library/react-native";
import { surfaceColors } from "@/theme/theme";

jest.mock("expo-symbols", () => {
	const { View } = require("react-native");
	return {
		SymbolView: (props: { name: string }) => (
			<View testID={`symbol-${props.name}`} {...props} />
		),
	};
});

import { CategoryChip } from "./category-chip";

const accent = { tint: "#EEF", ink: "#00F" };

describe("CategoryChip", () => {
	it("unselected: outlined, icon in the category's own color, no check", async () => {
		await render(
			<CategoryChip
				label="Learning"
				state="unselected"
				symbol="line.3.horizontal"
				accent={accent}
				onPress={jest.fn()}
			/>,
		);
		expect(screen.getByTestId("symbol-line.3.horizontal").props.tintColor).toBe(
			"#00F",
		);
		expect(screen.queryByTestId("symbol-checkmark")).toBeNull();
		expect(screen.getByRole("button").props.accessibilityState.selected).toBe(
			false,
		);
	});

	it("selected: fills with the category's ink and gains a check", async () => {
		await render(
			<CategoryChip
				label="Learning"
				state="selected"
				symbol="line.3.horizontal"
				accent={accent}
				onPress={jest.fn()}
			/>,
		);
		expect(screen.getByTestId("category-chip")).toHaveStyle({
			backgroundColor: "#00F",
		});
		expect(screen.getByTestId("symbol-checkmark")).toBeTruthy();
		expect(screen.getByText("Learning")).toHaveStyle({
			color: surfaceColors.light.onAccent,
		});
		expect(screen.getByRole("button").props.accessibilityState.selected).toBe(
			true,
		);
	});

	it("add: dashed, a neutral plus, and pressable", async () => {
		const onPress = jest.fn();
		await render(
			<CategoryChip label="Add category" state="add" onPress={onPress} />,
		);
		expect(screen.getByTestId("category-chip")).toHaveStyle({
			borderStyle: "dashed",
		});
		expect(screen.getByTestId("symbol-plus")).toBeTruthy();
		await fireEvent.press(screen.getByRole("button"));
		expect(onPress).toHaveBeenCalled();
	});

	it("preview: not a button", async () => {
		await render(
			<CategoryChip
				label="Journaling"
				state="preview"
				symbol="diamond.fill"
				accent={accent}
			/>,
		);
		expect(screen.queryByRole("button")).toBeNull();
		expect(screen.getByText("Journaling")).toBeTruthy();
	});

	it("truncates a long label to one line instead of wrapping", async () => {
		await render(
			<CategoryChip
				label="Weekend projects at"
				state="unselected"
				symbol="square"
				accent={accent}
				onPress={jest.fn()}
			/>,
		);
		const label = screen.getByText("Weekend projects at");
		expect(label.props.numberOfLines).toBe(1);
		expect(label.props.ellipsizeMode).toBe("tail");
	});
});
