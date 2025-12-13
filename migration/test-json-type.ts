import mysql from "mysql2/promise";

const mysqlDb = await mysql.createConnection(
  "mysql://root:root@localhost:3307/coursebuilder_test",
);

await mysqlDb.execute(`
  CREATE TABLE IF NOT EXISTS TestTag (
    id VARCHAR(255) PRIMARY KEY,
    fields JSON
  )
`);

await mysqlDb.execute(
  "INSERT INTO TestTag (id, fields) VALUES (?, ?)",
  ["test1", JSON.stringify({ name: "Test", value: 123 })],
);

const [rows] = await mysqlDb.execute("SELECT * FROM TestTag WHERE id = ?", [
  "test1",
]);
const row = (rows as any[])[0];
console.log("Field type:", typeof row.fields);
console.log("Field value:", row.fields);
console.log("Is object:", typeof row.fields === "object");

await mysqlDb.execute("DROP TABLE TestTag");
await mysqlDb.end();
