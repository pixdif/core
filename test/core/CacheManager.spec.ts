import {
	beforeAll,
	describe,
	expect,
	it,
	jest,
} from '@jest/globals';

import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';

import type { Progress } from '@pixdif/model';
import PdfParser from '@pixdif/pdf-parser';
import PngParser from '@pixdif/png-parser';

import CacheManager from '@pixdif/core/CacheManager.js';
import compareImage from '@pixdif/core/util/compareImage.js';

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
});

describe('Update Cache', () => {
	const pdf = new PdfParser(filePath);
	const parser = new CacheManager(pdf, { cacheDir });

	it('generates an invalid meta', async () => {
		await fsp.writeFile(path.join(cacheDir, '.meta'), '{}');
	});

	it('updates cache', async () => {
		expect(parser.getPageNum()).toBe(0);
		await parser.open();
		expect(parser.getPageNum()).toBe(1);
	});

	it('clears cache', async () => {
		await parser.clearCache();
	});

	it('clears cache twice', async () => {
		await parser.clearCache();
	});
});

describe('PNG Cache', () => {
	const png = new PngParser('test/sample/circle.png');
	const cm = new CacheManager(png, { cacheDir: 'output/cache/png' });

	it('cleans cache', async () => {
		await cm.clearCache();
	});

	it('reads image', async () => {
		await cm.open();
		const img = cm.getImage(0);
		expect(img.readable).toBe(true);
	});

	it('generates cache', () => {
		expect(fs.existsSync('output/cache/png/0.png')).toBe(true);
	});
});
