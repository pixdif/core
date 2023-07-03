import { Readable } from 'stream';

export abstract class Page {
	/**
	 * @returns Page title
	 */
	abstract getTitle(): string;

	/**
	 * @returns Whether the page is already cached. It's used to avoid unnecessary cache.
	 */
	abstract isCached(): boolean;

	/**
	 * Render current page into a readable stream.
	 *
	 * **IMPORTANT**: It must be a stream of an PNG image.
	 * @returns readable stream
	 */
	abstract render(): Promise<Readable>;
}

export default Page;
