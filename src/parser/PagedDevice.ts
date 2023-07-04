import Page from './Page';

export interface PagedDevice {
	/**
	 * @returns number of pages
	 */
	getPageNum(): Promise<number>;

	/**
	 * Gets a page.
	 * @param index page index (starting from 0)
	 * @returns a page instance
	 */
	getPage(index: number): Promise<Page>;
}

export default PagedDevice;
