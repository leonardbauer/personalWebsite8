import { writable } from 'svelte/store';

export const pageStyle = writable({
	backgroundColor: '#ffffff',
	textColor: '#000000'
});
