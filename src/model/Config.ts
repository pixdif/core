import DiffOptions from './DiffOptions';

export interface Config extends DiffOptions {
	/**
	 * WebSocket endpoint to the Pixdif Server.
	 * Connect to the server to perform some actions like updating snapshots.
	 */
	wsEndpoint: string;
}

export default Config;
