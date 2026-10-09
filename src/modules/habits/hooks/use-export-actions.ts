import { useCallback, useReducer, useRef, useState } from "react";
import { saveFileToFolder, shareFile } from "@/lib/file-export/file-export";
import { log } from "@/lib/logger/logger";
import { failureMessage } from "@/utils/failure-message";
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

/** How the last Share / Save to Files ended, when it didn't simply close the sheet. */
export type ExportDelivery =
	| { kind: "saved" }
	| { kind: "error"; message: string };

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
	const [delivery, setDelivery] = useState<ExportDelivery | null>(null);

	const run = useCallback(
		async (source: ExportSource, options: ExportOptions) => {
			last.current = { source, options };
			setDelivery(null);
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
					// A failure `runExport` didn't wrap is still logged, with its cause.
					log.error("export", "export failed unexpectedly", caught);
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

	// Neither of these may reject into an `onPress`: a failure becomes an inline
	// message on the ready card, and backing out of the system UI is not a failure.
	const share = useCallback(async () => {
		if (phase.name !== "ready") return;
		setDelivery(null);
		try {
			// The share sheet resolves on dismissal either way — there is no
			// "cancelled" to tell apart from "sent".
			await shareFile(phase.result.uri, phase.result.mimeType);
		} catch (error) {
			log.error("export", "share failed", error);
			setDelivery({
				kind: "error",
				message: failureMessage("share", "the file"),
			});
		}
	}, [phase]);

	const saveToFiles = useCallback(async () => {
		if (phase.name !== "ready") return;
		setDelivery(null);
		try {
			// false = the person backed out of the folder picker: say nothing.
			if (await saveFileToFolder(phase.result.uri)) {
				setDelivery({ kind: "saved" });
			}
		} catch (error) {
			log.error("export", "save to Files failed", error);
			setDelivery({
				kind: "error",
				message: failureMessage("save", "the file"),
			});
		}
	}, [phase]);

	const reset = useCallback(() => {
		setDelivery(null);
		dispatch({ type: "reset" });
	}, []);

	return { phase, delivery, run, retry, cancel, share, saveToFiles, reset };
}
