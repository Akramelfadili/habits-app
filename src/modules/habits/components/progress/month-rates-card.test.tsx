import { render, screen } from "@testing-library/react-native";
import { MonthRatesCard } from "./month-rates-card";

const rows = [
	{
		key: "1",
		name: "Meditate",
		dot: "#8855cc",
		isBreak: false,
		slipping: false,
		sub: "Daily · 21 of 22 · 1 frozen",
		rate: "95%",
		bar: 0.95,
		accessibilityLabel: "Meditate, 95%, Daily · 21 of 22 · 1 frozen",
	},
	{
		key: "2",
		name: "No social media",
		dot: "#2277dd",
		isBreak: true,
		slipping: false,
		sub: "Resisted 20 of 23",
		rate: "87%",
		bar: 0.87,
		accessibilityLabel: "No social media, Break, 87%, Resisted 20 of 23",
	},
	{
		key: "3",
		name: "Read 20 min",
		dot: "#cc7700",
		isBreak: false,
		slipping: true,
		sub: "Daily · 17 of 23 · slipping",
		rate: "74%",
		bar: 0.74,
		accessibilityLabel: "Read 20 min, 74%, Daily · 17 of 23 · slipping",
	},
];

describe("MonthRatesCard (P8)", () => {
	it("lists each habit with its rate and the line that explains it", async () => {
		await render(<MonthRatesCard rows={rows} meta="October so far" />);
		expect(screen.getByText("October so far")).toBeTruthy();
		expect(screen.getByText("Daily · 21 of 22 · 1 frozen")).toBeTruthy();
		expect(screen.getByText("95%")).toBeTruthy();
	});

	it("tags only the Break habit", async () => {
		await render(<MonthRatesCard rows={rows} meta="October" />);
		expect(screen.getAllByText("Break")).toHaveLength(1);
	});

	it("colours the slipping habit's rate and bar amber, and only that one", async () => {
		await render(<MonthRatesCard rows={rows} meta="October" />);
		expect(screen.getByText("74%")).toHaveStyle({ color: "#966408" });
		expect(screen.getByText("95%")).not.toHaveStyle({ color: "#966408" });
		const bars = screen.getAllByTestId("progress-bar");
		expect(bars).toHaveLength(3);
	});

	it("reads each habit as one stop", async () => {
		await render(<MonthRatesCard rows={rows} meta="October" />);
		expect(
			screen.getByLabelText("No social media, Break, 87%, Resisted 20 of 23")
				.props.accessible,
		).toBe(true);
	});
});
