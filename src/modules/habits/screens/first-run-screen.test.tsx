import {
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/react-native";

jest.mock("expo-symbols", () => {
	const { View } = require("react-native");
	return { SymbolView: View };
});

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockDismissAll = jest.fn();
jest.mock("expo-router", () => ({
	useRouter: () => ({
		push: (...args: unknown[]) => mockPush(...args),
		replace: (...args: unknown[]) => mockReplace(...args),
		dismissAll: () => mockDismissAll(),
		canDismiss: () => false,
	}),
}));

jest.mock("@/utils/use-accessibility-text-size", () => ({
	useAccessibilityTextSize: () => false,
}));

const mockMarkFirstRunSeen = jest.fn();
let mockMarkError: Error | null = null;
jest.mock("../hooks/use-first-run-actions", () => ({
	useFirstRunActions: () => ({
		markFirstRunSeen: (...args: unknown[]) => mockMarkFirstRunSeen(...args),
		isMarking: false,
		markError: mockMarkError,
	}),
}));

import { FirstRunScreen } from "./first-run-screen";

beforeEach(() => {
	mockPush.mockReset();
	mockReplace.mockReset();
	mockDismissAll.mockReset();
	mockMarkError = null;
	mockMarkFirstRunSeen.mockReset().mockResolvedValue({ ok: true });
});

describe("FirstRunScreen (FR1)", () => {
	it("says what the app is and the three things it does, in reading order", async () => {
		await render(<FirstRunScreen />);
		const texts = [
			"Small habits,\nevery day",
			"Tick them off on Today, see your week in Progress, and keep streaks going on off days with freezes.",
			"Today",
			"Tick what’s due",
			"Progress",
			"Week, month and year",
			"Freezes",
			"Keep a streak through a missed day",
			"Add your first habit",
			"Browse suggestions",
			"Skip for now",
		];
		for (const text of texts) expect(screen.getByText(text)).toBeTruthy();
	});

	it("has the title as its one heading, for the screen reader to start on", async () => {
		await render(<FirstRunScreen />);
		const headings = screen.getAllByRole("header");
		expect(headings).toHaveLength(1);
		expect(headings[0].props.accessibilityLabel).toBe(
			"Small habits, every day",
		);
	});

	it("Add your first habit opens the slim form", async () => {
		await render(<FirstRunScreen />);
		await fireEvent.press(screen.getByText("Add your first habit"));
		expect(mockPush).toHaveBeenCalledWith("/first-run/habit");
	});

	it("Browse suggestions opens the suggestions screen as part of First Run", async () => {
		await render(<FirstRunScreen />);
		await fireEvent.press(screen.getByText("Browse suggestions"));
		expect(mockPush).toHaveBeenCalledWith("/suggestions?firstRun=1");
	});

	it("Skip for now marks First Run seen and then opens an empty Today", async () => {
		await render(<FirstRunScreen />);
		await fireEvent.press(screen.getByText("Skip for now"));
		await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/"));
		expect(mockMarkFirstRunSeen).toHaveBeenCalledTimes(1);
	});

	it("stays put when the flag cannot be written, instead of looping back to First Run", async () => {
		mockMarkFirstRunSeen.mockResolvedValue({ ok: false });
		await render(<FirstRunScreen />);
		await fireEvent.press(screen.getByText("Skip for now"));
		await waitFor(() => expect(mockMarkFirstRunSeen).toHaveBeenCalled());
		expect(mockReplace).not.toHaveBeenCalled();
	});

	it("says so inline when the flag could not be written (no toast host exists before the tabs)", async () => {
		mockMarkError = new Error("disk full");
		await render(<FirstRunScreen />);
		expect(screen.getByRole("alert")).toBeTruthy();
		expect(screen.getByText("Couldn’t continue. Try again.")).toBeTruthy();
	});
});
