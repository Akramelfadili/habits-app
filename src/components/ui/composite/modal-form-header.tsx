import type { NativeStackNavigationOptions } from "expo-router";
import { useRouter } from "expo-router";
import { Button } from "@/components/ui/primitives/button";

/**
 * Shared header config for a modal form screen (New/Edit habit, and future
 * form screens): left-aligned title, no back chevron/gesture affordance, an
 * explicit "Cancel" button, and a full-screen presentation (not the iOS
 * page-sheet peek) — per docs/design-system.md's New/Edit habit screen
 * structure.
 *
 * `headerBackVisible: false` is required in addition to `headerLeft` — on
 * this Expo SDK, the native-stack header can render its own back chevron
 * outside of `headerLeft`, so overriding `headerLeft` alone doesn't remove
 * it. These options must also be registered statically (see the `_layout.tsx`
 * that renders this screen's `<Stack.Screen>`) rather than from inside the
 * routed screen component — the navigator resolves presentation/back-button
 * chrome for the push transition before the screen mounts, so a dynamically
 * registered override arrives too late.
 */
export function useModalFormHeaderOptions(
	title: string,
): NativeStackNavigationOptions {
	const router = useRouter();

	return {
		title,
		presentation: "fullScreenModal",
		headerTitleAlign: "left",
		headerBackVisible: false,
		headerLeft: () => null,
		headerRight: () => (
			<Button
				label="Cancel"
				variant="ghost"
				fullWidth={false}
				onPress={() => router.back()}
			/>
		),
	};
}
