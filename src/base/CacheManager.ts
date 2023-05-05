import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import { Readable } from 'stream';

import { rimraf } from 'rimraf';
import Parser from '@pixdif/parser';

import waitFor from '../util/waitFor';

interface CacheMeta {
	pageNum?: number;
	fingerprint?: string;
}

export interface CacheOptions {
	cacheDir: string;
}

export default class CacheManager {
	protected parser: Parser;

	protected cacheDir: string;

	protected cacheMeta?: CacheMeta;

	constructor(parser: Parser, options: CacheOptions) {
		this.parser = parser;
		this.cacheDir = options.cacheDir;
	}

	async open(): Promise<void> {
		const cacheMeta = await this.openCache();
		if (cacheMeta.pageNum && cacheMeta.fingerprint === await this.getFingerprint()) {
			this.cacheMeta = cacheMeta;
			return;
		}
		await this.parser.open();
		const pageNum = await this.parser.getPageNum();
		this.cacheMeta = { pageNum };
	}

	async getPageNum(): Promise<number> {
		return this.cacheMeta?.pageNum ?? 0;
	}

	isValid(): boolean {
		return Boolean(this.cacheMeta?.fingerprint);
	}

	async close(): Promise<void> {
		if (!this.isValid()) {
			await this.parser.close();
		}
	}

	getFingerprint(): Promise<string> {
		return this.parser.getFingerprint({ encoding: 'base64' });
	}

	async getImage(index: number): Promise<Readable> {
		const imageCachePath = path.join(this.cacheDir, `${index}.png`);
		if (this.isValid()) {
			if (fs.existsSync(imageCachePath)) {
				return fs.createReadStream(imageCachePath);
			}
			await this.parser.open();
		}

		const page = await this.parser.getPage(index);
		if (!page) {
			throw new Error(`Failed to read page ${index}`);
		}

		const image = await page.render();
		const cache = fs.createWriteStream(imageCachePath);
		image.pipe(cache);
		await waitFor(cache, 'finish');
		return fs.createReadStream(imageCachePath);
	}

	async commitCache(): Promise<void> {
		const { cacheMeta } = this;
		const pageNum = cacheMeta?.pageNum;
		if (!cacheMeta || !pageNum || pageNum <= 0) {
			// Not opened yet
			throw new Error('There is no data to commit.');
		}

		if (cacheMeta.fingerprint) {
			// Already saved
			return;
		}

		await this.close();

		cacheMeta.fingerprint = await this.getFingerprint();
		await fsp.writeFile(this.getMetaFile(), JSON.stringify(cacheMeta));
	}

	async clearCache(): Promise<void> {
		if (!fs.existsSync(this.getMetaFile())) {
			return;
		}

		await rimraf(this.cacheDir);
	}

	protected async openCache(): Promise<CacheMeta> {
		const metaFile = this.getMetaFile();
		if (!fs.existsSync(metaFile)) {
			if (!fs.existsSync(this.cacheDir)) {
				await fsp.mkdir(this.cacheDir, { recursive: true });
			}
			return {};
		}

		let meta: CacheMeta = {};
		try {
			meta = JSON.parse(await fsp.readFile(metaFile, 'utf-8'));
		} catch (error) {
			// Do nothing
		}
		return meta;
	}

	protected getMetaFile(): string {
		return path.join(this.cacheDir, '.meta');
	}
}
