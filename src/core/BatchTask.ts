import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import { EventEmitter } from 'stream';
import { TestCase, TestStatus } from '@pixdif/model';

import Comparator from './Comparator';

export type BatchTaskProps = Omit<TestCase, 'status' | 'details'>;

interface ExecutionOptions {
	reportDir: string;
	tolerance: number;
	cacheDir?: string;
}

interface BatchTaskEvents {
	on(event: 'started', listener: (cmp: Comparator) => void): this;
	on(event: 'stopped', listener: () => void): this;

	once(event: 'started', listener: (cmp: Comparator) => void): this;
	once(event: 'stopped', listener: () => void): this;

	off(event: 'started', listener: (cmp: Comparator) => void): this;
	off(event: 'stopped', listener: () => void): this;

	emit(event: 'started', cmp: Comparator): boolean;
	emit(event: 'stopped'): boolean;
}

export class BatchTask extends EventEmitter implements BatchTaskEvents {
	protected id = '';

	protected readonly testCase: TestCase;

	constructor(props: BatchTaskProps) {
		super();
		this.testCase = { ...props };
	}

	setId(id: string): void {
		this.id = id;
	}

	getId(): string {
		return this.id;
	}

	getTestCase(): TestCase {
		return this.testCase;
	}

	getUniqueDir(): string {
		if (this.id) {
			return String(this.id);
		}
		const { dir, name } = path.parse(this.testCase.actual);
		return path.join(dir, name);
	}

	async exec(options: ExecutionOptions): Promise<void> {
		const { expected, actual } = this.testCase;
		const dataDir = path.join(options.reportDir, 'data', this.getUniqueDir());
		const cmp = new Comparator(expected, actual, {
			imageDir: dataDir,
			cacheDir: options.cacheDir,
		});

		this.emit('started', cmp);

		const details = await cmp.exec();
		this.testCase.details = details;

		const baselineExists = fs.existsSync(expected);
		const actualExists = fs.existsSync(actual);
		if (baselineExists && actualExists) {
			const matched = details.every(({ ratio }): boolean => ratio <= options.tolerance);
			this.testCase.status = matched ? TestStatus.Matched : TestStatus.Mismatched;
		} else if (!baselineExists) {
			this.testCase.status = TestStatus.ExpectedNotFound;
		} else {
			this.testCase.status = TestStatus.ActualNotFound;
		}

		await fsp.writeFile(path.join(dataDir, 'test-case.pixdif.json'), JSON.stringify(this.testCase));
		this.emit('stopped');
	}
}

export default BatchTask;
