export default function stringifyError(error: unknown): string {
	if (error instanceof Error) {
		return error.stack ?? error.message;
	}
	return String(error);
}
