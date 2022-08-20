import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import { EventEmitter } from 'events';

import {
	Progress,
} from '@pixdif/model';
import Parser from '@pixdif/parser';

import compareImage from '../util/compareImage';

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

interface CacheMeta {
	pageNum?: number;
	fingerprint?: string;
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
		const expectedCacheDir = path.join(cacheDir, getImageDir(expected));
		const cacheMetaFile = path.join(expectedCacheDir, '.meta');
		let cacheMeta: CacheMeta = {};
		if (fs.existsSync(cacheMetaFile)) {
			try {
				cacheMeta = JSON.parse(await fsp.readFile(cacheMetaFile, 'utf-8'));
			} catch (error) {
				// Do nothing
			}
		} else {
			await fsp.mkdir(expectedCacheDir, { recursive: true });
		}

		// Update image cache if the baseline is updated
		let expectedPageNum = cacheMeta.pageNum || 0;
		const baseline = parse(expected);
		const expectedFingerprint = await baseline.getFingerprint();
		if (expectedFingerprint !== cacheMeta.fingerprint) {
			expectedPageNum = await baseline.open();
			for (let i = 1; i <= expectedPageNum; i++) {
				this.emit(Action.Preparing, {
					current: i,
					limit: expectedPageNum,
				});
				const image = await baseline.getImage(i);
				const out = fs.createWriteStream(path.join(expectedCacheDir, `${i}.png`));
				image.pipe(out);
			}
			cacheMeta = {
				fingerprint: expectedFingerprint,
				pageNum: expectedPageNum,
			};
			await fsp.writeFile(cacheMetaFile, JSON.stringify(cacheMeta));
		}

		// Make expected and actual image directory
		const expectedImageDir = path.join(imageDir, 'expected');
		await fsp.mkdir(expectedImageDir, { recursive: true });
		const actualImageDir = path.join(imageDir, 'actual');
		await fsp.mkdir(actualImageDir, { recursive: true });

		const diffs = [];
		const target = parse(actual);
		const targetPageNum = await target.open();
		const pageNum = Math.min(expectedPageNum, targetPageNum);

		this.emit(Action.Copying, { current: 0, limit: pageNum });
		for (let i = 1; i <= expectedPageNum; i++) {
			this.emit(Action.Copying, { current: i, limit: pageNum });
			const from = path.join(expectedCacheDir, `${i}.png`);
			const to = path.join(expectedImageDir, `${i}.png`);
			await fsp.copyFile(from, to);
		}

		this.emit(Action.Converting, { current: 0, limit: pageNum });
		this.emit(Action.Comparing, { current: 0, limit: pageNum });
		for (let i = 1; i <= pageNum; i++) {
			const expectedPath = path.join(expectedImageDir, `${i}.png`);
			const actualPath = path.join(actualImageDir, `${i}.png`);
			const outputPath = path.join(imageDir, `${i}.png`);

			this.emit(Action.Converting, { current: i, limit: pageNum });
			const actualImage = await target.getImage(i);
			actualImage.pipe(fs.createWriteStream(actualPath));

			this.emit(Action.Comparing, { current: i, limit: pageNum });
			const expectedImage = fs.createReadStream(expectedPath);
			try {
				const res = await compareImage(expectedImage, actualImage);
				diffs.push(res.diff / res.dimension);
				res.image.pipe(fs.createWriteStream(outputPath));
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

		if (expectedPageNum !== targetPageNum) {
			// Mark lost pages. The difference should be 100%
			const lost = Math.abs(expectedPageNum - targetPageNum);
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
