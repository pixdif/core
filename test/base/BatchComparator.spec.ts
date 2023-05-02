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

it('checks properties', () => {
	expect(cmp.getReportDir()).toBe(to);
	expect(cmp.getCacheDir()).toBeUndefined();
	expect(cmp.getProgress()).toBe(0);
	expect(cmp.getProgressLimit()).toBe(0);
});

it('can change cache directory', () => {
	const a = new BatchComparator(to);
	a.setCacheDir('test');
	expect(a.getCacheDir()).toBe('test');
});

it('cannot execute 0 tasks', async () => {
	await expect(() => cmp.exec()).rejects.toThrowError('Please add one task at least');
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
	cmp.addTask({
		name: 'fewer pages',
		expected: 'test/sample/logo.pdf',
		actual: 'test/sample/shape.pdf',
	});
	cmp.addTask({
		name: 'more pages',
		expected: 'test/sample/square.pdf',
		actual: 'test/sample/logo.pdf',
	});
});

let report: TestReport;

it('compares PDF files', async () => {
	report = await cmp.exec();
}, 20 * 1000);

it('can correctly show matched pages', () => {
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

it('can tell differences', () => {
	const testCase = report.get(1);
	expect(testCase?.name).toBe('shape to square');
	expect(testCase?.status).toBe(TestStatus.Mismatched);
	const details = testCase?.details;
	expect(details).toHaveLength(1);
	expect(details?.[0].ratio).toBeGreaterThan(0);
});

it('skips comparing if expected file is not found', () => {
	const testCase = report.get(2);
	expect(testCase?.name).toBe('expected not found');
	expect(testCase?.status).toBe(TestStatus.ExpectedNotFound);
});

it('skips comparing if actual file is not found', () => {
	const testCase = report.get(3);
	expect(testCase?.name).toBe('actual not found');
	expect(testCase?.status).toBe(TestStatus.ActualNotFound);
});

it('can handle fewer pages than expected', () => {
	const testCase = report.get(4);
	expect(testCase?.name).toBe('fewer pages');
	expect(testCase?.status).toBe(TestStatus.Mismatched);
});

it('can handle more pages than expected', () => {
	const testCase = report.get(5);
	expect(testCase?.name).toBe('more pages');
	expect(testCase?.status).toBe(TestStatus.Mismatched);
});

it('generates a report', async () => {
	report.setTitle('Sample Report');
	expect(report.getTitle()).toBe('Sample Report');
	report.setFormat('@pixdif/html-reporter');
	await report.save();
});
