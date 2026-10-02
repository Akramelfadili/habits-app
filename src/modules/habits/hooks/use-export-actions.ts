import { useCallback, useReducer, useRef } from "react";
import { saveFileToFolder, shareFile } from "@/lib/file-export/file-export";
import type { ExportSource } from "../services/export-data";
import {
	ExportCancelledError,
	ExportFailedError,
	type ExportFailureReason,
	type ExportProgress,
	type ExportResult,
	runExport,
} from "../services/export-service";
import type { ExportOptions } from "../types";

export type ExportPhase =
	| { name: "confirm" }
	| { name: "progress"; progress: ExportProgress }
	| { name: "ready"; result: ExportResult }
	| { name: "failed"; reason: ExportFailureReason };

type Action =
	| { type: "start" }
	| { type: "progress"; progress: ExportProgress }
	| { type: "done"; result: ExportResult }
	| { type: "failed"; reason: ExportFailureReason }
	| { type: "reset" };

function reducer(state: ExportPhase, action: Action): ExportPhase {
	switch (action.type) {
		case "start":
			return { name: "progress", progress: { done: 0, total: 0 } };
		case "progress":
			// A late tick after cancel/finish must not drag the sheet back to "progress".
			return state.name === "progress"
				? { name: "progress", progress: action.progress }
				: state;
		case "done":
			return { name: "ready", result: action.result };
		case "failed":
			return { name: "failed", reason: action.reason };
		case "reset":
			return { name: "confirm" };
	}
}

/**
 * The export sheet's state machine (HAB-15): confirm → progress → ready |
 * failed. "Try again" re-runs with the same options (`run` remembers them);
 * cancel aborts the run, which deletes the partial file (see `runExport`).
 */
export function useExportActions() {
	const [phase, dispatch] = useReducer(reducer, { name: "confirm" });
	const controller = useRef<AbortController | null>(null);
	const last = useRef<{ source: ExportSource; options: ExportOptions } | null>(
		null,
	);

	const run = useCallback(
		async (source: ExportSource, options: ExportOptions) => {
			last.current = { source, options };
			const abort = new AbortController();
			controller.current = abort;
			dispatch({ type: "start" });
			try {
				const result = await runExport({
					source,
					options,
					today: new Date(),
					signal: abort.signal,
					onProgress: (progress) => dispatch({ type: "progress", progress }),
				});
				dispatch({ type: "done", result });
			} catch (caught) {
				if (caught instanceof ExportCancelledError) {
					dispatch({ type: "reset" });
				} else {
					dispatch({
						type: "failed",
						reason:
							caught instanceof ExportFailedError
								? caught.reason
								: { kind: "unknown" },
					});
				}
			} finally {
				if (controller.current === abort) controller.current = null;
			}
		},
		[],
	);

	const retry = useCallback(async () => {
		if (last.current) await run(last.current.source, last.current.options);
	}, [run]);

	const cancel = useCallback(() => controller.current?.abort(), []);

	const share = useCallback(async () => {
		if (phase.name === "ready") {
			await shareFile(phase.result.uri, phase.result.mimeType);
		}
	}, [phase]);

	const saveToFiles = useCallback(async () => {
		if (phase.name === "ready") await saveFileToFolder(phase.result.uri);
	}, [phase]);

	const reset = useCallback(() => dispatch({ type: "reset" }), []);

	return { phase, run, retry, cancel, share, saveToFiles, reset };
}
