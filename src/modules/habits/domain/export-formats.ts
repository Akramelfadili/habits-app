import type { ExportFormat } from "../types";
import { toCsv } from "./export-csv";
import type { ExportModel } from "./export-data";
import { toJson } from "./export-json";

/**
 * One entry per export format — adding a format is a new serializer and a new
 * line here, not another branch in the service (same shape as the frequency
 * strategies).
 */
export type ExportFormatSpec = {
	extension: string;
	mimeType: string;
	serialize: (
		model: ExportModel,
		onProgress: (logsDone: number) => Promise<void> | void,
	) => Promise<string>;
};

export const EXPORT_FORMATS: Record<ExportFormat, ExportFormatSpec> = {
	csv: { extension: "csv", mimeType: "text/csv", serialize: toCsv },
	json: { extension: "json", mimeType: "application/json", serialize: toJson },
};
