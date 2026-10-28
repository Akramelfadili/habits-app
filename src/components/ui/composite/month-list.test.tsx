import { fireEvent, render, screen } from "@testing-library/react-native";
import { MonthList } from "./month-list";

describe("MonthList", () => {
	it("lists a month per row with its whole-number percentage, and 'No data' without a rate", async () => {
		await render(
			<MonthList
				emptyLabel="No data"
				items={[
					{
						key: "sep",
						label: "September",
						percent: 100,
						bar: 1,
						accessibilityLabel: "September, 100 percent. Opens Month.",
						onPress: jest.fn(),
					},
					{
						key: "oct",
						label: "October",
						percent: null,
						bar: 0,
						accessibilityLabel: "October, no data. Opens Month.",
						onPress: jest.fn(),
					},
				]}
			/>,
		);
		expect(screen.getByText("100%")).toBeTruthy();
		expect(screen.getByText("No data")).toBeTruthy();
	});

	it("is one VoiceOver stop and one tap per month", async () => {
		const onPress = jest.fn();
		await render(
			<MonthList
				emptyLabel="No data"
				items={[
					{
						key: "sep",
						label: "September",
						percent: 100,
						bar: 1,
						accessibilityLabel: "September, 100 percent. Opens Month.",
						onPress,
					},
				]}
			/>,
		);
		await fireEvent.press(
			screen.getByRole("button", {
				name: "September, 100 percent. Opens Month.",
			}),
		);
		expect(onPress).toHaveBeenCalledTimes(1);
	});
});
