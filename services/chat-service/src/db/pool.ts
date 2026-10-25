import pg from "pg";
import { config } from "../config.ts";

// Return DATE columns as 'YYYY-MM-DD' strings (not JS Dates, which carry a timezone)
// and NUMERIC columns as numbers.
pg.types.setTypeParser(1082, (value: string) => value);
pg.types.setTypeParser(1700, (value: string) => parseFloat(value));

export const pool = new pg.Pool({ connectionString: config.DATABASE_URL, max: 10 });
