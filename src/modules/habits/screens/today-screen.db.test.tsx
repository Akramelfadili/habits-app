import {
	act,
	fireEvent,
	render,
	renderHook,
	screen,
	waitFor,
} from "@testing-library/react-native";
import { eq } from "drizzle-orm";
import { Animated } from "react-native";
import { appSettings, entries, frozenDays, habits } from "@/lib/db/schema";
import { createTestDb } from "@/lib/db/test-db";
import { notifyTableChanged } from "@/lib/db/test-live-query";
import { useToastStore } from "@/store/toast-store";
import { SEEN_FIRST_RUN_SETTING_KEY } from "../constants";
import { calculateCurrentStreak } from "../domain/streaks";
import { makeHabitInput } from "../test-support/habit-builder";
import type { Entry, Habit } from "../types";

const mockDb = createTestDb({ onWrite: notifyTableChanged });
jest.doMock("@/lib/db/client", () => ({ db: mockDb }));
jest.doMock("drizzle-orm/expo-sqlite", () => ({
	useLiveQuery: require("@/lib/db/test-live-query").useLiveQuery,
}));
jest.mock("expo-symbols", () => {
	const { View } = require("react-native");
	return { SymbolView: View };
});
// Importing the real package prints its Expo Go push-token warning.
jest.mock(
	"expo-notifications",
	() =>
		require("../test-support/fake-expo-notifications").fakeNotifications.module,
);
const mockPush = jest.fn();
jest.mock("expo-router", () => ({
	useRouter: () => ({ push: mockPush, back: jest.fn() }),
	useFocusEffect: jest.fn(),
}));

const { TodayScreen } = require("./today-screen");
const { QuantityLogSheet } = require("../components/quantity-log-sheet");
const { useSelectedDayQueries } = require("../hooks/use-selected-day-queries");
const { useTodayQueries } = require("../hooks/use-today-queries");
const { useTodayLogActions } = require("../hooks/use-today-log-actions");
const { useOffScheduleQueries } = require("../hooks/use-off-schedule-queries");

function fakeClock(now: Date) {
	jest.useFakeTimers({
		now,
		doNotFake: [
			"nextTick",
			"setImmediate",
			"clearImmediate",
			"queueMicrotask",
			"requestAnimationFrame",
			"cancelAnimationFrame",
			"performance",
			"hrtime",
		],
	});
}

// The frozen clock never reaches an animation's end, so a fill or drawn check would keep requesting frames: every animation lands at once.
function jumpAnimationsToTheirEnd() {
	jest.spyOn(Animated, "timing").mockImplementation((value, config) => ({
		start: (done) => {
			(value as Animated.Value).setValue(config.toValue as number);
			done?.({ finished: true });
		},
		stop: () => {},
		reset: () => {},
	}));
}

const WED_NOON = new Date(2026, 8, 16, 12, 0, 0);
const MONDAY = "2026-09-14";
const TUESDAY = "2026-09-15";
const WEDNESDAY = "2026-09-16";

async function addHabit(
	overrides: Parameters<typeof makeHabitInput>[0] = {},
	createdAt = new Date(2026, 0, 1),
): Promise<number> {
	const input = makeHabitInput(overrides);
	const [row] = await mockDb
		.insert(habits)
		.values({
			name: input.name,
			categoryId: input.categoryId,
			direction: input.direction,
			targetType: input.targetType,
			targetAmount: input.targetAmount,
			targetUnit: input.targetUnit,
			frequencyType: input.frequency.type,
			frequencyDays:
				input.frequency.type === "weekdays"
					? JSON.stringify(input.frequency.days)
					: null,
			frequencyTimesPerWeek:
				input.frequency.type === "per-week"
					? input.frequency.timesPerWeek
					: null,
			sortOrder: 0,
			createdAt,
			updatedAt: createdAt,
		} as never)
		.returning();
	return row.id;
}

async function log(habitId: number, date: string, value?: number) {
	// A mounted screen is subscribed to the table, so the write goes through act.
	await act(async () => {
		await mockDb
			.insert(entries)
			.values({ habitId, date, value, createdAt: new Date() });
	});
}

async function freeze(habitId: number, date: string) {
	await act(async () => {
		await mockDb
			.insert(frozenDays)
			.values({ habitId, date, createdAt: new Date(2026, 8, 16, 7) });
	});
}

const entryRows = () => mockDb.select().from(entries);
const frozenRows = () => mockDb.select().from(frozenDays);
const toast = () => useToastStore.getState().toast;

// waitFor with a frozen clock advances timers inside an act scope it has switched off, so the live-query stand-in logs "not configured to support act"; each retry flushes one real macrotask in an awaited act instead.
async function waitForDb(check: () => Promise<void>) {
	let failure: unknown;
	for (let attempt = 0; attempt < 100; attempt++) {
		try {
			await check();
			return;
		} catch (error) {
			failure = error;
		}
		await act(async () => {
			await new Promise((resolve) => setImmediate(resolve));
		});
	}
	throw failure;
}

describe("TodayScreen on the in-memory database", () => {
	beforeEach(async () => {
		fakeClock(WED_NOON);
		jumpAnimationsToTheirEnd();
		await mockDb.delete(frozenDays);
		await mockDb.delete(entries);
		await mockDb.delete(habits);
		await mockDb.delete(appSettings);
		await mockDb
			.insert(appSettings)
			.values({ key: SEEN_FIRST_RUN_SETTING_KEY, value: "true" } as never);
		useToastStore.setState({ toast: null });
		mockPush.mockReset();
	});
	afterEach(() => jest.useRealTimers());

	it("ticks a habit, writes today's entry, and Undo deletes exactly that entry", async () => {
		const id = await addHabit({ name: "Read" });
		await render(<TodayScreen />);

		await fireEvent.press(await screen.findByLabelText("Read, not done"));
		await waitForDb(async () =>
			expect(await entryRows()).toEqual([
				expect.objectContaining({ habitId: id, date: WEDNESDAY }),
			]),
		);
		expect(toast()?.message).toBe("Marked 'Read' complete");

		await act(async () => {
			await toast()?.onAction?.();
		});
		expect(await entryRows()).toEqual([]);
	});

	describe("+1 on a quantity habit (D6)", () => {
		it("writes previous + 1 each tap, one entry per day, and Undo writes the amount from before that tap", async () => {
			const id = await addHabit({
				name: "Water",
				targetType: "quantity",
				targetAmount: 8,
				targetUnit: "glasses",
			});
			await render(<TodayScreen />);

			await fireEvent.press(
				await screen.findByLabelText("Add one, Water, 0 of 8"),
			);
			await waitForDb(async () =>
				expect(await entryRows()).toEqual([
					expect.objectContaining({ habitId: id, value: 1 }),
				]),
			);
			expect(toast()?.message).toBe("Water +1 · 1 of 8 glasses");

			await fireEvent.press(
				await screen.findByLabelText("Add one, Water, 1 of 8"),
			);
			await waitForDb(async () =>
				expect(await entryRows()).toEqual([
					expect.objectContaining({ habitId: id, value: 2 }),
				]),
			);
			expect(toast()?.message).toBe("Water +1 · 2 of 8 glasses");

			await act(async () => {
				await toast()?.onAction?.();
			});
			expect(await entryRows()).toEqual([
				expect.objectContaining({ habitId: id, value: 1 }),
			]);
		});

		it("the quantity sheet saves every change at once; closing shows one toast and Undo restores the amount from before it opened", async () => {
			const id = await addHabit({
				name: "Water",
				targetType: "quantity",
				targetAmount: 8,
				targetUnit: "glasses",
			});
			await log(id, WEDNESDAY, 5);
			await render(<TodayScreen />);

			await fireEvent.press(await screen.findByLabelText("Amount, 5 of 8"));
			await fireEvent.press(await screen.findByLabelText("Increase glasses"));
			await waitForDb(async () =>
				expect(await entryRows()).toEqual([
					expect.objectContaining({ habitId: id, value: 6 }),
				]),
			);
			await fireEvent.press(await screen.findByText("+2"));
			await waitForDb(async () =>
				expect(await entryRows()).toEqual([
					expect.objectContaining({ habitId: id, value: 8 }),
				]),
			);
			expect(toast()).toBeNull();
			await act(async () => {
				await fireEvent.press(screen.getByText("Done"));
			});
			expect(toast()?.message).toBe("Marked 'Water' complete");

			await act(async () => {
				await toast()?.onAction?.();
			});
			expect(await entryRows()).toEqual([
				expect.objectContaining({ habitId: id, value: 5 }),
			]);
		});

		it("Undo of the first +1 removes the entry (nothing was there before)", async () => {
			await addHabit({
				name: "Water",
				targetType: "quantity",
				targetAmount: 8,
				targetUnit: "glasses",
			});
			await render(<TodayScreen />);
			await fireEvent.press(
				await screen.findByLabelText("Add one, Water, 0 of 8"),
			);
			await waitForDb(async () => expect(await entryRows()).toHaveLength(1));
			await act(async () => {
				await toast()?.onAction?.();
			});
			expect(await entryRows()).toEqual([]);
		});

		it("keeps counting above the target", async () => {
			const id = await addHabit({
				name: "Water",
				targetType: "quantity",
				targetAmount: 2,
				targetUnit: "glasses",
			});
			await log(id, WEDNESDAY, 2);
			await render(<TodayScreen />);

			await fireEvent.press(
				await screen.findByLabelText("Add one, Water, 2 of 2"),
			);
			await waitForDb(async () =>
				expect(await entryRows()).toEqual([
					expect.objectContaining({ value: 3 }),
				]),
			);
			expect(toast()?.message).toBe("Water +1 · 3 of 2 glasses");
		});
	});

	describe("midnight", () => {
		it("with today selected, the screen moves to the new day and a write lands on it", async () => {
			fakeClock(new Date(2026, 8, 16, 23, 59, 30));
			const id = await addHabit({ name: "Read" });
			await render(<TodayScreen />);
			await screen.findByText("WEDNESDAY, 16 SEPTEMBER");

			await act(async () => {
				jest.setSystemTime(new Date(2026, 8, 17, 0, 0, 31));
				jest.advanceTimersByTime(61_000);
			});
			await screen.findByText("THURSDAY, 17 SEPTEMBER");

			await fireEvent.press(await screen.findByLabelText("Read, not done"));
			await waitForDb(async () =>
				expect(await entryRows()).toEqual([
					expect.objectContaining({ habitId: id, date: "2026-09-17" }),
				]),
			);
		});

		it("Undo after midnight still targets the day of the tap", async () => {
			const id = await addHabit({ name: "Read" });
			await render(<TodayScreen />);
			await fireEvent.press(await screen.findByLabelText("Read, not done"));
			await waitForDb(async () => expect(await entryRows()).toHaveLength(1));

			// Midnight passes with the toast still up, before the screen re-renders.
			jest.setSystemTime(new Date(2026, 8, 17, 0, 0, 5));
			await act(async () => {
				await toast()?.onAction?.();
			});

			expect(await entryRows()).toEqual([]);
			await log(id, "2026-09-17");
			expect(await entryRows()).toHaveLength(1);
		});

		it("a tap on a render that still shows yesterday writes nothing", async () => {
			await addHabit({ name: "Read" });
			await render(<TodayScreen />);
			const circle = await screen.findByLabelText("Read, not done");

			// The clock passes midnight; the 1 s margin timer has not yet refreshed the screen.
			jest.setSystemTime(new Date(2026, 8, 17, 0, 0, 0));
			await fireEvent.press(circle);

			expect(await entryRows()).toEqual([]);
			expect(toast()).toBeNull();
		});
	});

	describe("a rest-day bonus log never affects streaks (D11)", () => {
		it("logs the habit on its off day, shows the bonus, and leaves every streak as it was", async () => {
			const id = await addHabit({
				name: "Gym",
				frequency: { type: "weekdays", days: [4] },
			});
			await log(id, "2026-09-03");
			await log(id, "2026-09-10");
			const before = (await entryRows()) as Entry[];
			const habit = {
				...makeHabitInput({ frequency: { type: "weekdays", days: [4] } }),
				id,
				pauses: [],
				archivedAt: null,
				createdAt: new Date(2026, 0, 1),
			} as unknown as Habit;
			const asOf = new Date(2026, 8, 16);
			const streakBefore = calculateCurrentStreak(
				habit,
				before,
				new Set(),
				asOf,
			);
			expect(streakBefore).toBe(2);

			await render(<TodayScreen />);
			await fireEvent.press(
				await screen.findByLabelText("Gym, not due, bonus"),
			);
			await waitForDb(async () => expect(await entryRows()).toHaveLength(3));
			expect(toast()?.message).toBe("Logged 'Gym' · off-schedule");

			const after = (await entryRows()) as Entry[];
			expect(after.map((entry) => entry.date)).toContain(WEDNESDAY);
			expect(calculateCurrentStreak(habit, after, new Set(), asOf)).toBe(
				streakBefore,
			);
			expect(await screen.findByText("Bonus · streak unchanged")).toBeTruthy();
			expect(await screen.findByText("Rest day")).toBeTruthy();
			expect(await frozenRows()).toEqual([]);
		});
	});

	describe("freezes", () => {
		async function atRiskHabit() {
			const id = await addHabit({ name: "Read" });
			for (const date of ["2026-09-11", "2026-09-12", "2026-09-13", MONDAY]) {
				await log(id, date);
			}
			return id;
		}

		it("uses a freeze for yesterday, says how many are left, and Undo takes it back", async () => {
			const id = await atRiskHabit();
			await render(<TodayScreen />);

			await fireEvent.press(await screen.findByText("Read"));
			expect(await screen.findByText("Keep your Read streak?")).toBeTruthy();
			expect(screen.getByText("2 freezes left")).toBeTruthy();
			await fireEvent.press(screen.getByText("Use a freeze"));

			await waitForDb(async () =>
				expect(await frozenRows()).toEqual([
					expect.objectContaining({ habitId: id, date: TUESDAY }),
				]),
			);
			expect(toast()?.message).toBe("Freeze used for Tue 15 · 1 left");
			await waitFor(() =>
				expect(screen.queryByText("Keep your Read streak?")).toBeNull(),
			);

			await act(async () => {
				await toast()?.onAction?.();
			});
			expect(await frozenRows()).toEqual([]);
			await fireEvent.press(await screen.findByText("Read"));
			expect(await screen.findByText("2 freezes left")).toBeTruthy();
		});

		it("Not now writes nothing, and the habit stays at risk", async () => {
			await atRiskHabit();
			await render(<TodayScreen />);
			await fireEvent.press(await screen.findByText("Read"));
			await fireEvent.press(await screen.findByText("Not now"));

			expect(await frozenRows()).toEqual([]);
			expect(await entryRows()).toHaveLength(4);
			await fireEvent.press(await screen.findByText("Read"));
			expect(await screen.findByText("Keep your Read streak?")).toBeTruthy();
		});

		it("with the month's pool spent, the same tap opens the one-button explanation and writes nothing (SR3)", async () => {
			const other = await addHabit({ name: "Walk" });
			await atRiskHabit();
			await freeze(other, "2026-09-02");
			await freeze(other, "2026-09-03");
			await render(<TodayScreen />);

			await fireEvent.press(await screen.findByText("Read"));
			expect(
				await screen.findByText("No freezes left this month"),
			).toBeTruthy();
			expect(screen.getByText(/Your longest streak is kept\./)).toBeTruthy();
			expect(screen.queryByText("Use a freeze")).toBeNull();
			await fireEvent.press(screen.getByText("Got it"));

			expect(await frozenRows()).toHaveLength(2);
			expect(screen.queryByText("No freezes left this month")).toBeNull();
		});
	});
});

function useTodayDay(selectedInitially: Date | null) {
	const selected = useSelectedDayQueries();
	const today = useTodayQueries(selected.selectedKey);
	const offSchedule = useOffScheduleQueries(today.selectedDay);
	const logging = useTodayLogActions({
		today: today.today,
		selectedKey: selected.selectedKey,
		completedHabitIds: today.completedHabitIds,
		quantityValuesByHabitId: today.quantityValuesByHabitId,
		loggableHabits: [
			...today.groups.flatMap((group: { habits: Habit[] }) => group.habits),
			...offSchedule.eligibleHabits,
		],
	});
	return { selected, today, logging, selectedInitially };
}

describe("Today for a selected past day, on the in-memory database", () => {
	beforeEach(async () => {
		fakeClock(WED_NOON);
		await mockDb.delete(frozenDays);
		await mockDb.delete(entries);
		await mockDb.delete(habits);
		useToastStore.setState({ toast: null });
	});
	afterEach(() => jest.useRealTimers());

	it("lists only the habits that existed and were due then, and logs to that date with Undo on that date", async () => {
		const read = await addHabit({ name: "Read" });
		await addHabit({ name: "New one" }, new Date(2026, 8, 15));
		const { result } = await renderHook(() => useTodayDay(null));
		await waitFor(() => expect(result.current.today.isLoaded).toBe(true));

		await act(() => result.current.selected.selectDay(new Date(2026, 8, 14)));
		await waitFor(() =>
			expect(
				result.current.today.groups.flatMap((group: { habits: Habit[] }) =>
					group.habits.map((habit) => habit.name),
				),
			).toEqual(["Read"]),
		);

		const habit = result.current.today.groups[0].habits[0];
		await act(() => result.current.logging.toggle(habit));
		await waitForDb(async () =>
			expect(await entryRows()).toEqual([
				expect.objectContaining({ habitId: read, date: MONDAY }),
			]),
		);
		expect(toast()?.message).toBe("Marked 'Read' complete · Mon 14 Sep");

		await act(async () => {
			await toast()?.onAction?.();
		});
		expect(await entryRows()).toEqual([]);
	});

	it("keeps a past selection across midnight while today moves on; a followed day moves with it", async () => {
		await addHabit({ name: "Read" });
		const { result } = await renderHook(() => useTodayDay(null));
		await waitFor(() => expect(result.current.today.isLoaded).toBe(true));
		await act(() => result.current.selected.selectDay(new Date(2026, 8, 14)));

		await act(async () => {
			jest.setSystemTime(new Date(2026, 8, 17, 0, 0, 1));
			jest.advanceTimersByTime(13 * 3_600_000);
		});

		expect(result.current.selected.selectedKey).toBe(MONDAY);
		expect(result.current.today.today.getDate()).toBe(17);
		expect(result.current.today.selectedDay.getDate()).toBe(14);

		// And a write at 00:00:01 still lands on the selected Monday, not skipped.
		const habit = result.current.today.groups[0].habits[0];
		await act(() => result.current.logging.toggle(habit));
		await waitForDb(async () =>
			expect(await entryRows()).toEqual([
				expect.objectContaining({ date: MONDAY }),
			]),
		);

		await act(() => result.current.selected.showToday());
		expect(result.current.today.selectedDay.getDate()).toBe(17);
	});

	describe("logging a frozen day returns its freeze", () => {
		async function frozenTuesday() {
			const id = await addHabit({ name: "Read" });
			for (const date of ["2026-09-11", "2026-09-12", "2026-09-13", MONDAY]) {
				await log(id, date);
			}
			await freeze(id, TUESDAY);
			return id;
		}

		it("deletes the freeze with the entry, says so, and Undo puts both back exactly", async () => {
			const id = await frozenTuesday();
			const { result } = await renderHook(() => useTodayDay(null));
			await waitFor(() => expect(result.current.today.isLoaded).toBe(true));
			await act(() => result.current.selected.selectDay(new Date(2026, 8, 15)));
			await waitFor(() => expect(result.current.today.groups).toHaveLength(1));
			const habit = result.current.today.groups[0].habits[0];

			await act(() => result.current.logging.toggle(habit));

			await waitForDb(async () => expect(await frozenRows()).toEqual([]));
			expect(await entryRows()).toContainEqual(
				expect.objectContaining({ habitId: id, date: TUESDAY }),
			);
			expect(toast()?.message).toBe("Freeze returned for Tue 15 · 2 left");

			await act(async () => {
				await toast()?.onAction?.();
			});
			expect(await entryRows()).not.toContainEqual(
				expect.objectContaining({ date: TUESDAY }),
			);
			expect(await frozenRows()).toEqual([
				expect.objectContaining({ habitId: id, date: TUESDAY }),
			]);
		});

		it("a quantity amount short of the target keeps the freeze; reaching it returns it", async () => {
			const id = await addHabit({
				name: "Water",
				targetType: "quantity",
				targetAmount: 3,
				targetUnit: "glasses",
			});
			await freeze(id, TUESDAY);
			const { result } = await renderHook(() => useTodayDay(null));
			await waitFor(() => expect(result.current.today.isLoaded).toBe(true));
			await act(() => result.current.selected.selectDay(new Date(2026, 8, 15)));
			await waitFor(() => expect(result.current.today.groups).toHaveLength(1));
			const habit = result.current.today.groups[0].habits[0];

			await act(() => result.current.logging.addOne(habit));
			await waitForDb(async () => expect(await entryRows()).toHaveLength(1));
			expect(await frozenRows()).toHaveLength(1);

			await act(() => result.current.logging.openQuantitySheet(id));
			const sheet = result.current.logging.quantitySheet;
			expect(sheet).not.toBeNull();
			await render(<QuantityLogSheet {...sheet} onClosed={jest.fn()} />);
			await fireEvent.press(screen.getByText("Fill to 3"));
			await waitForDb(async () => expect(await frozenRows()).toEqual([]));
			await act(async () => {
				await fireEvent.press(screen.getByText("Done"));
			});
			expect(toast()?.message).toBe("Freeze returned for Tue 15 · 2 left");
		});
	});

	it("never shows streak-at-risk for a past day", async () => {
		const id = await addHabit({ name: "Read" });
		for (const date of ["2026-09-11", "2026-09-12", "2026-09-13", MONDAY]) {
			await log(id, date);
		}
		const { result } = await renderHook(() => useTodayDay(null));
		await waitFor(() =>
			expect(result.current.today.atRiskByHabitId.size).toBe(1),
		);
		await act(() => result.current.selected.selectDay(new Date(2026, 8, 14)));
		await waitFor(() =>
			expect(result.current.today.atRiskByHabitId.size).toBe(0),
		);
		await act(async () => {
			await mockDb.delete(entries).where(eq(entries.habitId, id));
		});
	});
});
