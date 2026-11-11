import { SymbolView } from "expo-symbols";
import type { Ref } from "react";
import {
	type HostInstance,
	Pressable,
	StyleSheet,
	Text,
	View,
} from "react-native";
import {
	iconSize,
	minTouchTarget,
	radius,
	space,
	textStyles,
} from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";
import { useAccessibilityTextSize } from "@/utils/use-accessibility-text-size";

// The full text stays in the accessibility label, so truncation loses nothing for a screen reader.
const TITLE_LINES = 2;
const SUBTITLE_LINES = 2;

const ROW_MIN_HEIGHT = minTouchTarget + 2 * space[200];

type ListItemProps = {
	title: string;
	subtitle?: string;
	titleAccessory?: React.ReactNode;
	onPress?: () => void;
	navigable?: boolean;
	leading?: React.ReactNode;
	value?: string;
	trailing?: React.ReactNode;
	// Wide controls (text buttons) drop under the text at large Dynamic Type; narrow ones (a handle, a tag) stay beside it.
	trailingBelowOnLargeText?: boolean;
	embedded?: boolean;
	dimmed?: boolean;
	selected?: boolean;
	// With `dimmed`: an archived habit's muted icon square would otherwise vanish on a white card.
	keepLeading?: boolean;
	lifted?: boolean;
	accessibilityLabel?: string;
	destructive?: boolean;
	accessibilityHint?: string;
	buttonRef?: Ref<HostInstance>;
	accessibilityActions?: { label: string; onAction: () => void }[];
};

export function ListItem({
	title,
	subtitle,
	titleAccessory,
	onPress,
	navigable = false,
	leading,
	value,
	trailing,
	trailingBelowOnLargeText = false,
	embedded = false,
	dimmed = false,
	keepLeading = false,
	selected,
	lifted = false,
	accessibilityLabel,
	destructive = false,
	accessibilityHint,
	buttonRef,
	accessibilityActions,
}: ListItemProps) {
	const { colors, scheme, elevation, opacity } = useTheme();
	const titleColor = destructive ? colors.dangerBg : colors.ink;
	const largeText = useAccessibilityTextSize();
	const stacked = largeText && trailingBelowOnLargeText && !!trailing;

	const chevron = navigable ? (
		<SymbolView
			name="chevron.right"
			size={iconSize.s}
			tintColor={colors.faint}
		/>
	) : selected ? (
		<View
			testID="list-item-check"
			style={[styles.check, { borderColor: colors.ink }]}
		/>
	) : null;

	// `trailing` sits beside the pressable area: it is its own touch target, and nesting it in the row's button is invalid on web.
	return (
		<View
			testID="list-item"
			style={[
				styles.row,
				stacked && styles.rowStacked,
				embedded ? styles.embedded : { backgroundColor: colors.card },
				lifted && [
					styles.lifted,
					{ backgroundColor: scheme === "dark" ? colors.inner : colors.card },
					elevation.lifted,
				],
			]}
		>
			<Pressable
				ref={buttonRef}
				accessibilityRole={
					selected !== undefined ? "radio" : onPress ? "button" : undefined
				}
				accessibilityState={selected !== undefined ? { selected } : undefined}
				accessibilityLabel={accessibilityLabel}
				accessibilityHint={accessibilityHint}
				accessibilityActions={accessibilityActions?.map(({ label }) => ({
					name: label,
					label,
				}))}
				onAccessibilityAction={(event) =>
					accessibilityActions
						?.find(({ label }) => label === event.nativeEvent.actionName)
						?.onAction()
				}
				onPress={onPress}
				style={({ pressed }) => [
					styles.pressable,
					stacked && styles.pressableStacked,
					!embedded && (largeText ? styles.paddedLarge : styles.padded),
					trailing ? styles.paddedBeforeTrailing : null,
					pressed && onPress && { backgroundColor: colors.inner },
				]}
			>
				<View
					testID="list-item-content"
					style={[
						styles.content,
						largeText && styles.contentStacked,
						dimmed && !keepLeading && { opacity: opacity.dimmed },
					]}
				>
					{leading}
					<View
						style={[
							styles.text,
							dimmed && keepLeading && { opacity: opacity.dimmed },
						]}
					>
						{titleAccessory ? (
							<View style={styles.titleRow}>
								<Text
									numberOfLines={largeText ? undefined : TITLE_LINES}
									style={[
										styles.title,
										styles.shrinkable,
										{ color: titleColor },
									]}
								>
									{title}
								</Text>
								{titleAccessory}
							</View>
						) : (
							<Text
								numberOfLines={largeText ? undefined : TITLE_LINES}
								style={[styles.title, { color: titleColor }]}
							>
								{title}
							</Text>
						)}
						{subtitle ? (
							<Text
								numberOfLines={largeText ? undefined : SUBTITLE_LINES}
								style={[styles.subtitle, { color: colors.sub }]}
							>
								{subtitle}
							</Text>
						) : null}
					</View>
					{value ? (
						<Text
							numberOfLines={largeText ? undefined : 1}
							style={[
								styles.value,
								largeText && styles.valueStacked,
								{ color: colors.sub },
							]}
						>
							{value}
						</Text>
					) : null}
				</View>
				{trailing ? null : chevron}
			</Pressable>
			{trailing ? (
				<View
					testID="list-item-trailing"
					style={[
						styles.trailing,
						stacked
							? styles.trailingStacked
							: !embedded && styles.trailingPadded,
					]}
				>
					{trailing}
					{chevron}
				</View>
			) : null}
		</View>
	);
}

const styles = StyleSheet.create({
	check: {
		width: space[150],
		height: space[300],
		borderRightWidth: 2,
		borderBottomWidth: 2,
		transform: [{ rotate: "45deg" }],
	},
	row: {
		flexDirection: "row",
		alignItems: "center",
		borderRadius: radius.m,
	},
	rowStacked: {
		flexDirection: "column",
		alignItems: "stretch",
	},
	pressableStacked: {
		// `flex: 0` means a zero basis on web, which collapses the text area.
		flexGrow: 0,
		flexShrink: 0,
		flexBasis: "auto",
	},
	trailingStacked: {
		flexWrap: "wrap",
		paddingHorizontal: space[400],
		paddingBottom: space[400],
	},
	lifted: {
		zIndex: 1,
	},
	pressable: {
		// The card's padding is outside the hit area, so an embedded row guarantees the 44 pt itself.
		minHeight: minTouchTarget,
		flex: 1,
		flexDirection: "row",
		alignItems: "center",
		gap: space[300],
		borderRadius: radius.m,
	},
	padded: {
		minHeight: ROW_MIN_HEIGHT,
		paddingVertical: space[250],
		paddingHorizontal: space[350],
	},
	paddedLarge: {
		minHeight: ROW_MIN_HEIGHT,
		paddingVertical: space[400],
		paddingHorizontal: space[400],
	},
	paddedBeforeTrailing: {
		paddingRight: space[300],
	},
	content: {
		flex: 1,
		flexDirection: "row",
		alignItems: "center",
		gap: space[300],
	},
	contentStacked: {
		flexDirection: "column",
		alignItems: "flex-start",
		gap: space[200],
	},
	embedded: {
		borderRadius: 0,
	},
	trailing: {
		flexDirection: "row",
		alignItems: "center",
		gap: space[300],
	},
	trailingPadded: {
		paddingRight: space[350],
	},
	text: {
		flex: 1,
		gap: space[50],
	},
	titleRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: space[200],
	},
	title: {
		...textStyles.body,
	},
	subtitle: {
		...textStyles.footnote,
	},
	value: {
		...textStyles.callout,
		flexShrink: 1,
		maxWidth: "45%",
		textAlign: "right",
	},
	valueStacked: {
		maxWidth: "100%",
		textAlign: "left",
	},
	shrinkable: {
		flexShrink: 1,
	},
});
