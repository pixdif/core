import { Readable } from 'stream';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';
import type { DiffOptions } from '@pixdif/model';

import clipImage from './clipImage.js';
import waitFor from './waitFor.js';

interface Comparison {
	/**
	 * Total number of different pixels
	 */
	diff: number;

	/**
	 * Total number of pixels.
	 */
	dimension: number;

	/**
	 * Diff Image
	 */
	image: PNG;
}

/**
 * Compare two images and generate their diff image
 * @param expected expected
 * @param actual actual
 * @return number of mismatched pixels and total pixels
 */
async function compareImage(
	expected: Readable,
	actual: Readable,
	options?: DiffOptions,
): Promise<Comparison> {
	const imageA = expected.pipe(new PNG());
	const imageB = actual.pipe(new PNG());

	await Promise.all([
		waitFor(imageA, 'parsed'),
		waitFor(imageB, 'parsed'),
	]);

	let { width, height } = imageB;
	let dimension = width * height;
	let dataA = imageA.data;
	let dataB = imageB.data;
	let diffNum = 0;

	if (width !== imageA.width || height !== imageA.height) {
		width = Math.min(width, imageA.width);
		height = Math.min(height, imageA.height);
		const rect = {
			x: 0,
			y: 0,
			width,
			height,
		};
		dataA = clipImage(imageA, rect);
		dataB = clipImage(imageB, rect);
		dimension = Math.max(imageA.width, imageB.width) * Math.max(imageA.height, imageB.height);
		diffNum += dimension - width * height;
	}

	const diff = new PNG({ width, height });
	diffNum += pixelmatch(dataA, dataB, diff.data, width, height, {
		threshold: 0.1,
		diffMask: true,
		...options,
	});

	return {
		diff: diffNum,
		dimension,
		image: diff,
	};
}

export default compareImage;
