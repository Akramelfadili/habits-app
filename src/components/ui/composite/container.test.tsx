import { render, screen } from "@testing-library/react-native";
import { Text, View } from "react-native";
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
});
