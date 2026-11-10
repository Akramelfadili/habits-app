import { fireEvent, render, screen } from "@testing-library/react-native";
import { InsightPager } from "./insight-pager";

jest.mock("expo-symbols", () => {
	const { View } = require("react-native");
	return { SymbolView: View };
});

const insights = [
	{
		symbol: "clock" as const,
		title: "Read is slipping",
		body: "a",
		tone: "warning" as const,
	},
	{
		symbol: "clock" as const,
		title: "Meditate is up",
		body: "b",
		tone: "success" as const,
	},
	{ symbol: "clock" as const, title: "Nothing else", body: "c" },
];
const label = (index: number, count: number) =>
	`Insight ${index + 1} of ${count}`;

async function renderPager(list = insights) {
	await render(<InsightPager insights={list} positionLabel={label} />);
	await fireEvent(screen.getByTestId("insight-pager"), "layout", {
		nativeEvent: { layout: { width: 300, height: 100 } },
	});
}

describe("InsightPager", () => {
	it("before it is measured shows the first card in its own column, not in a scroller whose pages have no width", async () => {
		await render(<InsightPager insights={insights} positionLabel={label} />);
		expect(screen.queryByTestId("insight-pager-scroll")).toBeNull();
		expect(screen.getAllByTestId("insight-card")).toHaveLength(1);
		expect(screen.getByText("Read is slipping")).toBeTruthy();
		await fireEvent(screen.getByTestId("insight-pager"), "layout", {
			nativeEvent: { layout: { width: 300, height: 100 } },
		});
		expect(screen.getByTestId("insight-pager-scroll")).toBeTruthy();
		expect(screen.getAllByTestId("insight-card")).toHaveLength(3);
	});

	it("draws a dot per insight with the first active", async () => {
		await renderPager();
		const hidden = { includeHiddenElements: true };
		expect(screen.getAllByTestId("insight-dot", hidden)).toHaveLength(2);
		expect(screen.getAllByTestId("insight-dot-active", hidden)).toHaveLength(1);
	});

	it("shows no pager and no dots for a single insight, and nothing for none", async () => {
		await render(
			<InsightPager insights={[insights[0]]} positionLabel={label} />,
		);
		expect(screen.queryByTestId("insight-pager")).toBeNull();
		expect(screen.getByText("Read is slipping")).toBeTruthy();
	});

	it("draws nothing for no insights", async () => {
		await render(<InsightPager insights={[]} positionLabel={label} />);
		expect(screen.queryByTestId("insight-card")).toBeNull();
	});

	it("moves the active dot when the pages scroll", async () => {
		await renderPager();
		await fireEvent(
			screen.getByTestId("insight-pager-scroll"),
			"momentumScrollEnd",
			{
				nativeEvent: { contentOffset: { x: 300 } },
			},
		);
		const dots = screen.getAllByTestId(/^insight-dot/, {
			includeHiddenElements: true,
		});
		expect(dots[1].props.testID).toBe("insight-dot-active");
	});

	it("reads each card's position and steps to the next on swipe up", async () => {
		await renderPager();
		expect(
			screen.getByLabelText("Insight 1 of 3. Read is slipping. a"),
		).toBeTruthy();
		await fireEvent(
			screen.getByLabelText("Insight 1 of 3. Read is slipping. a"),
			"accessibilityAction",
			{ nativeEvent: { actionName: "increment" } },
		);
		expect(
			screen.getAllByTestId(/^insight-dot/, { includeHiddenElements: true })[1]
				.props.testID,
		).toBe("insight-dot-active");
		for (let step = 0; step < 4; step += 1) {
			await fireEvent(
				screen.getByLabelText("Insight 3 of 3. Nothing else. c"),
				"accessibilityAction",
				{ nativeEvent: { actionName: "increment" } },
			);
		}
		expect(
			screen.getAllByTestId(/^insight-dot/, { includeHiddenElements: true })[2]
				.props.testID,
		).toBe("insight-dot-active");
	});

	it("hides the dots from VoiceOver: the position is in each card's label", async () => {
		await renderPager();
		expect(
			screen.getByTestId("insight-pager-dots", { includeHiddenElements: true })
				.props.accessibilityElementsHidden,
		).toBe(true);
	});
});
