import { StyleSheet, View } from "react-native";
import { StatCard } from "@/components/ui/composite/stat-card";
import { FieldHelper } from "@/components/ui/primitives/field-helper";
import { space } from "@/theme/theme";
import { useAccessibilityTextSize } from "@/utils/use-accessibility-text-size";
import {
	SettingsPage,
	settingsGroupStyle,
} from "../components/settings/settings-page";
import { useSettingsQueries } from "../hooks/use-settings-queries";
import { settingsCopy } from "../messages";

/**
 * Settings › Freezes (S4): what is left and what is used this month, and the
 * rule in plain words. "Saved" (streaks kept this year) needs the freeze log
 * query of PR-08 and Auto-use is Later: neither is drawn.
 */
export function SettingsFreezesScreen() {
	const settings = useSettingsQueries();
	const stacked = useAccessibilityTextSize();
	const { size, usedThisMonth } = settings.freezePool;
	const left = Math.max(0, size - usedThisMonth);

	return (
		<SettingsPage title={settingsCopy.streaks.title}>
			<View style={settingsGroupStyle}>
				<View style={stacked ? styles.column : styles.row}>
					<View style={styles.tile}>
						<StatCard
							label={settingsCopy.streaks.leftLabel}
							value={String(left)}
							caption={settingsCopy.streaks.leftCaption(left)}
						/>
					</View>
					<View style={styles.tile}>
						<StatCard
							label={settingsCopy.streaks.usedLabel}
							value={String(usedThisMonth)}
							caption={settingsCopy.streaks.usedCaption}
						/>
					</View>
				</View>
				<FieldHelper plain tone="hint">
					{settingsCopy.streaks.rule(size)}
				</FieldHelper>
				<FieldHelper plain tone="hint">
					{settingsCopy.streaks.how}
				</FieldHelper>
			</View>
		</SettingsPage>
	);
}

const styles = StyleSheet.create({
	row: {
		flexDirection: "row",
		gap: space[200],
	},
	column: {
		gap: space[200],
	},
	tile: {
		flex: 1,
	},
});
