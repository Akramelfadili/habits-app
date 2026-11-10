import { type ReactNode, useState } from "react";
import { type LayoutChangeEvent, StyleSheet, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
	type SharedValue,
	useAnimatedStyle,
	useSharedValue,
	withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { DragHandle } from "@/components/ui/primitives/drag-handle";
import { MoveButton } from "@/components/ui/primitives/move-button";
import { atIndex } from "@/utils/indexed";
import { useReducedMotion } from "@/utils/use-reduced-motion";
import {
	dragTargetIndex,
	groupBounds,
	moveItem,
	offsetBetween,
	settleDuration,
} from "./reorderable-list-helpers";

type ReorderableListProps<T> = {
	items: readonly T[];
	keyOf: (item: T) => string;
	groupOf?: (item: T) => string;
	renderItem: (item: T, handle: ReactNode, isDragging: boolean) => ReactNode;
	renderGroup?: (
		groupKey: string,
		rows: ReactNode,
		state: { isDragging: boolean },
	) => ReactNode;
	handleLabel: (item: T) => string;
	moveLabels: { up: string; down: string };
	moveButtonLabel: (item: T, direction: "up" | "down") => string;
	onReorder: (groupKeys: string[]) => void;
};

// The grip also offers Move up / Move down accessibility actions: a drag isn't reachable with VoiceOver.
export function ReorderableList<T>({
	items,
	keyOf,
	groupOf = () => "",
	renderItem,
	renderGroup,
	handleLabel,
	moveLabels,
	moveButtonLabel,
	onReorder,
}: ReorderableListProps<T>) {
	// Optimistic order after a drop, shown only while `items` is still the list it was made from.
	const [pending, setPending] = useState<{
		base: readonly T[];
		order: T[];
	} | null>(null);
	const shown = pending?.base === items ? pending.order : items;
	const [draggingKey, setDraggingKey] = useState<string | null>(null);
	const groups = shown.map(groupOf);

	const settleMs = settleDuration(useReducedMotion());
	const heights = useSharedValue<number[]>([]);
	const activeIndex = useSharedValue(-1);
	const targetIndex = useSharedValue(-1);
	const dragY = useSharedValue(0);

	function commit(from: number, to: number) {
		setDraggingKey(null);
		activeIndex.value = -1;
		targetIndex.value = -1;
		dragY.value = 0;
		if (from === to) return;
		const next = moveItem(shown, from, to);
		setPending({ base: items, order: next });
		const [start, end] = groupBounds(groups, to);
		onReorder(next.slice(start, end + 1).map(keyOf));
	}

	function handleLayout(index: number, event: LayoutChangeEvent) {
		const height = event.nativeEvent.layout.height;
		heights.modify((current) => {
			"worklet";
			current[index] = height;
			return current;
		});
	}

	const rows = shown.map((item, index) => {
		const key = keyOf(item);
		const bounds = groupBounds(groups, index);
		const gesture = Gesture.Pan()
			.activeOffsetY([-4, 4])
			.onStart(() => {
				"worklet";
				activeIndex.value = index;
				targetIndex.value = index;
				scheduleOnRN(setDraggingKey, key);
			})
			.onUpdate((event) => {
				"worklet";
				dragY.value = event.translationY;
				targetIndex.value = dragTargetIndex(
					index,
					event.translationY,
					heights.value,
					bounds,
				);
			})
			.onEnd(() => {
				"worklet";
				const to = targetIndex.value;
				dragY.value = withTiming(
					offsetBetween(index, to, heights.value),
					{ duration: settleMs },
					() => {
						"worklet";
						scheduleOnRN(commit, index, to);
					},
				);
			});

		return (
			<ReorderableRow
				key={key}
				index={index}
				activeIndex={activeIndex}
				targetIndex={targetIndex}
				dragY={dragY}
				heights={heights}
				settleMs={settleMs}
				onLayout={(event) => handleLayout(index, event)}
			>
				{renderItem(
					item,
					<View style={styles.controls}>
						<MoveButton
							direction="up"
							accessibilityLabel={moveButtonLabel(item, "up")}
							disabled={index <= bounds[0]}
							onPress={() => commit(index, index - 1)}
						/>
						<MoveButton
							direction="down"
							accessibilityLabel={moveButtonLabel(item, "down")}
							disabled={index >= bounds[1]}
							onPress={() => commit(index, index + 1)}
						/>
						<GestureDetector gesture={gesture}>
							<View
								accessible
								accessibilityRole="adjustable"
								accessibilityLabel={handleLabel(item)}
								accessibilityActions={[
									{ name: "moveUp", label: moveLabels.up },
									{ name: "moveDown", label: moveLabels.down },
								]}
								onAccessibilityAction={(event) => {
									const to =
										event.nativeEvent.actionName === "moveUp"
											? index - 1
											: index + 1;
									if (to >= bounds[0] && to <= bounds[1]) commit(index, to);
								}}
								hitSlop={8}
							>
								<DragHandle />
							</View>
						</GestureDetector>
					</View>,
					draggingKey === key,
				)}
			</ReorderableRow>
		);
	});

	if (!renderGroup) return <View>{rows}</View>;

	const runs: { key: string; start: number; end: number }[] = [];
	for (let i = 0; i < shown.length; i += 1) {
		const last = runs[runs.length - 1];
		const group = atIndex(groups, i);
		if (last && group === last.key) last.end = i;
		else runs.push({ key: group, start: i, end: i });
	}
	return (
		<View>
			{runs.map((run, runIndex) => (
				// Keyed by group (plus repeat count) so a reorder or an archived first row doesn't remount the card.
				<View
					key={`${run.key}-${runs.slice(0, runIndex).filter((r) => r.key === run.key).length}`}
				>
					{renderGroup(run.key, rows.slice(run.start, run.end + 1), {
						isDragging:
							draggingKey !== null &&
							shown
								.slice(run.start, run.end + 1)
								.some((item) => keyOf(item) === draggingKey),
					})}
				</View>
			))}
		</View>
	);
}

type ReorderableRowProps = {
	index: number;
	activeIndex: SharedValue<number>;
	targetIndex: SharedValue<number>;
	dragY: SharedValue<number>;
	heights: SharedValue<number[]>;
	settleMs: number;
	onLayout: (event: LayoutChangeEvent) => void;
	children: ReactNode;
};

function ReorderableRow({
	index,
	activeIndex,
	targetIndex,
	dragY,
	heights,
	settleMs,
	onLayout,
	children,
}: ReorderableRowProps) {
	const animatedStyle = useAnimatedStyle(() => {
		const active = activeIndex.value;
		if (active === -1) {
			return { transform: [{ translateY: 0 }], zIndex: 0 };
		}
		if (index === active) {
			return { transform: [{ translateY: dragY.value }], zIndex: 1 };
		}
		const target = targetIndex.value;
		const shift = heights.value[active] ?? 0;
		let translateY = 0;
		if (active < index && index <= target) translateY = -shift;
		if (target <= index && index < active) translateY = shift;
		return {
			transform: [
				{ translateY: withTiming(translateY, { duration: settleMs }) },
			],
			zIndex: 0,
		};
	});

	return (
		<Animated.View onLayout={onLayout} style={animatedStyle}>
			{children}
		</Animated.View>
	);
}

const styles = StyleSheet.create({
	controls: {
		flexDirection: "row",
		alignItems: "center",
	},
});
