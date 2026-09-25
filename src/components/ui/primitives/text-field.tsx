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
};

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
}: TextFieldProps) {
	const { colors } = useTheme();
	const [isFocused, setIsFocused] = useState(false);
	// Error outranks focus: a field being corrected keeps its red outline.
	const borderColor = error
		? colors.dangerBg
		: isFocused
			? colors.ink
			: "transparent";

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
				style={[styles.input, { color: colors.ink }]}
			/>
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
	error: {
		fontSize: 11,
	},
});
