import Config from './Config';
import TestCase from './TestCase';

/**
 * Define an extra column.
 * [index, column header, property name]
 */
export type ColumnDefinition = [number, string, string];

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
	 * Extra columns in the test report.
	 */
	extraColumns?: [number, string, string][];

	/**
	 * All test cases.
	 */
	cases: Record<string, TestCase>;
}

/**
 * Generate a test report into a specific format.
 */
export type TestReportWriter = (report: TestReport, location: string) => Promise<void>;
