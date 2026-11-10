/**
 * Every word the database gate shows. The words live in the app's message catalogue and are
 * handed to `DatabaseProvider` by the root layout, so this shared layer stays free of any one
 * module's copy.
 */
export type DatabaseCopy = {
	/** An update to the stored format is running. */
	updating: {
		title: string;
		body: string;
		/** The progress bar's label: it says what is happening, not how far (there is no count to give). */
		progress: string;
		keepOpen: string;
	};
	/** The update failed, and was rolled back whole. */
	updateFailed: {
		title: string;
		message: string;
		reason: { title: string; message: string };
	};
	openFailed: { title: string; message: string };
	newer: { title: string; message: string };
	setAside: {
		action: string;
		hint: string;
		confirm: {
			headline: string;
			body: string;
			confirmLabel: string;
			confirmHint: string;
			busy: { label: string; hint: string };
			error: { title: string; message: string };
			cancelLabel: string;
		};
	};
};
