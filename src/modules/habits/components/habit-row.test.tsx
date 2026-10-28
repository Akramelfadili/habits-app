import { fireEvent, render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import { makeHabit } from "../test-support/habit-builder";
import { HabitRow } from "./habit-row";

// jest's window reports fontScale 2 (accessibility sizes): each test says which layout it wants.
let mockAccessibilityText = false;
jest.mock("@/utils/use-accessibility-text-size", () => ({
	useAccessibilityTextSize: () => mockAccessibilityText,
}));

jest.mock("expo-symbols", () => {
	const { View } = require("react-native");
	return { SymbolView: View };
});

const quantityHabit = (overrides = {}) =>
	makeHabit({
		name: "Drink water",
		targetType: "quantity",
		targetAmount: 8,
		targetUnit: "glasses",
		...overrides,
	});

describe("HabitRow", () => {
	it("renders the name and the status line", async () => {
		await render(
			<HabitRow
				habit={makeHabit({ name: "Meditate" })}
				completed={false}
				status={{ text: "13-day streak", tone: "default" }}
				onToggle={jest.fn()}
				onPress={jest.fn()}
			/>,
		);
		expect(screen.getByText("Meditate")).toBeTruthy();
		expect(screen.getByText("13-day streak")).toBeTruthy();
	});

	it("never shows a completion time", async () => {
		await render(
			<HabitRow
				habit={makeHabit({ name: "Meditate" })}
				completed
				status={{ text: "13-day streak", tone: "default" }}
				onToggle={jest.fn()}
				onPress={jest.fn()}
			/>,
		);
		expect(screen.queryByText(/Done \d\d:\d\d/)).toBeNull();
	});

	it("the name area opens Detail and never logs", async () => {
		const onPress = jest.fn();
		const onToggle = jest.fn();
		await render(
			<HabitRow
				habit={makeHabit({ name: "Gym" })}
				completed={false}
				onToggle={onToggle}
				onPress={onPress}
			/>,
		);
		await fireEvent.press(screen.getByText("Gym"));
		expect(onPress).toHaveBeenCalledTimes(1);
		expect(onToggle).not.toHaveBeenCalled();
	});

	it("the circle logs and never opens Detail", async () => {
		const onPress = jest.fn();
		const onToggle = jest.fn();
		await render(
			<HabitRow
				habit={makeHabit({ name: "Gym" })}
				completed={false}
				onToggle={onToggle}
				onPress={onPress}
			/>,
		);
		await fireEvent.press(screen.getByLabelText("Gym, not done"));
		expect(onToggle).toHaveBeenCalledTimes(1);
		expect(onPress).not.toHaveBeenCalled();
	});

	it("reads the name area as 'name, status, button. Opens details.'", async () => {
		await render(
			<HabitRow
				habit={quantityHabit()}
				quantityValue={5}
				completed={false}
				status={{ text: "5 of 8 glasses", tone: "default" }}
				onToggle={jest.fn()}
				onIncrement={jest.fn()}
				onOpenQuantitySheet={jest.fn()}
				onPress={jest.fn()}
			/>,
		);
		const name = screen.getByRole("button", {
			name: "Drink water, 5 of 8 glasses",
		});
		expect(name.props.accessibilityHint).toBe("Opens details.");
	});

	describe("circle labels (08.3)", () => {
		it("says done or not done for a Build habit, with the matching hint", async () => {
			const { rerender } = await render(
				<HabitRow
					habit={makeHabit({ name: "Read 20 min" })}
					completed={false}
					onToggle={jest.fn()}
					onPress={jest.fn()}
				/>,
			);
			expect(
				screen.getByLabelText("Read 20 min, not done").props.accessibilityHint,
			).toBe("Double-tap to mark done");
			await rerender(
				<HabitRow
					habit={makeHabit({ name: "Read 20 min" })}
					completed
					onToggle={jest.fn()}
					onPress={jest.fn()}
				/>,
			);
			expect(screen.getByLabelText("Read 20 min, done")).toBeTruthy();
		});

		it("never calls a resisted Break habit 'done'", async () => {
			await render(
				<HabitRow
					habit={makeHabit({ name: "No social media", direction: "break" })}
					completed
					onToggle={jest.fn()}
					onPress={jest.fn()}
				/>,
			);
			expect(screen.getByLabelText("No social media, resisted")).toBeTruthy();
			expect(screen.queryByLabelText("No social media, done")).toBeNull();
		});

		it("asks 'resisted today?' of a Break habit not yet resisted", async () => {
			await render(
				<HabitRow
					habit={makeHabit({ name: "No social media", direction: "break" })}
					completed={false}
					onToggle={jest.fn()}
					onPress={jest.fn()}
				/>,
			);
			expect(
				screen.getByLabelText("No social media, resisted today?"),
			).toBeTruthy();
		});
	});

	describe("at risk (HAB-33)", () => {
		it("shows the amber dot, opens the streak options from the name, and still logs from the circle", async () => {
			const onPress = jest.fn();
			const onToggle = jest.fn();
			await render(
				<HabitRow
					habit={makeHabit({ name: "Meditate" })}
					completed={false}
					atRisk
					status={{ text: "Missed Thursday · 1 freeze left", tone: "warning" }}
					nameHint="Opens the streak options."
					onToggle={onToggle}
					onPress={onPress}
				/>,
			);
			expect(screen.getByTestId("completion-circle-at-risk")).toBeTruthy();
			await fireEvent.press(screen.getByText("Meditate"));
			expect(onPress).toHaveBeenCalledTimes(1);
			await fireEvent.press(screen.getByLabelText("Meditate, not done"));
			expect(onToggle).toHaveBeenCalledTimes(1);
			expect(onPress).toHaveBeenCalledTimes(1);
		});
	});

	describe("a quantity habit (HAB-07, D6)", () => {
		function renderQuantity(value: number, completed = false) {
			const handlers = {
				onToggle: jest.fn(),
				onIncrement: jest.fn(),
				onOpenQuantitySheet: jest.fn(),
				onPress: jest.fn(),
			};
			return {
				handlers,
				done: render(
					<HabitRow
						habit={quantityHabit()}
						quantityValue={value}
						completed={completed}
						{...handlers}
					/>,
				),
			};
		}

		it("the circle adds one: not the toggle, not the sheet", async () => {
			const { handlers, done } = renderQuantity(3);
			await done;
			await fireEvent.press(
				screen.getByLabelText("Add one, Drink water, 3 of 8"),
			);
			expect(handlers.onIncrement).toHaveBeenCalledTimes(1);
			expect(handlers.onOpenQuantitySheet).not.toHaveBeenCalled();
			expect(handlers.onToggle).not.toHaveBeenCalled();
		});

		it("long-press on the circle and the count button open the sheet", async () => {
			const { handlers, done } = renderQuantity(3);
			await done;
			await fireEvent(
				screen.getByLabelText("Add one, Drink water, 3 of 8"),
				"longPress",
			);
			await fireEvent.press(screen.getByLabelText("Amount, 3 of 8"));
			expect(handlers.onOpenQuantitySheet).toHaveBeenCalledTimes(2);
			expect(handlers.onIncrement).not.toHaveBeenCalled();
		});

		it("shows the count as a pill, and keeps counting above the target", async () => {
			const { done } = renderQuantity(9, true);
			await done;
			expect(screen.getByText("9/8")).toBeTruthy();
		});

		it("gives the circle 'Double-tap to log one more'", async () => {
			const { done } = renderQuantity(3);
			await done;
			expect(
				screen.getByLabelText("Add one, Drink water, 3 of 8").props
					.accessibilityHint,
			).toBe("Double-tap to log one more");
		});
	});

	describe("not due (T3)", () => {
		it("draws a dashed circle that logs a bonus, and no count button", async () => {
			const onToggle = jest.fn();
			await render(
				<HabitRow
					habit={quantityHabit()}
					completed={false}
					notDue
					onToggle={onToggle}
					onPress={jest.fn()}
					onOpenQuantitySheet={jest.fn()}
				/>,
			);
			expect(screen.queryByText("0/8")).toBeNull();
			await fireEvent.press(
				screen.getByLabelText("Drink water, not due, bonus"),
			);
			expect(onToggle).toHaveBeenCalledTimes(1);
		});
	});

	describe("layout (T-18, 08.6)", () => {
		afterEach(() => {
			mockAccessibilityText = false;
		});

		function rowStyle() {
			const circle = screen.getByLabelText("Gym, not done");
			// hit area → controls row → the row itself
			const row = circle.parent?.parent;
			return StyleSheet.flatten(row?.props.style);
		}

		it("is a flat 60 pt row at standard sizes", async () => {
			await render(
				<HabitRow
					habit={makeHabit({ name: "Gym" })}
					completed={false}
					onToggle={jest.fn()}
					onPress={jest.fn()}
				/>,
			);
			expect(rowStyle().minHeight).toBe(60);
			expect(rowStyle().flexDirection).toBe("row");
		});

		it("stacks at accessibility sizes: name first, count button and circle on their own line, 16 pt padding", async () => {
			mockAccessibilityText = true;
			await render(
				<HabitRow
					habit={makeHabit({ name: "Gym" })}
					completed={false}
					onToggle={jest.fn()}
					onPress={jest.fn()}
				/>,
			);
			expect(rowStyle().flexDirection).toBeUndefined();
			expect(rowStyle().paddingHorizontal).toBe(16);
		});
	});
});
