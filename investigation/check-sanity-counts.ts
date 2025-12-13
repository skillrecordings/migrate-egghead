import { createClient } from '@sanity/client'

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || 'sb1i5dlc',
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET_ID || 'production',
  useCdn: false,
  apiVersion: '2024-01-01',
})

async function main() {
  // Count courses
  const courseCount = await client.fetch(`count(*[_type == 'course'])`)
  console.log(`Sanity courses: ${courseCount}`)
  
  // Count lessons
  const lessonCount = await client.fetch(`count(*[_type == 'lesson'])`)
  console.log(`Sanity lessons: ${lessonCount}`)
  
  // Count with railsId (linked to Rails)
  const coursesWithRailsId = await client.fetch(`count(*[_type == 'course' && defined(railsCourseId)])`)
  console.log(`Sanity courses with railsCourseId: ${coursesWithRailsId}`)
  
  const lessonsWithRailsId = await client.fetch(`count(*[_type == 'lesson' && defined(railsLessonId)])`)
  console.log(`Sanity lessons with railsLessonId: ${lessonsWithRailsId}`)
  
  // Sample a few courses
  const sampleCourses = await client.fetch(`*[_type == 'course'][0..4]{title, slug, railsCourseId}`)
  console.log('\nSample courses:')
  sampleCourses.forEach((c: any) => console.log(`  - ${c.title} (slug: ${c.slug?.current}, railsId: ${c.railsCourseId})`))
}

main().catch(console.error)
