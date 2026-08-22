import 'dotenv/config';
import ibmdb from 'ibm_db';

const connStr = process.env.CISS_DATABASE_URL;
const conn = await ibmdb.open(connStr);

const patterns = process.argv.slice(2);

for (const pattern of patterns) {
  const sql = `
    SELECT TABSCHEMA, TABNAME, TYPE
    FROM SYSCAT.TABLES
    WHERE UPPER(TABNAME) LIKE UPPER('%${pattern}%')
    ORDER BY TABSCHEMA, TABNAME
    FETCH FIRST 60 ROWS ONLY
  `;
  try {
    const rows = await conn.query(sql);
    console.log(`\n=== pattern: ${pattern} (${rows.length}) ===`);
    rows.forEach(r => console.log(r.TABSCHEMA, r.TABNAME, r.TYPE));
  } catch (e) {
    console.log(`ERROR for pattern ${pattern}:`, e.message);
  }
}

await conn.close();
