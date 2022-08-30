import fs from 'fs';
import path from 'path';

import { compare } from '../../src/base/Comparator';
import idle from '../../src/util/idle';

it('compares the same PDF file', async () => {
	const imageDir = 'output/cmp-same';
	const diff = await compare('test/sample/shape.pdf', 'test/sample/shape.pdf', {
		imageDir,
	});
	expect(diff).toHaveLength(1);
	expect(diff[0]).toBe(0);
	expect(fs.existsSync(path.join(imageDir, '1.png'))).toBe(false);
	expect(fs.existsSync(path.join(imageDir, 'expected', '1.png'))).toBe(true);
	expect(fs.existsSync(path.join(imageDir, 'actual', '1.png'))).toBe(true);
});

it('compares 2 different PDF files', async () => {
	const imageDir = 'output/cmp-diff';
	const diff = await compare('test/sample/shape.pdf', 'test/sample/square.pdf', {
		imageDir,
	});
	expect(diff).toHaveLength(1);
	expect(diff[0]).toBeGreaterThan(0);

	await idle(100);
	const diffImageFile = path.join(imageDir, '1.png');
	expect(fs.existsSync(diffImageFile)).toBe(true);
});
