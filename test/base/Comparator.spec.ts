import fs from 'fs';
import path from 'path';
import { PNG } from 'pngjs';
import { rimraf } from 'rimraf';

import Comparator, { compare } from '../../src/base/Comparator';
import waitFor from '../../src/util/waitFor';

it('compares the same PDF file', async () => {
	const imageDir = 'output/cmp-same';
	const diff = await compare('test/sample/shape.pdf', 'test/sample/shape.pdf', {
		imageDir,
	});
	expect(diff).toHaveLength(1);
	expect(diff[0].ratio).toBe(0);
	expect(fs.existsSync(path.join(imageDir, '1.png'))).toBe(false);
	expect(fs.existsSync(path.join(imageDir, 'expected', '1.png'))).toBe(true);
	expect(fs.existsSync(path.join(imageDir, 'actual', '1.png'))).toBe(true);
});

it('compares 2 different PDF files', async () => {
	const imageDir = 'output/cmp-diff';
	if (fs.existsSync(imageDir)) {
		await rimraf(imageDir);
	}

	const cmp = new Comparator('test/sample/shape.pdf', 'test/sample/square.pdf', {
		imageDir,
	});
	const diff = await cmp.exec();
	expect(diff).toHaveLength(1);
	expect(diff[0].ratio).toBeGreaterThan(0);

	await cmp.idle();
	const diffImageFile = path.join(imageDir, '1.png');
	expect(fs.existsSync(diffImageFile)).toBe(true);

	const diffImage = fs.createReadStream(diffImageFile).pipe(new PNG());
	await waitFor(diffImage, 'parsed');
	expect(diffImage.width).toBe(420);
	expect(diffImage.height).toBe(600);
});
