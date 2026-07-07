import { env } from '@bookeeping-agent/env/server';
import { type PostgresQuery, postgres } from '@flue/postgres';
import pg from 'pg';

const { Pool } = pg;

const pool = new Pool({
	connectionString: env.DATABASE_URL,
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
