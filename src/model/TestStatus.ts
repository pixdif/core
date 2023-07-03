export const enum TestStatus {
	/**
	 * The test case has not been executed yet.
	 * This is the initial status.
	 */
	Unexecuted,

	/**
	 * The baseline file is not found.
	 */
	ExpectedNotFound,

	/**
	 * The actual output is not found.
	 */
	ActualNotFound,

	/**
	 * The files are being compared.
	 */
	InProgress,

	/**
	 * The two files are identical.
	 */
	Matched,

	/**
	 * The two files are different.
	 */
	Mismatched,
}

export default TestStatus;
