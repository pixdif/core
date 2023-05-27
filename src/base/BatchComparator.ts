import fs from 'fs';
import path from 'path';
import { EventEmitter } from 'events';

import {
	Progress,
	TestCase,
	TestStatus,
} from '@pixdif/model';

import Comparator from './Comparator';
import TestReport from './TestReport';

export interface BatchOptions {
	/**
	 * Difference threshold of 2 pixels. Default: 0.001
	 */
	tolerance?: number;

	/**
	 * WebSocket endpoint to connect and manage baseline files. Default: localhost:5269
	 */
	wsEndpoint?: string;
}

export type BatchTask = Omit<TestCase, 'status' | 'details'>;

export interface BatchProgress extends Progress {
	testCase: TestCase;
}

export interface BatchCompareProgress extends BatchProgress {
	comparator: Comparator;
}

export interface BatchComparator {
	on(event: 'started', listener: () => void): this;
	on(event: 'progress', listener: (progress: BatchProgress) => void): this;
	on(event: 'comparing', listener: (progress: BatchCompareProgress) => void): this;
	on(event: 'stopped', listener: () => void): this;

	once(event: 'started', listener: () => void): this;
	once(event: 'progress', listener: (progress: BatchProgress) => void): this;
	once(event: 'comparing', listener: (progress: BatchCompareProgress) => void): this;
	once(event: 'stopped', listener: () => void): this;

	off(event: 'started', listener: () => void): this;
	off(event: 'progress', listener: (progress: BatchProgress) => void): this;
	off(event: 'comparing', listener: (progress: BatchCompareProgress) => void): this;
	off(event: 'stopped', listener: () => void): this;

	emit(event: 'started'): boolean;
	emit(event: 'progress', progress: BatchProgress): boolean;
	emit(event: 'comparing', progress: BatchCompareProgress): boolean;
	emit(event: 'stopped'): boolean;
}

/**
 * Compare multiple files in two directories.
 */
export class BatchComparator extends EventEmitter {
	protected tasks: Readonly<BatchTask>[] = [];

	protected tolerance: number;

	protected wsEndpoint: string;

	protected reportDir: string;

	protected cacheDir?: string;

	protected progress = 0;

	constructor(reportDir: string, options?: BatchOptions) {
		super();

		this.reportDir = reportDir;
		this.tolerance = options?.tolerance ?? 0.001;
		this.wsEndpoint = options?.wsEndpoint ?? 'localhost:5269';
	}

	/**
	 * @returns Location of the report.
	 */
	getReportDir(): string {
		return this.reportDir;
	}

	/**
	 * @returns Directory to save cache files (e.g. temporary images converted from baseline files)
	 */
	getCacheDir(): string | undefined {
		return this.cacheDir;
	}

	/**
	 * Sets a directory to save cache files.
	 * @param location directory location
	 */
	setCacheDir(location: string): void {
		this.cacheDir = location;
	}

	/**
	 * Add a new task.
	 * @param task batch task
	 */
	addTask(task: Readonly<BatchTask>): void {
		this.tasks.push(task);
	}

	/**
	 * @returns Current progress
	 */
	getProgress(): number {
		return this.progress;
	}

	/**
	 * @returns Progress limit
	 */
	getProgressLimit(): number {
		return this.tasks.length;
	}

	/**
	 * Compare each file and generate a test report.
	 */
	async exec(): Promise<TestReport> {
		const limit = this.getProgressLimit();
		if (limit <= 0) {
			throw new Error('Please add one task at least.');
		}

		this.progress = 0;
		this.emit('started');

		const {
			tolerance,
			wsEndpoint,
			reportDir,
			cacheDir,
		} = this;

		const testCases: TestCase[] = [];
		for (const task of this.tasks) {
			this.progress++;

			const testCase: TestCase = {
				...task,
				status: TestStatus.Unexecuted,
			};

			const progress: BatchProgress = {
				testCase,
				current: this.progress,
				limit,
			};
			this.emit('progress', progress);

			const op = task.path && path.parse(task.path);
			const imageDir = op ? path.join(reportDir, 'image', op.dir, op.name) : path.join(reportDir, 'image', task.name);
			const cmp = new Comparator(task.expected, task.actual, {
				imageDir,
				cacheDir,
			});

			// Compare current file
			this.emit('comparing', {
				...progress,
				comparator: cmp,
			});
			const details = await cmp.exec();

			// Convert file paths
			testCase.details = details;

			const baselineExists = fs.existsSync(task.expected);
			const actualExists = fs.existsSync(task.actual);
			if (baselineExists && actualExists) {
				const matched = details.every(({ ratio }): boolean => ratio <= tolerance);
				testCase.status = matched ? TestStatus.Matched : TestStatus.Mismatched;
			} else if (!baselineExists) {
				testCase.status = TestStatus.ExpectedNotFound;
			} else {
				testCase.status = TestStatus.ActualNotFound;
			}

			this.emit('progress', progress);
			testCases.push(testCase);
		}

		this.emit('stopped');

		const config = {
			tolerance,
			wsEndpoint,
		};
		return new TestReport(reportDir, config, testCases);
	}
}

export default BatchComparator;
