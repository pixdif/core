/**
 * Idle for a few milliseconds.
 * @param msecs milliseconds
 * @returns
 */
export default function idle(msecs: number): Promise<void> {
	return new Promise((resolve) => {
		setTimeout(resolve, msecs);
	});
}
