import { fireEvent, render, screen } from "@testing-library/react-native";
import type { ManageHabitsView } from "../hooks/use-manage-habits-queries";
import { categoryNamed, makeHabit } from "../test-support/habit-builder";

jest.mock("expo-symbols", () => {
	const { View } = require("react-native");
	return { SymbolView: View };
});
const mockPush = jest.fn();
const mockBack = jest.fn();
jest.mock("expo-router", () => ({
	useRouter: () => ({ push: mockPush, back: mockBack }),
}));

let mockView: ManageHabitsView = { active: [], archived: [] };
jest.mock("../hooks/use-manage-habits-queries", () => ({
	useManageHabitsQueries: () => mockView,
}));
const mockReorder = jest.fn();
const mockArchive = jest.fn();
const mockRestore = jest.fn();
jest.mock("../hooks/use-manage-habits-actions", () => ({
	useManageHabitsActions: () => ({
		reorderHabits: mockReorder,
		archiveHabit: mockArchive,
		restoreHabit: mockRestore,
		isRestoring: false,
	}),
}));

import { useToastStore } from "@/store/toast-store";
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
	mockArchive.mockResolvedValue(undefined);
	mockRestore.mockResolvedValue(undefined);
	mockReorder.mockResolvedValue(undefined);
	mockView = {
		active: [water, meditate, read],
		archived: [{ habit: coldShower, logsKept: 41 }],
	};
});

describe("ManageHabitsScreen", () => {
	it("lists active habits with grips, and archived ones with Restore", async () => {
		await render(<ManageHabitsScreen />);

		expect(screen.getByText("Manage habits")).toBeTruthy();
		expect(screen.getAllByText("Morning · daily")).toHaveLength(2);
		expect(screen.getByText("Evening · 5× a week")).toBeTruthy();
		expect(screen.getAllByTestId("drag-handle")).toHaveLength(3);
		expect(screen.getByText("Archived · 1")).toBeTruthy();
		expect(screen.getByText("2 Sep · 41 days logged")).toBeTruthy();
		expect(screen.getByText("Restore")).toBeTruthy();
	});

	it("offers no delete anywhere on this screen", async () => {
		await render(<ManageHabitsScreen />);
		expect(screen.queryByText(/^Delete/)).toBeNull();
	});

	it("saves a reorder for the moved habit's category only", async () => {
		await render(<ManageHabitsScreen />);

		await fireEvent(
			screen.getByLabelText("Reorder Meditate"),
			"accessibilityAction",
			{
				nativeEvent: { actionName: "moveUp" },
			},
		);

		expect(mockReorder).toHaveBeenCalledWith([2, 1]);
	});

	it("archives from the row's swipe action and offers Undo", async () => {
		await render(<ManageHabitsScreen />);

		await fireEvent.press(screen.getAllByText("Archive")[0]);

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
		await render(<ManageHabitsScreen />);

		await fireEvent.press(screen.getByText("Restore"));

		expect(mockRestore).toHaveBeenCalledWith(6);
		expect(useToastStore.getState().toast?.message).toBe(
			"Restored 'Cold shower' — back on Today",
		);
	});

	it("opens a habit's detail — including an archived one's history", async () => {
		await render(<ManageHabitsScreen />);

		await fireEvent.press(screen.getByText("Cold shower"));

		expect(mockPush).toHaveBeenCalledWith("/habits/6");
	});

	it("is a pushed screen titled after its link — back in the header, no Done (audit #10)", async () => {
		await render(<ManageHabitsScreen />);
		expect(screen.getByRole("header", { name: "Manage habits" })).toBeTruthy();
		expect(screen.queryByText("Done")).toBeNull();
	});

	it("hides the Archived section when nothing is archived", async () => {
		mockView = { active: [water], archived: [] };
		await render(<ManageHabitsScreen />);
		expect(screen.queryByText(/^Archived ·/)).toBeNull();
	});

	it("links to Manage Categories until Settings exists (HAB-25)", async () => {
		await render(<ManageHabitsScreen />);
		await fireEvent.press(screen.getByText("Categories"));
		expect(mockPush).toHaveBeenCalledWith("/habits/categories");
	});
});
