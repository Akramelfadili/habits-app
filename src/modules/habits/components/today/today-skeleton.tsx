import { StyleSheet, View } from "react-native";
import { Container } from "@/components/ui/composite/container";
import { Skeleton } from "@/components/ui/primitives/skeleton";
import { minTouchTarget, space } from "@/theme/theme";
import { todayCopy } from "../../messages";

/** How many rows each card holds — SY1 draws two, one, two. */
const CARDS = [2, 1, 2] as const;

/** One placeholder row: icon square, two lines of text, the circle (V3-13's shape). */
function SkeletonRow() {
	return (
		<View style={styles.row}>
			<Skeleton width={32} height={32} />
			<View style={styles.lines}>
				<Skeleton width="55%" height={10} />
				<Skeleton width="35%" height={8} />
			</View>
			<Skeleton height={28} circle />
		</View>
	);
}

/**
 * SY1, the loading skeleton: the progress card and a few group cards as grey
 * shapes, standing in for what Today is about to draw. It is only mounted after
 * the wait has lasted 300 ms, and is one "Loading your habits" stop for a screen
 * reader — the shapes themselves say nothing.
 */
export function TodaySkeleton() {
	return (
		<View
			testID="today-skeleton"
			accessible
			accessibilityRole="progressbar"
			accessibilityLabel={todayCopy.loading}
			accessibilityState={{ busy: true }}
			importantForAccessibility="no-hide-descendants"
			style={styles.block}
		>
			<Container variant="card">
				<View style={styles.progress}>
					<Skeleton width="100%" height={6} />
				</View>
			</Container>
			{CARDS.map((rows, card) => (
				// biome-ignore lint/suspicious/noArrayIndexKey: a fixed placeholder list that never reorders
				<Container key={card} variant="flat">
					{Array.from({ length: rows }, (_, row) => (
						// biome-ignore lint/suspicious/noArrayIndexKey: a fixed placeholder list that never reorders
						<SkeletonRow key={row} />
					))}
				</Container>
			))}
		</View>
	);
}

const styles = StyleSheet.create({
	block: {
		gap: space[500],
	},
	progress: {
		paddingTop: space[400],
	},
	row: {
		minHeight: minTouchTarget + 2 * space[200],
		flexDirection: "row",
		alignItems: "center",
		gap: space[300],
		paddingHorizontal: space[400],
	},
	lines: {
		flex: 1,
		gap: space[150],
	},
});
