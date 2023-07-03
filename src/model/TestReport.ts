import Config from './Config';
import TestCase from './TestCase';

export interface TestReport {
	/**
	 * Report Title
	 */
	title?: string;

	/**
	 * Test configurations.
	 */
	config: Config;

	/**
	 * All test cases.
	 */
	cases: Record<string, TestCase>;
}

/**
 * Generate a test report into a specific format.
 */
export type TestReportWriter = (report: TestReport, location: string) => Promise<void>;
