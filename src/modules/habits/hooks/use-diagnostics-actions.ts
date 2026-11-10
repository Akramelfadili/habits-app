import { copyDiagnostics } from "@/lib/diagnostics/diagnostics";
import { messages, showMessage } from "../messages";

export function useDiagnosticsActions() {
	async function copyDiagnosticsAndTell(): Promise<void> {
		const result = await copyDiagnostics();
		const spec =
			result === "copied"
				? messages.diagnosticsCopied
				: result === "shared"
					? messages.diagnosticsShared
					: messages.diagnosticsFailed;
		showMessage(spec, []);
	}

	return { copyDiagnostics: copyDiagnosticsAndTell };
}
