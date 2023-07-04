import {
	expect,
	test,
} from '@jest/globals';
import { glob } from 'glob';

test('Find files', async () => {
	const images = await glob('./test/sample/*.png');
	expect(images).toHaveLength(6);
});
