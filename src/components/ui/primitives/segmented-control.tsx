import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { minTouchTarget, radius, space, textStyles } from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";
import { useAccessibilityTextSize } from "@/utils/use-accessibility-text-size";

type SegmentedControlOption<T extends string> = {
	value: T;
	label: string;
	/** Just this segment is unavailable (e.g. a period with no data yet) — the others stay live. */
	disabled?: boolean;
};

type SegmentedControlProps<T extends string> = {
	options:
		| [SegmentedControlOption<T>, SegmentedControlOption<T>]
		| [
				SegmentedControlOption<T>,
				SegmentedControlOption<T>,
				SegmentedControlOption<T>,
		  ];
	value: T;
	onChange: (value: T) => void;
	disabled?: boolean;
	/** "compact" hugs its labels so it can sit trailing in a row (Direction); default fills the width. */
	size?: "full" | "compact";
	label?: string;
	/**
	 * What the control does at accessibility text sizes: "stack" lists the options one under another
	 * (forms); "collapse" shows only the selected one with a chevron, and a tap opens the stacked list
	 * (Progress's range) so the pinned bar stays one line tall.
	 */
	axLayout?: "stack" | "collapse";
	collapsedHint?: string;
	/** The collapsed list opened or closed — a pinned bar keeps its slot the same height either way. */
	onOpenChange?: (open: boolean) => void;
};

/** The selected pill and its track: 40 pt tall to the eye inside a 48 pt hit area (4 pt inset). */
const HIT_HEIGHT = 48;

function Check({ color }: { color: string }) {
	return (
		<View
			testID="segmented-check"
			style={[styles.mark, styles.check, { borderColor: color }]}
		/>
	);
}

function Chevron({ color }: { color: string }) {
	return (
		<View
			testID="segmented-chevron"
			style={[styles.mark, styles.chevron, { borderColor: color }]}
		/>
	);
}

/**
 * A 40 pt selected pill in a 48 pt hit area on the `inner` track, pill radius, subhead labels.
 * Selection is state, not colour alone: the selected segment is filled and announced ("selected,
 * 1 of 3").
 */
export function SegmentedControl<T extends string>({
	options,
	value,
	onChange,
	disabled = false,
	size = "full",
	label,
	axLayout = "stack",
	collapsedHint,
	onOpenChange,
}: SegmentedControlProps<T>) {
	const { colors, opacity } = useTheme();
	const largeText = useAccessibilityTextSize();
	const [open, setOpenState] = useState(false);
	const setOpen = (next: boolean) => {
		setOpenState(next);
		onOpenChange?.(next);
	};
	const selected = options.find((option) => option.value === value);

	if (largeText) {
		const rows = (
			<View
				accessibilityRole="tablist"
				accessibilityLabel={label}
				testID="segmented-stack"
				style={[
					styles.stack,
					{ backgroundColor: colors.card, borderColor: colors.border },
				]}
			>
				{options.map((option) => {
					const isActive = option.value === value;
					const isDisabled = disabled || option.disabled === true;
					return (
						<Pressable
							key={option.value}
							accessibilityRole="tab"
							accessibilityState={{ selected: isActive, disabled: isDisabled }}
							disabled={isDisabled}
							onPress={() => {
								setOpen(false);
								onChange(option.value);
							}}
							style={[
								styles.row,
								isActive && { backgroundColor: colors.inner },
								isDisabled && { opacity: opacity.disabled },
							]}
						>
							<Text
								style={[
									styles.rowLabel,
									{ color: isActive ? colors.ink : colors.sub },
								]}
							>
								{option.label}
							</Text>
							{isActive ? <Check color={colors.ink} /> : null}
						</Pressable>
					);
				})}
			</View>
		);
		if (axLayout === "stack") return rows;
		return (
			<View style={styles.collapsed}>
				<Pressable
					testID="segmented-collapsed"
					accessibilityRole="button"
					accessibilityLabel={`${label ?? ""} ${selected?.label ?? ""}`.trim()}
					accessibilityState={{ expanded: open, disabled }}
					accessibilityHint={collapsedHint}
					disabled={disabled}
					onPress={() => setOpen(!open)}
					style={[styles.current, { backgroundColor: colors.inner }]}
				>
					<Text style={[styles.currentLabel, { color: colors.ink }]}>
						{selected?.label}
					</Text>
					<Chevron color={colors.sub} />
				</Pressable>
				{open ? rows : null}
			</View>
		);
	}

	return (
		<View
			accessibilityRole="tablist"
			accessibilityLabel={label}
			style={[
				styles.track,
				size === "compact" && styles.trackCompact,
				{ backgroundColor: colors.inner },
			]}
		>
			{options.map((option) => {
				const isActive = option.value === value;
				const isDisabled = disabled || option.disabled === true;
				return (
					<Pressable
						key={option.value}
						accessibilityRole="tab"
						accessibilityState={{ selected: isActive, disabled: isDisabled }}
						disabled={isDisabled}
						onPress={() => onChange(option.value)}
						style={[
							styles.segment,
							size === "full" && styles.segmentFull,
							isDisabled && { opacity: opacity.disabled },
						]}
					>
						<View
							style={[
								styles.pill,
								size === "compact" && styles.pillCompact,
								isActive && { backgroundColor: colors.accent },
							]}
						>
							<Text
								style={[
									styles.label,
									{ color: isActive ? colors.onAccent : colors.ink },
								]}
							>
								{option.label}
							</Text>
						</View>
					</Pressable>
				);
			})}
		</View>
	);
}

const styles = StyleSheet.create({
	track: {
		flexDirection: "row",
		borderRadius: radius.pill,
	},
	trackCompact: {
		alignSelf: "flex-start",
	},
	// Each segment is a 48 pt-tall touch column filling the track edge to edge,
	// so segments abut and never overlap; the pill inside keeps the 4 pt inset.
	segment: {
		minHeight: HIT_HEIGHT,
		justifyContent: "center",
		padding: space[100],
	},
	segmentFull: {
		flex: 1,
	},
	pill: {
		flex: 1,
		borderRadius: radius.pill,
		alignItems: "center",
		justifyContent: "center",
	},
	pillCompact: {
		paddingHorizontal: space[350],
	},
	label: {
		...textStyles.subhead,
	},
	stack: {
		borderRadius: radius.l,
		borderWidth: StyleSheet.hairlineWidth,
		padding: space[100],
		gap: space[50],
	},
	row: {
		minHeight: minTouchTarget,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		borderRadius: radius.m,
		paddingHorizontal: space[300],
	},
	rowLabel: {
		...textStyles.body,
	},
	collapsed: {
		gap: space[200],
	},
	current: {
		minHeight: HIT_HEIGHT,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		borderRadius: radius.l,
		paddingHorizontal: space[400],
	},
	currentLabel: {
		...textStyles.title,
	},
	mark: {
		width: space[200],
		height: space[200],
		borderRightWidth: 2,
		borderBottomWidth: 2,
	},
	check: {
		width: space[150],
		height: space[300],
		transform: [{ rotate: "45deg" }],
	},
	chevron: {
		transform: [{ rotate: "45deg" }],
	},
});
