export type ChannelEvent = {
	time: number;
	duration: number;
	pitch: number;
	noteName: string;
	velocity: number;
};

export type ChannelMap = Map<string, ChannelEvent[]>;

export type Trigger = {
	channel: string;
	event: ChannelEvent;
	firedAt: number;
};
