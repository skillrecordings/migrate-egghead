import { createClient } from '@sanity/client'

const client = createClient({
  projectId: 'sb1i5dlc',
  dataset: 'production',
  useCdn: false,
  apiVersion: '2024-01-01',
})

async function main() {
  // Get all courses with their lesson counts
  const courses = await client.fetch(`*[_type == 'course'] | order(_createdAt desc) {
    title,
    "slug": slug.current,
    railsCourseId,
    accessLevel,
    "lessonCount": count(resources[@->_type == 'lesson']),
    _createdAt
  }`)
  
  console.log(`Total Sanity courses: ${courses.length}\n`)
  console.log('All courses:')
  courses.forEach((c: any) => {
    console.log(`  ${c.railsCourseId ? '✓' : '✗'} ${c.title}`)
    console.log(`    slug: ${c.slug}, lessons: ${c.lessonCount}, access: ${c.accessLevel}, created: ${c._createdAt?.slice(0,10)}`)
  })
}

main().catch(console.error)
