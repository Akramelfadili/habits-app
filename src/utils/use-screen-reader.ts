import { useEffect, useState } from "react";
import { AccessibilityInfo, Platform } from "react-native";
import { log } from "@/lib/logger/logger";

/** True while VoiceOver / TalkBack is running, and live as it changes. */
export function useScreenReader(): boolean {
	const [enabled, setEnabled] = useState(false);

	useEffect(() => {
		// react-native-web answers "a screen reader is running" for everyone, which
		// would give every web render (and the visual checks) the VoiceOver layouts.
		if (Platform.OS === "web") return;
		let active = true;
		AccessibilityInfo.isScreenReaderEnabled()
			.then((value) => {
				if (active) setEnabled(value);
			})
			.catch((error) => {
				log.warn("a11y.screen_reader_read_failed", { error });
			});
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
