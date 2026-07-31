import { DatabaseConfig } from '@bookeeping-agent/env/database';
import { type PostgresQuery, postgres } from '@flue/postgres';
import { Effect, Redacted } from 'effect';
import pg from 'pg';

const { Pool } = pg;

const databaseUrl = Effect.runSync(DatabaseConfig.url);

const pool = new Pool({
	connectionString: Redacted.value(databaseUrl),
});

const query: PostgresQuery = async (text, params) => {
	const result = await pool.query(text, params);
	return result.rows;
};

export default postgres({
	close: () => pool.end(),
	query,
	transaction: async (fn) => {
		const client = await pool.connect();

		try {
			await client.query('BEGIN');

			const result = await fn({
				query: async (text, params) => {
					const queryResult = await client.query(text, params);
					return queryResult.rows;
				},
			});

			await client.query('COMMIT');
			return result;
		} catch (error) {
			await client.query('ROLLBACK');
			throw error;
		} finally {
			client.release();
		}
	},
});
