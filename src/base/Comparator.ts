import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import { EventEmitter } from 'events';
import { PassThrough } from 'stream';

import {
	Progress, TestPoint,
} from '@pixdif/model';
import Parser from '@pixdif/parser';

import compareImage from '../util/compareImage';
import CacheParser from './CacheParser';
import waitFor from '../util/waitFor';

type ParserType = new(filePath: string) => Parser;

function parse(filePath: string): Parser {
	const ext = path.extname(filePath).substring(1);
	// eslint-disable-next-line global-require, import/no-dynamic-require
	const ParserModule = require(`@pixdif/${ext}-parser`);
	const ParserClass: ParserType = ParserModule.default || ParserModule;
	return new ParserClass(filePath);
}

function getImageDir(filePath: string): string {
	const info = path.parse(filePath);
	return path.join(info.dir, info.name);
}

export const enum Action {
	/**
	 * Reading the baseline and convert it into images. Save images in cache.
	 */
	Preparing = 'preparing',

	/**
	 * Converting your output into images.
	 */
	Converting = 'converting',

	/**
	 * Copying baseline images into output folder.
	 */
	Copying = 'copying',

	/**
	 * Comparing your output images with corresponding baselines.
	 */
	Comparing = 'comparing',
}

export interface ComparisonOptions {
	/**
	 * Cache directory of intermediate results, mainly images converted from baselines.
	 */
	cacheDir?: string;

	/**
	 * Directory to save images converted from actual files.
	 * By default, it creates a directory of the same name in the same location as the actual file.
	 */
	imageDir?: string;
}

interface Comparator {
	on(event: Action, listener: (progress: Progress) => void): this;
	once(event: Action, listener: (progress: Progress) => void): this;
	off(event: Action, listener: (progress: Progress) => void): this;
	emit(event: Action, progress: Progress): boolean;
}

/**
 * A comparator between two files or directories.
 * The file / directory may contain multiple images inside.
 */
class Comparator extends EventEmitter {
	protected readonly expected: string;

	protected readonly actual: string;

	protected cacheDir: string;

	protected imageDir: string;

	protected tasks?: Promise<unknown>[];

	/**
	 * Compare if two files are the same
	 * @param expected baseline file path
	 * @param actual actual file path
	 * @param options extra options
	 */
	constructor(expected: string, actual: string, options?: ComparisonOptions) {
		super();

		this.expected = expected;
		this.actual = actual;
		this.cacheDir = options?.cacheDir ?? 'cache';
		this.imageDir = options?.imageDir ?? getImageDir(actual);
	}

	getExpected(): string {
		return this.expected;
	}

	getActual(): string {
		return this.actual;
	}

	/**
	 * Wait until the comparator is not running and all files are written to hard disk.
	 */
	async idle(): Promise<void> {
		if (!this.tasks) {
			return;
		}
		await Promise.all(this.tasks);
		delete this.tasks;
	}

	/**
	 * @return Differences of each image
	 */
	async exec(): Promise<TestPoint[]> {
		const {
			expected,
			actual,
			cacheDir,
			imageDir,
		} = this;

		const tasks: Promise<unknown>[] = [];

		// Read baseline cache meta
		const baseline = new CacheParser(parse(expected), {
			cacheDir: path.join(cacheDir, getImageDir(expected)),
		});

		// Update image cache if the baseline is updated
		const expectedImageDir = path.join(imageDir, 'expected');
		await fsp.mkdir(expectedImageDir, { recursive: true });

		await baseline.open();
		const expectedPageNum = await baseline.getPageNum();
		const validCache = baseline.isValid();
		for (let i = 1; i <= expectedPageNum; i++) {
			if (!validCache) {
				this.emit(Action.Preparing, {
					current: i,
					limit: expectedPageNum,
				});
			}
			this.emit(Action.Copying, { current: i, limit: expectedPageNum });
			const from = await baseline.getImage(i - 1);
			const to = from.pipe(fs.createWriteStream(path.join(expectedImageDir, `${i}.png`)));
			tasks.push(waitFor(to, 'close'));

			if (!validCache) {
				await baseline.commitCache();
			}
		}

		const actualImageDir = path.join(imageDir, 'actual');
		await fsp.mkdir(actualImageDir, { recursive: true });

		const details: TestPoint[] = [];
		const target = parse(actual);
		await target.open();
		const actualPageNum = await target.getPageNum();
		const pageNum = Math.min(expectedPageNum, actualPageNum);

		for (let i = 1; i <= pageNum; i++) {
			const name = `Page ${i}`;
			const expectedPath = path.join(expectedImageDir, `${i}.png`);
			const actualPath = path.join(actualImageDir, `${i}.png`);
			const diffPath = path.join(imageDir, `${i}.png`);

			this.emit(Action.Converting, { current: i, limit: pageNum });
			const actualPage = await target.getPage(i - 1);
			if (!actualPage) {
				throw new Error(`Failed to read page ${i}`);
			}

			const actualImage = await actualPage.getImage();
			const actualImageFile = actualImage.pipe(new PassThrough())
				.pipe(fs.createWriteStream(actualPath));
			tasks.push(waitFor(actualImageFile, 'close'));

			this.emit(Action.Comparing, { current: i, limit: pageNum });
			const expectedImage = await baseline.getImage(i - 1);
			try {
				const res = await compareImage(expectedImage, actualImage);
				const ratio = res.diff / res.dimension;
				details.push({
					name,
					expected: expectedPath,
					actual: actualPath,
					diff: diffPath,
					ratio,
				});
				if (res.diff > 0) {
					const diffImageFile = res.image.pack().pipe(fs.createWriteStream(diffPath));
					tasks.push(waitFor(diffImageFile, 'close'));
				}
			} catch (error) {
				this.emit(
					Action.Comparing,
					{
						current: i,
						limit: pageNum,
						error: (error instanceof Error) ? error : new Error(String(error)),
					},
				);
				details.push({
					name,
					expected: expectedPath,
					actual: '',
					ratio: NaN,
				});
			}
		}

		if (expectedPageNum !== actualPageNum) {
			// Mark lost pages. The difference should be 100%
			const start = Math.min(expectedPageNum, actualPageNum) + 1;
			const end = Math.max(expectedPageNum, actualPageNum);
			for (let i = start; i <= end; i++) {
				details.push({
					name: `Page ${i}`,
					expected: path.join(expectedImageDir, `${i}.png`),
					actual: path.join(actualImageDir, `${i}.png`),
					ratio: 1,
				});
			}
		}

		this.tasks = tasks;
		return details;
	}
}

/**
 * Compare if two files are the same
 * @param expected File path of baseline
 * @param actual File path of output
 * @param options Custom options
 * @return Differences of each page
*/
export async function compare(
	expected: string,
	actual: string,
	options?: ComparisonOptions,
): Promise<TestPoint[]> {
	const cmp = new Comparator(expected, actual, options);
	const diffs = await cmp.exec();
	return diffs;
}

export default Comparator;
