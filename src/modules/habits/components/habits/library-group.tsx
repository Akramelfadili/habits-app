import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { Container } from "@/components/ui/composite/container";
import { SectionHeader } from "@/components/ui/composite/section-header";
import { space } from "@/theme/theme";

type LibraryGroupProps = {
	name: string;
	count?: number;
	lifted?: boolean;
	children: ReactNode;
};

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
		// Gap between groups; the list itself has none, so a held row's group needs no special case.
		marginBottom: space[500],
	},
});
