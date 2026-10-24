import { act, renderHook } from "@testing-library/react-native";
import type * as WebAppSettingsRepository from "./app-settings-repository.web";

// Jest runs as iOS, so `./app-settings-repository` would resolve to the SQLite
// one — require the web file explicitly, fresh per test so the store resets.
function loadRepository(): typeof WebAppSettingsRepository {
	let repository!: typeof WebAppSettingsRepository;
	const react = jest.requireActual("react");
	jest.isolateModules(() => {
		// Share the test renderer's React — an isolated copy has no hook dispatcher.
		jest.doMock("react", () => react);
		repository = require("./app-settings-repository.web");
	});
	return repository;
}

describe("app-settings-repository.web", () => {
	it("seeds 'seen first run' as true by default", async () => {
		const { getSetting } = loadRepository();
		expect(await getSetting("habits.seenFirstRun")).toBe("true");
	});

	it("notifies live readers when a setting changes", async () => {
		const { setSetting, useAppSetting } = loadRepository();
		const { result } = await renderHook(() => useAppSetting("theme"));
		expect(result.current).toBeNull();

		await act(async () => {
			await setSetting("theme", "dark");
		});
		expect(result.current).toBe("dark");
	});

	it("deletes a setting back to 'never set' and notifies live readers", async () => {
		const { deleteSetting, useAppSetting } = loadRepository();
		const { result } = await renderHook(() =>
			useAppSetting("habits.seenFirstRun"),
		);
		expect(result.current).toBe("true");

		await act(async () => {
			await deleteSetting("habits.seenFirstRun");
		});
		expect(result.current).toBeNull();
	});

	it("follows a changed key (parity with the native live hook)", async () => {
		const { setSetting, useAppSetting } = loadRepository();
		await setSetting("first", "one");
		await setSetting("second", "two");
		const { result, rerender } = await renderHook(
			(key: string) => useAppSetting(key),
			{ initialProps: "first" },
		);
		expect(result.current).toBe("one");

		await rerender("second");
		expect(result.current).toBe("two");
	});
});
