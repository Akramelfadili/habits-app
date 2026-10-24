import { fireEvent, render, screen } from "@testing-library/react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import type { ManageHabitsView } from "../hooks/use-manage-habits-queries";
import { groupHabitsByCategory } from "../presenters/today-screen-helpers";
import { categoryNamed, makeHabit } from "../test-support/habit-builder";
import type { Habit } from "../types";

jest.mock("expo-symbols", () => {
	const { View } = require("react-native");
	return { SymbolView: View };
});
const mockPush = jest.fn();
const mockBack = jest.fn();
jest.mock("expo-router", () => ({
	useRouter: () => ({ push: mockPush, back: mockBack }),
}));

function viewOf(
	active: Habit[],
	archived: ManageHabitsView["archived"] = [],
): ManageHabitsView {
	const groups = groupHabitsByCategory(active, []);
	return {
		active: groups.flatMap((g) => g.habits),
		groups,
		archived,
		isLoaded: true,
	};
}

let mockView: ManageHabitsView = viewOf([]);
jest.mock("../hooks/use-manage-habits-queries", () => ({
	useManageHabitsQueries: () => mockView,
}));
const mockReorder = jest.fn();
const mockArchive = jest.fn();
const mockRestore = jest.fn();
const mockUndoRestore = jest.fn();
jest.mock("../hooks/use-manage-habits-actions", () => ({
	useManageHabitsActions: () => ({
		reorderHabits: mockReorder,
		archiveHabit: mockArchive,
		restoreHabit: mockRestore,
		undoRestoreHabit: mockUndoRestore,
		isRestoring: false,
	}),
}));

import { useToastStore } from "@/store/toast-store";
import { MANAGE_FOOTNOTE } from "../presenters/manage-habits-helpers";
import { ManageHabitsScreen } from "./manage-habits-screen";

const water = makeHabit({
	id: 1,
	name: "Glass of water",
	category: categoryNamed("Morning"),
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
const coldShower = makeHabit({
	id: 6,
	name: "Cold shower",
	archivedAt: new Date(2026, 8, 2),
});

beforeEach(() => {
	jest.clearAllMocks();
	useToastStore.setState({ toast: null });
	mockArchive.mockResolvedValue({ ok: true, value: undefined });
	mockRestore.mockResolvedValue({ ok: true, value: undefined });
	mockUndoRestore.mockReset().mockResolvedValue({ ok: true, value: undefined });
	mockReorder.mockResolvedValue({ ok: true, value: undefined });
	mockView = viewOf(
		[water, meditate, read],
		[{ habit: coldShower, logsKept: 41 }],
	);
});

describe("ManageHabitsScreen", () => {
	it("lists active habits with grips, and archived ones with Restore", async () => {
		await render(<ManageHabitsScreen />, { wrapper: GestureHandlerRootView });

		expect(screen.getByText("Habits")).toBeTruthy();
		expect(screen.getAllByText("Morning · daily")).toHaveLength(2);
		expect(screen.getByText("Evening · 5× a week")).toBeTruthy();
		expect(screen.getAllByTestId("drag-handle")).toHaveLength(3);
		expect(screen.getByText("Archived · 1")).toBeTruthy();
		expect(screen.getByText("Archived 2 Sep · 41 days logged")).toBeTruthy();
		expect(screen.getByText("Restore")).toBeTruthy();
	});

	it("offers no delete anywhere on this screen", async () => {
		await render(<ManageHabitsScreen />, { wrapper: GestureHandlerRootView });
		expect(screen.queryByText(/^Delete/)).toBeNull();
	});

	it("saves a reorder for the moved habit's category only", async () => {
		await render(<ManageHabitsScreen />, { wrapper: GestureHandlerRootView });

		await fireEvent(
			screen.getByLabelText("Reorder Meditate"),
			"accessibilityAction",
			{
				nativeEvent: { actionName: "moveUp" },
			},
		);

		expect(mockReorder).toHaveBeenCalledWith([2, 1]);
	});

	// The swipe's own Archive button can't be revealed under Jest (see
	// swipeable-row.test.tsx); the row's VoiceOver action runs the same handler.
	it("archives from the row's Archive action and offers Undo", async () => {
		await render(<ManageHabitsScreen />, { wrapper: GestureHandlerRootView });

		await fireEvent(screen.getByText("Glass of water"), "accessibilityAction", {
			nativeEvent: { actionName: "Archive" },
		});

		expect(mockArchive).toHaveBeenCalledWith(1);
		const toast = useToastStore.getState().toast;
		expect(toast).toMatchObject({
			message: "Archived 'Glass of water'",
			actionLabel: "Undo",
		});
		toast?.onAction?.();
		expect(mockRestore).toHaveBeenCalledWith(1);
	});

	it("restores an archived habit and confirms it's back on Today", async () => {
		await render(<ManageHabitsScreen />, { wrapper: GestureHandlerRootView });

		await fireEvent.press(screen.getByText("Restore"));

		expect(mockRestore).toHaveBeenCalledWith(6);
		expect(useToastStore.getState().toast?.message).toBe(
			"Restored 'Cold shower' — back on Today",
		);
	});

	it("Restore's toast has an Undo that re-archives it as it was (original date and pauses)", async () => {
		await render(<ManageHabitsScreen />, { wrapper: GestureHandlerRootView });
		await fireEvent.press(screen.getByText("Restore"));

		const toast = useToastStore.getState().toast;
		expect(toast?.actionLabel).toBe("Undo");
		toast?.onAction?.();

		const { habit } = mockView.archived[0];
		expect(mockUndoRestore).toHaveBeenCalledWith(6, {
			archivedAt: habit.archivedAt,
			pauses: habit.pauses,
		});
	});

	it("a failed Restore shows no Undo", async () => {
		mockRestore.mockResolvedValue({ ok: false });
		await render(<ManageHabitsScreen />, { wrapper: GestureHandlerRootView });
		await fireEvent.press(screen.getByText("Restore"));
		expect(useToastStore.getState().toast).toBeNull();
	});

	it("opens a habit's detail — including an archived one's history", async () => {
		await render(<ManageHabitsScreen />, { wrapper: GestureHandlerRootView });

		await fireEvent.press(screen.getByText("Cold shower"));

		expect(mockPush).toHaveBeenCalledWith("/habits/6");
	});

	it("is a pushed screen titled after its link — back in the header, no Done (audit #10)", async () => {
		await render(<ManageHabitsScreen />, { wrapper: GestureHandlerRootView });
		expect(screen.getByRole("header", { name: "Habits" })).toBeTruthy();
		expect(screen.queryByText("Done")).toBeNull();
	});

	it("E3: nothing archived keeps the Archived header over a dashed placeholder", async () => {
		mockView = viewOf([water]);
		await render(<ManageHabitsScreen />, { wrapper: GestureHandlerRootView });
		expect(screen.getByText("Archived")).toBeTruthy();
		expect(screen.queryByText(/^Archived ·/)).toBeNull();
		expect(screen.getByText("Nothing archived")).toBeTruthy();
		expect(screen.queryByText("Restore")).toBeNull();
	});

	it("headers each category with its habit count, in Today's order", async () => {
		const run = makeHabit({
			id: 4,
			name: "Easy run",
			category: categoryNamed("Training"),
		});
		mockView = viewOf([water, run, meditate]);
		await render(<ManageHabitsScreen />, { wrapper: GestureHandlerRootView });
		expect(screen.getByText("Morning")).toBeTruthy();
		expect(screen.getByText("2")).toBeTruthy();
		expect(screen.getByText("Training")).toBeTruthy();
		expect(screen.getByText("1")).toBeTruthy();
		expect(screen.getByText(MANAGE_FOOTNOTE)).toBeTruthy();
	});

	it("shows the outline tag only while a row is lifted, scoped to its category", async () => {
		await render(<ManageHabitsScreen />, { wrapper: GestureHandlerRootView });
		expect(screen.queryByText(/^Reordering within/)).toBeNull();
	});

	it("E2: everything archived replaces the categories with the empty card, Restore below", async () => {
		mockView = viewOf([], [{ habit: coldShower, logsKept: 41 }]);
		await render(<ManageHabitsScreen />, { wrapper: GestureHandlerRootView });
		expect(screen.getByText("No active habits")).toBeTruthy();
		expect(screen.getByText(/Everything is archived/)).toBeTruthy();
		expect(screen.queryByText(MANAGE_FOOTNOTE)).toBeNull();
		expect(screen.queryByTestId("drag-handle")).toBeNull();
		expect(screen.getByText("Restore")).toBeTruthy();

		await fireEvent.press(screen.getByText("Add habit"));
		expect(mockPush).toHaveBeenCalledWith("/new-habit");
	});

	it("no habits at all: the empty card doesn't claim anything was archived, and the placeholder shows", async () => {
		mockView = viewOf([]);
		await render(<ManageHabitsScreen />, { wrapper: GestureHandlerRootView });
		expect(screen.getByText("No active habits")).toBeTruthy();
		expect(screen.queryByText(/archived, so/)).toBeNull();
		expect(screen.getByText(/haven't added a habit/)).toBeTruthy();
		expect(screen.getByText("Nothing archived")).toBeTruthy();
	});

	it("drops a category's section as soon as its last habit is archived", async () => {
		const view = await render(<ManageHabitsScreen />, {
			wrapper: GestureHandlerRootView,
		});
		expect(screen.getByText("Evening")).toBeTruthy();

		mockView = viewOf([water, meditate], [{ habit: read, logsKept: 3 }]);
		await view.rerender(<ManageHabitsScreen />);

		expect(screen.queryByText("Evening")).toBeNull();
		expect(screen.getByText("Morning")).toBeTruthy();
	});

	it("keeps the VoiceOver Move up / Move down actions on every grip", async () => {
		await render(<ManageHabitsScreen />, { wrapper: GestureHandlerRootView });
		const grip = screen.getByLabelText("Reorder Meditate");
		expect(grip.props.accessibilityActions).toEqual([
			{ name: "moveUp", label: "Move up" },
			{ name: "moveDown", label: "Move down" },
		]);
	});

	it("can't move a habit across categories — Move down off the end of its card does nothing", async () => {
		await render(<ManageHabitsScreen />, { wrapper: GestureHandlerRootView });
		await fireEvent(
			screen.getByLabelText("Reorder Meditate"),
			"accessibilityAction",
			{ nativeEvent: { actionName: "moveDown" } },
		);
		expect(mockReorder).not.toHaveBeenCalled();
	});

	it("no longer carries the temporary Categories row — it lives in Settings (HAB-15)", async () => {
		await render(<ManageHabitsScreen />, { wrapper: GestureHandlerRootView });
		expect(screen.queryByText("Categories")).toBeNull();
	});
});

describe("loading and failed writes", () => {
	it("renders a neutral blank — not the empty state — until the lists load (A5-04)", async () => {
		mockView = { ...viewOf([]), isLoaded: false };
		await render(<ManageHabitsScreen />, { wrapper: GestureHandlerRootView });
		expect(screen.getByTestId("screen-loading")).toBeTruthy();
		expect(screen.queryByText("No active habits")).toBeNull();
	});

	it("a failed restore shows no 'back on Today' toast (the hook already toasted the error)", async () => {
		useToastStore.setState({ toast: null });
		mockRestore.mockResolvedValue({ ok: false, error: new Error("disk") });
		await render(<ManageHabitsScreen />, { wrapper: GestureHandlerRootView });

		await fireEvent.press(screen.getByText("Restore"));

		expect(useToastStore.getState().toast).toBeNull();
	});
});
