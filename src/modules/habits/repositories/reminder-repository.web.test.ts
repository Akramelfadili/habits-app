import { act, renderHook } from "@testing-library/react-native";
import type * as WebReminderRepository from "./reminder-repository.web";

function loadRepository(): typeof WebReminderRepository {
	let repository!: typeof WebReminderRepository;
	const react = jest.requireActual("react");
	jest.isolateModules(() => {
		jest.doMock("react", () => react);
		repository = require("./reminder-repository.web");
	});
	return repository;
}

describe("reminder-repository.web", () => {
	it("starts empty outside the reminders scenarios", async () => {
		const { useHabitReminders } = loadRepository();
		const { result } = await renderHook(() => useHabitReminders(1));
		expect(result.current).toEqual([]);
	});

	it("restores a removed reminder under the same id, and refuses a duplicate", async () => {
		const {
			createReminder,
			deleteReminder,
			restoreReminder,
			getHabitReminders,
		} = loadRepository();
		const made = await createReminder({
			habitId: 1,
			hour: 8,
			minute: 30,
			weekdays: [3, 1],
			enabled: false,
		});
		await deleteReminder(made.id);

		expect(await restoreReminder(made)).toEqual(made);
		expect(await getHabitReminders(1)).toEqual([made]);
		await expect(restoreReminder(made)).rejects.toThrow();
	});

	it("create, update and delete all notify live readers, earliest-first", async () => {
		const {
			createReminder,
			updateReminder,
			deleteReminder,
			useHabitReminders,
		} = loadRepository();
		const { result } = await renderHook(() => useHabitReminders(1));

		let late!: Awaited<ReturnType<typeof createReminder>>;
		await act(async () => {
			late = await createReminder({
				habitId: 1,
				hour: 21,
				minute: 0,
				weekdays: [7, 6],
				enabled: true,
			});
			await createReminder({
				habitId: 1,
				hour: 7,
				minute: 20,
				weekdays: [1],
				enabled: true,
			});
		});
		expect(result.current.map((r) => r.hour)).toEqual([7, 21]);
		expect(result.current[1].weekdays).toEqual([6, 7]);

		await act(async () => {
			await updateReminder(late.id, { enabled: false });
		});
		expect(result.current[1].enabled).toBe(false);

		await act(async () => {
			await deleteReminder(late.id);
		});
		expect(result.current.map((r) => r.hour)).toEqual([7]);
	});
});
