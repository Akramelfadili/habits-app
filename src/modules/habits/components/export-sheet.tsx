import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Banner } from "@/components/ui/composite/banner";
import { Container } from "@/components/ui/composite/container";
import { FileCard } from "@/components/ui/composite/file-card";
import { ListItem } from "@/components/ui/composite/list-item";
import { ProgressBar } from "@/components/ui/composite/progress-bar";
import { Sheet } from "@/components/ui/composite/sheet";
import { SheetHeader } from "@/components/ui/composite/sheet-header";
import { Button } from "@/components/ui/primitives/button";
import { Caption } from "@/components/ui/primitives/caption";
import { IconBadge } from "@/components/ui/primitives/icon-badge";
import { KeyValueRow } from "@/components/ui/primitives/key-value-row";
import { SegmentedControl } from "@/components/ui/primitives/segmented-control";
import { Toggle } from "@/components/ui/primitives/toggle";
import { copyDiagnostics } from "@/lib/diagnostics/diagnostics";
import { typeScale } from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";
import { formatCount, pluralise } from "@/utils/format";
import { useExportActions } from "../hooks/use-export-actions";
import {
	DEFAULT_EXPORT_OPTIONS,
	useExportQueries,
} from "../hooks/use-settings-queries";
import {
	EXPORT_FAILURE_REASSURANCE,
	entriesLabel,
	exportButtonLabel,
	exportFailureMessage,
	habitsCountLabel,
	kilobytesLabel,
	logsCountLabel,
	rangeLabel,
} from "../screens/settings-helpers";
import type { ExportFormat, ExportOptions } from "../types";

type ExportSheetProps = {
	visible: boolean;
	onClose: () => void;
};

/**
 * The export flow (HAB-15, frames B3–B6) as one stacked sheet that never
 * navigates away: confirm → progress → ready, or failed. Confirm states
 * exactly what goes in the file, and the button quotes the entry count for
 * the current toggle. Progress is the only phase that can't be dismissed by
 * the scrim — Cancel export is its own action.
 */
export function ExportSheet({ visible, onClose }: ExportSheetProps) {
	const { colors } = useTheme();
	const [options, setOptions] = useState<ExportOptions>(DEFAULT_EXPORT_OPTIONS);
	const { source, summary } = useExportQueries(options);
	const exporter = useExportActions();
	const { phase } = exporter;
	const [diagnosticsResult, setDiagnosticsResult] = useState<
		"copied" | "shared" | "failed" | null
	>(null);

	function close() {
		exporter.reset();
		setOptions((current) => ({ ...current, includeArchived: true }));
		onClose();
	}

	const content = (() => {
		switch (phase.name) {
			case "confirm":
				return (
					<>
						<SheetHeader
							title="Export your data"
							actionLabel="Cancel"
							onAction={close}
						/>
						<Text style={[styles.lead, { color: colors.sub }]}>
							One file with every habit, log, note and streak. It's created on
							this iPhone — you choose where it goes next.
						</Text>
						<Container variant="inset">
							<KeyValueRow label="Habits" value={habitsCountLabel(summary)} />
							<KeyValueRow label="Entries" value={logsCountLabel(summary)} />
							<KeyValueRow label="Range" value={rangeLabel(summary.range)} />
						</Container>
						<Container variant="inset" dividers>
							<ListItem
								embedded
								title="Format"
								trailing={
									<SegmentedControl<ExportFormat>
										label="File format"
										size="compact"
										options={[
											{ value: "csv", label: "CSV" },
											{ value: "json", label: "JSON" },
										]}
										value={options.format}
										onChange={(format) =>
											setOptions((current) => ({ ...current, format }))
										}
									/>
								}
							/>
							<ListItem
								embedded
								title="Include archived habits"
								trailing={
									<Toggle
										value={options.includeArchived}
										onValueChange={(includeArchived) =>
											setOptions((current) => ({
												...current,
												includeArchived,
											}))
										}
										accessibilityLabel="Include archived habits"
									/>
								}
							/>
						</Container>
						<Button
							label={exportButtonLabel(summary.logs)}
							onPress={() => exporter.run(source, options)}
						/>
					</>
				);
			case "progress": {
				const { done, total } = phase.progress;
				return (
					<>
						<View style={styles.heading}>
							<Text
								accessibilityRole="header"
								style={[styles.title, { color: colors.ink }]}
							>
								Exporting…
							</Text>
							<Text
								style={[styles.lead, styles.centered, { color: colors.sub }]}
							>
								Usually a second or two. Keep Habits open.
							</Text>
						</View>
						<Container variant="inset">
							<View style={styles.progressLabels}>
								<Text style={[styles.progressLabel, { color: colors.ink }]}>
									Packing entries
								</Text>
								<Text style={[styles.progressLabel, { color: colors.sub }]}>
									{formatCount(done)} of {formatCount(total)}
								</Text>
							</View>
							<ProgressBar value={total === 0 ? 0 : done / total} />
						</Container>
						<Button label="Preparing file…" disabled onPress={() => {}} />
						<Button
							label="Cancel export"
							variant="link"
							onPress={exporter.cancel}
						/>
					</>
				);
			}
			case "ready":
				return (
					<>
						<View style={styles.heading}>
							<IconBadge
								symbol="checkmark"
								size="large"
								accent={{ tint: colors.ink, ink: colors.onAccent }}
							/>
							<Text
								accessibilityRole="header"
								style={[styles.title, { color: colors.ink }]}
							>
								Export ready
							</Text>
							<Text
								style={[styles.lead, styles.centered, { color: colors.sub }]}
							>
								Saved on this iPhone. Send it anywhere — nothing was uploaded.
							</Text>
						</View>
						<FileCard
							name={phase.result.name}
							meta={`${kilobytesLabel(phase.result.sizeBytes)} · ${pluralise(phase.result.habits, "habit")} · ${entriesLabel(phase.result.logs)}`}
						/>
						{exporter.delivery?.kind === "error" ? (
							<Banner tone="error">{exporter.delivery.message}</Banner>
						) : null}
						{exporter.delivery?.kind === "saved" ? (
							<Caption>Saved to Files.</Caption>
						) : null}
						<Button label="Share file…" onPress={exporter.share} />
						<Button
							label="Save to Files"
							variant="secondary"
							onPress={exporter.saveToFiles}
						/>
						<Button label="Done" variant="link" onPress={close} />
					</>
				);
			case "failed":
				return (
					<>
						<View style={styles.heading}>
							<IconBadge
								symbol="exclamationmark"
								size="large"
								accent={{ tint: colors.warnTint, ink: colors.warnInk }}
							/>
							<Text
								accessibilityRole="header"
								style={[styles.title, { color: colors.ink }]}
							>
								Export didn't finish
							</Text>
						</View>
						<Banner>{exportFailureMessage(phase.reason)}</Banner>
						<Caption>{EXPORT_FAILURE_REASSURANCE}</Caption>
						<Button label="Try again" onPress={exporter.retry} />
						<Button label="Close" variant="secondary" onPress={close} />
						{/* The real cause is in the log; this puts it where it can be sent. */}
						<Button
							label="Copy diagnostics"
							variant="link"
							onPress={async () =>
								setDiagnosticsResult(await copyDiagnostics())
							}
						/>
						{diagnosticsResult ? (
							<Caption
								tone={diagnosticsResult === "failed" ? "error" : "default"}
							>
								{diagnosticsResult === "failed"
									? "Couldn't copy diagnostics."
									: diagnosticsResult === "shared"
										? "Diagnostics ready to share."
										: "Diagnostics copied."}
							</Caption>
						) : null}
					</>
				);
		}
	})();

	return (
		<Sheet
			visible={visible}
			onDismiss={close}
			dismissible={phase.name !== "progress"}
		>
			{content}
		</Sheet>
	);
}

const styles = StyleSheet.create({
	heading: {
		alignItems: "center",
		gap: 8,
	},
	title: {
		fontSize: typeScale.section,
		fontWeight: "500",
		textAlign: "center",
	},
	lead: {
		fontSize: typeScale.subtitle,
		lineHeight: 18,
		paddingHorizontal: 4,
	},
	centered: {
		textAlign: "center",
	},
	progressLabels: {
		flexDirection: "row",
		justifyContent: "space-between",
	},
	progressLabel: {
		fontSize: typeScale.subtitle,
	},
});
