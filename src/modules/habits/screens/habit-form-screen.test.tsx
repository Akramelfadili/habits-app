import {
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/react-native";
import { Keyboard, ScrollView, StyleSheet, TextInput } from "react-native";
import { useToastStore } from "@/store/toast-store";
import {
	categoryNamed,
	makeCategory,
	makeHabit,
	TEST_BUILT_IN_CATEGORIES,
} from "../test-support/habit-builder";
import type { Category, Habit } from "../types";

jest.mock("expo-symbols", () => {
	const { View } = require("react-native");
	return { SymbolView: View };
});

const mockBack = jest.fn();
jest.mock("expo-router", () => ({
	useRouter: () => ({ back: mockBack, push: jest.fn() }),
}));

jest.mock("expo-router/react-navigation", () => ({
	useHeaderHeight: () => 56,
}));

const mockArchiveHabit = jest.fn();
const mockRestoreHabit = jest.fn();
jest.mock("../hooks/use-habit-detail-actions", () => ({
	useHabitDetailActions: () => ({
		archiveHabitOrThrow: (...args: unknown[]) => mockArchiveHabit(...args),
		restoreHabit: (...args: unknown[]) => mockRestoreHabit(...args),
		isArchiving: false,
	}),
}));

const mockCreateHabit = jest.fn();
const mockUpdateHabit = jest.fn();
jest.mock("../hooks/use-habit-actions", () => ({
	useHabitActions: () => ({
		createHabit: (...args: unknown[]) => mockCreateHabit(...args),
		updateHabit: (...args: unknown[]) => mockUpdateHabit(...args),
		isCreating: false,
		isUpdating: false,
		createError: null,
		updateError: null,
	}),
}));

let mockHabits: Habit[] = [];
jest.mock("../hooks/use-habit-queries", () => ({
	useHabitQueries: () => ({
		habits: mockHabits,
		getHabitById: (id: number) => mockHabits.find((habit) => habit.id === id),
	}),
}));

let mockCategories: Category[] = [];
jest.mock("../hooks/use-category-queries", () => ({
	useCategoryQueries: () => ({ categories: mockCategories }),
}));

const mockCreateCategory = jest.fn();
jest.mock("../hooks/use-category-actions", () => ({
	useCategoryActions: () => ({
		createCategory: (...args: unknown[]) => mockCreateCategory(...args),
		isCreating: false,
		createError: null,
	}),
}));

import { HabitFormScreen } from "./habit-form-screen";

const existingHabit = makeHabit({
	name: "Gym",
	category: categoryNamed("Morning"),
	frequency: { type: "weekdays", days: [1, 3, 5] },
});

const MORNING = categoryNamed("Morning");

const isSaveDisabled = () =>
	screen.getByText("Save habit").parent?.props.accessibilityState.disabled;
// Category chips report `selected`; weekday chips are checkboxes and report `checked`.
const isSelected = (label: string) => {
	const state = screen.getByLabelText(label).props.accessibilityState;
	return state.selected ?? state.checked;
};

async function pickCategory(name: string) {
	await fireEvent.press(screen.getByLabelText(name));
}

beforeEach(() => {
	mockCategories = [...TEST_BUILT_IN_CATEGORIES, MORNING];
	mockCreateCategory.mockReset();
});

// jest's window reports fontScale 2, i.e. accessibility sizes, where a segmented control stacks:
// these tests are about the standard layout.
jest.mock("@/utils/use-accessibility-text-size", () => ({
	useAccessibilityTextSize: () => false,
}));

describe("HabitFormScreen — create mode", () => {
	beforeEach(() => {
		mockBack.mockReset();
		mockCreateHabit.mockReset().mockResolvedValue(existingHabit);
		mockUpdateHabit.mockReset();
		mockHabits = [];
	});

	it("disables Save until a name and a category are both set", async () => {
		await render(<HabitFormScreen />);
		expect(isSaveDisabled()).toBe(true);

		await fireEvent.changeText(screen.getAllByDisplayValue("")[0], "Read");
		expect(isSaveDisabled()).toBe(true);

		await pickCategory("Learning");
		expect(isSaveDisabled()).toBe(false);
	});

	it("explains one blocking reason at a time — the name's first (HAB-24)", async () => {
		await render(<HabitFormScreen />);
		expect(screen.getByText("Add a name to save this habit")).toBeTruthy();
		expect(screen.queryByText("Pick a category to save this habit")).toBeNull();

		await fireEvent.changeText(screen.getAllByDisplayValue("")[0], "Read");
		expect(screen.queryByText("Add a name to save this habit")).toBeNull();
		expect(screen.getByText("Pick a category to save this habit")).toBeTruthy();

		await pickCategory("Learning");
		expect(screen.queryByText("Pick a category to save this habit")).toBeNull();
	});

	describe("name field (HAB-22)", () => {
		const nameInput = () => screen.getByLabelText("Name");

		it("opens empty and focused, with an example placeholder and no counter (E5)", async () => {
			await render(<HabitFormScreen />);
			expect(nameInput().props.value).toBe("");
			expect(nameInput().props.placeholder).toBe("e.g. Drink a glass of water");
			expect(nameInput().props.autoFocus).toBe(true);
			expect(nameInput().props.maxLength).toBe(32);
			expect(screen.queryByText(/ \/ 32$/)).toBeNull();
			expect(isSaveDisabled()).toBe(true);
		});

		it("shows the counter only from 26 of 32 characters (E6)", async () => {
			await render(<HabitFormScreen />);
			await fireEvent.changeText(nameInput(), "a".repeat(25));
			expect(screen.queryByText("25 / 32")).toBeNull();

			await fireEvent.changeText(nameInput(), "a".repeat(26));
			expect(screen.getByText("26 / 32")).toBeTruthy();
		});

		it("trims a pasted over-limit name to 32 and still shows the at-limit counter", async () => {
			await render(<HabitFormScreen />);
			await fireEvent.changeText(nameInput(), "a".repeat(50));
			expect(nameInput().props.value).toBe("a".repeat(32));
			expect(screen.getByText("32 / 32")).toBeTruthy();
		});

		it("drops the helper line once a valid name exists and a category is picked", async () => {
			await render(<HabitFormScreen />);
			expect(screen.getByText("Add a name to save this habit")).toBeTruthy();

			await fireEvent.changeText(
				nameInput(),
				"Read twenty pages before coffee",
			);
			await pickCategory("Learning");
			expect(screen.queryByText("Add a name to save this habit")).toBeNull();
			expect(isSaveDisabled()).toBe(false);
		});
	});

	it("acts on a tap while the autofocused keyboard is up (HAB-22)", async () => {
		await render(<HabitFormScreen />);
		expect(
			screen.getByTestId("habit-form-scroll").props.keyboardShouldPersistTaps,
		).toBe("handled");
	});

	it("lists built-ins in their fixed order, then customs, then Add category last", async () => {
		await render(<HabitFormScreen />);
		const chips = screen
			.getAllByTestId("category-chip")
			.map((chip) => chip.props.accessibilityLabel);
		expect(chips).toEqual([
			...TEST_BUILT_IN_CATEGORIES.map((c) => c.name),
			"Morning",
			"Add category",
		]);
	});

	it("selects one category at a time and shows it in the card header", async () => {
		await render(<HabitFormScreen />);
		expect(screen.getByText("Sets the habit's icon & colour")).toBeTruthy();

		await pickCategory("Learning");
		expect(isSelected("Learning")).toBe(true);
		expect(screen.queryByText("Sets the habit's icon & colour")).toBeNull();

		await pickCategory("Fitness");
		expect(isSelected("Fitness")).toBe(true);
		expect(isSelected("Learning")).toBe(false);
	});

	it("keeps the category selected when its chip is tapped again", async () => {
		await render(<HabitFormScreen />);
		await pickCategory("Learning");
		await pickCategory("Learning");
		expect(isSelected("Learning")).toBe(true);
	});

	it("creates the habit with a trimmed name and the picked category's id", async () => {
		await render(<HabitFormScreen />);

		await fireEvent.changeText(screen.getAllByDisplayValue("")[0], "  Read  ");
		await pickCategory("Morning");
		await fireEvent.press(screen.getByText("Save habit"));

		await waitFor(() => expect(mockCreateHabit).toHaveBeenCalledTimes(1));
		expect(mockCreateHabit).toHaveBeenCalledWith(
			expect.objectContaining({
				name: "Read",
				categoryId: MORNING.id,
				direction: "build",
				targetType: "simple",
				frequency: { type: "daily" },
			}),
		);
		expect(mockBack).toHaveBeenCalledTimes(1);
	});

	it("a failed create shows an inline error, stays on the form, and a retry works", async () => {
		mockCreateHabit.mockRejectedValueOnce(new Error("disk full"));
		await render(<HabitFormScreen />);

		await fireEvent.changeText(screen.getAllByDisplayValue("")[0], "Read");
		await pickCategory("Morning");
		await fireEvent.press(screen.getByText("Save habit"));

		expect(
			await screen.findByText("Couldn't save this habit. Try again."),
		).toBeTruthy();
		expect(mockBack).not.toHaveBeenCalled();
		expect(screen.getByText("Save habit")).toBeTruthy();

		await fireEvent.press(screen.getByText("Save habit"));
		await waitFor(() => expect(mockBack).toHaveBeenCalledTimes(1));
		expect(mockCreateHabit).toHaveBeenCalledTimes(2);
		expect(
			screen.queryByText("Couldn't save this habit. Try again."),
		).toBeNull();
	});

	it("draws a hairline above Save only once the form is scrolled (F1c)", async () => {
		await render(<HabitFormScreen />);
		const footerBorder = () =>
			StyleSheet.flatten(screen.getByTestId("habit-form-footer").props.style)
				.borderTopWidth;
		const scrollTo = (y: number) =>
			fireEvent.scroll(screen.getByTestId("habit-form-scroll"), {
				nativeEvent: { contentOffset: { x: 0, y } },
			});

		expect(footerBorder()).toBeUndefined();
		await scrollTo(120);
		expect(footerBorder()).toBe(StyleSheet.hairlineWidth);
		await scrollTo(0);
		expect(footerBorder()).toBeUndefined();
	});

	describe("add category sheet", () => {
		const nameField = () => screen.getByPlaceholderText("e.g. Journaling");

		it("opens with Add disabled, explaining a name is needed, and a placeholder preview", async () => {
			await render(<HabitFormScreen />);
			await fireEvent.press(screen.getByLabelText("Add category"));

			expect(nameField()).toBeTruthy();
			expect(
				screen.getByText("Add a name to create this category"),
			).toBeTruthy();
			expect(screen.getByText("Your category")).toBeTruthy();
			expect(
				screen.getAllByText("Add category").at(-1)?.parent?.props
					.accessibilityState.disabled,
			).toBe(true);
		});

		it("previews the typed name live", async () => {
			await render(<HabitFormScreen />);
			await fireEvent.press(screen.getByLabelText("Add category"));
			await fireEvent.changeText(nameField(), "Journaling");

			expect(screen.getByTestId("category-preview")).toBeTruthy();
			expect(screen.getByText("Journaling")).toBeTruthy();
			expect(
				screen.queryByText("Add a name to create this category"),
			).toBeNull();
		});

		it("flags a duplicate of a built-in (any case/spacing), hides the preview, blocks Add", async () => {
			await render(<HabitFormScreen />);
			await fireEvent.press(screen.getByLabelText("Add category"));
			await fireEvent.changeText(nameField(), " fitness ");

			expect(
				screen.getByText(
					"You already have Fitness. Pick it from the list instead.",
				),
			).toBeTruthy();
			expect(screen.queryByTestId("category-preview")).toBeNull();
			expect(
				screen.getAllByText("Add category").at(-1)?.parent?.props
					.accessibilityState.disabled,
			).toBe(true);
		});

		it("creates with the previewed rotation pick, closes, and auto-selects the new chip", async () => {
			const journaling = makeCategory({
				id: 12,
				name: "Journaling",
				shape: "ring",
				hue: 330,
			});
			mockCreateCategory.mockImplementation(async () => {
				mockCategories = [...mockCategories, journaling];
				return journaling;
			});
			await render(<HabitFormScreen />);
			await fireEvent.press(screen.getByLabelText("Add category"));
			await fireEvent.changeText(nameField(), "Journaling");
			const [, addButton] = screen.getAllByText("Add category");
			await fireEvent.press(addButton);

			// Morning already sits on slot 1, so the next pick is slot 2.
			await waitFor(() =>
				expect(mockCreateCategory).toHaveBeenCalledWith({
					name: "Journaling",
					shape: "square",
					hue: 95,
				}),
			);
			await waitFor(() =>
				expect(screen.queryByPlaceholderText("e.g. Journaling")).toBeNull(),
			);
			expect(isSelected("Journaling")).toBe(true);
		});
	});

	it("shows the direction explanation caption in create mode too", async () => {
		await render(<HabitFormScreen />);
		expect(screen.getByText(/checking it off means you did it/)).toBeTruthy();
	});

	it("disables Quantity and resets it to Simple check when Direction switches to Break", async () => {
		await render(<HabitFormScreen />);

		await fireEvent.press(screen.getByText("Quantity"));
		expect(
			screen.getByText("Quantity").parent?.parent?.props.accessibilityState
				.selected,
		).toBe(true);

		await fireEvent.press(screen.getByText("Break"));

		await waitFor(() =>
			expect(
				screen.getByText("Simple check").parent?.parent?.props
					.accessibilityState.selected,
			).toBe(true),
		);
		expect(
			screen.getByText("Quantity").parent?.parent?.props.accessibilityState
				.disabled,
		).toBe(true);
		expect(
			screen.getByText(/quantity targets aren't available for Break/),
		).toBeTruthy();
	});

	it("saves a Break habit with targetType simple even if Quantity was picked first", async () => {
		await render(<HabitFormScreen />);

		await fireEvent.changeText(screen.getAllByDisplayValue("")[0], "No phone");
		await pickCategory("Health");
		await fireEvent.press(screen.getByText("Quantity"));
		await fireEvent.press(screen.getByText("Break"));
		await waitFor(() =>
			expect(
				screen.getByText("Simple check").parent?.parent?.props
					.accessibilityState.selected,
			).toBe(true),
		);

		await fireEvent.press(screen.getByText("Save habit"));
		await waitFor(() => expect(mockCreateHabit).toHaveBeenCalledTimes(1));
		expect(mockCreateHabit).toHaveBeenCalledWith(
			expect.objectContaining({ direction: "break", targetType: "simple" }),
		);
	});

	describe("keyboard (A5-13)", () => {
		afterEach(() => jest.restoreAllMocks());

		it("Return on Name only puts the keyboard away for a simple check — it never saves a half-filled form", async () => {
			const dismiss = jest
				.spyOn(Keyboard, "dismiss")
				.mockImplementation(() => {});
			await render(<HabitFormScreen />);
			const name = screen.getByLabelText("Name");
			expect(name.props.returnKeyType).toBe("done");

			await fireEvent(name, "submitEditing");

			expect(dismiss).toHaveBeenCalledTimes(1);
			expect(mockCreateHabit).not.toHaveBeenCalled();
		});

		it("Return on Name moves on to Unit for a quantity habit, with a 'Next' key and the keyboard kept up", async () => {
			const dismiss = jest
				.spyOn(Keyboard, "dismiss")
				.mockImplementation(() => {});
			const focus = jest
				.spyOn(TextInput.prototype, "focus")
				.mockImplementation(() => {});
			await render(<HabitFormScreen />);
			await fireEvent.press(screen.getByText("Quantity"));
			const name = screen.getByLabelText("Name");
			expect(name.props.returnKeyType).toBe("next");
			expect(name.props.submitBehavior).toBe("submit");

			await fireEvent(name, "submitEditing");

			expect(focus).toHaveBeenCalledTimes(1);
			expect(dismiss).not.toHaveBeenCalled();
		});

		it("Return on Unit puts the keyboard away, and focusing it scrolls it into view", async () => {
			const dismiss = jest
				.spyOn(Keyboard, "dismiss")
				.mockImplementation(() => {});
			await render(<HabitFormScreen />);
			await fireEvent.press(screen.getByText("Quantity"));
			const unit = screen.getByLabelText("Unit");
			expect(unit.props.returnKeyType).toBe("done");

			await fireEvent(unit, "submitEditing");
			expect(dismiss).toHaveBeenCalledTimes(1);

			const scrollToEnd = jest
				.spyOn(ScrollView.prototype, "scrollToEnd")
				.mockImplementation(() => {});
			await fireEvent(unit, "focus");
			expect(scrollToEnd).toHaveBeenCalledWith({ animated: true });
		});

		it("scrolling the form drags the keyboard away, and a chip tap still lands on the first tap", async () => {
			await render(<HabitFormScreen />);
			const scroll = screen.getByTestId("habit-form-scroll");
			expect(scroll.props.keyboardDismissMode).toBe("on-drag");
			expect(scroll.props.keyboardShouldPersistTaps).toBe("handled");
		});
	});

	it("reveals Amount and Unit fields when Quantity is selected", async () => {
		await render(<HabitFormScreen />);

		expect(screen.queryByPlaceholderText("glasses")).toBeNull();
		await fireEvent.press(screen.getByText("Quantity"));
		expect(screen.getByText("Amount")).toBeTruthy();
		expect(screen.getByPlaceholderText("glasses")).toBeTruthy();
	});

	it("blocks Save until a unit is entered for a Quantity habit", async () => {
		await render(<HabitFormScreen />);

		await fireEvent.changeText(screen.getAllByDisplayValue("")[0], "Water");
		await pickCategory("Health");
		expect(isSaveDisabled()).toBe(false);

		await fireEvent.press(screen.getByText("Quantity"));
		expect(isSaveDisabled()).toBe(true);

		await fireEvent.changeText(
			screen.getByPlaceholderText("glasses"),
			"glasses",
		);
		expect(isSaveDisabled()).toBe(false);
	});

	it("creates a Quantity habit with its amount and unit", async () => {
		await render(<HabitFormScreen />);

		await fireEvent.changeText(screen.getAllByDisplayValue("")[0], "Water");
		await pickCategory("Health");
		await fireEvent.press(screen.getByText("Quantity"));
		await fireEvent.changeText(
			screen.getByPlaceholderText("glasses"),
			"glasses",
		);
		await fireEvent.press(screen.getByLabelText("Increase target amount"));
		await fireEvent.press(screen.getByText("Save habit"));

		await waitFor(() => expect(mockCreateHabit).toHaveBeenCalledTimes(1));
		expect(mockCreateHabit).toHaveBeenCalledWith(
			expect.objectContaining({
				targetType: "quantity",
				targetAmount: 9,
				targetUnit: "glasses",
			}),
		);
	});

	it("clears amount and unit to null when Quantity is switched back to Simple check", async () => {
		await render(<HabitFormScreen />);

		await fireEvent.changeText(screen.getAllByDisplayValue("")[0], "Water");
		await pickCategory("Health");
		await fireEvent.press(screen.getByText("Quantity"));
		await fireEvent.changeText(
			screen.getByPlaceholderText("glasses"),
			"glasses",
		);
		await fireEvent.press(screen.getByText("Simple check"));
		await fireEvent.press(screen.getByText("Save habit"));

		await waitFor(() => expect(mockCreateHabit).toHaveBeenCalledTimes(1));
		expect(mockCreateHabit).toHaveBeenCalledWith(
			expect.objectContaining({
				targetType: "simple",
				targetAmount: null,
				targetUnit: null,
			}),
		);
	});
});

describe("HabitFormScreen — frequency", () => {
	beforeEach(() => {
		mockBack.mockReset();
		mockCreateHabit.mockReset().mockResolvedValue(existingHabit);
		mockHabits = [];
	});

	async function renderNamed() {
		await render(<HabitFormScreen />);
		await fireEvent.changeText(screen.getAllByDisplayValue("")[0], "Gym");
		await pickCategory("Fitness");
	}

	it("offers all three modes, defaulting to Daily with no day picker", async () => {
		await render(<HabitFormScreen />);

		expect(
			screen.getByText("Daily").parent?.parent?.props.accessibilityState
				.selected,
		).toBe(true);
		expect(screen.getByText("Specific weekdays")).toBeTruthy();
		expect(screen.getByText("X per week")).toBeTruthy();
		expect(screen.queryByLabelText("Monday")).toBeNull();
	});

	it("blocks Save with an inline message when Specific weekdays has no days", async () => {
		await renderNamed();
		expect(isSaveDisabled()).toBe(false);

		await fireEvent.press(screen.getByText("Specific weekdays"));
		expect(isSaveDisabled()).toBe(true);
		expect(screen.getByText("Pick at least one day.")).toBeTruthy();

		await fireEvent.press(screen.getByLabelText("Wednesday"));
		expect(isSaveDisabled()).toBe(false);
		expect(screen.queryByText("Pick at least one day.")).toBeNull();
	});

	it("Weekdays shortcut pre-fills Mon–Fri, which stay individually editable", async () => {
		await renderNamed();
		await fireEvent.press(screen.getByText("Specific weekdays"));
		await fireEvent.press(screen.getByText("Weekdays shortcut"));

		expect(
			["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"].every(
				isSelected,
			),
		).toBe(true);
		expect(isSelected("Saturday")).toBe(false);

		await fireEvent.press(screen.getByLabelText("Tuesday"));
		await fireEvent.press(screen.getByLabelText("Sunday"));
		expect(
			screen.getByText("Specific weekdays").parent?.parent?.props
				.accessibilityState.selected,
		).toBe(true);

		await fireEvent.press(screen.getByText("Save habit"));
		await waitFor(() => expect(mockCreateHabit).toHaveBeenCalledTimes(1));
		expect(mockCreateHabit).toHaveBeenCalledWith(
			expect.objectContaining({
				frequency: { type: "weekdays", days: [1, 3, 4, 5, 7] },
			}),
		);
	});

	it("saves an X-per-week count from the stepper", async () => {
		await renderNamed();
		await fireEvent.press(screen.getByText("X per week"));

		expect(screen.getByText("3")).toBeTruthy();
		await fireEvent.press(screen.getByLabelText("Increase times per week"));
		await fireEvent.press(screen.getByText("Save habit"));

		await waitFor(() => expect(mockCreateHabit).toHaveBeenCalledTimes(1));
		expect(mockCreateHabit).toHaveBeenCalledWith(
			expect.objectContaining({
				frequency: { type: "per-week", timesPerWeek: 4 },
			}),
		);
	});
});

describe("HabitFormScreen — edit mode", () => {
	beforeEach(() => {
		mockBack.mockReset();
		mockCreateHabit.mockReset();
		mockUpdateHabit.mockReset().mockResolvedValue(existingHabit);
		mockHabits = [existingHabit];
	});

	it("pre-fills the form from the existing habit", async () => {
		await render(<HabitFormScreen habitId={1} />);
		await waitFor(() => expect(screen.getByDisplayValue("Gym")).toBeTruthy());
		expect(isSelected("Morning")).toBe(true);
		expect(
			screen.getByText("Specific weekdays").parent?.parent?.props
				.accessibilityState.selected,
		).toBe(true);
		expect(
			["Monday", "Tuesday", "Wednesday", "Friday"].map(isSelected),
		).toEqual([true, false, true, true]);
	});

	it("lets frequency change in edit mode", async () => {
		await render(<HabitFormScreen habitId={1} />);
		await waitFor(() => expect(screen.getByDisplayValue("Gym")).toBeTruthy());

		await fireEvent.press(screen.getByText("Daily"));
		await fireEvent.press(screen.getByText("Save habit"));

		await waitFor(() => expect(mockUpdateHabit).toHaveBeenCalledTimes(1));
		expect(mockUpdateHabit).toHaveBeenCalledWith(
			1,
			expect.objectContaining({ frequency: { type: "daily" } }),
		);
	});

	describe("Archive at the foot (HAB-17, A5-01)", () => {
		beforeEach(() => {
			mockArchiveHabit.mockReset().mockResolvedValue(undefined);
			mockRestoreHabit.mockReset().mockResolvedValue(undefined);
			useToastStore.setState({ toast: null });
		});

		it("is offered in edit mode only, and not for an archived habit", async () => {
			await render(<HabitFormScreen />);
			expect(screen.queryByTestId("action-card")).toBeNull();
		});

		it("is not offered once the habit is already archived", async () => {
			mockHabits = [
				makeHabit({ ...existingHabit, archivedAt: new Date(2026, 8, 2) }),
			];
			await render(<HabitFormScreen habitId={1} />);
			await waitFor(() => expect(screen.getByDisplayValue("Gym")).toBeTruthy());
			expect(screen.queryByTestId("action-card")).toBeNull();
		});

		it("archives in one tap, closes the form and leaves an Undo toast that restores the habit", async () => {
			await render(<HabitFormScreen habitId={1} />);
			await waitFor(() => expect(screen.getByDisplayValue("Gym")).toBeTruthy());

			await fireEvent.press(screen.getByTestId("action-card"));

			await waitFor(() => expect(mockArchiveHabit).toHaveBeenCalledWith(1));
			expect(mockBack).toHaveBeenCalledTimes(1);
			const toast = useToastStore.getState().toast;
			expect(toast?.message).toBe("Archived 'Gym'");
			expect(toast?.actionLabel).toBe("Undo");
			toast?.onAction?.();
			expect(mockRestoreHabit).toHaveBeenCalledWith(1);
		});

		it("stays open and says so inline when archiving fails", async () => {
			mockArchiveHabit.mockRejectedValue(new Error("db locked"));
			await render(<HabitFormScreen habitId={1} />);
			await waitFor(() => expect(screen.getByDisplayValue("Gym")).toBeTruthy());

			await fireEvent.press(screen.getByTestId("action-card"));

			await waitFor(() =>
				expect(
					screen.getByText("Couldn't archive this habit. Try again."),
				).toBeTruthy(),
			);
			expect(mockBack).not.toHaveBeenCalled();
			expect(useToastStore.getState().toast).toBeNull();
		});
	});

	it("doesn't autofocus the name in edit mode (HAB-22)", async () => {
		await render(<HabitFormScreen habitId={1} />);
		await waitFor(() => expect(screen.getByDisplayValue("Gym")).toBeTruthy());
		expect(screen.getByLabelText("Name").props.autoFocus).toBe(false);
	});

	describe("legacy V1 name over 32 (HAB-22)", () => {
		const legacyName = "Read twenty pages before a morning tea"; // 38
		beforeEach(() => {
			mockHabits = [makeHabit({ id: 3, name: legacyName, category: MORNING })];
		});

		it("saves other fields with the name left unchanged, showing its real count", async () => {
			await render(<HabitFormScreen habitId={3} />);
			await waitFor(() =>
				expect(screen.getByDisplayValue(legacyName)).toBeTruthy(),
			);
			expect(screen.getByText("38 / 32")).toBeTruthy();
			expect(isSaveDisabled()).toBe(false);

			await fireEvent.press(screen.getByText("Daily"));
			await fireEvent.press(screen.getByText("Save habit"));
			await waitFor(() => expect(mockUpdateHabit).toHaveBeenCalledTimes(1));
			expect(mockUpdateHabit).toHaveBeenCalledWith(
				3,
				expect.objectContaining({ name: legacyName }),
			);
		});

		it("blocks Save once the name is edited but still over 32", async () => {
			await render(<HabitFormScreen habitId={3} />);
			await waitFor(() =>
				expect(screen.getByDisplayValue(legacyName)).toBeTruthy(),
			);
			await fireEvent.changeText(
				screen.getByDisplayValue(legacyName),
				legacyName.slice(0, 35),
			);
			expect(screen.getByDisplayValue(legacyName.slice(0, 35))).toBeTruthy();
			expect(isSaveDisabled()).toBe(true);
			expect(
				screen.getByText("Shorten the name to 32 characters to save"),
			).toBeTruthy();
		});

		it("saves once the name is edited down to 32", async () => {
			await render(<HabitFormScreen habitId={3} />);
			await waitFor(() =>
				expect(screen.getByDisplayValue(legacyName)).toBeTruthy(),
			);
			const shortened = legacyName.slice(0, 32);
			await fireEvent.changeText(
				screen.getByDisplayValue(legacyName),
				shortened,
			);
			expect(isSaveDisabled()).toBe(false);

			await fireEvent.press(screen.getByText("Save habit"));
			await waitFor(() => expect(mockUpdateHabit).toHaveBeenCalledTimes(1));
			expect(mockUpdateHabit).toHaveBeenCalledWith(
				3,
				expect.objectContaining({ name: shortened.trim() }),
			);
		});
	});

	it("locks Direction and shows the explanatory caption", async () => {
		await render(<HabitFormScreen habitId={1} />);
		await waitFor(() => expect(screen.getByDisplayValue("Gym")).toBeTruthy());

		expect(screen.getByText(/checking it off means you did it/)).toBeTruthy();
		expect(
			screen.getByText("Break").parent?.parent?.props.accessibilityState
				.disabled,
		).toBe(true);
	});

	it("pre-fills Amount and Unit from an existing Quantity habit", async () => {
		const quantityHabit = makeHabit({
			id: 2,
			name: "Read before bed",
			targetType: "quantity",
			targetAmount: 20,
			targetUnit: "pages",
		});
		mockHabits = [quantityHabit];

		await render(<HabitFormScreen habitId={2} />);
		await waitFor(() =>
			expect(screen.getByDisplayValue("Read before bed")).toBeTruthy(),
		);
		expect(screen.getByText("20")).toBeTruthy();
		expect(screen.getByDisplayValue("pages")).toBeTruthy();
	});

	it("updates the habit without touching direction", async () => {
		await render(<HabitFormScreen habitId={1} />);
		await waitFor(() => expect(screen.getByDisplayValue("Gym")).toBeTruthy());

		await fireEvent.changeText(screen.getByDisplayValue("Gym"), "Gym session");
		await fireEvent.press(screen.getByText("Save habit"));

		await waitFor(() => expect(mockUpdateHabit).toHaveBeenCalledTimes(1));
		expect(mockUpdateHabit).toHaveBeenCalledWith(
			1,
			expect.objectContaining({
				name: "Gym session",
				categoryId: MORNING.id,
				targetType: "simple",
			}),
		);
		expect(mockBack).toHaveBeenCalledTimes(1);
	});
});

describe("HabitFormScreen — focus=frequency (HAB-16)", () => {
	function scrollSpy() {
		const spy = jest.fn();
		const { ScrollView } = require("react-native");
		jest
			.spyOn(ScrollView.prototype, "scrollTo")
			.mockImplementation(spy as never);
		return spy;
	}

	beforeEach(() => {
		mockCategories = TEST_BUILT_IN_CATEGORIES;
		mockHabits = [existingHabit];
	});
	afterEach(() => jest.restoreAllMocks());

	it("scrolls to the Frequency section once, when it lays out", async () => {
		const spy = scrollSpy();
		await render(<HabitFormScreen habitId={1} focus="frequency" />);
		const frequency = screen.getByTestId("habit-form-frequency");
		await fireEvent(frequency, "layout", {
			nativeEvent: { layout: { x: 0, y: 420, width: 300, height: 120 } },
		});
		expect(spy).toHaveBeenCalledWith({ y: 412, animated: false });

		await fireEvent(frequency, "layout", {
			nativeEvent: { layout: { x: 0, y: 500, width: 300, height: 120 } },
		});
		expect(spy).toHaveBeenCalledTimes(1);
	});

	it("stays at the top without a focus", async () => {
		const spy = scrollSpy();
		await render(<HabitFormScreen habitId={1} />);
		await fireEvent(screen.getByTestId("habit-form-frequency"), "layout", {
			nativeEvent: { layout: { x: 0, y: 420, width: 300, height: 120 } },
		});
		expect(spy).not.toHaveBeenCalled();
	});
});
