import { test } from '@jest/globals';
import { EventEmitter } from 'events';

import waitFor from '@pixdif/core/util/waitFor.js';

test('Wait for an event', async () => {
	const emitter = new EventEmitter();
	setTimeout(() => {
		emitter.emit('fake');
	});
	await waitFor(emitter, 'fake');
});
