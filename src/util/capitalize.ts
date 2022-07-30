/**
 * Convert the initial letter to upper case.
 * @param str a string
 * @returns a string with its initial letter in upper case
 */
function capitalize(str: string): string {
	return `${str.charAt(0).toUpperCase()}${str.substring(1)}`;
}

export default capitalize;
