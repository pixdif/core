import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import { EventEmitter } from 'events';
import { Readable } from 'stream';

import { rimraf } from 'rimraf';
import { Progress } from '@pixdif/model';
import Parser from '@pixdif/parser';

import waitFor from '../util/waitFor';

interface CacheMeta {
	pageNum: number;
	fingerprint: string;
}

export interface CacheOptions {
	cacheDir: string;
}

interface CacheManager {
	on(eventName: 'progress', listener: (progress: Progress) => void): this;

	once(eventName: 'progress', listener: (progress: Progress) => void): this;

	off(eventName: 'progress', listener: (progress: Progress) => void): this;

	emit(eventName: 'progress', progress: Progress): boolean;
}

class CacheManager extends EventEmitter {
	protected parser: Parser;

	protected cacheDir: string;

	protected pageNum = 0;

	protected fingerprint = '';

	constructor(parser: Parser, options: CacheOptions) {
		super();
		this.parser = parser;
		this.cacheDir = options.cacheDir;
	}

	getPageNum(): number {
		return this.pageNum;
	}

	getImage(index: number): Readable {
		return fs.createReadStream(this.getImagePath(index));
	}

	async open(): Promise<void> {
		await this.openCache();
		await this.updateCache();
	}

	async updateCache(forced = false): Promise<void> {
		const fingerprint = await this.parser.getFingerprint({ encoding: 'base64' });
		if (!forced && fingerprint === this.fingerprint) {
			return;
		}

		await this.parser.open();
		const pageNum = await this.parser.getPageNum();
		const outputs: Promise<void>[] = new Array(pageNum);
		for (let i = 0; i < pageNum; i++) {
			const cache = await this.createPageCache(i);
			if (cache) {
				outputs[i] = waitFor(cache, 'finish');
			}
			this.emit('progress', { current: i + 1, limit: pageNum });
		}
		await this.parser.close();

		await Promise.all(outputs);
		const meta: CacheMeta = {
			pageNum,
			fingerprint,
		};
		this.pageNum = pageNum;
		this.fingerprint = fingerprint;
		await fsp.writeFile(this.getMetaFile(), JSON.stringify(meta));
	}

	async clearCache(): Promise<void> {
		if (!fs.existsSync(this.getMetaFile())) {
			return;
		}

		await rimraf(this.cacheDir);
	}

	protected async openCache(): Promise<boolean> {
		const metaFile = this.getMetaFile();
		if (!fs.existsSync(metaFile)) {
			if (!fs.existsSync(this.cacheDir)) {
				await fsp.mkdir(this.cacheDir, { recursive: true });
			}
			return false;
		}

		let meta: Partial<CacheMeta> = {};
		try {
			meta = JSON.parse(await fsp.readFile(metaFile, 'utf-8'));
		} catch (error) {
			// Do nothing
		}

		if (meta.pageNum === undefined || meta.fingerprint === undefined) {
			await fsp.unlink(metaFile);
			return false;
		}

		this.pageNum = meta.pageNum;
		this.fingerprint = meta.fingerprint;

		return true;
	}

	protected async createPageCache(i: number): Promise<fs.WriteStream | undefined> {
		const page = await this.parser.getPage(i);
		const image = await page.render();
		const cache = fs.createWriteStream(this.getImagePath(i));
		image.pipe(cache);
		return cache;
	}

	protected getImagePath(index: number): string {
		return path.join(this.cacheDir, `${index}.png`);
	}

	protected getMetaFile(): string {
		return path.join(this.cacheDir, '.meta');
	}
}

export default CacheManager;
