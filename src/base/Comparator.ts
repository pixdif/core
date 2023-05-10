import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import { EventEmitter } from 'events';
import { PassThrough } from 'stream';

import {
	Progress,
	TestPoint,
} from '@pixdif/model';
import Parser from '@pixdif/parser';

import compareImage from '../util/compareImage';
import CacheManager from './CacheManager';
import parse from '../util/parse';
import waitFor from '../util/waitFor';

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

export interface Comparator {
	on(event: Action, listener: (progress: Progress) => void): this;
	once(event: Action, listener: (progress: Progress) => void): this;
	off(event: Action, listener: (progress: Progress) => void): this;
	emit(event: Action, progress: Progress): boolean;
}

/**
 * A comparator between two files or directories.
 * The file / directory may contain multiple images inside.
 */
export class Comparator extends EventEmitter {
	protected readonly expected: string;

	protected readonly actual: string;

	protected cacheDir: string;

	protected imageDir: string;

	protected tasks: Promise<unknown>[] = [];

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
		if (this.tasks.length <= 0) {
			return;
		}
		await Promise.all(this.tasks);
		this.tasks = [];
	}

	/**
	 * @return Differences of each image
	 */
	async exec(): Promise<TestPoint[]> {
		await this.idle();

		// Open expected file
		const expected = await this.#openExpectedFile();
		const expectedImageDir = this.#getExpectedImageDir();
		const expectedPageNum = expected ? expected.getPageNum() : 0;

		// Prepare directory to save images of actual file
		const actualImageDir = this.#getActualImageDir();
		await fsp.mkdir(actualImageDir, { recursive: true });

		// Open actual file
		const actual = await this.#openActualFile();
		const actualPageNum = actual ? await actual.getPageNum() : 0;

		// Compare each page
		const pageNum = Math.max(expectedPageNum, actualPageNum);
		const details: TestPoint[] = [];
		for (let i = 1; i <= pageNum; i++) {
			const index = i - 1;
			const expectedPath = path.join(expectedImageDir, `${i}.png`);
			const actualPath = path.join(actualImageDir, `${i}.png`);
			const diffPath = path.join(this.imageDir, `${i}.png`);

			this.emit(Action.Converting, { current: i, limit: pageNum });
			const actualPage = index < actualPageNum ? await actual?.getPage(index) : undefined;
			const actualImage = await actualPage?.render();

			// Save the image to hard disk
			if (actualImage) {
				const actualImageFile = actualImage.pipe(new PassThrough())
					.pipe(fs.createWriteStream(actualPath));
				this.tasks.push(waitFor(actualImageFile, 'close'));
			}

			const name = actualPage ? actualPage.getTitle() : `Page ${i}`;
			this.emit(Action.Comparing, { current: i, limit: pageNum });
			const expectedImage = index < expectedPageNum ? expected?.getImage(index) : undefined;

			// If both expected and actual exist, compare them
			const detail = {
				name,
				expected: expectedPath,
				actual: actualPath,
				diff: diffPath,
			};
			let ratio = NaN;

			if (expectedImage && actualImage) {
				try {
					const res = await compareImage(expectedImage, actualImage);
					ratio = res.diff / res.dimension;
					if (res.diff > 0) {
						const diffImageFile = res.image.pack().pipe(fs.createWriteStream(diffPath));
						this.tasks.push(waitFor(diffImageFile, 'close'));
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
				}
			} else {
				ratio = 1;
			}

			details.push({
				...detail,
				ratio,
			});
		}

		return details;
	}

	/**
	 * @returns The directory to save images of expected file.
	 */
	#getExpectedImageDir(): string {
		return path.join(this.imageDir, 'expected');
	}

	/**
	 * @returns The directory to save images of actual file.
	 */
	#getActualImageDir(): string {
		return path.join(this.imageDir, 'actual');
	}

	/**
	 * Open baseline (expected file) and read images.
	 *
	 * The images will be cached to speed up further reading actions.
	 *
	 * @returns expected images
	 */
	async #openExpectedFile(): Promise<CacheManager | undefined> {
		const { expected } = this;
		if (!fs.existsSync(expected)) {
			return;
		}

		// Read baseline cache meta
		const baseline = new CacheManager(parse(expected), {
			cacheDir: path.join(this.cacheDir, getImageDir(expected)),
		});

		// Update image cache if the baseline is updated
		const expectedImageDir = this.#getExpectedImageDir();
		await fsp.mkdir(expectedImageDir, { recursive: true });

		baseline.on('progress', (progress) => {
			this.emit(Action.Preparing, progress);
		});
		await baseline.open();

		const expectedPageNum = baseline.getPageNum();
		for (let i = 1; i <= expectedPageNum; i++) {
			this.emit(Action.Copying, { current: i, limit: expectedPageNum });
			const from = baseline.getImage(i - 1);
			const to = fs.createWriteStream(path.join(expectedImageDir, `${i}.png`));
			from.pipe(to);
			this.tasks.push(waitFor(to, 'close'));
		}

		return baseline;
	}

	/**
	 * Open actual output and read images.
	 *
	 * @returns parser of actual output
	 */
	async #openActualFile(): Promise<Parser | undefined> {
		const { actual } = this;
		if (!fs.existsSync(actual)) {
			return;
		}

		const parser = parse(actual);
		await parser.open();
		return parser;
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
