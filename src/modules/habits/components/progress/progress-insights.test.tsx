import { fireEvent, render, screen } from "@testing-library/react-native";
import { ProgressInsights } from "./progress-insights";

jest.mock("expo-symbols", () => {
	const { View } = require("react-native");
	return { SymbolView: View };
});

const slipping = {
	symbol: "exclamationmark.circle" as const,
	title: "Read 20 min is slipping",
	body: "3 of 5 so far this week, 7 of 7 last week.",
	tone: "warning" as const,
	action: { label: "Change frequency ›", habitId: 2 },
};
const improved = {
	symbol: "chart.bar" as const,
	title: "Meditate is up 3 days",
	body: "21 of 22 this month.",
	tone: "success" as const,
};

describe("ProgressInsights (HAB-38)", () => {
	it("sends a slipping card's link to Edit habit for that habit", async () => {
		const onChangeFrequency = jest.fn();
		await render(
			<ProgressInsights
				insights={[slipping]}
				onChangeFrequency={onChangeFrequency}
			/>,
		);
		await fireEvent.press(screen.getByText("Change frequency ›"));
		expect(onChangeFrequency).toHaveBeenCalledWith(2);
	});

	it("gives improved and nothing-to-fix cards no link", async () => {
		await render(
			<ProgressInsights insights={[improved]} onChangeFrequency={jest.fn()} />,
		);
		expect(screen.queryByRole("button")).toBeNull();
		expect(screen.getByText("Meditate is up 3 days")).toBeTruthy();
	});

	it("pages through several, reading 'Insight 1 of 2'", async () => {
		await render(
			<ProgressInsights
				insights={[slipping, improved]}
				onChangeFrequency={jest.fn()}
			/>,
		);
		await fireEvent(screen.getByTestId("insight-pager"), "layout", {
			nativeEvent: { layout: { width: 300, height: 100 } },
		});
		expect(
			screen.getByLabelText(
				"Insight 1 of 2. Read 20 min is slipping. 3 of 5 so far this week, 7 of 7 last week.",
			),
		).toBeTruthy();
		expect(screen.getByLabelText(/^Insight 2 of 2\./)).toBeTruthy();
	});
});
