import { StyleSheet, View } from "react-native";
import { space } from "@/theme/theme";

type CheckMarkProps = {
	color: string;
	testID?: string;
};

/**
 * A drawn check: two borders of a turned square, so it needs no icon font and
 * shows on web. The shape that says "selected" without colour (08.7).
 */
export function CheckMark({ color, testID = "check-mark" }: CheckMarkProps) {
	return (
		<View testID={testID} style={[styles.check, { borderColor: color }]} />
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
});
