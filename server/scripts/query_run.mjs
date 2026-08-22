import 'dotenv/config';
import ibmdb from 'ibm_db';

const connStr = process.env.CISS_DATABASE_URL;
const conn = await ibmdb.open(connStr);

const sql = process.argv[2];
const rows = await conn.query(sql);
console.log(`rows: ${rows.length}`);
rows.forEach(r => console.log(JSON.stringify(r)));

await conn.close();
