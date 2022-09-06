import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import { Config, TestCase, TestStatus } from '@pixdif/model';

import TestReport from '../../src/base/TestReport';
import rimraf from '../../src/util/rimraf';

const config: Config = {
	tolerance: 0,
	wsEndpoint: 'localhost:5983',
};

it('saves an empty report', async () => {
	const to = 'output/empty-report/';
	await rimraf(to);

	const report = new TestReport(to, config);
	report.setFormat('@pixdif/html-reporter');
	await report.save();

	expect(fs.existsSync(path.join(to, 'index.html'))).toBe(true);
	expect(fs.existsSync(path.join(to, 'diff-viewer.html'))).toBe(true);
	expect(fs.existsSync(path.join(to, 'test-report.data.js'))).toBe(true);
	expect(fs.existsSync(path.join(to, 'static'))).toBe(true);
});

it('saves a success and a failure', async () => {
	const to = 'output/sample';
	await rimraf(to);

	const success: TestCase = {
		name: 'success',
		path: 'success.pdf',
		expected: 'base/success.pdf',
		actual: 'out/success.pdf',
		status: TestStatus.Matched,
	};
	const failure: TestCase = {
		name: 'failure',
		path: 'failure.pdf',
		expected: 'base/failure.pdf',
		actual: 'out/failure.pdf',
		status: TestStatus.Mismatched,
	};
	const report = new TestReport(to, config, [success]);
	report.setFormat('@pixdif/html-reporter');
	report.add(failure);
	expect(report.length).toBe(2);

	await report.save();
});
