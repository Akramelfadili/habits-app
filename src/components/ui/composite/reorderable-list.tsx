import { type ReactNode, useState } from "react";
import { type LayoutChangeEvent, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
	type SharedValue,
	useAnimatedStyle,
	useSharedValue,
	withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { DragHandle } from "@/components/ui/primitives/drag-handle";
import {
	dragTargetIndex,
	groupBounds,
	moveItem,
	offsetBetween,
} from "./reorderable-list-helpers";

type ReorderableListProps<T> = {
	items: readonly T[];
	keyOf: (item: T) => string;
	/**
	 * Items only move within their own run of equal groups (e.g. a habit
	 * stays inside its category, HAB-13). Omit for one free-for-all group.
	 */
	groupOf?: (item: T) => string;
	/**
	 * Renders one row; place `handle` where the drag grip belongs (usually
	 * trailing). `isDragging` is true while this row is held — show it lifted.
	 */
	renderItem: (item: T, handle: ReactNode, isDragging: boolean) => ReactNode;
	/**
	 * Wraps each run of equal groups (e.g. one card per category, HAB-19).
	 * `isDragging` is true while a row of that run is held. Omit to render the
	 * rows unwrapped.
	 */
	renderGroup?: (
		groupKey: string,
		rows: ReactNode,
		state: { isDragging: boolean },
	) => ReactNode;
	/** Accessibility label for a row's grip, e.g. "Reorder Meditate". */
	handleLabel: (item: T) => string;
	/** The moved item's group, in its new order — only that group changed. */
	onReorder: (groupKeys: string[]) => void;
};

const SETTLE_MS = 150;

/**
 * A vertical list whose rows are dragged by their grip (design-system "List
 * item — reorder", Manage & Archive). The grip also offers "Move up" / "Move
 * down" accessibility actions, since a drag isn't reachable with VoiceOver.
 * Shows the new order immediately, then waits for `items` to catch up.
 */
export function ReorderableList<T>({
	items,
	keyOf,
	groupOf = () => "",
	renderItem,
	renderGroup,
	handleLabel,
	onReorder,
}: ReorderableListProps<T>) {
	// Optimistic order after a drop, shown only while `items` is still the
	// list it was made from — any new `items` means the source has caught up.
	const [pending, setPending] = useState<{
		base: readonly T[];
		order: T[];
	} | null>(null);
	const shown = pending?.base === items ? pending.order : items;
	const [draggingKey, setDraggingKey] = useState<string | null>(null);
	const groups = shown.map(groupOf);

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
					{ duration: SETTLE_MS },
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
				onLayout={(event) => handleLayout(index, event)}
			>
				{renderItem(
					item,
					<GestureDetector gesture={gesture}>
						<View
							accessible
							accessibilityRole="adjustable"
							accessibilityLabel={handleLabel(item)}
							accessibilityActions={[
								{ name: "moveUp", label: "Move up" },
								{ name: "moveDown", label: "Move down" },
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
					</GestureDetector>,
					draggingKey === key,
				)}
			</ReorderableRow>
		);
	});

	if (!renderGroup) return <View>{rows}</View>;

	// Runs of equal groups, each wrapped by the caller (a card per category).
	const runs: { key: string; start: number; end: number }[] = [];
	for (let i = 0; i < shown.length; i += 1) {
		const last = runs[runs.length - 1];
		if (last && groups[i] === last.key) last.end = i;
		else runs.push({ key: groups[i], start: i, end: i });
	}
	return (
		<View>
			{runs.map((run, runIndex) => (
				// Keyed by the group (plus its repeat count, should a group ever
				// split) so a reorder or an archived first row doesn't remount the card.
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
	onLayout: (event: LayoutChangeEvent) => void;
	children: ReactNode;
};

/** One row's position: follows the finger while dragged, or steps aside for the dragged row. */
function ReorderableRow({
	index,
	activeIndex,
	targetIndex,
	dragY,
	heights,
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
				{ translateY: withTiming(translateY, { duration: SETTLE_MS }) },
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
