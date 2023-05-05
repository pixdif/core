import {
	beforeAll,
	describe,
	expect,
	it,
	jest,
} from '@jest/globals';
import { Progress } from '@pixdif/model';
import PdfParser from '@pixdif/pdf-parser';

import CacheManager from '../../src/base/CacheManager';
import compareImage from '../../src/util/compareImage';

const cacheDir = 'output/cache/test/sample/shape';
const filePath = 'test/sample/shape.pdf';

describe('Create Cache', () => {
	const pdf = new PdfParser(filePath);
	const parser = new CacheManager(pdf, { cacheDir });
	const getPage = jest.spyOn(pdf, 'getPage');

	beforeAll(async () => {
		await parser.clearCache();
	});

	it('generates cache', async () => {
		const onProgress = jest.fn<(progress: Progress) => void>();
		parser.on('progress', onProgress);
		await parser.open();
		expect(parser.getPageNum()).toBe(1);
		expect(getPage).toBeCalledTimes(1);
		getPage.mockClear();
		expect(onProgress).toBeCalledWith({ current: 1, limit: 1 });
	});

	it('reads cache', async () => {
		const image1 = parser.getImage(0);
		const image2 = parser.getImage(0);
		expect(getPage).toBeCalledTimes(0);

		const cmp = await compareImage(image1, image2);
		expect(cmp.diff).toBe(0);
	});
});

describe('Reuse Cache', () => {
	const pdf = new PdfParser(filePath);
	const parser = new CacheManager(pdf, { cacheDir });
	const getPage = jest.spyOn(pdf, 'getPage');

	it('does not fire progress', async () => {
		const onProgress = jest.fn<(progress: Progress) => void>();
		parser.on('progress', onProgress);
		await parser.open();
		expect(onProgress).not.toBeCalled();
	});

	it('reads cache', async () => {
		const image1 = parser.getImage(0);
		const image2 = parser.getImage(0);
		expect(getPage).toBeCalledTimes(0);

		const cmp = await compareImage(image1, image2);
		expect(cmp.diff).toBe(0);
	});

	it('clears cache', async () => {
		await parser.clearCache();
	});

	it('clears cache twice', async () => {
		await parser.clearCache();
	});
});
