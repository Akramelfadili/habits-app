import { View } from "react-native";
import { Container } from "@/components/ui/composite/container";
import { ListItem } from "@/components/ui/composite/list-item";
import { ToggleRow } from "@/components/ui/composite/toggle-row";
import { FieldHelper } from "@/components/ui/primitives/field-helper";
import type { ThemePreference } from "@/theme/theme-preference-store";
import { LibrarySectionHeader } from "../components/habits/library-section-header";
import {
	SettingsPage,
	settingsGroupStyle,
} from "../components/settings/settings-page";
import { useSettingsActions } from "../hooks/use-settings-actions";
import { useSettingsQueries } from "../hooks/use-settings-queries";
import { settingsCopy } from "../messages";

const THEMES: ThemePreference[] = ["light", "dark", "system"];

/**
 * Settings › Appearance (S2): Light, Dark or System as radio rows. Week start
 * (Monday, D9) and text size are explained, not configurable.
 */
export function SettingsAppearanceScreen() {
	const settings = useSettingsQueries();
	const actions = useSettingsActions();

	return (
		<SettingsPage title={settingsCopy.appearance.header}>
			<View style={settingsGroupStyle}>
				<LibrarySectionHeader label={settingsCopy.appearance.themeHeader} />
				<Container variant="flat">
					{THEMES.map((preference) => (
						<ListItem
							key={preference}
							title={settingsCopy.appearance.theme[preference]}
							subtitle={
								preference === "system"
									? settingsCopy.appearance.systemNote
									: undefined
							}
							selected={settings.themePreference === preference}
							onPress={() => actions.setThemePreference(preference)}
						/>
					))}
				</Container>
				<FieldHelper plain tone="hint">
					{settingsCopy.appearance.note}
				</FieldHelper>
			</View>
			<View style={settingsGroupStyle}>
				<Container variant="flat">
					<ToggleRow
						title={settingsCopy.appearance.haptics}
						subtitle={settingsCopy.appearance.hapticsBody}
						value={settings.hapticsEnabled}
						onValueChange={actions.setHaptics}
						accessibilityLabel={`${settingsCopy.appearance.haptics}, ${settingsCopy.appearance.hapticsBody}`}
					/>
				</Container>
				<FieldHelper plain tone="hint">
					{settingsCopy.appearance.hapticsHint}
				</FieldHelper>
			</View>
		</SettingsPage>
	);
}
