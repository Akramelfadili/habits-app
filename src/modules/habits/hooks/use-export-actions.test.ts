import { act, renderHook } from "@testing-library/react-native";
import { clearLog, getLogEntries } from "@/lib/logger/logger";
import { useToastStore } from "@/store/toast-store";
import { makeExportSource } from "../test-support/export-fixtures";
import type { ExportOptions } from "../types";

const mockShare = jest.fn();
jest.mock("@/lib/file-export/file-export", () => ({
	shareFile: (...args: unknown[]) => mockShare(...args),
}));

const mockRunExport = jest.fn();
jest.mock("../services/export-service", () => {
	class ExportCancelledError extends Error {}
	class ExportFailedError extends Error {
		reason: unknown;
		constructor(reason: unknown) {
			super("failed");
			this.reason = reason;
		}
	}
	return {
		ExportCancelledError,
		ExportFailedError,
		exportFileName: (_today: Date, extension: string) =>
			`habits-2026-10-23.${extension}`,
		runExport: (...args: unknown[]) => mockRunExport(...args),
	};
});

import {
	ExportCancelledError,
	ExportFailedError,
} from "../services/export-service";
import { useExportActions, useExportStore } from "./use-export-actions";

const source = makeExportSource();
const options: ExportOptions = {
	format: "json",
	includeArchived: true,
	includeNotes: true,
};
const result = {
	uri: "file:///habits.json",
	name: "habits-2026-10-23.json",
	sizeBytes: 2048,
	mimeType: "application/json",
	habits: 2,
	logs: 3,
};

beforeEach(() => {
	jest.clearAllMocks();
	clearLog();
	useToastStore.setState({ toast: null });
	useExportStore.setState({
		phase: { name: "confirm" },
		openSheets: 0,
		last: null,
		shareFailed: false,
	});
});

describe("useExportActions (EX1–EX4)", () => {
	it("starts at the format choice, then writes with the file's name and progress, then is ready", async () => {
		let finish: (value: typeof result) => void = () => {};
		mockRunExport.mockImplementation(
			({ onProgress }) =>
				new Promise((resolve) => {
					onProgress({ done: 2, total: 3 });
					finish = resolve;
				}),
		);
		const { result: hook } = await renderHook(() => useExportActions());
		expect(hook.current.phase.name).toBe("confirm");

		let running: Promise<void> = Promise.resolve();
		await act(async () => {
			running = hook.current.run(source, options);
		});
		expect(hook.current.phase).toEqual({
			name: "progress",
			fileName: "habits-2026-10-23.json",
			progress: { done: 2, total: 3 },
		});

		await act(async () => {
			finish(result);
			await running;
		});
		expect(hook.current.phase).toEqual({ name: "ready", result });
	});

	it("passes the chosen options to the service, archived habits included", async () => {
		mockRunExport.mockResolvedValue(result);
		const { result: hook } = await renderHook(() => useExportActions());
		await act(() => hook.current.run(source, options));
		expect(mockRunExport).toHaveBeenCalledWith(
			expect.objectContaining({ source, options }),
		);
		expect(mockRunExport.mock.calls[0][0].options.includeArchived).toBe(true);
	});

	it("a second Export tap while one is writing does nothing", async () => {
		mockRunExport.mockImplementation(() => new Promise(() => {}));
		const { result: hook } = await renderHook(() => useExportActions());
		await act(async () => {
			void hook.current.run(source, options);
		});
		await act(async () => {
			void hook.current.run(source, options);
		});
		expect(mockRunExport).toHaveBeenCalledTimes(1);
	});

	describe("closing the sheet keeps it running (EX2)", () => {
		it("a reset while writing changes nothing, and a toast says when it is ready", async () => {
			let finish: (value: typeof result) => void = () => {};
			mockRunExport.mockImplementation(
				() =>
					new Promise((resolve) => {
						finish = resolve;
					}),
			);
			const { result: hook } = await renderHook(() => useExportActions());
			let running: Promise<void> = Promise.resolve();
			await act(async () => {
				hook.current.trackSheet(1);
				running = hook.current.run(source, options);
			});
			await act(async () => {
				hook.current.reset();
				hook.current.trackSheet(-1);
			});
			expect(hook.current.phase.name).toBe("progress");

			await act(async () => {
				finish(result);
				await running;
			});
			expect(hook.current.phase.name).toBe("ready");
			expect(useToastStore.getState().toast?.message).toBe(
				"Export ready · habits-2026-10-23.json",
			);
		});

		it("says nothing in a toast when the sheet is still open", async () => {
			mockRunExport.mockResolvedValue(result);
			const { result: hook } = await renderHook(() => useExportActions());
			await act(async () => {
				hook.current.trackSheet(1);
				await hook.current.run(source, options);
			});
			expect(useToastStore.getState().toast).toBeNull();
		});

		it("stays quiet while a second sheet is still open after the first closes", async () => {
			mockRunExport.mockResolvedValue(result);
			const { result: hook } = await renderHook(() => useExportActions());
			await act(async () => {
				hook.current.trackSheet(1);
				hook.current.trackSheet(1);
				hook.current.trackSheet(-1);
				await hook.current.run(source, options);
			});
			expect(useToastStore.getState().toast).toBeNull();
		});

		it("a failure while closed toasts it as an error, and the sheet shows it on reopening", async () => {
			mockRunExport.mockRejectedValue(
				new ExportFailedError({ kind: "storage", neededBytes: 5000 }),
			);
			const { result: hook } = await renderHook(() => useExportActions());
			await act(() => hook.current.run(source, options));
			expect(useToastStore.getState().toast).toMatchObject({
				tone: "error",
			});
			expect(hook.current.phase).toEqual({
				name: "failed",
				reason: { kind: "storage", neededBytes: 5000 },
			});
		});

		it("a finished export is cleared by reset, so the next open starts at the choice", async () => {
			mockRunExport.mockResolvedValue(result);
			const { result: hook } = await renderHook(() => useExportActions());
			await act(() => hook.current.run(source, options));
			await act(async () => hook.current.reset());
			expect(hook.current.phase.name).toBe("confirm");
		});
	});

	it("a failure shows why, and Retry reuses the same options (EX4)", async () => {
		mockRunExport.mockRejectedValueOnce(
			new ExportFailedError({ kind: "storage", neededBytes: 5000 }),
		);
		mockRunExport.mockResolvedValueOnce(result);
		const { result: hook } = await renderHook(() => useExportActions());

		await act(() => hook.current.run(source, options));
		expect(hook.current.phase).toEqual({
			name: "failed",
			reason: { kind: "storage", neededBytes: 5000 },
		});

		await act(() => hook.current.retry());
		expect(mockRunExport).toHaveBeenCalledTimes(2);
		expect(mockRunExport.mock.calls[1][0].options).toEqual(options);
		expect(hook.current.phase.name).toBe("ready");
	});

	it("an aborted run returns to the format choice", async () => {
		mockRunExport.mockRejectedValue(new ExportCancelledError());
		const { result: hook } = await renderHook(() => useExportActions());
		await act(() => hook.current.run(source, options));
		expect(hook.current.phase.name).toBe("confirm");
	});

	it("an unexpected (non-ExportFailedError) failure is logged and shown as unknown", async () => {
		mockRunExport.mockRejectedValue(new Error("boom"));
		const { result: hook } = await renderHook(() => useExportActions());
		await act(() => hook.current.run(source, options));
		expect(hook.current.phase).toEqual({
			name: "failed",
			reason: { kind: "unknown" },
		});
		expect(
			getLogEntries().some(
				(entry) => entry.level === "error" && entry.event.startsWith("export."),
			),
		).toBe(true);
	});

	describe("Share file", () => {
		it("shares the finished file with its type", async () => {
			mockRunExport.mockResolvedValue(result);
			mockShare.mockResolvedValue(undefined);
			const { result: hook } = await renderHook(() => useExportActions());
			await act(() => hook.current.run(source, options));
			await act(() => hook.current.share());
			expect(mockShare).toHaveBeenCalledWith(result.uri, result.mimeType);
			expect(hook.current.shareFailed).toBe(false);
		});

		it("returns to the choice screen once shared: the file is deleted, so another export is needed", async () => {
			mockRunExport.mockResolvedValue(result);
			mockShare.mockResolvedValue(undefined);
			const { result: hook } = await renderHook(() => useExportActions());
			await act(() => hook.current.run(source, options));
			await act(() => hook.current.share());
			expect(hook.current.phase).toEqual({ name: "confirm" });
		});

		it("a failed share keeps the finished file on screen for a retry", async () => {
			mockRunExport.mockResolvedValue(result);
			mockShare.mockRejectedValue(new Error("no share sheet"));
			const { result: hook } = await renderHook(() => useExportActions());
			await act(() => hook.current.run(source, options));
			await act(() => hook.current.share());
			expect(hook.current.phase).toEqual({ name: "ready", result });
		});

		it("a failing share becomes an inline flag, never a rejection", async () => {
			mockRunExport.mockResolvedValue(result);
			mockShare.mockRejectedValue(new Error("no share sheet"));
			const { result: hook } = await renderHook(() => useExportActions());
			await act(() => hook.current.run(source, options));
			await act(() => hook.current.share());
			expect(hook.current.shareFailed).toBe(true);
		});

		it("does nothing before there is a file", async () => {
			const { result: hook } = await renderHook(() => useExportActions());
			await act(() => hook.current.share());
			expect(mockShare).not.toHaveBeenCalled();
		});
	});
});
