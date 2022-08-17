import glob from '../../src/util/glob';

test('Find files', async () => {
	const images = await glob('./test/sample/*.png');
	expect(images).toHaveLength(3);
});
