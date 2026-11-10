import { render, screen } from "@testing-library/react-native";
import { Text } from "react-native";
import { EmptyState } from "./empty-state";

jest.mock("expo-symbols", () => {
	const { View } = require("react-native");
	return { SymbolView: View };
});

describe("EmptyState", () => {
	it("renders the headline and subtitle", async () => {
		await render(
			<EmptyState
				icon="circle"
				headline="Rest day"
				subtitle="Nothing is scheduled for Sunday. Streaks stay intact."
			/>,
		);
		expect(screen.getByText("Rest day")).toBeTruthy();
		expect(
			screen.getByText("Nothing is scheduled for Sunday. Streaks stay intact."),
		).toBeTruthy();
	});

	it("renders its children beneath the message", async () => {
		await render(
			<EmptyState icon="circle" headline="Rest day" subtitle="…">
				<Text>Log something anyway</Text>
			</EmptyState>,
		);
		expect(screen.getByText("Log something anyway")).toBeTruthy();
	});
});

describe("EmptyState", () => {
	it("announces its title as a heading", async () => {
		await render(
			<EmptyState icon="circle" headline="Nothing to track yet" subtitle="…" />,
		);
		expect(
			screen.getByRole("header", { name: "Nothing to track yet" }),
		).toBeTruthy();
	});
});
