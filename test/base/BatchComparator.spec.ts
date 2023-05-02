import path from 'path';
import { rimraf } from 'rimraf';
import { TestStatus } from '@pixdif/model';

import BatchComparator from '../../src/base/BatchComparator';
import type TestReport from '../../src/base/TestReport';

const to = 'output/batch';
const cmp = new BatchComparator(to);

beforeAll(async () => {
	await rimraf(to);
});

it('adds tasks', async () => {
	cmp.addTask({
		name: 'shape to shape',
		expected: 'test/sample/shape.pdf',
		actual: 'test/sample/shape.pdf',
	});
	cmp.addTask({
		name: 'shape to square',
		path: 'test/sample/shape-to-square.yaml',
		expected: 'test/sample/shape.pdf',
		actual: 'test/sample/square.pdf',
	});
	cmp.addTask({
		name: 'expected not found',
		path: 'test/sample/expected-not-found.yaml',
		expected: 'test/sample/not-found.pdf',
		actual: 'test/sample/square.pdf',
	});
	cmp.addTask({
		name: 'actual not found',
		path: 'test/sample/actual-not-found.yaml',
		expected: 'test/sample/shape.pdf',
		actual: 'test/sample/not-found.pdf',
	});
});

let report: TestReport;

it('compares PDF files', async () => {
	report = await cmp.exec();

	const testCase = report.get(0);
	expect(testCase).toEqual({
		name: 'shape to shape',
		expected: path.normalize('../../test/sample/shape.pdf'),
		actual: path.normalize('../../test/sample/shape.pdf'),
		status: TestStatus.Matched,
		details: [
			{
				expected: path.normalize('image/shape to shape/expected/1.png'),
				diff: path.normalize('image/shape to shape/1.png'),
				actual: path.normalize('image/shape to shape/actual/1.png'),
				name: 'Page 1',
				ratio: 0,
			},
		],
	});
});

it('generates a report', async () => {
	report.setTitle('Sample Report');
	expect(report.getTitle()).toBe('Sample Report');
	report.setFormat('@pixdif/html-reporter');
	await report.save();
});
