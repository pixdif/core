import fs from 'fs';
import { Readable } from 'stream';
import Page from '@pixdif/parser/base/Page';

export default class SingleImage extends Page {
	protected title: string;

	protected location: string;

	constructor(title: string, location: string) {
		super();
		this.title = title;
		this.location = location;
	}

	getTitle(): string {
		return this.title;
	}

	isCached(): boolean {
		return fs.existsSync(this.location);
	}

	async render(): Promise<Readable> {
		return fs.createReadStream(this.location);
	}
}
