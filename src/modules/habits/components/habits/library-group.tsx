import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { Container } from "@/components/ui/composite/container";
import { SectionHeader } from "@/components/ui/composite/section-header";
import { space } from "@/theme/theme";

type LibraryGroupProps = {
	/** The category's name. */
	name: string;
	/** How many habits it holds — shown at the far edge, as on Today. Left out where nothing is counted (Browse suggestions, BS1). */
	count?: number;
	/** A row of this group is held mid-drag: the card lets its shadow out (H4). */
	lifted?: boolean;
	children: ReactNode;
};

/**
 * One category's card on the Habits tab (H1, H4): its caps name and count over
 * a flat card whose rows are separated by hairlines. The count and the name are
 * one VoiceOver heading.
 */
export function LibraryGroup({
	name,
	count,
	lifted = false,
	children,
}: LibraryGroupProps) {
	return (
		<View style={styles.group}>
			<SectionHeader
				size="eyebrow"
				title={name}
				count={count === undefined ? undefined : String(count)}
			/>
			<Container variant="flat" lifted={lifted}>
				{children}
			</Container>
		</View>
	);
}

const styles = StyleSheet.create({
	group: {
		gap: space[150],
		// Gap between groups (F-04 space-500); the list itself has none, so a held row's group needs no special case.
		marginBottom: space[500],
	},
});
