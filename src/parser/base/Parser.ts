import { EventEmitter } from 'events';
import fs from 'fs';

import Outline from './Outline';
import Page from './Page';
import PagedDevice from './PagedDevice';

import hash, { HashOptions } from '../util/hash';

export interface Parser {
	on(event: 'open', listener: () => void): this;
	on(event: 'close', listener: () => void): this;

	once(event: 'open', listener: () => void): this;
	once(event: 'close', listener: () => void): this;

	off(event: 'open', listener: () => void): this;
	off(event: 'close', listener: () => void): this;

	emit(event: 'open'): boolean;
	emit(event: 'close'): boolean;
}

export abstract class Parser extends EventEmitter implements PagedDevice {
	protected filePath: string;

	constructor(filePath: string) {
		super();

		this.filePath = filePath;
	}

	/**
	 * @returns Fingerprint of the input
	 */
	getFingerprint(options?: Partial<HashOptions>): Promise<string> {
		const input = fs.createReadStream(this.filePath);
		return hash(input, options);
	}

	/**
	 * Open the input file.
	 * @returns progress limit
	 */
	async open(): Promise<void> {
		await this.openFile();
		this.emit('open');
	}

	/**
	 * Close the file and release resources.
	 */
	async close(): Promise<void> {
		await this.closeFile();
		this.emit('close');
	}

	/**
	 * @returns number of pages
	 */
	abstract getPageNum(): Promise<number>;

	/**
	 * Gets a page.
	 * @param index page index (starting from 0)
	 * @returns a page instance
	 */
	abstract getPage(index: number): Promise<Page>;

	/**
	 * @returns Outline of contents
	 */
	abstract getOutline(): Promise<Outline[]>;

	/**
	 * Internal implementation of open().
	 */
	protected abstract openFile(): Promise<void>;

	/**
	 * Internal implementation of close().
	 */
	protected abstract closeFile(): Promise<void>;
}

export default Parser;
