/**
 * Every word the database gate shows (SY3, SY4). The words live in the app's
 * message catalogue and are handed to `DatabaseProvider` by the root layout, so
 * this shared layer stays free of any one module's copy.
 */
export type DatabaseCopy = {
	/** SY3: an update to the stored format is running. */
	updating: {
		title: string;
		body: string;
		/** The progress bar's label: it says what is happening, not how far (there is no count to give). */
		progress: string;
		keepOpen: string;
	};
	/** SY4: the update failed, and was rolled back whole. */
	updateFailed: {
		title: string;
		message: string;
		reason: { title: string; message: string };
	};
	/** The database could not be prepared on a launch with nothing to update. */
	openFailed: { title: string; message: string };
};
