export interface TestPoint {
	/**
	 * Name
	 */
	readonly name: string;

	/**
	 * Location of baseline
	 */
	readonly expected: string;

	/**
	 * Location of actual output
	 */
	readonly actual: string;

	/**
	 * Location of diff image
	 */
	readonly diff?: string;

	/**
	 * Difference ratio
	 */
	readonly ratio: number;
}

export default TestPoint;
