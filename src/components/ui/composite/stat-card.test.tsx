import { render, screen } from "@testing-library/react-native";
import { semanticColors, surfaceColors } from "@/theme/theme";
import { StatCard } from "./stat-card";

describe("StatCard", () => {
	it("renders the label upper-cased, the numeral, and the caption", async () => {
		await render(<StatCard label="Current" value="24" caption="day streak" />);
		expect(screen.getByText("CURRENT")).toBeTruthy();
		expect(screen.getByText("24")).toBeTruthy();
		expect(screen.getByText("day streak")).toBeTruthy();
		expect(screen.getByLabelText("Current: 24, day streak")).toBeTruthy();
	});

	it("recedes a muted numeral to secondary ink", async () => {
		await render(
			<StatCard label="Longest" value="0" caption="no streak yet" muted />,
		);
		expect(screen.getByText("0")).toHaveStyle({
			color: surfaceColors.light.sub,
		});
	});

	it("uses the warning tint for the warning tone", async () => {
		await render(
			<StatCard
				label="At risk"
				value="2"
				caption="freezes left"
				tone="warning"
			/>,
		);
		expect(screen.getByText("2")).toHaveStyle({
			color: semanticColors.light.warnInk,
		});
	});

	it("uses the one V2 size everywhere: 14px padding, 10px label, 26px numeral (VAR-14)", async () => {
		await render(<StatCard label="Current" value="24" caption="day streak" />);
		expect(screen.getByText("CURRENT")).toHaveStyle({ fontSize: 10 });
		expect(screen.getByText("24")).toHaveStyle({ fontSize: 26 });
		expect(screen.getByLabelText("Current: 24, day streak")).toHaveStyle({
			padding: 14,
		});
	});
});
