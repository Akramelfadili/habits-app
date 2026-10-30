import { fireEvent, render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import { SearchField } from "./search-field";

async function renderField(
	props: Partial<Parameters<typeof SearchField>[0]> = {},
) {
	const onChangeText = jest.fn();
	const onCancel = jest.fn();
	await render(
		<SearchField
			value=""
			onChangeText={onChangeText}
			label="Search habits"
			cancelLabel="Cancel"
			clearLabel="Clear text"
			onCancel={onCancel}
			{...props}
		/>,
	);
	return { onChangeText, onCancel };
}

describe("SearchField", () => {
	it("is a search field named for what it searches", async () => {
		await renderField();
		const field = screen.getByLabelText("Search habits");
		expect(field.props.accessibilityRole).toBe("search");
		expect(field.props.placeholder).toBe("Search habits");
	});

	it("reports typing", async () => {
		const { onChangeText } = await renderField();
		await fireEvent.changeText(screen.getByLabelText("Search habits"), "yo");
		expect(onChangeText).toHaveBeenCalledWith("yo");
	});

	it("idle shows neither Cancel nor Clear, and no outline", async () => {
		await renderField();
		expect(screen.queryByRole("button", { name: "Cancel" })).toBeNull();
		expect(screen.queryByRole("button", { name: "Clear text" })).toBeNull();
		expect(
			StyleSheet.flatten(screen.getByTestId("search-field").props.style)
				.borderColor,
		).toBe("transparent");
	});

	it("focused it takes the ink outline and offers Cancel", async () => {
		const onFocus = jest.fn();
		await renderField({ onFocus });
		await fireEvent(screen.getByLabelText("Search habits"), "focus");
		expect(onFocus).toHaveBeenCalledTimes(1);
		expect(
			StyleSheet.flatten(screen.getByTestId("search-field").props.style)
				.borderColor,
		).not.toBe("transparent");
		expect(screen.getByRole("button", { name: "Cancel" })).toBeTruthy();
	});

	it("with text offers Clear (which empties it) and Cancel (which ends the search)", async () => {
		const { onChangeText, onCancel } = await renderField({ value: "yoga" });
		await fireEvent.press(screen.getByRole("button", { name: "Clear text" }));
		expect(onChangeText).toHaveBeenCalledWith("");
		await fireEvent.press(screen.getByRole("button", { name: "Cancel" }));
		expect(onCancel).toHaveBeenCalledTimes(1);
	});

	it("is at least 44 pt tall, and so are its two buttons", async () => {
		await renderField({ value: "yoga" });
		expect(
			StyleSheet.flatten(screen.getByTestId("search-field").props.style)
				.minHeight,
		).toBe(44);
		for (const name of ["Clear text", "Cancel"]) {
			const style = StyleSheet.flatten(
				screen.getByRole("button", { name }).props.style,
			);
			expect(style.minHeight ?? style.height).toBe(44);
		}
	});
});
