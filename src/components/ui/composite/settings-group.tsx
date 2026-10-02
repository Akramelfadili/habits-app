import type { PropsWithChildren } from "react";
import { StyleSheet, View } from "react-native";
import { Caption } from "../primitives/caption";
import { Container } from "./container";
import { SectionHeader } from "./section-header";

type SettingsGroupProps = PropsWithChildren<{
	title: string;
	/** Explains the whole group, under its card — "Applies to every habit at once…". */
	footnote?: string;
	/** Rows stacked inside the card are separated by hairlines (tight ones, like a list). */
	dividers?: boolean;
}>;

/**
 * NEW-04: a titled settings card with an optional footnote beneath it
 * (Settings' Appearance / Reminders / Your data, HAB-15). The title sits
 * outside the card, the footnote outside it too, so the card holds only the
 * controls.
 */
export function SettingsGroup({
	title,
	footnote,
	dividers = false,
	children,
}: SettingsGroupProps) {
	return (
		<View testID="settings-group" style={styles.group}>
			<SectionHeader title={title} size="group" />
			<Container dividers={dividers} compact={dividers}>
				{children}
			</Container>
			{footnote ? (
				<View style={styles.footnote}>
					<Caption>{footnote}</Caption>
				</View>
			) : null}
		</View>
	);
}

const styles = StyleSheet.create({
	group: {
		gap: 8,
	},
	footnote: {
		paddingHorizontal: 4,
	},
});
