import { render, screen } from "@testing-library/react-native";
import { ProgressStatTiles } from "./progress-stat-tiles";

let mockAccessibilityText = false;
jest.mock("@/utils/use-accessibility-text-size", () => ({
	useAccessibilityTextSize: () => mockAccessibilityText,
}));

const tiles = [
	{ key: "a", label: "Completion", value: "70%", caption: "19 of 27 so far" },
	{ key: "b", label: "Best streak", value: "13", caption: "Meditate · days" },
	{ key: "c", label: "Best day", value: "Mon", caption: "5 of 6 done" },
];

describe("ProgressStatTiles (V3-10)", () => {
	beforeEach(() => {
		mockAccessibilityText = false;
	});

	it("shows each tile as one VoiceOver stop", async () => {
		await render(<ProgressStatTiles tiles={tiles} />);
		expect(
			screen.getByLabelText("Completion: 70%, 19 of 27 so far"),
		).toBeTruthy();
		expect(screen.getByLabelText("Best day: Mon, 5 of 6 done")).toBeTruthy();
	});

	it("sits the tiles side by side with an 8 pt gap", async () => {
		await render(<ProgressStatTiles tiles={tiles} />);
		expect(screen.getByTestId("progress-stat-tiles")).toHaveStyle({
			flexDirection: "row",
			gap: 8,
		});
	});

	it("stacks them one-up at accessibility sizes (P11)", async () => {
		mockAccessibilityText = true;
		await render(<ProgressStatTiles tiles={tiles} />);
		expect(
			screen.getByTestId("progress-stat-tiles").props.style.flexDirection,
		).toBeUndefined();
	});

	it("passes the warning tone through", async () => {
		await render(
			<ProgressStatTiles
				tiles={[
					{
						key: "f",
						label: "Freezes",
						value: "0",
						caption: "0 freezes left",
						tone: "warning",
					},
				]}
			/>,
		);
		expect(screen.getByText("0")).toHaveStyle({ color: "#966408" });
	});
});
