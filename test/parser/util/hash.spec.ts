import {
	expect,
	it,
} from '@jest/globals';
import fs from 'fs';

import hash from '@pixdif/parser/util/hash.js';

it('calculates MD5 fingerprint (hex)', async () => {
	const input = fs.createReadStream('test/sample/circle.png');
	const fingerprint = await hash(input, { algorithm: 'md5' });
	expect(fingerprint).toBe('d334256c5a11daa173c6c24db094a483');
});

it('calculates sha256 fingerprint (base64)', async () => {
	const input = fs.createReadStream('test/sample/circle.png');
	const fingerprint = await hash(input, {
		algorithm: 'sha256',
		encoding: 'base64',
	});
	expect(fingerprint).toBe('Ly0P6KgmtP0jyC85j+wmXtswAXaKRRP0wrmtvcBsrcM=');
});

it('calculates SHA1 fingerprint (base64)', async () => {
	const input = fs.createReadStream('test/sample/circle.png');
	const fingerprint = await hash(input, { encoding: 'base64' });
	expect(fingerprint).toBe('mHz8/rtW52sYo2SRAIgvNVXrxw4=');
});

it('calculates SHA1 fingerprint (hex)', async () => {
	const input = fs.createReadStream('test/sample/circle.png');
	const fingerprint = await hash(input);
	expect(fingerprint).toBe('987cfcfebb56e76b18a3649100882f3555ebc70e');
});

it('can handle non-existing file', async () => {
	const input = fs.createReadStream('test/404.png');
	await expect(() => hash(input)).rejects.toThrowError(/^ENOENT: no such file or directory, open '.+'$/i);
});
