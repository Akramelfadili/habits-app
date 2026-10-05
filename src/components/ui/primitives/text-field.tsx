import { useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { useTheme } from "@/theme/use-theme";
import { CharacterCounter } from "./character-counter";
import { FieldHelper } from "./field-helper";
import { SectionLabel } from "./section-label";

type TextFieldProps = {
	label: string;
	value: string;
	onChangeText: (text: string) => void;
	onBlur?: () => void;
	onFocus?: () => void;
	placeholder?: string;
	error?: string;
	maxLength?: number;
	autoFocus?: boolean;
	/** Wraps onto more lines as the text grows — for short free text like a note. */
	multiline?: boolean;
	/**
	 * VAR-12 name-field behavior (HAB-22/HAB-24): the NEW-23 counter from 80%
	 * of `maxLength`, amber at the limit — instead of the remaining-characters
	 * counter below.
	 */
	nearLimitCounter?: boolean;
	/**
	 * Input that can't be used as-is but isn't a hard error (a duplicate name):
	 * amber outline plus a NEW-24 helper under the field.
	 */
	warning?: string;
	/** Return key — e.g. saving an inline rename (HAB-25). */
	onSubmitEditing?: () => void;
};

/** How close to `maxLength` the remaining-characters counter starts showing. */
export const COUNTER_THRESHOLD = 40;

export function TextField({
	label,
	value,
	onChangeText,
	onBlur,
	onFocus,
	placeholder,
	error,
	maxLength,
	autoFocus,
	multiline = false,
	nearLimitCounter = false,
	warning,
	onSubmitEditing,
}: TextFieldProps) {
	const { colors, scheme } = useTheme();
	const [isFocused, setIsFocused] = useState(false);
	// Error outranks warning outranks focus: a field being corrected keeps its outline.
	const borderColor = error
		? colors.dangerBg
		: warning
			? colors.warnInk
			: isFocused
				? colors.ink
				: "transparent";
	// Only surfaces near the cap, so a short note doesn't carry a counter;
	// the input itself stops at `maxLength` rather than truncating later.
	const remaining =
		maxLength !== undefined ? maxLength - value.length : undefined;
	const showCounter =
		!nearLimitCounter &&
		remaining !== undefined &&
		remaining <= COUNTER_THRESHOLD;

	const field = (
		<View testID="text-field" style={[styles.container, { borderColor }]}>
			{nearLimitCounter && maxLength !== undefined ? (
				// E6 draws NEW-23 on the label row, so its appearing never moves the input.
				<View style={styles.labelRow}>
					<SectionLabel>{label}</SectionLabel>
					<CharacterCounter length={value.length} limit={maxLength} />
				</View>
			) : (
				<SectionLabel>{label}</SectionLabel>
			)}
			<TextInput
				// The visible label is a sibling Text, not associated with the input —
				// without this, VoiceOver announces an unnamed text field.
				accessibilityLabel={label}
				// The on-screen keyboard follows the app's Appearance choice, not just iOS's.
				keyboardAppearance={scheme}
				value={value}
				// `maxLength` stops typing; slicing too covers a paste that arrives
				// over the limit, so it's trimmed to fit rather than rejected. A value
				// already over the limit (a V1 habit name) is never cut by an edit —
				// deleting shortens it one character at a time as usual.
				onChangeText={(text) =>
					onChangeText(
						maxLength !== undefined
							? text.slice(0, Math.max(maxLength, value.length))
							: text,
					)
				}
				onFocus={() => {
					setIsFocused(true);
					onFocus?.();
				}}
				onBlur={() => {
					setIsFocused(false);
					onBlur?.();
				}}
				placeholder={placeholder}
				placeholderTextColor={colors.faint}
				maxLength={maxLength}
				autoFocus={autoFocus}
				multiline={multiline}
				onSubmitEditing={onSubmitEditing}
				returnKeyType={onSubmitEditing ? "done" : undefined}
				style={[
					styles.input,
					multiline && styles.multiline,
					{ color: colors.ink },
				]}
			/>
			{showCounter ? (
				<Text
					accessibilityLiveRegion="polite"
					style={[
						styles.counter,
						{ color: remaining === 0 ? colors.ink : colors.faint },
					]}
				>
					{`${value.length}/${maxLength}`}
				</Text>
			) : null}
			{error ? (
				<Text style={[styles.error, { color: colors.dangerBg }]}>{error}</Text>
			) : null}
		</View>
	);

	if (!warning) return field;
	return (
		<View style={styles.withWarning}>
			{field}
			<FieldHelper tone="error">{warning}</FieldHelper>
		</View>
	);
}

const styles = StyleSheet.create({
	// Label and value sit flush with the surrounding card's content edge; the
	// padding/negative-margin pair gives the error outline room around them
	// without shifting that alignment.
	container: {
		gap: 6,
		borderWidth: 1,
		borderRadius: 12,
		padding: 10,
		margin: -10,
	},
	input: {
		paddingVertical: 2,
		fontSize: 15,
	},
	multiline: {
		// No fixed height: grows with the text, starting at one line.
		textAlignVertical: "top",
	},
	counter: {
		alignSelf: "flex-end",
		fontSize: 11,
		fontVariant: ["tabular-nums"],
	},
	error: {
		fontSize: 11,
	},
	labelRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
	},
	withWarning: {
		// Clears the field's -10 outline margin so the helper sits under the box.
		gap: 18,
	},
});
