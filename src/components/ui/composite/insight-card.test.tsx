import { fireEvent, render, screen } from "@testing-library/react-native";
import { semanticColors, surfaceColors } from "@/theme/theme";
import { InsightCard } from "./insight-card";

jest.mock("expo-symbols", () => {
	const { View } = require("react-native");
	return { SymbolView: View };
});

const light = { ...surfaceColors.light, ...semanticColors.light };

describe("InsightCard", () => {
	it("renders the title and body, with nothing tappable", async () => {
		await render(
			<InsightCard symbol="clock" title="Too early to call" body="Not yet." />,
		);
		expect(screen.getByText("Too early to call")).toBeTruthy();
		expect(screen.getByText("Not yet.")).toBeTruthy();
		expect(screen.queryByRole("button")).toBeNull();
	});

	it("uses the amber icon square for the warning tone and fires only its link", async () => {
		const onPress = jest.fn();
		await render(
			<InsightCard
				tone="warning"
				symbol="exclamationmark.circle"
				title="Read 20 min is slipping"
				body="3 of 5 so far this week, 7 of 7 last week."
				action={{ label: "Change frequency ›", onPress }}
			/>,
		);
		expect(screen.getByTestId("insight-card-icon")).toHaveStyle({
			backgroundColor: light.warnTint,
		});
		// The body is never a target; only the link is.
		expect(screen.getAllByRole("button")).toHaveLength(1);
		await fireEvent.press(screen.getByText("Change frequency ›"));
		expect(onPress).toHaveBeenCalledTimes(1);
	});

	it("keeps success and neutral on the quiet square, told apart by the glyph's ink", async () => {
		await render(
			<>
				<InsightCard tone="success" symbol="chart.bar" title="a" body="b" />
				<InsightCard tone="neutral" symbol="checkmark" title="c" body="d" />
			</>,
		);
		const [success, neutral] = screen.getAllByTestId("insight-card-icon");
		expect(success).toHaveStyle({ backgroundColor: light.inner });
		expect(neutral).toHaveStyle({ backgroundColor: light.inner });
	});

	it("is a 20 pt card with a hairline and 14 pt padding", async () => {
		await render(<InsightCard symbol="clock" title="a" body="b" />);
		expect(screen.getByTestId("insight-card")).toHaveStyle({
			borderRadius: 20,
			padding: 14,
			backgroundColor: light.card,
		});
	});

	it("reads its position first and steps with swipe up and down inside a pager", async () => {
		const onStep = jest.fn();
		await render(
			<InsightCard
				symbol="clock"
				title="Read 20 min is slipping"
				body="3 of 5."
				position={{ label: "Insight 1 of 3", onStep }}
			/>,
		);
		const text = screen.getByLabelText(
			"Insight 1 of 3. Read 20 min is slipping. 3 of 5.",
		);
		expect(text.props.accessibilityRole).toBe("adjustable");
		await fireEvent(text, "accessibilityAction", {
			nativeEvent: { actionName: "increment" },
		});
		await fireEvent(text, "accessibilityAction", {
			nativeEvent: { actionName: "decrement" },
		});
		expect(onStep.mock.calls).toEqual([[1], [-1]]);
	});
});
