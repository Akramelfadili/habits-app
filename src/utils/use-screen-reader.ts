import { useEffect, useState } from "react";
import { AccessibilityInfo } from "react-native";

/** True while VoiceOver / TalkBack is running, and live as it changes. */
export function useScreenReader(): boolean {
	const [enabled, setEnabled] = useState(false);

	useEffect(() => {
		let active = true;
		AccessibilityInfo.isScreenReaderEnabled()
			.then((value) => {
				if (active) setEnabled(value);
			})
			.catch(() => {});
		const subscription = AccessibilityInfo.addEventListener(
			"screenReaderChanged",
			setEnabled,
		);
		return () => {
			active = false;
			subscription.remove();
		};
	}, []);

	return enabled;
}
