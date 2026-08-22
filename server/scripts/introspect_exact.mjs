import 'dotenv/config';
import ibmdb from 'ibm_db';

const connStr = process.env.CISS_DATABASE_URL;
const conn = await ibmdb.open(connStr);

const names = process.argv.slice(2);

for (const name of names) {
  const sql = `
    SELECT TABSCHEMA, TABNAME, TYPE
    FROM SYSCAT.TABLES
    WHERE UPPER(TABNAME) = UPPER('${name}')
    ORDER BY TABSCHEMA
  `;
  const rows = await conn.query(sql);
  console.log(`\n=== exact: ${name} (${rows.length}) ===`);
  rows.forEach(r => console.log(r.TABSCHEMA, r.TABNAME, r.TYPE));
}

await conn.close();
