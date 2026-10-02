import { render, screen } from "@testing-library/react-native";
import { Text } from "react-native";
import { TrendRow } from "./trend-row";

const props = {
	label: "Read",
	badge: <Text>badge</Text>,
	trend: <Text>trend</Text>,
	value: "82%",
	accessibilityLabel: "Read: 82%, up 11 points on last month",
};

describe("TrendRow", () => {
	it("lays out badge, name, trend, rate and delta as one readable element", async () => {
		await render(<TrendRow {...props} deltaPoints={11} />);
		expect(screen.getByText("badge")).toBeTruthy();
		expect(screen.getByText("Read")).toBeTruthy();
		expect(screen.getByText("trend")).toBeTruthy();
		expect(screen.getByText("82%")).toBeTruthy();
		expect(screen.getByText("+11")).toBeTruthy();
		expect(
			screen.getByLabelText("Read: 82%, up 11 points on last month"),
		).toBeTruthy();
	});

	it("shows no delta at all when there's no previous month to compare", async () => {
		await render(<TrendRow {...props} deltaPoints={null} />);
		expect(screen.queryByText(/^[+−0]/)).toBeNull();
	});

	it("is just badge, name and trend when it has no figure (Yearly's strip slot)", async () => {
		await render(
			<TrendRow
				label="Read"
				badge={<Text>badge</Text>}
				trend={<Text>strip</Text>}
				accessibilityLabel="Read by month"
			/>,
		);
		expect(screen.getByText("strip")).toBeTruthy();
		expect(screen.queryByText(/%/)).toBeNull();
	});
});
