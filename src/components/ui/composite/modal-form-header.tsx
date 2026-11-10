import type { NativeStackNavigationOptions } from "expo-router";
import { useRouter } from "expo-router";
import { headerActionOptions, headerNoBackOptions } from "./header-buttons";

// Register these options statically in the layout, not from inside the routed screen: the navigator
// resolves the back-button chrome before the screen mounts, so a dynamic override arrives too late.
export function useModalFormHeaderOptions(
	title: string,
	closeLabel = "Close",
	onClose?: () => void,
): NativeStackNavigationOptions {
	const router = useRouter();

	return {
		title,
		presentation: "fullScreenModal",
		headerTitleAlign: "left",
		...headerNoBackOptions(),
		...headerActionOptions({
			label: closeLabel,
			onPress: onClose ?? (() => router.back()),
		}),
	};
}
