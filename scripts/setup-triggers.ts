import { neon } from '@neondatabase/serverless';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error('DATABASE_URL is not set');

const sql = neon(DATABASE_URL);

async function setupTriggers() {
	// Create update_updated_at function
	await sql`
		CREATE OR REPLACE FUNCTION update_updated_at()
		RETURNS TRIGGER AS $$
		BEGIN
			NEW.updated_at = NOW();
			RETURN NEW;
		END;
		$$ LANGUAGE plpgsql;
	`;

	// Create trigger for posts table
	await sql`
		DROP TRIGGER IF EXISTS posts_updated_at ON posts;
	`;

	await sql`
		CREATE TRIGGER posts_updated_at
			BEFORE UPDATE ON posts
			FOR EACH ROW
			EXECUTE FUNCTION update_updated_at();
	`;

	console.log('Triggers created successfully');
}

setupTriggers().catch(console.error);
