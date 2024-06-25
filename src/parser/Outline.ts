import Page from './Page.js';
import PagedDevice from './PagedDevice.js';

export interface OutlineProperties {
	children?: Outline[];
}

export abstract class Outline implements PagedDevice {
	protected title: string;

	protected children?: Outline[];

	protected pages?: Page[];

	constructor(title: string, props?: OutlineProperties) {
		this.title = title;
		if (props) {
			this.children = props.children;
		}
	}

	getTitle(): string {
		return this.title;
	}

	getChildren(): Outline[] | undefined {
		return this.children;
	}

	abstract getPageNum(): Promise<number>;

	abstract getPage(index: number): Promise<Page>;
}

export default Outline;
