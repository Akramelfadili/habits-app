import { format } from "date-fns";
import { setSetting } from "@/lib/app-settings/repositories/app-settings-repository";
import {
	clearExports,
	discardFile,
	promoteScratchFile,
	writeScratchFile,
} from "@/lib/file-export/file-export";
import { log } from "@/lib/logger/logger";
import { LAST_EXPORT_SETTING_KEY } from "../constants";
import { buildExportModel, type ExportSource } from "../domain/export-data";
import { EXPORT_FORMATS } from "../domain/export-formats";
import type { ExportOptions } from "../types";

/**
 * Runs a data export (HAB-15): build → serialize (with progress) → write to a
 * scratch path → rename into place → record the date. A composite operation
 * with real ordering rules, hence a service:
 *
 * - Cancel (an aborted `signal`) and failure both delete the scratch file, so
 *   no partial export is ever left on disk.
 * - "Last export" is written only after the file is in place — a cancelled or
 *   failed run leaves it untouched.
 * - Earlier exports are cleared first, so the cache never accumulates them.
 */

export type ExportProgress = { done: number; total: number };

export type ExportResult = {
	uri: string;
	name: string;
	sizeBytes: number;
	mimeType: string;
	habits: number;
	logs: number;
};

export type ExportFailureReason =
	| { kind: "storage"; neededBytes: number }
	| { kind: "unknown" };

export class ExportCancelledError extends Error {
	constructor() {
		super("Export cancelled");
		this.name = "ExportCancelledError";
	}
}

export class ExportFailedError extends Error {
	/** `options.cause` is the real error — kept for the log and diagnostics, never shown as text. */
	constructor(
		readonly reason: ExportFailureReason,
		options?: { cause?: unknown },
	) {
		super(
			reason.kind === "storage" ? "Out of storage" : "Export failed",
			options,
		);
		this.name = "ExportFailedError";
	}
}

const STORAGE_ERROR = /no space|enospc|out of (storage|space)|disk full/i;

/** Lets the UI repaint (and a cancel tap land) between serializer chunks. */
const yieldToUi = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

export function exportFileName(today: Date, extension: string): string {
	return `habits-${format(today, "yyyy-MM-dd")}.${extension}`;
}

type RunExportInput = {
	source: ExportSource;
	options: ExportOptions;
	today: Date;
	signal?: AbortSignal;
	onProgress?: (progress: ExportProgress) => void;
};

export async function runExport({
	source,
	options,
	today,
	signal,
	onProgress,
}: RunExportInput): Promise<ExportResult> {
	const spec = EXPORT_FORMATS[options.format];
	const model = buildExportModel(source, options, today);
	const throwIfCancelled = () => {
		if (signal?.aborted) throw new ExportCancelledError();
	};

	let scratchUri: string | null = null;
	let neededBytes = 0;
	try {
		throwIfCancelled();
		clearExports();
		const content = await spec.serialize(model, async (done) => {
			onProgress?.({ done, total: model.logCount });
			await yieldToUi();
			throwIfCancelled();
		});
		neededBytes = new TextEncoder().encode(content).length;

		const scratch = writeScratchFile(content);
		scratchUri = scratch.uri;
		throwIfCancelled();

		const written = promoteScratchFile(
			scratch,
			exportFileName(today, spec.extension),
		);
		scratchUri = written.uri;
		throwIfCancelled();

		await setSetting(LAST_EXPORT_SETTING_KEY, format(today, "yyyy-MM-dd"));
		return {
			uri: written.uri,
			name: written.name,
			sizeBytes: written.sizeBytes,
			mimeType: spec.mimeType,
			habits: model.habits.length,
			logs: model.logCount,
		};
	} catch (caught) {
		if (scratchUri) discardFile(scratchUri);
		if (caught instanceof ExportCancelledError) throw caught;
		const message = caught instanceof Error ? caught.message : String(caught);
		const reason: ExportFailureReason =
			neededBytes > 0 && STORAGE_ERROR.test(message)
				? { kind: "storage", neededBytes }
				: { kind: "unknown" };
		const failure = new ExportFailedError(reason, { cause: caught });
		log.error("export", "export failed", failure, { neededBytes });
		throw failure;
	}
}
