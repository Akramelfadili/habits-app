import { DatePicker, Host } from "@expo/ui/swift-ui";
import { datePickerStyle, labelsHidden } from "@expo/ui/swift-ui/modifiers";
import { set } from "date-fns";
import { useTheme } from "@/theme/use-theme";

export type TimeWheelProps = {
	hour: number;
	minute: number;
	onChange: (time: { hour: number; minute: number }) => void;
};

/**
 * Hour + minute wheel — SwiftUI's native time picker (via @expo/ui, which
 * ships in Expo Go). Works in plain hours and minutes; the Date it's built on
 * is an implementation detail of the native picker.
 */
export function TimeWheel({ hour, minute, onChange }: TimeWheelProps) {
	const { scheme } = useTheme();

	return (
		<Host matchContents colorScheme={scheme} style={{ alignSelf: "center" }}>
			<DatePicker
				selection={set(new Date(), {
					hours: hour,
					minutes: minute,
					seconds: 0,
					milliseconds: 0,
				})}
				displayedComponents={["hourAndMinute"]}
				onDateChange={(date) =>
					onChange({ hour: date.getHours(), minute: date.getMinutes() })
				}
				modifiers={[datePickerStyle("wheel"), labelsHidden()]}
			/>
		</Host>
	);
}
