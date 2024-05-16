import TestPoint from './TestPoint';
import TestStatus from './TestStatus';

export interface TestCase {
	/**
	 * Human-friendly name.
	 */
	readonly name: string;

	/**
	 * Location of the test case.
	 */
	readonly path?: string;

	/**
	 * Location of the baseline file.
	 */
	readonly expected: string;

	/**
	 * Location of the actual output file.
	 */
	readonly actual: string;

	/**
	 * Current status of the test case.
	 * (Default: Unexecuted)
	 */
	status?: TestStatus;

	/**
	 * All test points
	 */
	details?: TestPoint[];

	/**
	 * Other information.
	 */
	extra?: Record<string, unknown>;
}

export default TestCase;
