export interface Progress {
	current: number;
	limit: number;
	error?: Error;
}

export default Progress;
