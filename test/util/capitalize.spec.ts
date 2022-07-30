import capitalize from '../../src/util/capitalize';

test('Convert a word', () => {
	const res = capitalize('this');
	expect(res).toBe('This');
});
