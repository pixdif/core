import fsp from 'fs/promises';
import path from 'path';
import { glob } from 'glob';
import {
	ColumnDefinition,
	Config,
	TestCase,
	TestPoint,
	TestReport as TestReportModel,
	TestReportWriter,
} from '@pixdif/model';

interface TestReportWriterModule extends TestReportWriter {
	default?: TestReportWriter;
}

async function loadReportWriter(format: string): Promise<TestReportWriter> {
	let reporter = await import(format) as TestReportWriterModule;
	for (let i = 0; i < 2 && reporter.default; i++) {
		reporter = reporter.default;
	}
	return reporter;
}

async function writeReport(format: string, data: TestReportModel, location: string): Promise<void> {
	const write = await loadReportWriter(format);
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

	private extraColumns?: ColumnDefinition[];

	private testCases: TestCase[] = [];

	constructor(location: string, config: Config) {
		this.location = location;
		this.config = config;
	}

	async collect(): Promise<void> {
		const testCaseFileNames = await glob('**/test-case.pixdif.json', {
			cwd: this.location,
		});
		const testCaseFiles = await Promise.all(testCaseFileNames.map(async (fileName) => {
			const location = path.join(this.location, fileName);
			const { birthtimeMs } = await fsp.stat(location);
			return {
				location,
				birthTime: birthtimeMs,
			};
		}));
		testCaseFiles.sort((a, b) => a.birthTime - b.birthTime);
		for (const { location } of testCaseFiles) {
			const testCase = JSON.parse(await fsp.readFile(location, 'utf-8')) as TestCase;
			this.testCases.push(this.#resolveTestCase(testCase));
		}
	}

	#resolveTestCase(from: Readonly<TestCase>): TestCase {
		return {
			...from,
			path: from.path && this.#resolvePath(from.path),
			expected: this.#resolvePath(from.expected),
			actual: this.#resolvePath(from.actual),
			details: from.details?.map((detail) => this.#resolveTestPoint(detail)),
		};
	}

	#resolveTestPoint(from: Readonly<TestPoint>): TestPoint {
		return {
			...from,
			expected: this.#resolvePath(from.expected),
			actual: this.#resolvePath(from.actual),
			diff: from.diff && this.#resolvePath(from.diff),
		};
	}

	#resolvePath(filePath: string): string {
		return filePath ? path.relative(this.location, filePath) : filePath;
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

	/**
	 * @returns Extra columns.
	 */
	getExtraColumns(): ColumnDefinition[] | undefined {
		return this.extraColumns;
	}

	/**
	 * Sets extra columns.
	 * @param cols column definitions
	 */
	setExtraColumns(cols: ColumnDefinition[]): void {
		this.extraColumns = cols;
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
			extraColumns: this.extraColumns,
			cases,
		};
	}

	/**
	 * Save the test report and configuration to a directory with GUI.
	 */
	async save(): Promise<void> {
		switch (this.format) {
		case TestReportFormat.Json as string:
			await fsp.writeFile(this.location, JSON.stringify(this));
			break;
		default:
			await writeReport(this.format, this.toJSON(), this.location);
			break;
		}
	}
}

export default TestReport;
