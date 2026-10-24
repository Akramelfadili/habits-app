import { act, renderHook } from "@testing-library/react-native";
import { AppState } from "react-native";

const mockReconcile = jest.fn();
jest.mock("../services/reminder-reconcile-service", () => ({
	reconcileScheduledReminders: () => mockReconcile(),
}));

describe("useStartupActions", () => {
	beforeEach(() => {
		mockReconcile.mockReset().mockResolvedValue(undefined);
	});

	/** A fresh module (its once-per-runtime flag reset), on the same React the renderer uses. */
	function load() {
		let hook!: () => void;
		const react = jest.requireActual("react");
		jest.isolateModules(() => {
			jest.doMock("react", () => react);
			hook = require("./use-startup-actions").useStartupActions;
		});
		return hook;
	}

	it("reconciles reminders once on mount", async () => {
		const useStartupActions = load();
		await renderHook(() => useStartupActions());
		expect(mockReconcile).toHaveBeenCalledTimes(1);
	});

	it("does not run again on a re-render, a remount, or a return to the foreground", async () => {
		const useStartupActions = load();
		const first = await renderHook(() => useStartupActions());
		await first.rerender({});
		await first.unmount();
		await renderHook(() => useStartupActions());

		const listeners: Array<(state: string) => void> = [];
		const spy = jest
			.spyOn(AppState, "addEventListener")
			.mockImplementation((_type, listener) => {
				listeners.push(listener as (state: string) => void);
				return { remove: () => {} };
			});
		await act(() => {
			for (const listener of listeners) listener("active");
		});
		spy.mockRestore();

		expect(mockReconcile).toHaveBeenCalledTimes(1);
	});
});
