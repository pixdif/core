import crypto from 'crypto';
import { Readable } from 'stream';

export interface HashOptions {
	/**
	 * Hash algorithm (Default: `sha1`)
	 */
	algorithm: string;

	/**
	 * Encoding (Default: `hex`)
	 */
	encoding: BufferEncoding;
}

/**
 * Calculate hash of a file
 * @param filePath file path
 * @param options hash options
 * @return file hash
 */
export function hash(input: Readable, options?: Partial<HashOptions>): Promise<string> {
	const algorithm = options?.algorithm ?? 'sha1';
	const encoding = options?.encoding ?? 'hex';

	return new Promise((resolve, reject) => {
		input.once('error', reject);

		const output = crypto.createHash(algorithm);
		output.setEncoding(encoding);
		input.pipe(output);

		output.once('error', reject);
		output.once('finish', () => {
			resolve(output.read());
		});
	});
}

export default hash;
