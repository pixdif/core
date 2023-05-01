import { glob } from 'glob';

test('Find files', async () => {
	const images = await glob('./test/sample/*.png');
	expect(images).toHaveLength(3);
});
