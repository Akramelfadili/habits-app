import { render, screen } from "@testing-library/react-native";
import { Text } from "react-native";
import { ChartCard } from "./chart-card";

describe("ChartCard", () => {
	it("holds a titled body with meta on the right and a footer under it", async () => {
		await render(
			<ChartCard
				title="This week"
				meta="19 – 25 Oct"
				footer={<Text>Legend</Text>}
			>
				<Text>Body</Text>
			</ChartCard>,
		);
		expect(screen.getByRole("header", { name: "This week" })).toBeTruthy();
		expect(screen.getByText("19 – 25 Oct")).toBeTruthy();
		expect(screen.getByText("Body")).toBeTruthy();
		expect(screen.getByText("Legend")).toBeTruthy();
	});

	it("omits the meta when there is none", async () => {
		await render(
			<ChartCard title="Per habit">
				<Text>Body</Text>
			</ChartCard>,
		);
		expect(screen.queryByText("19 – 25 Oct")).toBeNull();
	});
});
