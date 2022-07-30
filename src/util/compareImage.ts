import fs from 'fs';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';

import clipImage from './clipImage';
import waitFor from './waitFor';

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
 * @param imageAPath expected
 * @param imageBPath actual
 * @return number of mismatched pixels and total pixels
 */
async function compareImage(
	imageAPath: string,
	imageBPath: string,
): Promise<Comparison> {
	const imageA = fs.createReadStream(imageAPath).pipe(new PNG());
	const imageB = fs.createReadStream(imageBPath).pipe(new PNG());

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
	});

	return {
		diff: diffNum,
		dimension,
		image: diff,
	};
}

export default compareImage;
