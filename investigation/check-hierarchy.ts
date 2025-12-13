import { runWithMysql } from './src/lib/mysql.js'
import { Effect } from 'effect'
import { SqlClient } from '@effect/sql'

const query = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient
  
  // Check ContentResourceResource hierarchy
  const hierarchyCount = yield* sql`
    SELECT COUNT(*) as count
    FROM egghead_ContentResourceResource
    WHERE deletedAt IS NULL
  `
  
  console.log('=== Hierarchy Relationships ===')
  console.log(`Total: ${(hierarchyCount[0] as any).count}`)
  
  // Sample some hierarchies
  const hierarchies = yield* sql`
    SELECT 
      crr.resourceOfId,
      parent.type as parentType,
      crr.resourceId,
      child.type as childType,
      crr.position
    FROM egghead_ContentResourceResource crr
    JOIN egghead_ContentResource parent ON parent.id = crr.resourceOfId
    JOIN egghead_ContentResource child ON child.id = crr.resourceId
    WHERE crr.deletedAt IS NULL
    LIMIT 10
  `
  
  console.log('\nSample hierarchies:')
  for (const row of hierarchies as Array<any>) {
    console.log(`  ${row.parentType} → ${row.childType} (pos: ${row.position})`)
  }
  
  // Check ContentContribution
  const contribCount = yield* sql`
    SELECT COUNT(*) as count
    FROM egghead_ContentContribution
    WHERE deletedAt IS NULL
  `
  
  console.log(`\n=== Content Contributions ===`)
  console.log(`Total: ${(contribCount[0] as any).count}`)
  
  // Check Tags
  const tagCount = yield* sql`
    SELECT COUNT(*) as count
    FROM egghead_Tag
  `
  
  console.log(`\n=== Tags ===`)
  console.log(`Total: ${(tagCount[0] as any).count}`)
  
  const taggingCount = yield* sql`
    SELECT COUNT(*) as count
    FROM egghead_ContentResourceTag
    WHERE deletedAt IS NULL
  `
  
  console.log(`Content tagged: ${(taggingCount[0] as any).count}`)
})

runWithMysql(query)
