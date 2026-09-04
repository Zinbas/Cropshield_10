import "dotenv/config";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";

async function main() {
  console.log("Connecting to", process.env.DATABASE_URL);
  const sql = postgres(process.env.DATABASE_URL!, { prepare: false });
  const db = drizzle(sql);
  
  try {
    console.log("Testing connection...");
    const result = await sql`SELECT 1 as connected`;
    console.log("Connected successfully:", result);
    const tables = await sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`;
    console.log("Tables in database:", tables.map(r => r.table_name));
  } catch (err) {
    console.error("Connection failed:", err);
  } finally {
    await sql.end();
  }
}

main().catch(console.error);
