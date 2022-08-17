import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';

import {
	Config,
	TestCase,
	TestStatus,
	TestReport as TestReportModel,
} from '@pixdif/model';

function findReporter(reporter: string): string {
	const curDir = require.resolve(reporter);
	return path.dirname(curDir);
}

export default class TestReport {
	private reporter = '@pixdif/html-reporter';

	private config: Config;

	private testCases: TestCase[];

	constructor(config: Config, testCases: TestCase[] = []) {
		this.config = config;
		this.testCases = testCases;
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
		return {
			config: this.config,
			testCases: this.testCases,
		};
	}

	/**
	 * Save the test report and configuration to a directory with GUI.
	 * @param outputDir
	 */
	async save(outputDir: string): Promise<void> {
		const reporterDir = findReporter(this.reporter);

		if (!fs.existsSync(outputDir)) {
			await fsp.mkdir(outputDir, { recursive: true });
		}

		const report = JSON.stringify(this);
		await fsp.writeFile(path.join(outputDir, 'test-report.data.js'), `window.testReport = ${report};`);
		await fsp.writeFile(path.join(outputDir, 'test-report.json'), report);

		await fsp.copyFile(path.join(reporterDir, 'index.html'), path.join(outputDir, 'index.html'));
		await fsp.copyFile(path.join(reporterDir, 'diff-viewer.html'), path.join(outputDir, 'diff-viewer.html'));

		const outputStaticDir = path.join(outputDir, 'static');
		if (!fs.existsSync(outputStaticDir)) {
			await fsp.mkdir(outputStaticDir);
		}
		const reporterStaticDir = path.join(reporterDir, 'static');
		const staticFiles = await fsp.readdir(reporterStaticDir);
		for (const staticFile of staticFiles) {
			await fsp.copyFile(
				path.join(reporterStaticDir, staticFile),
				path.join(outputStaticDir, staticFile),
			);
		}

		const failedCases = this.testCases
			.filter((res) => res.status === TestStatus.Mismatched)
			.map((res) => res.path);
		if (failedCases.length > 0) {
			await fsp.writeFile(path.join(outputDir, 'failed-cases.json'), JSON.stringify(failedCases));
		}
	}
}
