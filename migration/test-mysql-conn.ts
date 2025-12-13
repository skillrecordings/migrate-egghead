import postgres from "postgres";

const mysqlDb = postgres("mysql://root:root@localhost:3307/coursebuilder_test");

const result = await mysqlDb`SHOW TABLES`;
console.log("Tables:", result);

await mysqlDb.end();
