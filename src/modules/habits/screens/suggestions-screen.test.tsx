import {
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/react-native";
import { makeHabit } from "../test-support/habit-builder";
import type { Habit } from "../types";

jest.mock("expo-symbols", () => {
	const { View } = require("react-native");
	return { SymbolView: View };
});
jest.mock("@/utils/use-accessibility-text-size", () => ({
	useAccessibilityTextSize: () => false,
}));

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockDismissAll = jest.fn();
jest.mock("expo-router", () => ({
	useRouter: () => ({
		push: (...args: unknown[]) => mockPush(...args),
		replace: (...args: unknown[]) => mockReplace(...args),
		dismissAll: () => mockDismissAll(),
		canDismiss: () => true,
	}),
}));

let mockHabits: Habit[] = [];
jest.mock("../hooks/use-habit-queries", () => ({
	useHabitQueries: () => ({ habits: mockHabits }),
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

import { parseHabitPrefill } from "../presenters/habit-form-prefill";
import { SuggestionsScreen } from "./suggestions-screen";

beforeEach(() => {
	mockHabits = [];
	mockPush.mockReset();
	mockReplace.mockReset();
	mockDismissAll.mockReset();
	mockMarkFirstRunSeen.mockReset().mockResolvedValue({ ok: true });
});

describe("SuggestionsScreen (BS1)", () => {
	it("says what tapping does, then lists the nine in their groups", async () => {
		await render(<SuggestionsScreen />);
		expect(
			screen.getByText(
				"Tap one to open Add habit with it filled in. Change anything before saving.",
			),
		).toBeTruthy();
		for (const group of [
			"Health",
			"Mindfulness",
			"Fitness",
			"Learning",
			"Break a habit",
		]) {
			expect(screen.getByLabelText(group)).toBeTruthy();
		}
		for (const name of [
			"Drink water",
			"Cold shower",
			"Meditate",
			"Journal 5 min",
			"Morning run",
			"Upper body",
			"Read 20 min",
			"No social media",
			"No phone in bed",
		]) {
			expect(screen.getByText(name)).toBeTruthy();
		}
		expect(screen.getByText("Quantity · 8 glasses a day")).toBeTruthy();
		expect(screen.getByText("Mon, Wed, Fri")).toBeTruthy();
	});

	it("groups are headings", async () => {
		await render(<SuggestionsScreen />);
		const headings = screen
			.getAllByRole("header")
			.map((h) => h.props.accessibilityLabel);
		expect(headings).toEqual(
			expect.arrayContaining([
				"Health",
				"Mindfulness",
				"Fitness",
				"Learning",
				"Break a habit",
			]),
		);
	});

	it("opens Add habit with the suggestion's every field, creating nothing itself", async () => {
		await render(<SuggestionsScreen />);
		await fireEvent.press(screen.getByLabelText(/^Drink water, Quantity/));

		expect(mockPush).toHaveBeenCalledTimes(1);
		const [href] = mockPush.mock.calls[0];
		expect(href.pathname).toBe("/new-habit");
		expect(href.params.firstRun).toBeUndefined();
		expect(parseHabitPrefill(href.params.prefill)).toEqual({
			name: "Drink water",
			category: "Health",
			direction: "build",
			target: { amount: 8, unit: "glasses" },
			frequency: { type: "daily" },
		});
	});

	it("passes a Break habit through as Break", async () => {
		await render(<SuggestionsScreen />);
		await fireEvent.press(screen.getByLabelText(/^No phone in bed/));
		const prefill = parseHabitPrefill(mockPush.mock.calls[0][0].params.prefill);
		expect(prefill).toMatchObject({
			name: "No phone in bed",
			direction: "break",
		});
	});

	it("marks a suggestion that already exists as Added, archived included, and cannot be picked", async () => {
		mockHabits = [
			makeHabit({ id: 1, name: "Meditate" }),
			makeHabit({
				id: 2,
				name: "Read 20 min",
				archivedAt: new Date("2026-09-01"),
			}),
		];
		await render(<SuggestionsScreen />);
		expect(screen.getAllByText("Added")).toHaveLength(2);
		await fireEvent.press(screen.getByText("Meditate"));
		await fireEvent.press(screen.getByText("Read 20 min"));
		expect(mockPush).not.toHaveBeenCalled();
		await fireEvent.press(screen.getByLabelText(/^Cold shower/));
		expect(mockPush).toHaveBeenCalledTimes(1);
	});

	it("outside First Run there is no skip", async () => {
		await render(<SuggestionsScreen />);
		expect(screen.queryByText("Skip for now")).toBeNull();
	});
});

describe("SuggestionsScreen from First Run", () => {
	it("carries First Run into Add habit, so saving there finishes it", async () => {
		await render(<SuggestionsScreen firstRun />);
		await fireEvent.press(screen.getByLabelText(/^Meditate/));
		expect(mockPush.mock.calls[0][0].params.firstRun).toBe("1");
	});

	it("Skip for now marks First Run seen and opens an empty Today", async () => {
		await render(<SuggestionsScreen firstRun />);
		await fireEvent.press(screen.getByText("Skip for now"));
		await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/"));
		expect(mockMarkFirstRunSeen).toHaveBeenCalledTimes(1);
		expect(mockDismissAll).toHaveBeenCalled();
	});

	it("says so inline when the flag cannot be written (no toast host outside the tabs)", async () => {
		mockMarkError = new Error("disk full");
		await render(<SuggestionsScreen firstRun />);
		expect(screen.getByText("Couldn\u2019t continue. Try again.")).toBeTruthy();
		mockMarkError = null;
	});

	it("stays when the flag cannot be written", async () => {
		mockMarkFirstRunSeen.mockResolvedValue({ ok: false });
		await render(<SuggestionsScreen firstRun />);
		await fireEvent.press(screen.getByText("Skip for now"));
		await waitFor(() => expect(mockMarkFirstRunSeen).toHaveBeenCalled());
		expect(mockReplace).not.toHaveBeenCalled();
	});
});
