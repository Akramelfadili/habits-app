import { render, screen } from "@testing-library/react-native";
import { StyleSheet, Text } from "react-native";
import { LibraryGroup } from "./library-group";

describe("LibraryGroup", () => {
	it("is a caps name and its count over the rows, read as one heading", async () => {
		await render(
			<LibraryGroup name="Health" count={2}>
				<Text>Drink water</Text>
				<Text>Cold shower</Text>
			</LibraryGroup>,
		);
		expect(screen.getByText("HEALTH")).toBeTruthy();
		expect(screen.getByText("2")).toBeTruthy();
		expect(screen.getByRole("header", { name: "Health, 2" })).toBeTruthy();
		expect(screen.getByText("Drink water")).toBeTruthy();
		expect(screen.getByText("Cold shower")).toBeTruthy();
	});

	it("draws no count where nothing is counted (Browse suggestions), and is still one heading", async () => {
		await render(
			<LibraryGroup name="Health">
				<Text>Drink water</Text>
			</LibraryGroup>,
		);
		expect(screen.getByRole("header", { name: "Health" })).toBeTruthy();
		expect(screen.queryByText("0")).toBeNull();
	});

	it("separates its rows with a hairline", async () => {
		await render(
			<LibraryGroup name="Health" count={2}>
				<Text>Drink water</Text>
				<Text>Cold shower</Text>
			</LibraryGroup>,
		);
		expect(screen.getAllByTestId("container-section")).toHaveLength(2);
	});

	it("leaves 20 pt before the next group", async () => {
		await render(
			<LibraryGroup name="Health" count={1}>
				<Text>Drink water</Text>
			</LibraryGroup>,
		);
		const group = screen.getByText("HEALTH").parent?.parent;
		expect(StyleSheet.flatten(group?.props.style).marginBottom).toBe(20);
	});
});
