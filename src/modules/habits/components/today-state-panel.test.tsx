import { render, screen } from "@testing-library/react-native";
import { Text } from "react-native";
import { TodayStatePanel } from "./today-state-panel";

jest.mock("expo-symbols", () => {
	const { View } = require("react-native");
	return { SymbolView: View };
});

describe("TodayStatePanel", () => {
	it("renders the headline and subtitle", async () => {
		await render(
			<TodayStatePanel
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
			<TodayStatePanel icon="circle" headline="Rest day" subtitle="…">
				<Text>Log something anyway</Text>
			</TodayStatePanel>,
		);
		expect(screen.getByText("Log something anyway")).toBeTruthy();
	});
});
