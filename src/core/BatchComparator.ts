import { EventEmitter } from 'events';

import {
	Progress,
	TestCase,
} from '@pixdif/model';

import type BatchTask from './BatchTask';
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

export interface BatchProgress extends Progress {
	testCase: TestCase;
}

export interface BatchCompareProgress extends BatchProgress {
	comparator: Comparator;
}

interface BatchComparatorEvents {
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
export class BatchComparator extends EventEmitter implements BatchComparatorEvents {
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
	addTask(task: BatchTask): void {
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

		for (const task of this.tasks) {
			this.progress++;

			const progress: BatchProgress = {
				testCase: task.getTestCase(),
				current: this.progress,
				limit,
			};
			this.emit('progress', progress);

			task.once('started', (comparator) => {
				this.emit('comparing', {
					...progress,
					comparator,
				});
			});

			await task.exec({
				reportDir,
				cacheDir,
				tolerance,
			});

			this.emit('progress', progress);
		}

		this.emit('stopped');

		const config = {
			tolerance,
			wsEndpoint,
		};
		return new TestReport(reportDir, config);
	}
}

export default BatchComparator;
