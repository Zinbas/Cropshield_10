import postgres from "postgres";
import * as dotenv from "dotenv";
dotenv.config();

const sql = postgres(process.env.DATABASE_URL);

async function migrate() {
  console.log("Adding assignedState and assignedDistrict columns to users table...");
  
  // Check if columns already exist
  const existing = await sql`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'users' AND column_name IN ('assignedState', 'assignedDistrict')
  `;
  
  const existingCols = existing.map(r => r.column_name);
  
  if (!existingCols.includes('assignedState')) {
    await sql`ALTER TABLE users ADD COLUMN "assignedState" VARCHAR(100)`;
    console.log("  ✅ Added assignedState column");
  } else {
    console.log("  ⏭️  assignedState already exists");
  }
  
  if (!existingCols.includes('assignedDistrict')) {
    await sql`ALTER TABLE users ADD COLUMN "assignedDistrict" VARCHAR(100)`;
    console.log("  ✅ Added assignedDistrict column");
  } else {
    console.log("  ⏭️  assignedDistrict already exists");
  }
  
  // Update the existing admin to have Punjab/Ludhiana jurisdiction
  const adminUpdate = await sql`
    UPDATE users 
    SET "assignedState" = 'Punjab', "assignedDistrict" = 'Ludhiana'
    WHERE role = 'admin' AND email = 'admin@cropshield.org' AND "assignedState" IS NULL
  `;
  console.log(`  ✅ Updated ${adminUpdate.count} admin(s) with Punjab/Ludhiana jurisdiction`);
  
  console.log("\n🎉 Migration complete!");
  await sql.end();
}

migrate().catch(err => { console.error(err); process.exit(1); });
