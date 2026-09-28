import { useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { useTheme } from "@/theme/use-theme";
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
}: TextFieldProps) {
	const { colors } = useTheme();
	const [isFocused, setIsFocused] = useState(false);
	// Error outranks focus: a field being corrected keeps its red outline.
	const borderColor = error
		? colors.dangerBg
		: isFocused
			? colors.ink
			: "transparent";
	// Only surfaces near the cap, so a short note doesn't carry a counter;
	// the input itself stops at `maxLength` rather than truncating later.
	const remaining =
		maxLength !== undefined ? maxLength - value.length : undefined;
	const showCounter = remaining !== undefined && remaining <= COUNTER_THRESHOLD;

	return (
		<View testID="text-field" style={[styles.container, { borderColor }]}>
			<SectionLabel>{label}</SectionLabel>
			<TextInput
				value={value}
				onChangeText={onChangeText}
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
});
