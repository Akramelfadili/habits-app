import { Component, type ReactNode } from "react";
import { log } from "@/lib/logger/logger";

type LoadErrorBoundaryProps = {
	/** Logger scope — the screen this guards, e.g. "today". */
	scope: string;
	/** What to draw in place of the screen; `retry` mounts it afresh so its live queries re-subscribe. */
	fallback: (retry: () => void) => ReactNode;
	children: ReactNode;
};

type LoadErrorBoundaryState = { failed: boolean; attempt: number };

/**
 * Keeps one screen's load failure inside that screen (SY2). A live query that
 * fails is rethrown by `useLiveRows`; without this it would reach the root
 * boundary and replace the whole app, tab bar included. Here the screen's own
 * header and the tabs stay, and `retry` remounts the children so the query runs
 * again. The error was already logged by the hook that threw it; it is only
 * noted here, once, that this boundary caught it.
 */
export class LoadErrorBoundary extends Component<
	LoadErrorBoundaryProps,
	LoadErrorBoundaryState
> {
	override state: LoadErrorBoundaryState = { failed: false, attempt: 0 };

	static getDerivedStateFromError(): Partial<LoadErrorBoundaryState> {
		return { failed: true };
	}

	override componentDidCatch(error: Error) {
		log.warn("boundary.load_failed", { scope: this.props.scope, error });
	}

	retry = () => {
		this.setState((state) => ({ failed: false, attempt: state.attempt + 1 }));
	};

	override render() {
		if (this.state.failed) return this.props.fallback(this.retry);
		return (
			<FragmentKeyed key={this.state.attempt}>
				{this.props.children}
			</FragmentKeyed>
		);
	}
}

/** A keyed wrapper, so a retry remounts everything below it. */
function FragmentKeyed({ children }: { children: ReactNode }) {
	return <>{children}</>;
}
