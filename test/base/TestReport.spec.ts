import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import { Config, TestCase, TestStatus } from '@pixdif/model';

import TestReport from '../../src/base/TestReport';
import rimraf from '../../src/util/rimraf';

const config: Config = {
	diffThreshold: 0,
	wsEndpoint: 'localhost:5983',
};

it('saves an empty report', async () => {
	const to = 'output/empty-report/';

	const report = new TestReport(config);
	await report.save(to);

	expect(fs.existsSync(path.join(to, 'index.html'))).toBe(true);
	expect(fs.existsSync(path.join(to, 'diff-viewer.html'))).toBe(true);
	expect(fs.existsSync(path.join(to, 'test-report.data.js'))).toBe(true);
	expect(fs.existsSync(path.join(to, 'static'))).toBe(true);

	const reportData = JSON.parse(await fsp.readFile(path.join(to, 'test-report.json'), 'utf8'));
	expect(reportData.config).toStrictEqual(config);
	expect(reportData.testCases).toHaveLength(0);

	await rimraf(to);
});

it('saves a success and a failure', async () => {
	const success: TestCase = {
		id: 0,
		name: 'success',
		path: 'success.pdf',
		baseline: 'base/success.pdf',
		actual: 'out/success.pdf',
		status: TestStatus.Matched,
	};
	const failure: TestCase = {
		id: 0,
		name: 'failure',
		path: 'failure.pdf',
		baseline: 'base/failure.pdf',
		actual: 'out/failure.pdf',
		status: TestStatus.Mismatched,
	};
	const report = new TestReport(config, [success]);
	report.add(failure);
	expect(report.length).toBe(2);

	const to = 'output/sample';
	await report.save(to);

	const { testCases } = JSON.parse(await fsp.readFile(path.join(to, 'test-report.json'), 'utf8'));
	expect(testCases).toHaveLength(2);
	expect(testCases[0]).toStrictEqual(success);
	expect(testCases[1]).toStrictEqual(failure);

	const failedCases = JSON.parse(await fsp.readFile(path.join(to, 'failed-cases.json'), 'utf8'));
	expect(failedCases).toHaveLength(1);
	expect(failedCases).toContain(failure.path);
});
