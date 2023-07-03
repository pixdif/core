import { EventEmitter } from 'events';

/**
 * Wait until the emitter emits the event.
 * @param emitter
 * @param event
 */
export default function waitFor(emitter: EventEmitter, event: string): Promise<void> {
	return new Promise((resolve, reject) => {
		emitter.once(event, resolve);
		emitter.once('error', reject);
	});
}
