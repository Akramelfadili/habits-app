import { fireEvent, render, screen } from "@testing-library/react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { groupHabitsByCategory } from "../../presenters/today-screen-helpers";
import { builtInCategory, makeHabit } from "../../test-support/habit-builder";
import { HabitsLibrary } from "./habits-library";

jest.mock("expo-symbols", () => {
	const { View } = require("react-native");
	return { SymbolView: View };
});

const water = makeHabit({
	id: 1,
	name: "Drink water",
	category: builtInCategory("Health"),
	targetType: "quantity",
	targetAmount: 8,
	targetUnit: "glasses",
});
const shower = makeHabit({
	id: 2,
	name: "Cold shower",
	category: builtInCategory("Health"),
	frequency: { type: "per-week", timesPerWeek: 3 },
});
const upper = makeHabit({
	id: 3,
	name: "Upper body",
	category: builtInCategory("Fitness"),
	frequency: { type: "weekdays", days: [2, 4] },
});

const groups = groupHabitsByCategory([water, shower, upper], []);

function renderLibrary(
	props: Partial<React.ComponentProps<typeof HabitsLibrary>> = {},
) {
	const handlers = {
		onStartReorder: jest.fn(),
		onReorder: jest.fn(),
		onOpen: jest.fn(),
		onArchive: jest.fn(),
	};
	return render(
		<HabitsLibrary
			groups={groups}
			active={groups.flatMap((group) => group.habits)}
			streakByHabitId={new Map([[3, 9]])}
			reordering={false}
			{...handlers}
			{...props}
		/>,
		{ wrapper: GestureHandlerRootView },
	).then(() => handlers);
}

describe("HabitsLibrary", () => {
	it("heads the list with the count and Reorder, and groups the habits by category", async () => {
		await renderLibrary();
		expect(screen.getByText("ACTIVE · 3")).toBeTruthy();
		expect(screen.getByText("HEALTH")).toBeTruthy();
		expect(screen.getByText("FITNESS")).toBeTruthy();
		expect(screen.getByText("Daily · 8 glasses")).toBeTruthy();
		expect(screen.getByText("3× per week")).toBeTruthy();
		expect(screen.getByText("Tue, Thu")).toBeTruthy();
	});

	it("opens a habit from its row", async () => {
		const { onOpen } = await renderLibrary();
		await fireEvent.press(
			screen.getByRole("button", { name: /^Cold shower, Health/ }),
		);
		expect(onOpen).toHaveBeenCalledWith(shower);
	});

	it("starts Reorder from the header or a row's VoiceOver action", async () => {
		const { onStartReorder } = await renderLibrary();
		await fireEvent.press(
			screen.getByRole("button", { name: "Reorder habits" }),
		);
		expect(onStartReorder).toHaveBeenCalledTimes(1);
		await fireEvent(
			screen.getByRole("button", { name: /^Cold shower, Health/ }),
			"accessibilityAction",
			{ nativeEvent: { actionName: "Reorder" } },
		);
		expect(onStartReorder).toHaveBeenCalledTimes(2);
	});

	it("archives from a row's VoiceOver action", async () => {
		const { onArchive } = await renderLibrary();
		await fireEvent(
			screen.getByRole("button", { name: /^Cold shower, Health/ }),
			"accessibilityAction",
			{ nativeEvent: { actionName: "Archive" } },
		);
		expect(onArchive).toHaveBeenCalledWith(shower);
	});

	describe("reordering (H4)", () => {
		it("shows a grip on every row instead of the chevron, and the hint, but not the header", async () => {
			await renderLibrary({ reordering: true });
			expect(screen.getAllByTestId("drag-handle")).toHaveLength(3);
			expect(
				screen.getByText(
					"Habits move within their category. To change a category, use Edit.",
				),
			).toBeTruthy();
			expect(screen.queryByText("ACTIVE · 3")).toBeNull();
		});

		it("a grip's Move down within a category saves that category's new order", async () => {
			const { onReorder } = await renderLibrary({ reordering: true });
			await fireEvent(
				screen.getByLabelText("Reorder Drink water"),
				"accessibilityAction",
				{ nativeEvent: { actionName: "moveDown" } },
			);
			expect(onReorder).toHaveBeenCalledWith([2, 1]);
		});

		it("never moves a habit out of its category", async () => {
			const { onReorder } = await renderLibrary({ reordering: true });
			await fireEvent(
				screen.getByLabelText("Reorder Cold shower"),
				"accessibilityAction",
				{ nativeEvent: { actionName: "moveDown" } },
			);
			expect(onReorder).not.toHaveBeenCalled();
		});
	});
});
