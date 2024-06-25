import {
	expect,
	test,
} from '@jest/globals';
import capitalize from '@pixdif/core/util/capitalize.js';

test('Convert a word', () => {
	const res = capitalize('this');
	expect(res).toBe('This');
});
