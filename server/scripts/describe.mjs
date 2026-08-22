import 'dotenv/config';
import ibmdb from 'ibm_db';

const connStr = process.env.CISS_DATABASE_URL;
const conn = await ibmdb.open(connStr);

const [schema, table] = process.argv[2].split('.');

const sql = `
  SELECT COLNAME, TYPENAME, LENGTH, SCALE, NULLS
  FROM SYSCAT.COLUMNS
  WHERE TABSCHEMA = '${schema}' AND TABNAME = '${table}'
  ORDER BY COLNO
`;
const rows = await conn.query(sql);
console.log(`\n=== ${schema}.${table} (${rows.length} cols) ===`);
rows.forEach(r => console.log(r.COLNAME, r.TYPENAME, r.LENGTH, r.SCALE, r.NULLS));

await conn.close();
