export type MessageLevel = 'normal' | 'info' | 'warn' | 'error';

export interface Message {
	level: MessageLevel;
	text: string;
}
