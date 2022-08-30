import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import { EventEmitter } from 'events';
import { PassThrough } from 'stream';

import {
	Progress,
} from '@pixdif/model';
import Parser from '@pixdif/parser';

import compareImage from '../util/compareImage';
import CacheParser from './CacheParser';

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
	 * @return Differences of each image
	 */
	async exec(): Promise<number[]> {
		const {
			expected,
			actual,
			cacheDir,
			imageDir,
		} = this;

		// Read baseline cache meta
		const baseline = new CacheParser(parse(expected), {
			cacheDir: path.join(cacheDir, getImageDir(expected)),
		});

		// Update image cache if the baseline is updated
		const expectedImageDir = path.join(imageDir, 'expected');
		await fsp.mkdir(expectedImageDir, { recursive: true });

		const expectedPageNum = await baseline.open();
		const validCache = baseline.isValid();
		for (let i = 1; i <= expectedPageNum; i++) {
			if (!validCache) {
				this.emit(Action.Preparing, {
					current: i,
					limit: expectedPageNum,
				});
			}
			this.emit(Action.Copying, { current: i, limit: expectedPageNum });
			const from = await baseline.getImage(i);
			const to = fs.createWriteStream(path.join(expectedImageDir, `${i}.png`));
			from.pipe(to);

			if (!validCache) {
				await baseline.commitCache();
			}
		}

		const actualImageDir = path.join(imageDir, 'actual');
		await fsp.mkdir(actualImageDir, { recursive: true });

		const diffs = [];
		const target = parse(actual);
		const actualPageNum = await target.open();
		const pageNum = Math.min(expectedPageNum, actualPageNum);

		for (let i = 1; i <= pageNum; i++) {
			const actualPath = path.join(actualImageDir, `${i}.png`);
			const diffPath = path.join(imageDir, `${i}.png`);

			this.emit(Action.Converting, { current: i, limit: pageNum });
			const actualImage = await target.getImage(i);
			actualImage.pipe(new PassThrough()).pipe(fs.createWriteStream(actualPath));

			this.emit(Action.Comparing, { current: i, limit: pageNum });
			const expectedImage = await baseline.getImage(i);
			try {
				const res = await compareImage(expectedImage, actualImage);
				diffs.push(res.diff / res.dimension);
				if (res.diff > 0) {
					res.image.pack().pipe(fs.createWriteStream(diffPath));
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
				diffs.push(NaN);
			}
		}

		if (expectedPageNum !== actualPageNum) {
			// Mark lost pages. The difference should be 100%
			const lost = Math.abs(expectedPageNum - actualPageNum);
			for (let i = 0; i < lost; i++) {
				diffs.push(1);
			}
		}

		return diffs;
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
): Promise<number[]> {
	const cmp = new Comparator(expected, actual, options);
	const diffs = await cmp.exec();
	return diffs;
}

export default Comparator;
