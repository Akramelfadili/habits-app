import { StyleSheet, Text } from "react-native";
import { typeScale } from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";

type CaptionProps = {
	children: string;
	/** "error" is inline validation copy for controls that aren't a TextField. */
	tone?: "default" | "error";
};

/** Smallest helper text — locked-field explanations, hints next to controls. */
export function Caption({ children, tone = "default" }: CaptionProps) {
	const { colors } = useTheme();

	return (
		<Text
			accessibilityRole={tone === "error" ? "alert" : undefined}
			style={[
				styles.caption,
				{ color: tone === "error" ? colors.dangerBg : colors.faint },
			]}
		>
			{children}
		</Text>
	);
}

const styles = StyleSheet.create({
	caption: {
		fontSize: typeScale.caption,
	},
});
