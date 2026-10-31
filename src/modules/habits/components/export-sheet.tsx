import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Banner } from "@/components/ui/composite/banner";
import { FileCard } from "@/components/ui/composite/file-card";
import { ProgressBar } from "@/components/ui/composite/progress-bar";
import { Sheet } from "@/components/ui/composite/sheet";
import { SheetHeader } from "@/components/ui/composite/sheet-header";
import { Button } from "@/components/ui/primitives/button";
import { FieldHelper } from "@/components/ui/primitives/field-helper";
import { SectionLabel } from "@/components/ui/primitives/section-label";
import { SegmentedControl } from "@/components/ui/primitives/segmented-control";
import { space } from "@/theme/theme";
import { formatCount, pluralise } from "@/utils/format";
import { useExportActions } from "../hooks/use-export-actions";
import {
	DEFAULT_EXPORT_OPTIONS,
	useExportQueries,
} from "../hooks/use-export-queries";
import { exportCopy } from "../messages";
import { kilobytesLabel } from "../presenters/settings-helpers";
import type { ExportFormat, ExportOptions } from "../types";

type ExportSheetProps = {
	visible: boolean;
	onClose: () => void;
};

const FORMAT_WORD: Record<ExportFormat, "JSON" | "CSV"> = {
	json: "JSON",
	csv: "CSV",
};

/**
 * Export data (HAB-44, EX1–EX4), opened from Settings and from Progress ›
 * Export. One sheet, four states of one export: choose JSON or CSV with a line
 * on what each is for; writing, with the file's name, a real percentage, the
 * format locked and the button reading Exporting…; ready, as a file card with
 * Share file; failed, with the reason and Retry first. Archived habits are
 * always in. The export lives in a store, so closing the sheet while it writes
 * leaves it running and a toast says when it is ready.
 */
export function ExportSheet({ visible, onClose }: ExportSheetProps) {
	const [options, setOptions] = useState<ExportOptions>(DEFAULT_EXPORT_OPTIONS);
	const { source } = useExportQueries(options);
	const exporter = useExportActions();
	const { phase, setSheetOpen } = exporter;

	// A finished export toasts only while no sheet is up.
	useEffect(() => {
		setSheetOpen(visible);
		return () => setSheetOpen(false);
	}, [visible, setSheetOpen]);

	function close() {
		exporter.reset();
		onClose();
	}

	const running =
		phase.name === "progress"
			? phase.fileName.endsWith(".csv")
				? "csv"
				: "json"
			: null;
	const format = running ?? options.format;

	const formatPicker = (
		<View style={styles.field}>
			<SectionLabel>{exportCopy.format}</SectionLabel>
			<SegmentedControl<ExportFormat>
				label={exportCopy.formatLabel}
				options={[
					{ value: "json", label: exportCopy.json },
					{ value: "csv", label: exportCopy.csv },
				]}
				value={format}
				disabled={running !== null}
				onChange={(next) =>
					setOptions((current) => ({ ...current, format: next }))
				}
			/>
		</View>
	);

	const content = (() => {
		switch (phase.name) {
			case "confirm":
				return (
					<>
						<SheetHeader
							title={exportCopy.title}
							actionLabel={exportCopy.close}
							onAction={close}
						/>
						{formatPicker}
						<FieldHelper plain tone="hint">
							{exportCopy.explain}
						</FieldHelper>
						<Button
							label={exportCopy.button(FORMAT_WORD[options.format])}
							onPress={() => void exporter.run(source, options)}
						/>
					</>
				);
			case "progress": {
				const { done, total } = phase.progress;
				return (
					<>
						<SheetHeader
							title={exportCopy.title}
							actionLabel={exportCopy.close}
							onAction={close}
						/>
						{formatPicker}
						<ProgressBar
							label={exportCopy.writing(phase.fileName)}
							value={total === 0 ? 0 : done / total}
						/>
						<FieldHelper plain tone="hint">
							{exportCopy.progressNote}
						</FieldHelper>
						<Button label={exportCopy.exporting} disabled onPress={() => {}} />
					</>
				);
			}
			case "ready":
				return (
					<>
						<SheetHeader
							title={exportCopy.title}
							actionLabel={exportCopy.close}
							onAction={close}
						/>
						<FileCard
							name={phase.result.name}
							meta={exportCopy.fileMeta(
								kilobytesLabel(phase.result.sizeBytes),
								pluralise(phase.result.habits, "habit"),
								`${formatCount(phase.result.logs)} ${phase.result.logs === 1 ? "log" : "logs"}`,
							)}
						/>
						{exporter.shareFailed ? (
							<Banner tone="error">{exportCopy.shareFailed}</Banner>
						) : null}
						<Button label={exportCopy.share} onPress={exporter.share} />
						<Button
							label={exportCopy.done}
							variant="secondary"
							onPress={close}
						/>
						<FieldHelper plain tone="hint">
							{exportCopy.shareNote}
						</FieldHelper>
					</>
				);
			case "failed":
				return (
					<>
						<SheetHeader
							title={exportCopy.title}
							actionLabel={exportCopy.close}
							onAction={close}
						/>
						<Banner
							tone="error"
							symbol="exclamationmark.circle"
							title={exportCopy.failed.title}
						>
							{phase.reason.kind === "storage"
								? exportCopy.failed.storage
								: exportCopy.failed.unknown}
						</Banner>
						<Button label={exportCopy.failed.retry} onPress={exporter.retry} />
						<Button
							label={exportCopy.failed.cancel}
							variant="secondary"
							onPress={close}
						/>
					</>
				);
		}
	})();

	return (
		<Sheet visible={visible} onDismiss={close}>
			{content}
		</Sheet>
	);
}

const styles = StyleSheet.create({
	field: {
		gap: space[150],
	},
});
