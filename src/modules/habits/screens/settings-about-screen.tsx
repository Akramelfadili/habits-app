import { Linking, View } from "react-native";
import { Container } from "@/components/ui/composite/container";
import { ListItem } from "@/components/ui/composite/list-item";
import { FieldHelper } from "@/components/ui/primitives/field-helper";
import {
	SettingsPage,
	settingsGroupStyle,
} from "../components/settings/settings-page";
import { PRIVACY_POLICY_URL } from "../constants";
import { useDiagnosticsActions } from "../hooks/use-diagnostics-actions";
import { useSettingsQueries } from "../hooks/use-settings-queries";
import { settingsCopy } from "../messages";
import { versionLabel } from "../presenters/settings-helpers";

/**
 * Settings › About (S6): the version, Copy diagnostics (a toast confirms, no
 * Undo) with a line saying what it holds, and the Privacy policy, which opens
 * the hosted page (E-02). Send feedback is drawn in the frame but has no
 * mailbox, so it is not built.
 */
export function SettingsAboutScreen() {
	const settings = useSettingsQueries();
	const diagnostics = useDiagnosticsActions();

	return (
		<SettingsPage title={settingsCopy.about.title}>
			<View style={settingsGroupStyle}>
				<Container variant="flat">
					<ListItem
						title={settingsCopy.about.version}
						value={versionLabel(settings.about)}
					/>
					<ListItem
						title={settingsCopy.about.copy}
						subtitle={settingsCopy.about.copyBody}
						value={settingsCopy.about.copyValue}
						onPress={diagnostics.copyDiagnostics}
					/>
				</Container>
				<FieldHelper plain tone="hint">
					{settingsCopy.about.copyNote}
				</FieldHelper>
			</View>
			<View style={settingsGroupStyle}>
				<Container variant="flat">
					<ListItem
						title={settingsCopy.about.privacy}
						navigable
						onPress={() => void Linking.openURL(PRIVACY_POLICY_URL)}
					/>
				</Container>
			</View>
		</SettingsPage>
	);
}
