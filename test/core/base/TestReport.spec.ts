import {
	expect,
	it,
} from '@jest/globals';
import fs from 'fs';
import path from 'path';

import { rimraf } from 'rimraf';
import { Config, TestCase, TestStatus } from '@pixdif/model';

import TestReport from '@pixdif/core/base/TestReport';

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
	expect(fs.existsSync(path.join(to, 'test-report.data.js'))).toBe(true);
	expect(fs.existsSync(path.join(to, 'static'))).toBe(true);
});

it('saves a success and a failure', async () => {
	const to = 'output/test-report';
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
	const report = new TestReport(to, config);
	report.setFormat('@pixdif/html-reporter');
	expect(report.getFormat()).toBe('@pixdif/html-reporter');
	report.add(success);
	report.add(failure);
	expect(report.length).toBe(2);

	await report.save();
});
