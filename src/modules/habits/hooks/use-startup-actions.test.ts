import { act, renderHook } from "@testing-library/react-native";
import { AppState } from "react-native";

const mockWarn = jest.fn();
jest.mock("@/lib/logger/logger", () => ({
	log: { warn: (...args: unknown[]) => mockWarn(...args) },
}));

const mockReconcile = jest.fn();
const mockClearExports = jest.fn();
jest.mock("../services/reminder-reconcile-service", () => ({
	reconcileScheduledReminders: () => mockReconcile(),
}));
jest.mock("@/lib/file-export/file-export", () => ({
	clearExports: () => mockClearExports(),
}));

describe("useStartupActions", () => {
	beforeEach(() => {
		mockReconcile.mockReset().mockResolvedValue(undefined);
		mockClearExports.mockReset();
		mockWarn.mockReset();
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

	it("clears the export and diagnostics files an earlier run left behind (E-03)", async () => {
		const useStartupActions = load();
		await renderHook(() => useStartupActions());
		expect(mockClearExports).toHaveBeenCalledTimes(1);
	});

	it("a failing cleanup is logged and does not stop startup", async () => {
		mockClearExports.mockImplementation(() => {
			throw new Error("Operation not permitted");
		});
		const useStartupActions = load();
		await renderHook(() => useStartupActions());
		expect(mockReconcile).toHaveBeenCalledTimes(1);
		expect(mockWarn).toHaveBeenCalledTimes(1);
		expect(mockWarn).toHaveBeenCalledWith("export.cleanup_failed", {
			error: expect.any(Error),
		});
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
