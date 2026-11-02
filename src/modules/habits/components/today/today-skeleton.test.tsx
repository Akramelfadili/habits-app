import { render, screen } from "@testing-library/react-native";
import { AccessibilityInfo } from "react-native";
import { TodaySkeleton } from "./today-skeleton";

jest.mock("@/utils/use-reduced-motion", () => ({
	useReducedMotion: () => true,
}));

describe("TodaySkeleton (SY1)", () => {
	it("draws the progress card and five placeholder rows in three cards", async () => {
		await render(<TodaySkeleton />);
		// 1 bar + 5 rows × (square, two lines, circle) = 21 shapes.
		expect(
			screen.getAllByTestId("skeleton", { includeHiddenElements: true }),
		).toHaveLength(21);
	});

	it("reads as one 'Loading your habits' stop, busy, with its shapes hidden", async () => {
		await render(<TodaySkeleton />);
		const block = screen.getByTestId("today-skeleton", {
			includeHiddenElements: true,
		});
		expect(block.props.accessibilityLabel).toBe("Loading your habits");
		expect(block.props.accessibilityRole).toBe("progressbar");
		expect(block.props.accessibilityState).toEqual({ busy: true });
		expect(block.props.importantForAccessibility).toBe("no-hide-descendants");
	});

	it("announces 'Loading your habits' when it appears", async () => {
		const announce = jest
			.spyOn(AccessibilityInfo, "announceForAccessibility")
			.mockImplementation(() => {});
		await render(<TodaySkeleton />);
		expect(announce).toHaveBeenCalledWith("Loading your habits");
		announce.mockRestore();
	});

	it("says nothing in words: no text is drawn", async () => {
		await render(<TodaySkeleton />);
		expect(screen.queryByText(/\w/)).toBeNull();
	});
});
