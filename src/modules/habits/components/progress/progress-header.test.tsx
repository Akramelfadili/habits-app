import { fireEvent, render, screen } from "@testing-library/react-native";
import { ProgressHeader } from "./progress-header";

jest.mock("expo-symbols", () => {
	const { View } = require("react-native");
	return { SymbolView: View };
});

// jest's window reports fontScale 2, i.e. accessibility sizes: say which one a test wants.
let mockAccessibilityText = false;
jest.mock("@/utils/use-accessibility-text-size", () => ({
	useAccessibilityTextSize: () => mockAccessibilityText,
}));

beforeEach(() => {
	mockAccessibilityText = false;
});

const props = {
	eyebrow: "Week of 19 October",
	exportUnavailable: false,
	onExport: jest.fn(),
};

describe("ProgressHeader (V3-02, P1)", () => {
	it("reads the title and the eyebrow as one heading", async () => {
		await render(<ProgressHeader {...props} />);
		const heading = screen.getByRole("header", {
			name: "Progress. Week of 19 October",
		});
		expect(heading.props.accessible).toBe(true);
		expect(screen.getByText("Progress")).toBeTruthy();
		expect(screen.getByText("WEEK OF 19 OCTOBER")).toBeTruthy();
	});

	it("exports on tap", async () => {
		const onExport = jest.fn();
		await render(<ProgressHeader {...props} onExport={onExport} />);
		await fireEvent.press(screen.getByRole("button", { name: "Export data" }));
		expect(onExport).toHaveBeenCalledTimes(1);
	});

	it("reads Export as unavailable, yet still taps, when there is nothing to export (P3)", async () => {
		const onExport = jest.fn();
		await render(
			<ProgressHeader {...props} exportUnavailable onExport={onExport} />,
		);
		const button = screen.getByRole("button", { name: "Export data" });
		expect(button.props.accessibilityState).toEqual({ disabled: true });
		await fireEvent.press(button);
		expect(onExport).toHaveBeenCalledTimes(1);
	});

	it("offers the way back to Year when a month was opened from it (P13)", async () => {
		const onPress = jest.fn();
		await render(
			<ProgressHeader {...props} back={{ label: "Year", onPress }} />,
		);
		await fireEvent.press(screen.getByRole("button", { name: "Back to Year" }));
		expect(onPress).toHaveBeenCalledTimes(1);
		expect(screen.getByText("‹ Year")).toBeTruthy();
	});

	it("takes no taps and leaves VoiceOver once the inline bar has taken over", async () => {
		await render(<ProgressHeader {...props} collapsed />);
		expect(screen.queryByRole("button", { name: "Export data" })).toBeNull();
	});

	it("stacks the button above the title at accessibility sizes", async () => {
		mockAccessibilityText = true;
		await render(<ProgressHeader {...props} />);
		const button = screen.getByRole("button", { name: "Export data" });
		const heading = screen.getByRole("header", { name: /Progress/ });
		expect(
			button.parent?.parent?.children.indexOf(button.parent as never),
		).toBe(0);
		expect(heading).toBeTruthy();
	});
});
