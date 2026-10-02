import { act, renderHook } from "@testing-library/react-native";
import { makeExportSource } from "../test-support/export-fixtures";
import type { ExportOptions } from "../types";

jest.mock("../repositories/frozen-day-repository", () => ({}));

const mockShare = jest.fn();
const mockSave = jest.fn();
jest.mock("@/lib/file-export/file-export", () => ({
	shareFile: (...args: unknown[]) => mockShare(...args),
	saveFileToFolder: (...args: unknown[]) => mockSave(...args),
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
		runExport: (...args: unknown[]) => mockRunExport(...args),
	};
});

import {
	ExportCancelledError,
	ExportFailedError,
} from "../services/export-service";
import { useExportActions } from "./use-export-actions";

const source = makeExportSource();
const options: ExportOptions = { format: "json", includeArchived: false };
const result = {
	uri: "file:///habits.json",
	name: "habits.json",
	sizeBytes: 2048,
	mimeType: "application/json",
	habits: 2,
	logs: 3,
};

beforeEach(() => {
	jest.clearAllMocks();
});

describe("useExportActions", () => {
	it("starts at confirm, shows progress while running, then ready", async () => {
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
			progress: { done: 2, total: 3 },
		});

		await act(async () => {
			finish(result);
			await running;
		});
		expect(hook.current.phase).toEqual({ name: "ready", result });
	});

	it("passes the chosen options to the service", async () => {
		mockRunExport.mockResolvedValue(result);
		const { result: hook } = await renderHook(() => useExportActions());
		await act(() => hook.current.run(source, options));
		expect(mockRunExport).toHaveBeenCalledWith(
			expect.objectContaining({ source, options }),
		);
	});

	it("a failure shows why, and Try again reuses the same options", async () => {
		mockRunExport.mockRejectedValueOnce(
			new ExportFailedError({ kind: "storage", neededBytes: 100 }),
		);
		const { result: hook } = await renderHook(() => useExportActions());
		await act(() => hook.current.run(source, options));
		expect(hook.current.phase).toEqual({
			name: "failed",
			reason: { kind: "storage", neededBytes: 100 },
		});

		mockRunExport.mockResolvedValueOnce(result);
		await act(() => hook.current.retry());
		expect(mockRunExport).toHaveBeenLastCalledWith(
			expect.objectContaining({ source, options }),
		);
		expect(hook.current.phase.name).toBe("ready");
	});

	it("cancel aborts the run and returns to confirm", async () => {
		mockRunExport.mockImplementation(
			({ signal }: { signal: AbortSignal }) =>
				new Promise((_, reject) => {
					signal.addEventListener("abort", () =>
						reject(new ExportCancelledError()),
					);
				}),
		);
		const { result: hook } = await renderHook(() => useExportActions());
		let running: Promise<void> = Promise.resolve();
		await act(async () => {
			running = hook.current.run(source, options);
		});
		expect(hook.current.phase.name).toBe("progress");

		await act(async () => {
			hook.current.cancel();
			await running;
		});
		expect(hook.current.phase.name).toBe("confirm");
	});

	it("shares and saves the finished file", async () => {
		mockRunExport.mockResolvedValue(result);
		const { result: hook } = await renderHook(() => useExportActions());
		await act(() => hook.current.run(source, options));

		await act(() => hook.current.share());
		expect(mockShare).toHaveBeenCalledWith(result.uri, result.mimeType);
		await act(() => hook.current.saveToFiles());
		expect(mockSave).toHaveBeenCalledWith(result.uri);
	});
});
