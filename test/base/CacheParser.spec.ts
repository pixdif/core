import {
	beforeAll,
	describe,
	expect,
	it,
	jest,
} from '@jest/globals';
import fsp from 'fs/promises';
import path from 'path';
import PdfParser from '@pixdif/pdf-parser';

import CacheParser from '../../src/base/CacheParser';
import compareImage from '../../src/util/compareImage';

const cacheDir = 'output/cache/test/sample/shape';
const filePath = 'test/sample/shape.pdf';

describe('Normal Cases', () => {
	const pdf = new PdfParser(filePath);
	const parser = new CacheParser(pdf, { cacheDir });

	beforeAll(async () => {
		await parser.clearCache();
	});

	it('opens a PDF file', async () => {
		await parser.open();
		expect(await parser.getPageNum()).toBe(1);
	});

	it('generates cache', async () => {
		const getPage = jest.spyOn(pdf, 'getPage');
		const image1 = await parser.getImage(0);
		await parser.commitCache();

		const image2 = await parser.getImage(0);
		expect(getPage).toBeCalledTimes(1);
		expect(getPage).toBeCalledWith(0);

		const cmp = await compareImage(image1, image2);
		expect(cmp.diff).toBe(0);
	});
});

describe('Error Cases', () => {
	const pdf = new PdfParser(filePath);
	const parser = new CacheParser(pdf, { cacheDir });

	it('returns invalid cache if not open', () => {
		expect(parser.isValid()).toBe(false);
	});

	it('cannot commit cache without data', async () => {
		await expect(() => parser.commitCache()).rejects.toThrowError('There is no data to commit.');
	});

	it('can re-generate an image if it is deleted by mistake', async () => {
		await fsp.unlink(path.join(cacheDir, '0.png'));

		await parser.open();
		expect(parser.isValid()).toBe(true);
		await parser.getImage(0);
	});

	it('does nothing if fingerprint is not changed', async () => {
		const writeFile = jest.spyOn(fsp, 'writeFile');
		await parser.commitCache();
		expect(writeFile).toBeCalledTimes(0);
		writeFile.mockRestore();
	});

	it('clear cache twice', async () => {
		await parser.clearCache();
		await parser.clearCache();
	});
});
