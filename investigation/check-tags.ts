import { runWithMysql } from './src/lib/mysql.js'
import { Effect } from 'effect'
import { SqlClient } from '@effect/sql'

const query = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient
  
  const taggingCount = yield* sql`
    SELECT COUNT(*) as count
    FROM egghead_ContentResourceTag
  `
  
  console.log(`=== Content Resource Tags ===`)
  console.log(`Total: ${(taggingCount[0] as any).count}`)
  
  // Sample some tags
  const samples = yield* sql`
    SELECT 
      t.name,
      COUNT(*) as usage
    FROM egghead_Tag t
    JOIN egghead_ContentResourceTag crt ON crt.tagId = t.id
    GROUP BY t.id, t.name
    ORDER BY usage DESC
    LIMIT 10
  `
  
  console.log('\nTop 10 tags by usage:')
  for (const row of samples as Array<any>) {
    console.log(`  ${row.name}: ${row.usage}`)
  }
})

runWithMysql(query)
