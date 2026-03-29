import posthog from 'posthog-js';
import { browser } from '$app/environment';

export const load = async () => {
	if (browser) {
		posthog.init('phc_PCFLey0AmADF6vF05aDfqgopF07CPEv6dp1eLrBak5q', {
			api_host: 'https://eu.i.posthog.com',
			defaults: '2026-01-30'
		});
	}

	return;
};
