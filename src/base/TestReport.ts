import fsp from 'fs/promises';
import {
	Config,
	TestCase,
	TestReport as TestReportModel,
	TestReportWriter,
} from '@pixdif/model';

function loadReportWriter(format: string): TestReportWriter {
	/*
		eslint-disable-next-line
		import/no-dynamic-require,
		global-require,
		@typescript-eslint/no-var-requires
	*/
	const reporter = require(format);
	return reporter.default || reporter;
}

async function writeReport(format: string, data: TestReportModel, location: string): Promise<void> {
	const write = loadReportWriter(format);
	await write(data, location);
}

export const enum TestReportFormat {
	Json = 'json',
}

export class TestReport {
	private title?: string;

	private location: string;

	private format: string = TestReportFormat.Json;

	private config: Config;

	private testCases: TestCase[];

	constructor(location: string, config: Config, testCases: TestCase[] = []) {
		this.location = location;
		this.config = config;
		this.testCases = testCases;
	}

	/**
	 * @returns report title
	 */
	getTitle(): string | undefined {
		return this.title;
	}

	/**
	 * Customize report title.
	 * @param title report title
	 */
	setTitle(title: string): void {
		this.title = title;
	}

	/**
	 * @returns Test report format (Default: JSON)
	 */
	getFormat(): string {
		return this.format;
	}

	/**
	 * Sets report format.
	 * For built-in types, it can only be JSON.
	 * For custom types, please specify a Node.js module that implements TestReportWriter.
	 * @param format
	 */
	setFormat(format: string): void {
		this.format = format;
	}

	getConfig(): Config {
		return this.config;
	}

	get length(): number {
		return this.testCases.length;
	}

	get(index: number): TestCase | undefined {
		return this.testCases[index];
	}

	add(...testCases: TestCase[]): void {
		this.testCases.push(...testCases);
	}

	remove(index: number, count = 1): void {
		this.testCases.splice(index, count);
	}

	clear() {
		this.testCases = [];
	}

	toJSON(): TestReportModel {
		const cases: Record<string, TestCase> = {};
		for (let i = 0; i < this.testCases.length; i++) {
			cases[String(i + 1)] = this.testCases[i];
		}
		return {
			title: this.title,
			config: this.config,
			cases,
		};
	}

	/**
	 * Save the test report and configuration to a directory with GUI.
	 */
	async save(): Promise<void> {
		switch (this.format) {
		case TestReportFormat.Json:
			await fsp.writeFile(this.location, JSON.stringify(this));
			break;
		default:
			await writeReport(this.format, this.toJSON(), this.location);
			break;
		}
	}
}

export default TestReport;
