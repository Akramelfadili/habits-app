import { Linking } from "react-native";
import { Banner } from "@/components/ui/composite/banner";
import { settingsCopy } from "../../messages";

type DeniedBannerProps = {
	/** The sentence under the title: the whole impact or the evening review's alone. */
	body: string;
};

/** The amber "Notifications are off" banner with Open Settings, drawn once at the top of the page it belongs to. */
export function NotificationsOffBanner({ body }: DeniedBannerProps) {
	return (
		<Banner
			tone="warning"
			symbol="bell.slash"
			title={settingsCopy.denied.title}
			action={{
				label: settingsCopy.denied.action,
				onPress: () => void Linking.openSettings(),
			}}
		>
			{body}
		</Banner>
	);
}
