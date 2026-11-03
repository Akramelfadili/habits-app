import type { NativeStackNavigationOptions } from "expo-router";
import { useRouter } from "expo-router";
import { headerActionOptions, headerNoBackOptions } from "./header-buttons";

/**
 * Shared header config for a modal form screen (New/Edit habit, and future
 * form screens): left-aligned title, no back chevron/gesture affordance, an
 * explicit "Cancel" button, and a full-screen presentation (not the iOS
 * page-sheet peek) — per docs/design-system.md's New/Edit habit screen
 * structure.
 *
 * Header buttons come from `header-buttons.tsx` (plain, no iOS 26 glass
 * capsule). These options must be registered statically (see the `_layout.tsx`
 * that renders this screen's `<Stack.Screen>`) rather than from inside the
 * routed screen component — the navigator resolves presentation/back-button
 * chrome for the push transition before the screen mounts, so a dynamically
 * registered override arrives too late.
 */
export function useModalFormHeaderOptions(
	title: string,
	closeLabel = "Close",
	/** What Close does when it is not "go back" (First Run's Close skips to Today). */
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
