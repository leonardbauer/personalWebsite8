import { writable } from 'svelte/store';
import { browser } from '$app/environment';

export type ThemeName = 'light' | 'dark' | 'system';

export interface Theme {
	name: string;
	background: string;
	backgroundSecondary: string;
	text: string;
	textInverted: string;
	textMuted: string;
	accent: string;
	border: string;
	shadow: string;
	codeBackground: string;
}

export const themes: Record<'light' | 'dark', Theme> = {
	light: {
		name: 'Light',
		background: '#ffffff',
		backgroundSecondary: '#eeeeee',
		text: '#000000',
		textInverted: '#ffffff',
		textMuted: '#666666',
		accent: '#0066cc',
		border: '#cccccc',
		shadow: 'rgba(0, 0, 0, 0.3)',
		codeBackground: 'rgba(0, 0, 0, 0.1)'
	},
	dark: {
		name: 'Dark',
		background: '#121212',
		backgroundSecondary: '#1e1e1e',
		text: '#ffffff',
		textInverted: '#000000',
		textMuted: '#999999',
		accent: '#66b3ff',
		border: '#333333',
		shadow: 'rgba(0, 0, 0, 0.5)',
		codeBackground: 'rgba(255, 255, 255, 0.1)'
	}
};

function getInitialTheme(): ThemeName {
	if (!browser) return 'system';
	const stored = localStorage.getItem('theme') as ThemeName | null;
	if (stored && ['light', 'dark', 'system'].includes(stored)) {
		return stored;
	}
	return 'system';
}

function getSystemTheme(): 'light' | 'dark' {
	if (!browser) return 'light';
	return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export const themeName = writable<ThemeName>(getInitialTheme());

export const resolvedTheme = writable<'light' | 'dark'>(
	browser ? (getInitialTheme() === 'system' ? getSystemTheme() : getInitialTheme() as 'light' | 'dark') : 'light'
);

export const currentTheme = writable<Theme>(themes.light);

// Subscribe to changes and update localStorage + CSS variables
if (browser) {
	themeName.subscribe((name) => {
		localStorage.setItem('theme', name);
		const resolved = name === 'system' ? getSystemTheme() : name;
		resolvedTheme.set(resolved);
		currentTheme.set(themes[resolved]);
		applyTheme(themes[resolved]);
	});

	// Listen for system theme changes
	window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
		themeName.update((current) => {
			if (current === 'system') {
				const resolved = e.matches ? 'dark' : 'light';
				resolvedTheme.set(resolved);
				currentTheme.set(themes[resolved]);
				applyTheme(themes[resolved]);
			}
			return current;
		});
	});
}

function applyTheme(theme: Theme) {
	if (!browser) return;
	const root = document.documentElement;
	root.style.setProperty('--color-background', theme.background);
	root.style.setProperty('--color-background-secondary', theme.backgroundSecondary);
	root.style.setProperty('--color-text', theme.text);
	root.style.setProperty('--color-text-inverted', theme.textInverted);
	root.style.setProperty('--color-text-muted', theme.textMuted);
	root.style.setProperty('--color-accent', theme.accent);
	root.style.setProperty('--color-border', theme.border);
	root.style.setProperty('--color-shadow', theme.shadow);
	root.style.setProperty('--color-code-background', theme.codeBackground);
	root.setAttribute('data-theme', theme.name.toLowerCase());
}

export function setTheme(name: ThemeName) {
	themeName.set(name);
}

export function toggleTheme() {
	themeName.update((current) => {
		if (current === 'light') return 'dark';
		if (current === 'dark') return 'light';
		// If system, toggle to opposite of current system theme
		return getSystemTheme() === 'dark' ? 'light' : 'dark';
	});
}
