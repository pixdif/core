import { compare } from '../../src/base/Comparator';

it('compares PDF files', async () => {
	const diff = await compare('test/sample/shape.pdf', 'test/sample/shape.pdf', {
		imageDir: 'output/cmp',
	});
	expect(diff).toHaveLength(1);
	expect(diff[0]).toBe(0);
});
