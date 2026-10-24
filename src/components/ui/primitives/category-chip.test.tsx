import { fireEvent, render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
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
		expect(screen.getByTestId("category-chip-pill")).toHaveStyle({
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
		expect(screen.getByTestId("category-chip-pill")).toHaveStyle({
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

	it("locked (HAB-25): tinted with the category's own color, not a button", async () => {
		await render(
			<CategoryChip
				label="Health"
				state="locked"
				symbol="plus"
				accent={accent}
				onPress={jest.fn()}
			/>,
		);
		expect(screen.queryByRole("button")).toBeNull();
		expect(screen.getByTestId("category-chip")).toHaveStyle({
			backgroundColor: "#EEF",
			borderColor: "#EEF",
		});
		expect(screen.getByLabelText("Health")).toBeTruthy();
	});

	it("without onPress: a label only — hugs its text and isn't announced as a button", async () => {
		await render(
			<CategoryChip
				label="Music"
				state="unselected"
				symbol="diamond.fill"
				accent={accent}
			/>,
		);
		expect(screen.queryByRole("button")).toBeNull();
		expect(screen.getByTestId("category-chip")).toHaveStyle({
			alignSelf: "flex-start",
		});
	});

	it("compact: the shorter list-row size", async () => {
		await render(
			<CategoryChip
				label="Music"
				state="unselected"
				size="compact"
				symbol="diamond.fill"
				accent={accent}
			/>,
		);
		expect(screen.getByTestId("category-chip")).toHaveStyle({
			minHeight: 28,
		});
	});

	it("an interactive chip has a 44pt-tall touch area around its pill", async () => {
		await render(
			<CategoryChip label="Learning" state="unselected" onPress={jest.fn()} />,
		);
		const button = screen.getByRole("button", { name: "Learning" });
		expect(StyleSheet.flatten(button.props.style).minHeight).toBe(44);
		expect(button.props.hitSlop).toBeUndefined();
	});
});
