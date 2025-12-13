import { runWithMysql } from './src/lib/mysql.js'
import { Effect } from 'effect'
import { SqlClient } from '@effect/sql'

const query = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient
  
  // Check what types exist in ContentResource
  const types = yield* sql`
    SELECT type, COUNT(*) as count
    FROM egghead_ContentResource
    WHERE deletedAt IS NULL
    GROUP BY type
    ORDER BY count DESC
  `
  
  console.log('=== ContentResource Types ===')
  for (const row of types as Array<{ type: string; count: number }>) {
    console.log(`  ${row.type}: ${row.count}`)
  }
  
  // Sample a few records of each type to see fields structure
  const samples = yield* sql`
    SELECT id, type, fields
    FROM egghead_ContentResource
    WHERE deletedAt IS NULL
    LIMIT 10
  `
  
  console.log('\n=== Sample Fields ===')
  for (const row of samples as Array<{ id: string; type: string; fields: any }>) {
    console.log(`\n${row.type} (${row.id}):`)
    console.log(JSON.stringify(row.fields, null, 2))
  }
})

runWithMysql(query)
