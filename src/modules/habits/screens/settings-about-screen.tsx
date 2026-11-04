import { Container } from "@/components/ui/composite/container";
import { ListItem } from "@/components/ui/composite/list-item";
import { SettingsPage } from "../components/settings/settings-page";
import { useDiagnosticsActions } from "../hooks/use-diagnostics-actions";
import { useSettingsQueries } from "../hooks/use-settings-queries";
import { settingsCopy } from "../messages";
import { versionLabel } from "../presenters/settings-helpers";

/**
 * Settings › About (S6): the version and Copy diagnostics (a toast confirms, no
 * Undo). Privacy and Send feedback are drawn in the frame but have no address
 * to open, so they are not built.
 */
export function SettingsAboutScreen() {
	const settings = useSettingsQueries();
	const diagnostics = useDiagnosticsActions();

	return (
		<SettingsPage title={settingsCopy.about.title}>
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
		</SettingsPage>
	);
}
