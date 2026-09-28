import { fireEvent, render, screen } from "@testing-library/react-native";
import { semanticColors, surfaceColors } from "@/theme/theme";
import { InsightCard } from "./insight-card";

jest.mock("expo-symbols", () => {
	const { View } = require("react-native");
	return { SymbolView: View };
});

describe("InsightCard", () => {
	it("renders the title and body", async () => {
		await render(
			<InsightCard symbol="clock" title="Too early to call" body="Not yet." />,
		);
		expect(screen.getByText("Too early to call")).toBeTruthy();
		expect(screen.getByText("Not yet.")).toBeTruthy();
		expect(screen.queryByRole("button")).toBeNull();
	});

	it("uses the amber icon square for the warning tone and fires its action", async () => {
		const onPress = jest.fn();
		await render(
			<InsightCard
				tone="warning"
				symbol="diamond.fill"
				title="Mobility is slipping"
				body="Two of seven days."
				action={{ label: "Reschedule habit →", onPress }}
			/>,
		);
		expect(screen.getByTestId("insight-card-icon")).toHaveStyle({
			backgroundColor: semanticColors.light.warnTint,
		});
		await fireEvent.press(screen.getByText("Reschedule habit →"));
		expect(onPress).toHaveBeenCalledTimes(1);
	});

	it("uses a filled ink icon square for the success tone", async () => {
		await render(
			<InsightCard
				tone="success"
				symbol="checkmark"
				title="Perfect week"
				body="Nothing to fix."
			/>,
		);
		expect(screen.getByTestId("insight-card-icon")).toHaveStyle({
			backgroundColor: surfaceColors.light.ink,
		});
	});
});
