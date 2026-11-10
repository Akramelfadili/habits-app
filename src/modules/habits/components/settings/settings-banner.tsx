import { Linking } from "react-native";
import { Banner } from "@/components/ui/composite/banner";
import { settingsCopy } from "../../messages";

type DeniedBannerProps = {
	body: string;
};

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
