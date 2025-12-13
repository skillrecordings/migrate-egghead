import { createClient } from "@sanity/client";

const sanityClient = createClient({
  projectId: "sb1i5dlc",
  dataset: "production",
  useCdn: false,
  apiVersion: "2024-01-01",
});

const query = `*[_type == "course" && slug.current == $slug][0] {
  _id,
  title,
  "slug": slug.current,
  resources[]-> {
    _id,
    _type,
    title,
    "slug": slug.current
  }
}`;

const course = await sanityClient.fetch(query, { slug: "claude-code-essentials~jc0n6" });
console.log(JSON.stringify(course, null, 2));
