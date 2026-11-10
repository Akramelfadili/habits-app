import { render, screen } from "@testing-library/react-native";
import { semanticColors, surfaceColors, textStyles } from "@/theme/theme";
import { StatCard } from "./stat-card";

// jest's window reports fontScale 2, i.e. accessibility sizes: say which one a test wants.
let mockAccessibilityText = false;
jest.mock("@/utils/use-accessibility-text-size", () => ({
	useAccessibilityTextSize: () => mockAccessibilityText,
}));

beforeEach(() => {
	mockAccessibilityText = false;
});

describe("StatCard", () => {
	it("renders the label upper-cased, the numeral, and the caption as one VoiceOver stop", async () => {
		await render(<StatCard label="Current" value="24" caption="day streak" />);
		expect(screen.getByText("CURRENT")).toBeTruthy();
		expect(screen.getByText("24")).toBeTruthy();
		expect(screen.getByText("day streak")).toBeTruthy();
		expect(
			screen.getByLabelText("Current: 24, day streak").props.accessible,
		).toBe(true);
	});

	it("recedes a muted numeral to secondary ink", async () => {
		await render(
			<StatCard
				label="Longest"
				value="—"
				caption="Starts with your first log"
				muted
			/>,
		);
		expect(screen.getByText("—")).toHaveStyle({
			color: surfaceColors.light.sub,
		});
	});

	it("turns the numeral and caption amber for the warning tone, on a plain card", async () => {
		await render(
			<StatCard
				label="Freezes"
				value="0"
				caption="0 freezes left"
				tone="warning"
			/>,
		);
		expect(screen.getByText("0")).toHaveStyle({
			color: semanticColors.light.warnInk,
		});
		expect(screen.getByText("0 freezes left")).toHaveStyle({
			color: semanticColors.light.warnInk,
		});
		expect(screen.getByLabelText("Freezes: 0, 0 freezes left")).toHaveStyle({
			backgroundColor: surfaceColors.light.card,
		});
	});

	it("uses one size: padding 12, 2 pt gaps, caption label, stat numeral, footnote sub", async () => {
		await render(<StatCard label="Current" value="24" caption="day streak" />);
		expect(screen.getByLabelText("Current: 24, day streak")).toHaveStyle({
			padding: 12,
			gap: 2,
		});
		expect(screen.getByText("CURRENT")).toHaveStyle({
			fontSize: textStyles.caption.fontSize,
		});
		expect(screen.getByText("24")).toHaveStyle({
			fontSize: textStyles.stat.fontSize,
		});
		expect(screen.getByText("day streak")).toHaveStyle({
			fontSize: textStyles.footnote.fontSize,
		});
	});

	it("lets a long caption wrap instead of clipping", async () => {
		await render(
			<StatCard
				label="Daily average"
				value="4.6"
				caption="habits per day across October so far"
			/>,
		);
		expect(
			screen.getByText("habits per day across October so far").props
				.numberOfLines,
		).toBeUndefined();
	});

	it("restores 16 pt padding at accessibility sizes", async () => {
		mockAccessibilityText = true;
		await render(<StatCard label="Current" value="24" caption="day streak" />);
		expect(screen.getByLabelText("Current: 24, day streak")).toHaveStyle({
			padding: 16,
		});
	});
});
