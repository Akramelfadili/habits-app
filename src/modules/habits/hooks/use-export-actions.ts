import { create } from "zustand";
import { shareFile } from "@/lib/file-export/file-export";
import { log } from "@/lib/logger/logger";
import type { ExportSource } from "../domain/export-data";
import { EXPORT_FORMATS } from "../domain/export-formats";
import { messages, showMessage } from "../messages";
import {
	ExportCancelledError,
	ExportFailedError,
	type ExportProgress,
	type ExportResult,
	exportFileName,
	runExport,
} from "../services/export-service";
import type { ExportFailureReason, ExportOptions } from "../types";

type ExportPhase =
	| { name: "confirm" }
	| { name: "progress"; fileName: string; progress: ExportProgress }
	| { name: "ready"; result: ExportResult }
	| { name: "failed"; reason: ExportFailureReason };

type ExportState = {
	phase: ExportPhase;
	openSheets: number;
	last: { source: ExportSource; options: ExportOptions } | null;
	shareFailed: boolean;
	trackSheet: (delta: 1 | -1) => void;
	run: (source: ExportSource, options: ExportOptions) => Promise<void>;
	retry: () => Promise<void>;
	share: () => Promise<void>;
	reset: () => void;
};

// State lives here, not in the sheet: closing the sheet mid-write leaves the export running, and any export sheet shows where it stands.
export const useExportStore = create<ExportState>((set, get) => ({
	phase: { name: "confirm" },
	openSheets: 0,
	last: null,
	shareFailed: false,
	trackSheet: (delta) =>
		set((state) => ({ openSheets: Math.max(0, state.openSheets + delta) })),

	run: async (source, options) => {
		if (get().phase.name === "progress") return;
		set({ last: { source, options } });
		const today = new Date();
		const fileName = exportFileName(
			today,
			EXPORT_FORMATS[options.format].extension,
		);
		set({
			shareFailed: false,
			phase: {
				name: "progress",
				fileName,
				progress: { done: 0, total: 0 },
			},
		});
		try {
			const result = await runExport({
				source,
				options,
				today,
				onProgress: (progress) =>
					set((state) =>
						// A late tick after the run finished must not pull the sheet back.
						state.phase.name === "progress"
							? { phase: { ...state.phase, progress } }
							: state,
					),
			});
			set({ phase: { name: "ready", result } });
			if (get().openSheets === 0)
				showMessage(messages.exportReady, [result.name]);
		} catch (caught) {
			if (caught instanceof ExportCancelledError) {
				set({ phase: { name: "confirm" } });
				return;
			}
			// A failure `runExport` didn't wrap is still logged, with its cause.
			if (!(caught instanceof ExportFailedError)) {
				log.error("export.failed_unexpectedly", { error: caught });
			}
			set({
				phase: {
					name: "failed",
					reason:
						caught instanceof ExportFailedError
							? caught.reason
							: { kind: "unknown" },
				},
			});
			if (get().openSheets === 0)
				showMessage(messages.exportFailedWhileClosed, []);
		}
	},

	retry: async () => {
		const { last } = get();
		if (last) await get().run(last.source, last.options);
	},

	share: async () => {
		const { phase } = get();
		if (phase.name !== "ready") return;
		set({ shareFailed: false });
		try {
			// The share sheet resolves on dismissal either way — there is no
			// "cancelled" to tell apart from "sent".
			await shareFile(phase.result.uri, phase.result.mimeType);
			// The file is deleted once shared, so a second Share would have
			// nothing to send: back to the choice screen, where Export makes a new one.
			if (get().phase === phase) set({ phase: { name: "confirm" } });
		} catch (error) {
			log.error("export.share_failed", { error });
			set({ shareFailed: true });
		}
	},

	reset: () => {
		// A running export keeps running: only a finished or failed one is cleared.
		if (get().phase.name === "progress") return;
		set({ phase: { name: "confirm" }, shareFailed: false });
	},
}));

export function useExportActions() {
	const phase = useExportStore((state) => state.phase);
	const shareFailed = useExportStore((state) => state.shareFailed);
	const run = useExportStore((state) => state.run);
	const retry = useExportStore((state) => state.retry);
	const share = useExportStore((state) => state.share);
	const reset = useExportStore((state) => state.reset);
	const trackSheet = useExportStore((state) => state.trackSheet);
	return { phase, shareFailed, run, retry, share, reset, trackSheet };
}
