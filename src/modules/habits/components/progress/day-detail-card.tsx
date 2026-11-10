import { StyleSheet, Text, View } from "react-native";
import { Container } from "@/components/ui/composite/container";
import { Button } from "@/components/ui/primitives/button";
import { space, textStyles } from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";
import { progressCopy } from "../../messages";
import type { DayDetailCardData } from "../../presenters/progress-calendar-presenter";

type DayDetailCardProps = {
	detail: DayDetailCardData;
	onClose: () => void;
	onEdit: () => void;
};

/**
 * Month's day card (P13): the ringed day, "4 of 5 done · 80%", each habit's
 * state, and "Edit this day" (not on a day that hasn't happened yet).
 */
export function DayDetailCard({ detail, onClose, onEdit }: DayDetailCardProps) {
	const { colors } = useTheme();

	return (
		<Container variant="outlined" testID="day-detail-card">
			<View style={styles.content}>
				<View style={styles.header}>
					<View
						accessible
						accessibilityRole="header"
						accessibilityLabel={detail.accessibilityLabel}
						style={styles.titles}
					>
						<Text style={[styles.title, { color: colors.ink }]}>
							{detail.title}
						</Text>
						<Text style={[styles.summary, { color: colors.sub }]}>
							{detail.summary}
						</Text>
					</View>
					<Button
						label={progressCopy.day.close}
						variant="link"
						fullWidth={false}
						onPress={onClose}
					/>
				</View>
				{detail.rows.map((row) => (
					<View
						key={row.key}
						accessible
						accessibilityLabel={`${row.name}, ${row.state}`}
						style={styles.row}
					>
						<View style={styles.name}>
							<View style={[styles.dot, { backgroundColor: row.dot }]} />
							<Text
								style={[styles.rowName, { color: colors.ink }]}
								numberOfLines={2}
							>
								{row.name}
							</Text>
						</View>
						<Text style={[styles.state, { color: colors.sub }]}>
							{row.state}
						</Text>
					</View>
				))}
				{detail.editable ? (
					<Button
						label={progressCopy.day.editThisDay}
						accessibilityLabel={progressCopy.day.editThisDayLabel}
						variant="inline"
						fullWidth={false}
						onPress={onEdit}
					/>
				) : null}
			</View>
		</Container>
	);
}

const styles = StyleSheet.create({
	content: {
		gap: space[200],
	},
	header: {
		flexDirection: "row",
		alignItems: "flex-start",
		justifyContent: "space-between",
		gap: space[300],
	},
	titles: {
		flex: 1,
		gap: space[50],
	},
	title: {
		...textStyles.callout,
		fontWeight: "500",
	},
	summary: {
		...textStyles.footnote,
	},
	row: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		gap: space[300],
	},
	name: {
		flex: 1,
		flexDirection: "row",
		alignItems: "center",
		gap: space[200],
	},
	dot: {
		width: space[200],
		height: space[200],
		borderRadius: space[100],
	},
	rowName: {
		...textStyles.footnote,
		flexShrink: 1,
	},
	state: {
		...textStyles.footnote,
	},
});
