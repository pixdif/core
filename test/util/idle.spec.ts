import {
	test,
	jest,
} from '@jest/globals';

import idle from '@pixdif/core/util/idle';

jest.useFakeTimers();

test('Delay a few seconds', async () => {
	await Promise.all([
		idle(100),
		jest.advanceTimersByTime(101),
	]);
});
