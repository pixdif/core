import {
	describe,
	test,
	expect,
	jest,
} from '@jest/globals';

import SingleImageParser from './mock/SingleImageParser';

describe('Normal', () => {
	const input = 'test/sample/circle.png';
	const parser = new SingleImageParser(input);

	test('Open an image', async () => {
		const openFile = jest.spyOn(parser, 'openFile');
		expect(await parser.getFingerprint()).toBe('987cfcfebb56e76b18a3649100882f3555ebc70e');
		await parser.open();
		expect(openFile).toBeCalledTimes(1);
	});

	test('Supports multiple hash algorithm', async () => {
		expect(await parser.getFingerprint({
			algorithm: 'sha256',
			encoding: 'base64',
		})).toBe('Ly0P6KgmtP0jyC85j+wmXtswAXaKRRP0wrmtvcBsrcM=');
	});

	test('Open a page', async () => {
		expect(await parser.getPageNum()).toBe(1);
		expect(await parser.getPage(0)).toBeTruthy();
	});

	test('Open an outline', async () => {
		const outlines = await parser.getOutline();
		expect(outlines).toHaveLength(1);

		const [outline] = outlines;
		expect(outline.getTitle()).toBe('Heading 1');
		expect(await outline.getPageNum()).toBe(1);
		expect(outline.getChildren()).toHaveLength(0);

		const page = await outline.getPage(0);
		expect(await page.render()).toBeTruthy();
	});
});

describe('Non-existing Image', () => {
	const parser = new SingleImageParser('n');

	test('Open a non-existing image', async () => {
		await parser.open();
		expect(await parser.getPageNum()).toBe(0);
		expect(() => parser.getPage(0)).rejects.toThrowError('Invalid page index: 0');
	});

	test('Read a non-existing image', async () => {
		const closeFile = jest.spyOn(parser, 'closeFile');
		await parser.close();
		expect(closeFile).toBeCalledTimes(1);
		closeFile.mockRestore();
	});
});
