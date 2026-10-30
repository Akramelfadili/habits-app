import { render, screen } from "@testing-library/react-native";
import { StyleSheet, Text, View } from "react-native";
import { Container } from "./container";

describe("Container", () => {
	it("renders its children", async () => {
		await render(
			<Container>
				<Text>Form section</Text>
			</Container>,
		);
		expect(screen.getByText("Form section")).toBeTruthy();
	});

	it("renders every section when dividers is set, without adding one before the first", async () => {
		await render(
			<Container dividers>
				<Text>Category</Text>
				<View>
					<Text>Direction</Text>
				</View>
			</Container>,
		);
		expect(screen.getByText("Category")).toBeTruthy();
		expect(screen.getByText("Direction")).toBeTruthy();
	});

	it("drops the gap under each divider when compact", async () => {
		await render(
			<Container dividers compact>
				<Text>Today</Text>
				<Text>Yesterday</Text>
			</Container>,
		);
		for (const section of screen.getAllByTestId("container-section")) {
			expect(section).toHaveStyle({ gap: 0 });
		}
	});

	it("keeps the regular section gap without compact", async () => {
		await render(
			<Container dividers>
				<Text>Category</Text>
				<Text>Direction</Text>
			</Container>,
		);
		expect(screen.getAllByTestId("container-section")[0]).toHaveStyle({
			gap: 16,
		});
	});

	it("uses a thin inset for a tight list card", async () => {
		await render(
			<Container tight>
				<Text>Row</Text>
			</Container>,
		);
		expect(screen.getByText("Row").parent).toHaveStyle({ padding: 6 });
	});

	it("outlined: a card with a hairline border (HAB-25's move preview)", async () => {
		await render(
			<Container variant="outlined">
				<Text>Preview</Text>
			</Container>,
		);
		expect(screen.getByText("Preview").parent).toHaveStyle({ borderWidth: 1 });
	});

	it("lifted: an outline appears without shifting the content (HAB-19)", async () => {
		const view = await render(
			<Container tight>
				<Text>Row</Text>
			</Container>,
		);
		expect(screen.getByText("Row").parent).toHaveStyle({
			borderWidth: 0,
			padding: 6,
		});
		await view.rerender(
			<Container tight lifted>
				<Text>Row</Text>
			</Container>,
		);
		expect(screen.getByText("Row").parent).toHaveStyle({
			borderWidth: 1,
			padding: 5,
		});
	});

	it("flat and lifted: the card keeps its hairline and lets a held row's shadow out (H4)", async () => {
		const view = await render(
			<Container variant="flat">
				<Text>Row</Text>
			</Container>,
		);
		const resting = StyleSheet.flatten(
			screen.getByTestId("container-section").parent?.props.style,
		);
		expect(resting.overflow).toBe("hidden");
		await view.rerender(
			<Container variant="flat" lifted>
				<Text>Row</Text>
			</Container>,
		);
		const lifted = StyleSheet.flatten(
			screen.getByTestId("container-section").parent?.props.style,
		);
		expect(lifted.overflow).toBe("visible");
		expect(lifted.borderColor).toBe(resting.borderColor);
	});

	it("dashed: a transparent card with a dashed border (HAB-19)", async () => {
		await render(
			<Container variant="dashed">
				<Text>Empty</Text>
			</Container>,
		);
		expect(screen.getByText("Empty").parent).toHaveStyle({
			borderStyle: "dashed",
			backgroundColor: "transparent",
		});
	});
});

describe("Container — flat (V3 list card)", () => {
	it("has no padding, radius l, and a hairline between its children", async () => {
		await render(
			<Container variant="flat">
				<Text>One</Text>
				<Text>Two</Text>
			</Container>,
		);
		expect(screen.getAllByTestId("container-section")).toHaveLength(2);
		const card = screen.getAllByTestId("container-section")[0].parent;
		const style = StyleSheet.flatten(card?.props.style);
		expect(style.padding).toBe(0);
		expect(style.borderRadius).toBe(20);
	});
});
