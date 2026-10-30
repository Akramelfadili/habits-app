import { fireEvent, render, screen } from "@testing-library/react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import type { HabitsLibrary } from "../hooks/use-habits-queries";
import { groupHabitsByCategory } from "../presenters/today-screen-helpers";
import { categoryNamed, makeHabit } from "../test-support/habit-builder";
import type { Habit } from "../types";

jest.mock("expo-symbols", () => {
	const { View } = require("react-native");
	return { SymbolView: View };
});
const mockPush = jest.fn();
jest.mock("expo-router", () => ({
	useRouter: () => ({ push: mockPush, back: jest.fn() }),
}));

function libraryOf(
	active: Habit[],
	archived: Habit[] = [],
	extra: Partial<HabitsLibrary> = {},
): HabitsLibrary {
	const groups = groupHabitsByCategory(active, []);
	return {
		isLoaded: true,
		groups,
		active: groups.flatMap((group) => group.habits),
		archived,
		streakByHabitId: new Map(),
		bestStreakByHabitId: new Map(),
		categoryCount: 12,
		...extra,
	};
}

let mockLibrary: HabitsLibrary = libraryOf([]);
jest.mock("../hooks/use-habits-queries", () => ({
	useHabitsQueries: () => mockLibrary,
}));
const mockReorder = jest.fn();
const mockArchive = jest.fn();
const mockRestore = jest.fn();
jest.mock("../hooks/use-habits-actions", () => ({
	useHabitsActions: () => ({
		reorderHabits: mockReorder,
		archive: mockArchive,
		restore: mockRestore,
		isRestoring: false,
	}),
}));

import { HabitsScreen } from "./habits-screen";

const water = makeHabit({
	id: 1,
	name: "Glass of water",
	category: categoryNamed("Morning"),
	targetType: "quantity",
	targetAmount: 8,
	targetUnit: "glasses",
});
const meditate = makeHabit({
	id: 2,
	name: "Meditate",
	category: categoryNamed("Morning"),
});
const read = makeHabit({
	id: 3,
	name: "Read",
	category: categoryNamed("Evening"),
	frequency: { type: "per-week", timesPerWeek: 5 },
});
const run = makeHabit({
	id: 6,
	name: "Morning run",
	category: categoryNamed("Training"),
	archivedAt: new Date(2026, 9, 12),
});

function renderScreen() {
	return render(<HabitsScreen />, { wrapper: GestureHandlerRootView });
}

beforeEach(() => {
	jest.clearAllMocks();
	mockLibrary = libraryOf([water, meditate, read], [run]);
});

describe("HabitsScreen — the library (H1)", () => {
	it("counts what there is over the title, and groups the active habits by category", async () => {
		await renderScreen();
		expect(
			screen.getByLabelText("Habits, heading. 3 active, 1 archived"),
		).toBeTruthy();
		expect(screen.getByText("3 ACTIVE · 1 ARCHIVED")).toBeTruthy();
		expect(screen.getByText("ACTIVE · 3")).toBeTruthy();
		expect(screen.getByText("MORNING")).toBeTruthy();
		expect(screen.getByText("EVENING")).toBeTruthy();
		expect(screen.getByText("Daily · 8 glasses")).toBeTruthy();
		expect(screen.getByText("5× per week")).toBeTruthy();
	});

	it("opens Settings from the gear and Add habit from the +", async () => {
		await renderScreen();
		const [gear] = screen.getAllByRole("button", { name: "Settings" });
		await fireEvent.press(gear);
		expect(mockPush).toHaveBeenCalledWith("/settings");
		const [plus] = screen.getAllByRole("button", { name: "Add habit" });
		await fireEvent.press(plus);
		expect(mockPush).toHaveBeenCalledWith("/new-habit");
	});

	it("opens a habit's detail from its row", async () => {
		await renderScreen();
		await fireEvent.press(
			screen.getByRole("button", {
				name: "Glass of water, Morning, daily, 8 glasses",
			}),
		);
		expect(mockPush).toHaveBeenCalledWith("/habit/1");
	});

	it("ends with the Categories row and its count", async () => {
		await renderScreen();
		await fireEvent.press(
			screen.getByRole("button", { name: "Categories, 12" }),
		);
		expect(mockPush).toHaveBeenCalledWith("/categories?from=habits");
	});

	it("offers no delete anywhere on this screen", async () => {
		await renderScreen();
		expect(screen.queryByText(/^Delete/)).toBeNull();
	});

	it("renders a neutral blank — not the empty state — until the lists load (A5-04)", async () => {
		mockLibrary = { ...libraryOf([]), isLoaded: false };
		await renderScreen();
		expect(screen.getByTestId("screen-loading")).toBeTruthy();
		expect(screen.queryByText("No habits yet")).toBeNull();
	});

	it("drops a category's card as soon as its last habit is archived", async () => {
		const view = await renderScreen();
		expect(screen.getByText("EVENING")).toBeTruthy();
		mockLibrary = libraryOf([water, meditate], [read, run]);
		await view.rerender(<HabitsScreen />);
		expect(screen.queryByText("EVENING")).toBeNull();
		expect(screen.getByText("MORNING")).toBeTruthy();
	});
});

describe("HabitsScreen — Archived (H1, H5)", () => {
	it("is collapsed: the count and Show, no rows", async () => {
		await renderScreen();
		expect(screen.getByText("ARCHIVED · 1")).toBeTruthy();
		expect(screen.queryByText("Morning run")).toBeNull();
	});

	it("expands in place, with the date and best streak, and Restore", async () => {
		mockLibrary = libraryOf([water], [run], {
			bestStreakByHabitId: new Map([[6, 41]]),
		});
		await renderScreen();
		await fireEvent.press(
			screen.getByRole("button", { name: "Archived, 1, collapsed" }),
		);
		expect(screen.getByText("Archived 12 Oct · best streak 41")).toBeTruthy();
		expect(screen.getByText("Hide")).toBeTruthy();
	});

	it("Restore is one press and hands over the habit; the hook says 'back on Today'", async () => {
		await renderScreen();
		await fireEvent.press(
			screen.getByRole("button", { name: "Archived, 1, collapsed" }),
		);
		await fireEvent.press(
			screen.getByRole("button", { name: "Restore Morning run" }),
		);
		expect(mockRestore).toHaveBeenCalledWith(run);
	});

	it("archives from a row's VoiceOver Archive action", async () => {
		await renderScreen();
		await fireEvent(
			screen.getByRole("button", {
				name: "Glass of water, Morning, daily, 8 glasses",
			}),
			"accessibilityAction",
			{ nativeEvent: { actionName: "Archive" } },
		);
		expect(mockArchive).toHaveBeenCalledWith(water);
	});
});

describe("HabitsScreen — search (H2, H3)", () => {
	async function search(text: string) {
		await renderScreen();
		await fireEvent.changeText(screen.getByLabelText("Search habits"), text);
	}

	it("matches active and archived habits and splits them by status", async () => {
		await search("run");
		expect(screen.getByText("ARCHIVED · 1")).toBeTruthy();
		expect(screen.getByText("Training · archived 12 Oct")).toBeTruthy();
		expect(screen.queryByText("ACTIVE · 3")).toBeNull();
		await fireEvent.press(
			screen.getByRole("button", { name: "Restore Morning run" }),
		);
		expect(mockRestore).toHaveBeenCalledWith(run);
	});

	it("hides the library, the archived section and Categories while there is a query", async () => {
		await search("glass");
		expect(screen.getByText("ACTIVE · 1")).toBeTruthy();
		expect(screen.queryByText("EVENING")).toBeNull();
		expect(screen.queryByRole("button", { name: "Categories, 12" })).toBeNull();
	});

	it("nothing matching says what was searched and offers Add with the name filled in", async () => {
		await search("yoga");
		expect(screen.getByText("No habits match “yoga”")).toBeTruthy();
		await fireEvent.press(screen.getByText("Add “Yoga” as a habit"));
		expect(mockPush).toHaveBeenCalledWith({
			pathname: "/new-habit",
			params: { name: "Yoga" },
		});
	});

	it("Cancel clears the query and brings the library back", async () => {
		await search("run");
		await fireEvent.press(screen.getByRole("button", { name: "Cancel" }));
		expect(screen.getByText("ACTIVE · 3")).toBeTruthy();
	});
});

describe("HabitsScreen — Reorder (H4)", () => {
	it("starts from the Active header: the grips appear, with Done instead of the gear and +", async () => {
		await renderScreen();
		expect(screen.queryByTestId("drag-handle")).toBeNull();
		await fireEvent.press(
			screen.getByRole("button", { name: "Reorder habits" }),
		);
		expect(screen.getAllByTestId("drag-handle")).toHaveLength(3);
		expect(screen.getByText("REORDER · DRAG WITHIN A CATEGORY")).toBeTruthy();
		expect(
			screen.getByText(
				"Habits move within their category. To change a category, use Edit.",
			),
		).toBeTruthy();
		expect(screen.queryByRole("button", { name: "Settings" })).toBeNull();
		expect(screen.queryByLabelText("Search habits")).toBeNull();
	});

	it("Done leaves reorder mode", async () => {
		await renderScreen();
		await fireEvent.press(
			screen.getByRole("button", { name: "Reorder habits" }),
		);
		await fireEvent.press(screen.getAllByRole("button", { name: "Done" })[0]);
		expect(screen.queryByTestId("drag-handle")).toBeNull();
		expect(screen.getByText("ACTIVE · 3")).toBeTruthy();
	});

	it("saves a reorder for the moved habit's category only (Move up on a grip)", async () => {
		await renderScreen();
		await fireEvent.press(
			screen.getByRole("button", { name: "Reorder habits" }),
		);
		await fireEvent(
			screen.getByLabelText("Reorder Meditate"),
			"accessibilityAction",
			{ nativeEvent: { actionName: "moveUp" } },
		);
		expect(mockReorder).toHaveBeenCalledWith([2, 1]);
	});

	it("can't move a habit across categories: Move down off the end of its card does nothing", async () => {
		await renderScreen();
		await fireEvent.press(
			screen.getByRole("button", { name: "Reorder habits" }),
		);
		await fireEvent(
			screen.getByLabelText("Reorder Meditate"),
			"accessibilityAction",
			{ nativeEvent: { actionName: "moveDown" } },
		);
		expect(mockReorder).not.toHaveBeenCalled();
	});

	it("a row's VoiceOver Reorder action starts it too", async () => {
		await renderScreen();
		await fireEvent(
			screen.getByRole("button", {
				name: "Glass of water, Morning, daily, 8 glasses",
			}),
			"accessibilityAction",
			{ nativeEvent: { actionName: "Reorder" } },
		);
		expect(screen.getAllByTestId("drag-handle")).toHaveLength(3);
	});
});

describe("HabitsScreen — empty states (H6)", () => {
	it("no habits at all: the empty state with Add habit, and Categories still reachable", async () => {
		mockLibrary = libraryOf([]);
		await renderScreen();
		expect(screen.getByText("NO HABITS")).toBeTruthy();
		expect(screen.getByText("No habits yet")).toBeTruthy();
		expect(screen.queryByLabelText("Search habits")).toBeNull();
		await fireEvent.press(screen.getAllByText("Add habit").at(-1) as never);
		expect(mockPush).toHaveBeenCalledWith("/new-habit");
		expect(screen.getByRole("button", { name: "Categories, 12" })).toBeTruthy();
	});

	it("hides the suggestions link until the suggestions exist (HAB-46)", async () => {
		mockLibrary = libraryOf([]);
		await renderScreen();
		expect(screen.queryByText(/suggestion/i)).toBeNull();
	});

	it("everything archived: says so and keeps Restore within reach", async () => {
		mockLibrary = libraryOf([], [run]);
		await renderScreen();
		expect(screen.getByText("No active habits")).toBeTruthy();
		expect(screen.getByText("ARCHIVED · 1")).toBeTruthy();
		expect(screen.queryByTestId("drag-handle")).toBeNull();
	});
});
