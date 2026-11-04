import { StyleSheet, Text } from "react-native";
import { space, typeScale } from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";
import type { TimeWheelProps } from "./time-wheel";

/**
 * Web-only stand-in for `time-wheel.tsx` — the SwiftUI picker has no web
 * renderer, and web exists only for visual checks, so it shows the time.
 */
export function TimeWheel({ hour, minute }: TimeWheelProps) {
	const { colors } = useTheme();
	const label = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
	return <Text style={[styles.time, { color: colors.ink }]}>{label}</Text>;
}

const styles = StyleSheet.create({
	time: {
		fontSize: typeScale.stat,
		fontWeight: "500",
		textAlign: "center",
		paddingVertical: space[600],
	},
});
