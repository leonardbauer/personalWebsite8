import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from './schema';
import { env } from '$env/dynamic/private';

export function getDb() {
	if (!env.DATABASE_URL) throw new Error('DATABASE_URL is not set');
	const client = neon(env.DATABASE_URL);
	return drizzle(client, { schema });
}
