/**
 * Idle for a few milliseconds.
 * @param msecs milliseconds
 * @returns
 */
function idle(msecs: number): Promise<void> {
	return new Promise((resolve) => {
		setTimeout(resolve, msecs);
	});
}

export default idle;
