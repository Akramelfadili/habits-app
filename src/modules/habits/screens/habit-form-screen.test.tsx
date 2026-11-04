import {
	act,
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/react-native";
import { AccessibilityInfo } from "react-native";
import { useToastStore } from "@/store/toast-store";
import { useFirstRunOfferStore } from "../first-run-offer-store";
import {
	builtInCategory,
	categoryNamed,
	makeHabit,
	TEST_BUILT_IN_CATEGORIES,
} from "../test-support/habit-builder";
import type { Category, Habit } from "../types";

jest.mock("expo-symbols", () => {
	const { View } = require("react-native");
	return { SymbolView: View };
});

const mockBack = jest.fn();
const mockReplace = jest.fn();
const mockDismissAll = jest.fn();
type Removal = { data: { action: unknown } };
let mockPrevent = false;
let mockOnRemove: ((event: Removal) => void) | null = null;
const mockDispatch = jest.fn();
jest.mock("expo-router", () => ({
	useRouter: () => ({
		back: mockBack,
		push: jest.fn(),
		replace: (...args: unknown[]) => mockReplace(...args),
		dismissAll: () => mockDismissAll(),
		canDismiss: () => true,
	}),
	useNavigation: () => ({
		dispatch: (...args: unknown[]) => mockDispatch(...args),
		goBack: jest.fn(),
	}),
	usePreventRemove: (prevent: boolean, callback: (event: Removal) => void) => {
		mockPrevent = prevent;
		mockOnRemove = callback;
	},
}));

jest.mock("expo-router/react-navigation", () => ({
	useHeaderHeight: () => 56,
}));

jest.mock("@/utils/use-accessibility-text-size", () => ({
	useAccessibilityTextSize: () => false,
}));

const mockTimeWheel = jest.fn();
jest.mock("@/components/ui/primitives/time-wheel", () => ({
	TimeWheel: (props: { hour: number; minute: number }) => {
		mockTimeWheel(props);
		return null;
	},
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

const mockMarkFirstRunSeen = jest.fn();
jest.mock("../hooks/use-first-run-actions", () => ({
	useFirstRunActions: () => ({
		markFirstRunSeen: (...args: unknown[]) => mockMarkFirstRunSeen(...args),
	}),
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

const MORNING = categoryNamed("Morning");
const OTHER = builtInCategory("Other");
const LEARNING = builtInCategory("Learning");

const existingHabit = makeHabit({
	id: 1,
	name: "Gym",
	category: MORNING,
	frequency: { type: "weekdays", days: [1, 3, 5] },
});

const saveButton = () => screen.getByText(/^Save (habit|changes)$/).parent;
const isSaveDisabled = () => saveButton()?.props.accessibilityState.disabled;
const nameInput = () => screen.getByLabelText("Name");
const typeName = (text: string) => fireEvent.changeText(nameInput(), text);
// Category chips report `selected`; weekday chips are checkboxes and report `checked`.
type A11yState = { selected?: boolean; checked?: boolean; disabled?: boolean };
/** The nearest ancestor of the text that carries an accessibility state (segments, mode chips). */
function stateOfText(label: string): A11yState {
	type Node = {
		props: { accessibilityState?: A11yState };
		parent: Node | null;
	};
	let node: Node | null = screen.getByText(label) as unknown as Node;
	while (node && !node.props.accessibilityState) node = node.parent;
	return node?.props.accessibilityState ?? {};
}
const isSelected = (label: string) => {
	const direct = screen.queryByLabelText(label);
	const state: A11yState = direct
		? direct.props.accessibilityState
		: stateOfText(label);
	return state.selected ?? state.checked;
};
const isDisabled = (label: string) => stateOfText(label).disabled;

/** The navigator removing the screen (Close, a swipe, Android back): it reaches the guard only while it is preventing. */
async function tryToLeave(action: unknown = { type: "POP" }) {
	let prevented = false;
	await act(async () => {
		if (mockPrevent) {
			prevented = true;
			mockOnRemove?.({ data: { action } });
		}
	});
	return prevented;
}

beforeEach(() => {
	mockCategories = [...TEST_BUILT_IN_CATEGORIES, MORNING];
	mockHabits = [];
	mockBack.mockReset();
	mockReplace.mockReset();
	mockDismissAll.mockReset();
	mockMarkFirstRunSeen.mockReset().mockResolvedValue({ ok: true });
	useFirstRunOfferStore.getState().clear();
	mockDispatch.mockReset();
	mockCreateHabit
		.mockReset()
		.mockResolvedValue({ habit: existingHabit, remindersFailed: false });
	mockUpdateHabit.mockReset();
	mockCreateCategory.mockReset();
	mockTimeWheel.mockReset();
	useToastStore.setState({ toast: null } as never);
});

describe("HabitFormScreen — create", () => {
	it("lays out Type, Name, Category, Goal, Frequency, Reminders in that order", async () => {
		await render(<HabitFormScreen />);
		const labels = [
			"TYPE",
			"NAME",
			"CATEGORY",
			"GOAL",
			"FREQUENCY",
			"REMINDERS",
		];
		const found = labels.map((label) => screen.getByText(label));
		expect(found).toHaveLength(labels.length);
		// Source order = render order: each label appears after the previous one.
		const rendered = JSON.stringify(screen.toJSON());
		const positions = labels.map((label) => rendered.indexOf(`"${label}"`));
		expect(positions).toEqual([...positions].sort((a, b) => a - b));
	});

	it("needs only a name: Save is off with its reason until one is typed", async () => {
		await render(<HabitFormScreen />);
		expect(isSaveDisabled()).toBe(true);
		expect(screen.getByText("Add a name to save")).toBeTruthy();

		await typeName("Read");
		expect(isSaveDisabled()).toBe(false);
		expect(screen.queryByText("Add a name to save")).toBeNull();
	});

	it("a dimmed Save reads its reason as the hint, and drops it once the name is typed (08.3)", async () => {
		await render(<HabitFormScreen />);
		expect(saveButton()?.props.accessibilityHint).toBe("Add a name to save");
		await typeName("Read");
		expect(saveButton()?.props.accessibilityHint).toBeUndefined();
	});

	it("a name already taken is announced as an alert next to the field (08.3)", async () => {
		mockHabits = [existingHabit];
		await render(<HabitFormScreen />);
		await typeName("Gym");
		const alert = screen.getByRole("alert");
		expect(alert.props.accessibilityLabel).toMatch(/already have a habit/i);
	});

	it("saves with no category as Other, and offers no icon or colour picker", async () => {
		await render(<HabitFormScreen />);
		expect(screen.queryByText(/icon/i)).toBeNull();
		await typeName("  Read  ");
		await fireEvent.press(saveButton() as never);

		await waitFor(() => expect(mockCreateHabit).toHaveBeenCalled());
		expect(mockCreateHabit.mock.calls[0][0]).toEqual({
			name: "Read",
			categoryId: OTHER.id,
			direction: "build",
			targetType: "simple",
			targetAmount: null,
			targetUnit: null,
			frequency: { type: "daily" },
		});
		await waitFor(() => expect(mockBack).toHaveBeenCalled());
	});

	it("picks one category at a time, saves its id, and clears it with a second tap", async () => {
		await render(<HabitFormScreen />);
		await typeName("Read");
		await fireEvent.press(screen.getByLabelText("Learning"));
		expect(isSelected("Learning")).toBe(true);
		await fireEvent.press(screen.getByLabelText("Health"));
		expect(isSelected("Learning")).toBe(false);
		expect(isSelected("Health")).toBe(true);
		await fireEvent.press(screen.getByLabelText("Health"));
		expect(isSelected("Health")).toBe(false);

		await fireEvent.press(screen.getByLabelText("Learning"));
		await fireEvent.press(saveButton() as never);
		await waitFor(() => expect(mockCreateHabit).toHaveBeenCalled());
		expect(mockCreateHabit.mock.calls[0][0].categoryId).toBe(LEARNING.id);
	});

	it("says the category is optional and lists every category, then New category", async () => {
		await render(<HabitFormScreen />);
		expect(
			screen.getByText("Optional — habits without one go to Other."),
		).toBeTruthy();
		expect(screen.getByLabelText("Morning")).toBeTruthy();
		expect(screen.getByLabelText("New category")).toBeTruthy();
	});

	it("opens the add-category sheet from New category and selects the one created", async () => {
		const created = { ...MORNING, id: 99, name: "Journaling" };
		mockCreateCategory.mockResolvedValue(created);
		await render(<HabitFormScreen />);
		await fireEvent.press(screen.getByLabelText("New category"));
		const field = screen.getAllByLabelText("Name").at(-1);
		await fireEvent.changeText(field as never, "Journaling");
		await fireEvent.press(screen.getByText("Add category"));
		await waitFor(() => expect(mockCreateCategory).toHaveBeenCalled());
	});

	describe("name field", () => {
		it("opens empty with an example placeholder and no counter", async () => {
			await render(<HabitFormScreen />);
			expect(nameInput().props.placeholder).toBe("e.g. Drink water");
			expect(screen.queryByText(/ \/ 32$/)).toBeNull();
		});

		it("shows the counter from 26 of 32, and 'characters max' amber at the limit", async () => {
			await render(<HabitFormScreen />);
			await typeName("a".repeat(25));
			expect(screen.queryByText("25 / 32")).toBeNull();
			await typeName("a".repeat(26));
			expect(screen.getByText("26 / 32")).toBeTruthy();
			await typeName("a".repeat(32));
			expect(screen.getByText("32 characters max")).toBeTruthy();
		});

		it("trims a pasted over-limit name to 32", async () => {
			await render(<HabitFormScreen />);
			await typeName("b".repeat(50));
			expect(nameInput().props.value).toBe("b".repeat(32));
		});

		it("prefills the name from the route (H3)", async () => {
			await render(<HabitFormScreen name="Yoga" />);
			expect(nameInput().props.value).toBe("Yoga");
			expect(isSaveDisabled()).toBe(false);
		});
	});

	describe("validation (F8)", () => {
		it("shows a duplicate name inline, in the field, and blocks Save naming the issue", async () => {
			mockHabits = [makeHabit({ id: 5, name: "Read 20 min" })];
			await render(<HabitFormScreen />);
			await typeName("read 20 MIN");

			expect(
				screen.getByRole("alert", {
					name: "You already have a habit called Read 20 min. Choose another name.",
				}),
			).toBeTruthy();
			expect(isSaveDisabled()).toBe(true);
			expect(screen.getByText("Fix 1 issue to save")).toBeTruthy();
		});

		it("counts a duplicate and an empty day list as two issues", async () => {
			mockHabits = [makeHabit({ id: 5, name: "Read 20 min" })];
			await render(<HabitFormScreen />);
			await typeName("Read 20 min");
			await fireEvent.press(screen.getByText("Specific days"));
			expect(
				screen.getByRole("alert", { name: "Pick at least one day" }),
			).toBeTruthy();
			expect(screen.getByText("Fix 2 issues to save")).toBeTruthy();
		});

		it("clears the error and re-enables Save once the name is changed", async () => {
			mockHabits = [makeHabit({ id: 5, name: "Read 20 min" })];
			await render(<HabitFormScreen />);
			await typeName("Read 20 min");
			await typeName("Read 30 min");
			expect(screen.queryByText(/already have a habit/)).toBeNull();
			expect(isSaveDisabled()).toBe(false);
		});
	});

	describe("goal", () => {
		it("starts on Check, and Quantity adds a daily target, a unit and the live example", async () => {
			await render(<HabitFormScreen />);
			expect(screen.queryByText("DAILY TARGET")).toBeNull();
			await fireEvent.press(screen.getByText("Quantity"));
			expect(screen.getByText("DAILY TARGET")).toBeTruthy();
			expect(screen.getByText("units a day")).toBeTruthy();

			await fireEvent.changeText(screen.getByLabelText("Unit"), "glasses");
			expect(screen.getByText("glasses a day")).toBeTruthy();
			expect(
				screen.getByText("Shown after the number: 5 of 8 glasses"),
			).toBeTruthy();
		});

		it("asks for a unit before saving, then saves the target and unit", async () => {
			await render(<HabitFormScreen />);
			await typeName("Drink water");
			await fireEvent.press(screen.getByText("Quantity"));
			expect(isSaveDisabled()).toBe(true);
			expect(screen.getByText("Add a unit to save")).toBeTruthy();

			await fireEvent.changeText(screen.getByLabelText("Unit"), " glasses ");
			await fireEvent.press(screen.getByLabelText("Increase daily target"));
			await fireEvent.press(saveButton() as never);
			await waitFor(() => expect(mockCreateHabit).toHaveBeenCalled());
			expect(mockCreateHabit.mock.calls[0][0]).toMatchObject({
				targetType: "quantity",
				targetAmount: 9,
				targetUnit: "glasses",
			});
		});

		it("shows the missing-unit error once the unit has been left", async () => {
			await render(<HabitFormScreen />);
			await typeName("Drink water");
			await fireEvent.press(screen.getByText("Quantity"));
			await fireEvent(screen.getByLabelText("Unit"), "blur");
			expect(
				screen.getByRole("alert", {
					name: "Give this target a unit, e.g. “glasses”.",
				}),
			).toBeTruthy();
			expect(screen.getByText("Fix 1 issue to save")).toBeTruthy();
		});

		it("saves a switched-back Check habit with a null target", async () => {
			await render(<HabitFormScreen />);
			await typeName("Drink water");
			await fireEvent.press(screen.getByText("Quantity"));
			await fireEvent.changeText(screen.getByLabelText("Unit"), "glasses");
			await fireEvent.press(screen.getByText("Check"));
			await fireEvent.press(saveButton() as never);
			await waitFor(() => expect(mockCreateHabit).toHaveBeenCalled());
			expect(mockCreateHabit.mock.calls[0][0]).toMatchObject({
				targetType: "simple",
				targetAmount: null,
				targetUnit: null,
			});
		});
	});

	describe("Break (F5)", () => {
		it("explains Break, turns Quantity off with the reason, and resets a picked Quantity to Check", async () => {
			await render(<HabitFormScreen />);
			await typeName("No social media");
			await fireEvent.press(screen.getByText("Quantity"));
			await fireEvent.press(screen.getByText("Break"));

			expect(
				screen.getByText(
					"A Break habit counts the days you resist. Tick the circle on each day you held off.",
				),
			).toBeTruthy();
			expect(
				screen.getByText("Break habits are yes or no, so Quantity is off."),
			).toBeTruthy();
			expect(isDisabled("Quantity")).toBe(true);
			expect(screen.queryByText("DAILY TARGET")).toBeNull();

			await fireEvent.press(saveButton() as never);
			await waitFor(() => expect(mockCreateHabit).toHaveBeenCalled());
			expect(mockCreateHabit.mock.calls[0][0]).toMatchObject({
				direction: "break",
				targetType: "simple",
			});
		});
	});

	describe("frequency", () => {
		it("offers three modes — Daily, Specific days, × per week — never a fourth Weekdays", async () => {
			await render(<HabitFormScreen />);
			expect(isSelected("Daily")).toBe(true);
			expect(screen.getByText("Specific days")).toBeTruthy();
			expect(screen.getByText("× per week")).toBeTruthy();
			expect(screen.queryByText("Weekdays")).toBeNull();
			expect(screen.queryByLabelText("Monday")).toBeNull();
		});

		it("Specific days shows the weekday chips, with the error until one is picked", async () => {
			await render(<HabitFormScreen />);
			await typeName("Upper body");
			await fireEvent.press(screen.getByText("Specific days"));
			expect(screen.getByLabelText("Monday")).toBeTruthy();
			expect(screen.getByText("Pick at least one day")).toBeTruthy();
			expect(isSaveDisabled()).toBe(true);

			await fireEvent.press(screen.getByLabelText("Tuesday"));
			await fireEvent.press(screen.getByLabelText("Thursday"));
			expect(screen.queryByText("Pick at least one day")).toBeNull();
			await fireEvent.press(saveButton() as never);
			await waitFor(() => expect(mockCreateHabit).toHaveBeenCalled());
			expect(mockCreateHabit.mock.calls[0][0].frequency).toEqual({
				type: "weekdays",
				days: [2, 4],
			});
		});

		it("× per week has a stepper, the Monday–Sunday rule and saves the count", async () => {
			await render(<HabitFormScreen />);
			await typeName("Cold shower");
			await fireEvent.press(screen.getByText("× per week"));
			expect(screen.getByText("times a week")).toBeTruthy();
			expect(
				screen.getByText(
					"Weeks run Monday to Sunday. Once you reach 3, it leaves Today until the next week starts.",
				),
			).toBeTruthy();

			await fireEvent.press(screen.getByLabelText("Increase times per week"));
			expect(screen.getByText(/Once you reach 4,/)).toBeTruthy();
			await fireEvent.press(saveButton() as never);
			await waitFor(() => expect(mockCreateHabit).toHaveBeenCalled());
			expect(mockCreateHabit.mock.calls[0][0].frequency).toEqual({
				type: "per-week",
				timesPerWeek: 4,
			});
		});
	});

	describe("reminders before saving (F7)", () => {
		it("adds a time through the sheet, lists it with its days, and sends it with the habit", async () => {
			await render(<HabitFormScreen />);
			await typeName("Upper body");
			await fireEvent.press(screen.getByText("Specific days"));
			await fireEvent.press(screen.getByLabelText("Tuesday"));
			await fireEvent.press(screen.getByLabelText("Thursday"));

			await fireEvent.press(screen.getByLabelText("Add time"));
			// The sheet opens on 09:00, on the days the habit is set for.
			expect(mockTimeWheel.mock.calls.at(-1)?.[0]).toMatchObject({
				hour: 9,
				minute: 0,
			});
			await fireEvent.press(screen.getByText("Save time"));
			expect(screen.getByText("09:00")).toBeTruthy();
			expect(screen.getByText("Tue, Thu")).toBeTruthy();

			await fireEvent.press(saveButton() as never);
			await waitFor(() => expect(mockCreateHabit).toHaveBeenCalled());
			expect(mockCreateHabit.mock.calls[0][1]).toEqual([
				{ hour: 9, minute: 0, weekdays: [2, 4] },
			]);
		});

		it("removes a queued time at once, and never saves it", async () => {
			await render(<HabitFormScreen />);
			await typeName("Read");
			await fireEvent.press(screen.getByLabelText("Add time"));
			await fireEvent.press(screen.getByText("Save time"));
			await fireEvent.press(screen.getByLabelText("Remove reminder at 09:00"));
			expect(screen.queryByText("09:00")).toBeNull();

			await fireEvent.press(saveButton() as never);
			await waitFor(() => expect(mockCreateHabit).toHaveBeenCalled());
			expect(mockCreateHabit.mock.calls[0][1]).toEqual([]);
		});

		it("stops at four times, saying why", async () => {
			await render(<HabitFormScreen />);
			for (let index = 0; index < 4; index++) {
				await fireEvent.press(screen.getByLabelText("Add time"));
				await fireEvent.press(screen.getByText("Save time"));
			}
			expect(
				screen.getByLabelText("Add time").props.accessibilityState.disabled,
			).toBe(true);
			expect(screen.getByText(/remove one to add another/)).toBeTruthy();
		});

		it("tells the person when the habit saved but a reminder did not", async () => {
			mockCreateHabit.mockResolvedValue({
				habit: existingHabit,
				remindersFailed: true,
			});
			await render(<HabitFormScreen />);
			await typeName("Read");
			await fireEvent.press(saveButton() as never);
			await waitFor(() => expect(mockBack).toHaveBeenCalled());
			expect(useToastStore.getState().toast?.message).toBe(
				"Saved, but a reminder couldn’t be set. Add it from the habit’s Reminders.",
			);
		});
	});

	it("a failed save shows an inline error above Save, stays on the form, and a retry works", async () => {
		mockCreateHabit.mockRejectedValueOnce(new Error("disk full"));
		await render(<HabitFormScreen />);
		await typeName("Read");
		await fireEvent.press(saveButton() as never);
		await waitFor(() =>
			expect(screen.getByRole("alert")).toHaveTextContent(/Couldn.t save/),
		);
		expect(mockBack).not.toHaveBeenCalled();

		await fireEvent.press(saveButton() as never);
		await waitFor(() => expect(mockBack).toHaveBeenCalled());
	});

	it("a failed save moves the screen reader onto the error (08.4)", async () => {
		jest.useFakeTimers();
		const focus = jest
			.spyOn(AccessibilityInfo, "sendAccessibilityEvent")
			.mockImplementation();
		mockCreateHabit.mockRejectedValueOnce(new Error("disk full"));
		await render(<HabitFormScreen />);
		await typeName("Read");
		await fireEvent.press(saveButton() as never);
		await waitFor(() => expect(screen.getByRole("alert")).toBeTruthy());
		await act(async () => {
			jest.advanceTimersByTime(200);
		});
		expect(focus).toHaveBeenCalledWith(expect.anything(), "focus");
		focus.mockRestore();
		jest.useRealTimers();
	});

	it("draws a hairline above Save only once the form is scrolled", async () => {
		await render(<HabitFormScreen />);
		const footer = () => screen.getByTestId("habit-form-footer");
		const flat = () =>
			Object.assign({}, ...[footer().props.style].flat().filter(Boolean));
		expect(flat().borderTopWidth).toBeUndefined();
		await fireEvent.scroll(screen.getByTestId("habit-form-scroll"), {
			nativeEvent: { contentOffset: { y: 12 } },
		});
		expect(flat().borderTopWidth).toBeGreaterThan(0);
	});
});

describe("HabitFormScreen — the end of the form stays clear of Save", () => {
	const layout = (height: number) => ({ nativeEvent: { layout: { height } } });
	const scrolledTo = (y: number) => ({
		nativeEvent: {
			contentOffset: { y },
			contentSize: { height: 900 },
			layoutMeasurement: { height: 500 },
		},
	});
	let scrollToEnd: jest.SpyInstance;
	beforeEach(() => {
		const { ScrollView } = require("react-native");
		scrollToEnd = jest
			.spyOn(ScrollView.prototype, "scrollToEnd")
			.mockImplementation(() => {});
	});
	afterEach(() => jest.restoreAllMocks());

	it("follows the end only when the Save bar grows while the form rests there", async () => {
		await render(<HabitFormScreen />);
		const footer = screen.getByTestId("habit-form-footer");
		const scroller = screen.getByTestId("habit-form-scroll");
		const followed = () =>
			scrollToEnd.mock.calls.filter(([arg]) => arg?.animated === false).length;
		await fireEvent(footer, "layout", layout(76));
		scrollToEnd.mockClear();

		// Not at the end: a taller bar leaves the form where it is.
		await fireEvent.scroll(scroller, scrolledTo(100));
		await fireEvent(footer, "layout", layout(120));
		expect(followed()).toBe(0);

		// At the end, the bar shrinking changes nothing…
		await fireEvent.scroll(scroller, scrolledTo(400));
		await fireEvent(footer, "layout", layout(76));
		expect(followed()).toBe(0);

		// …and growing (errors, a reason) keeps the last field above it.
		await fireEvent(footer, "layout", layout(120));
		expect(scrollToEnd).toHaveBeenCalledWith({ animated: false });
		expect(followed()).toBe(1);
	});
});

describe("HabitFormScreen — discard prompt (F9)", () => {
	it("lets a pristine form close without asking", async () => {
		await render(<HabitFormScreen />);
		expect(await tryToLeave()).toBe(false);
		expect(screen.queryByText("Discard changes?")).toBeNull();
	});

	it("asks before closing with edits: Keep editing stays, Discard replays the exit", async () => {
		await render(<HabitFormScreen />);
		await typeName("Read");
		const action = { type: "POP", from: "header" };
		expect(await tryToLeave(action)).toBe(true);
		expect(screen.getByText("Discard changes?")).toBeTruthy();
		expect(screen.getByText("Your new habit won’t be saved.")).toBeTruthy();

		await fireEvent.press(screen.getByText("Keep editing"));
		expect(screen.queryByText("Discard changes?")).toBeNull();
		expect(mockDispatch).not.toHaveBeenCalled();
		expect(nameInput().props.value).toBe("Read");

		await tryToLeave(action);
		await fireEvent.press(screen.getByText("Discard"));
		expect(mockDispatch).toHaveBeenCalledWith(action);
	});

	it("counts a queued reminder as an edit", async () => {
		await render(<HabitFormScreen />);
		await fireEvent.press(screen.getByLabelText("Add time"));
		await fireEvent.press(screen.getByText("Save time"));
		expect(await tryToLeave()).toBe(true);
	});

	it("does not ask after a successful save", async () => {
		await render(<HabitFormScreen />);
		await typeName("Read");
		await fireEvent.press(saveButton() as never);
		await waitFor(() => expect(mockBack).toHaveBeenCalled());
		// The guard is off by the time the form leaves, so nothing is asked.
		expect(await tryToLeave()).toBe(false);
		expect(screen.queryByText("Discard changes?")).toBeNull();
	});

	it("names the habit when editing one", async () => {
		mockHabits = [existingHabit];
		await render(<HabitFormScreen habitId={1} />);
		await typeName("Gym 2");
		await tryToLeave();
		expect(screen.getByText("Your edits to Gym won’t be saved.")).toBeTruthy();
	});
});

describe("HabitFormScreen — prefilled from a suggestion (BS2)", () => {
	const prefill = {
		name: "Drink water",
		category: "Health" as const,
		direction: "build" as const,
		target: { amount: 8, unit: "glasses" },
		frequency: { type: "daily" as const },
	};

	it("fills every field, says where from, and saves nothing until Save", async () => {
		await render(<HabitFormScreen prefill={prefill} />);
		expect(screen.getByText("From a suggestion")).toBeTruthy();
		expect(
			screen.getByText(
				"Drink water is filled in. Change anything before saving.",
			),
		).toBeTruthy();
		expect(nameInput().props.value).toBe("Drink water");
		expect(isSelected("Health")).toBe(true);
		expect(screen.getByText("glasses a day")).toBeTruthy();
		expect(mockCreateHabit).not.toHaveBeenCalled();

		await fireEvent.press(saveButton() as never);
		await waitFor(() => expect(mockCreateHabit).toHaveBeenCalled());
		expect(mockCreateHabit.mock.calls[0][0]).toMatchObject({
			name: "Drink water",
			targetType: "quantity",
			targetAmount: 8,
			targetUnit: "glasses",
		});
	});

	it("is not an edit until something changes: closing asks nothing", async () => {
		await render(<HabitFormScreen prefill={prefill} />);
		expect(await tryToLeave()).toBe(false);
	});

	it("has no banner without a prefill", async () => {
		await render(<HabitFormScreen />);
		expect(screen.queryByText("From a suggestion")).toBeNull();
	});
});

describe("HabitFormScreen — edit", () => {
	beforeEach(() => {
		mockHabits = [existingHabit];
		mockUpdateHabit.mockResolvedValue(existingHabit);
	});

	it("pre-fills the form from the habit and has no reminders section", async () => {
		await render(<HabitFormScreen habitId={1} />);
		await waitFor(() => expect(nameInput().props.value).toBe("Gym"));
		expect(isSelected("Morning")).toBe(true);
		expect(isSelected("Specific days")).toBe(true);
		expect(isSelected("Monday")).toBe(true);
		expect(isSelected("Tuesday")).toBe(false);
		expect(screen.queryByText("REMINDERS")).toBeNull();
		expect(screen.getByText("Save changes")).toBeTruthy();
	});

	it("doesn't autofocus the name, and locks Type with the reason", async () => {
		await render(<HabitFormScreen habitId={1} />);
		expect(nameInput().props.autoFocus).toBeFalsy();
		expect(
			screen.getByText("Build and Break can’t be switched after saving."),
		).toBeTruthy();
		expect(isDisabled("Break")).toBe(true);
	});

	it("lets the habit keep its own name without a duplicate error", async () => {
		await render(<HabitFormScreen habitId={1} />);
		await typeName("Gym");
		expect(screen.queryByText(/already have a habit/)).toBeNull();
		expect(isSaveDisabled()).toBe(false);
	});

	it("updates the habit without touching its direction, and keeps a picked category", async () => {
		await render(<HabitFormScreen habitId={1} />);
		await typeName("Gym 2");
		await fireEvent.press(screen.getByLabelText("Learning"));
		await fireEvent.press(saveButton() as never);
		await waitFor(() => expect(mockUpdateHabit).toHaveBeenCalled());
		const [id, input] = mockUpdateHabit.mock.calls[0];
		expect(id).toBe(1);
		expect(input).toMatchObject({ name: "Gym 2", categoryId: LEARNING.id });
		expect(input).not.toHaveProperty("direction");
	});

	it("pre-fills target and unit from a Quantity habit", async () => {
		mockHabits = [
			makeHabit({
				id: 2,
				name: "Water",
				category: MORNING,
				targetType: "quantity",
				targetAmount: 6,
				targetUnit: "cups",
			}),
		];
		await render(<HabitFormScreen habitId={2} />);
		await waitFor(() => expect(screen.getByText("cups a day")).toBeTruthy());
		expect(screen.getByLabelText("Unit").props.value).toBe("cups");
	});

	describe("Archive at the foot", () => {
		it("is offered for an active habit only", async () => {
			await render(<HabitFormScreen habitId={1} />);
			expect(screen.getByText("Archive habit")).toBeTruthy();
		});

		it("is not offered once the habit is archived", async () => {
			mockHabits = [
				makeHabit({ ...existingHabit, archivedAt: new Date(2026, 8, 2) }),
			];
			await render(<HabitFormScreen habitId={1} />);
			expect(screen.queryByText("Archive habit")).toBeNull();
		});

		it("archives in one tap, closes without asking and leaves an Undo toast", async () => {
			mockArchiveHabit.mockResolvedValue(undefined);
			await render(<HabitFormScreen habitId={1} />);
			await typeName("Gym 2");
			await fireEvent.press(screen.getByText("Archive habit"));
			await waitFor(() => expect(mockBack).toHaveBeenCalled());
			expect(mockArchiveHabit).toHaveBeenCalledWith(1);
			const toast = useToastStore.getState().toast;
			expect(toast?.message).toBe("Gym archived");
			toast?.onAction?.();
			expect(mockRestoreHabit).toHaveBeenCalledWith(1);
		});

		it("stays open and says so inline when archiving fails", async () => {
			mockArchiveHabit.mockRejectedValue(new Error("nope"));
			await render(<HabitFormScreen habitId={1} />);
			await fireEvent.press(screen.getByText("Archive habit"));
			await waitFor(() =>
				expect(screen.getByRole("alert")).toHaveTextContent(/archive/i),
			);
			expect(mockBack).not.toHaveBeenCalled();
		});
	});

	describe("a legacy name over 32 (HAB-22)", () => {
		const legacyName = "Read twenty pages before a morning tea"; // 38
		beforeEach(() => {
			mockHabits = [makeHabit({ id: 3, name: legacyName, category: MORNING })];
			mockUpdateHabit.mockResolvedValue(mockHabits[0]);
		});

		it("saves other fields with the name unchanged", async () => {
			await render(<HabitFormScreen habitId={3} />);
			await fireEvent.press(screen.getByText("× per week"));
			expect(isSaveDisabled()).toBe(false);
			await fireEvent.press(saveButton() as never);
			await waitFor(() => expect(mockUpdateHabit).toHaveBeenCalled());
			expect(mockUpdateHabit.mock.calls[0][1].name).toBe(legacyName);
		});

		it("blocks Save, naming the issue, once the name is edited but still over 32", async () => {
			await render(<HabitFormScreen habitId={3} />);
			await typeName(legacyName.slice(0, 35));
			expect(isSaveDisabled()).toBe(true);
			expect(
				screen.getByText("Shorten the name to 32 characters."),
			).toBeTruthy();
		});

		it("saves once the name is edited down to 32", async () => {
			await render(<HabitFormScreen habitId={3} />);
			await typeName(legacyName.slice(0, 32));
			expect(isSaveDisabled()).toBe(false);
		});
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

describe("HabitFormScreen — First Run, the slim form (FR2)", () => {
	const HEALTH = builtInCategory("Health");

	it("says so inline when Close could not leave First Run", async () => {
		await render(<HabitFormScreen firstRun slim />);
		expect(screen.queryByText("Couldn\u2019t continue. Try again.")).toBeNull();
		await act(async () => useFirstRunOfferStore.getState().setSkipFailed(true));
		expect(screen.getByText("Couldn\u2019t continue. Try again.")).toBeTruthy();
		useFirstRunOfferStore.getState().setSkipFailed(false);
	});

	it("is Name, Or pick one, Type, Frequency and a note — no Category, Goal or Reminders", async () => {
		await render(<HabitFormScreen firstRun slim />);
		const labels = ["NAME", "OR PICK ONE", "TYPE", "FREQUENCY"];
		const found = labels.map((label) => screen.getByText(label));
		expect(found.every(Boolean)).toBe(true);
		for (const hidden of ["CATEGORY", "GOAL", "REMINDERS", "DAILY TARGET"]) {
			expect(screen.queryByText(hidden)).toBeNull();
		}
		expect(
			screen.getByText(
				"Category and reminders can wait \u2014 change them any time.",
			),
		).toBeTruthy();
		expect(screen.queryByText("From a suggestion")).toBeNull();
	});

	it("offers the five quick picks, and Save is off with its reason until there is a name", async () => {
		await render(<HabitFormScreen firstRun slim />);
		for (const pick of [
			"Drink water",
			"Read 20 min",
			"Meditate",
			"Morning run",
			"No phone in bed",
		]) {
			expect(screen.getByText(pick)).toBeTruthy();
		}
		expect(isSaveDisabled()).toBe(true);
		expect(screen.getByText("Add a name to save")).toBeTruthy();
	});

	it("a quick pick fills the name, type and frequency, and keeps the category and target it brings", async () => {
		await render(<HabitFormScreen firstRun slim />);
		await fireEvent.press(screen.getByText("Drink water"));
		expect(nameInput().props.value).toBe("Drink water");
		await fireEvent.press(saveButton() as never);

		await waitFor(() => expect(mockCreateHabit).toHaveBeenCalled());
		expect(mockCreateHabit.mock.calls[0][0]).toEqual({
			name: "Drink water",
			categoryId: HEALTH.id,
			direction: "build",
			targetType: "quantity",
			targetAmount: 8,
			targetUnit: "glasses",
			frequency: { type: "daily" },
		});
	});

	it("a quick pick sets Break and specific days where the suggestion has them", async () => {
		await render(<HabitFormScreen firstRun slim />);
		await fireEvent.press(screen.getByText("No phone in bed"));
		expect(isSelected("Break")).toBe(true);
		await fireEvent.press(screen.getByText("Morning run"));
		expect(isSelected("Build")).toBe(true);
		expect(isSelected("Specific days")).toBe(true);
		expect(isSelected("Monday")).toBe(true);
		expect(isSelected("Tuesday")).toBe(false);
	});

	it("changing the picked name drops the category and target that came with it", async () => {
		await render(<HabitFormScreen firstRun slim />);
		await fireEvent.press(screen.getByText("Drink water"));
		await typeName("Drink tea");
		await fireEvent.press(saveButton() as never);

		await waitFor(() => expect(mockCreateHabit).toHaveBeenCalled());
		expect(mockCreateHabit.mock.calls[0][0]).toMatchObject({
			name: "Drink tea",
			categoryId: OTHER.id,
			targetType: "simple",
			targetAmount: null,
			targetUnit: null,
		});
	});

	it("saving marks First Run seen, offers the reminder question and opens Today with no way back", async () => {
		const saved = makeHabit({ id: 9, name: "Read 20 min" });
		mockCreateHabit.mockResolvedValue({ habit: saved, remindersFailed: false });
		await render(<HabitFormScreen firstRun slim />);
		await fireEvent.press(screen.getByText("Read 20 min"));
		await fireEvent.press(saveButton() as never);

		await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/"));
		expect(mockMarkFirstRunSeen).toHaveBeenCalledTimes(1);
		expect(useFirstRunOfferStore.getState().habit).toBe(saved);
		expect(mockDismissAll).toHaveBeenCalled();
		expect(mockBack).not.toHaveBeenCalled();
	});

	it("a failed save marks nothing, offers nothing and stays on the form", async () => {
		mockCreateHabit.mockRejectedValue(new Error("disk full"));
		await render(<HabitFormScreen firstRun slim />);
		await typeName("Read");
		await fireEvent.press(saveButton() as never);

		await waitFor(() =>
			expect(screen.getByText(/Couldn.t save this habit/)).toBeTruthy(),
		);
		expect(mockMarkFirstRunSeen).not.toHaveBeenCalled();
		expect(useFirstRunOfferStore.getState().habit).toBeNull();
		expect(mockReplace).not.toHaveBeenCalled();
	});

	it("still hands over to Today when only the seen flag fails to write: the habit exists, so the gate is done", async () => {
		mockMarkFirstRunSeen.mockResolvedValue({ ok: false });
		await render(<HabitFormScreen firstRun slim />);
		await typeName("Read");
		await fireEvent.press(saveButton() as never);

		await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/"));
	});
});

describe("HabitFormScreen — First Run through a suggestion (BS2)", () => {
	const prefill = {
		name: "Meditate",
		category: "Mindfulness" as const,
		direction: "build" as const,
		target: null,
		frequency: { type: "daily" as const },
	};

	it("is the full form with the banner, and saving still finishes First Run", async () => {
		await render(<HabitFormScreen firstRun prefill={prefill} />);
		expect(screen.getByText("From a suggestion")).toBeTruthy();
		expect(screen.getByText("CATEGORY")).toBeTruthy();
		await fireEvent.press(saveButton() as never);

		await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/"));
		expect(mockMarkFirstRunSeen).toHaveBeenCalledTimes(1);
		expect(useFirstRunOfferStore.getState().habit).not.toBeNull();
	});

	it("outside First Run a saved suggestion just goes back and asks nothing", async () => {
		await render(<HabitFormScreen prefill={prefill} />);
		await fireEvent.press(saveButton() as never);

		await waitFor(() => expect(mockBack).toHaveBeenCalled());
		expect(mockMarkFirstRunSeen).not.toHaveBeenCalled();
		expect(useFirstRunOfferStore.getState().habit).toBeNull();
	});
});
