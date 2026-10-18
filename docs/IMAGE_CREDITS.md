# Image credits, source rights and editorial image policy

## Artwork supplied in this repository

The files under `frontend/public/images/*.svg` are original, programmatically created editorial *category illustrations* for this demo. The files are local, responsive and require no network connection. They cover Entertainment, Movies, Films, Hollywood, Music, Pop, Rock and Arts. They should never be described as photos from a current event.

## Optional Unsplash editorial/category stock photographs

`frontend/lib/visuals.ts` includes four stock photograph URLs for some culture topics. In the web UI, the stock image is loaded as an overlay, with the local vector illustration still present as a fallback. See the [Unsplash License](https://unsplash.com/license) and [Unsplash guidance on image, likeness and trademark rights](https://unsplash.com/terms).

- Concert crowd in orange lights: https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3
- Concert confetti: https://images.unsplash.com/photo-1492684223066-81342ee5ff30
- Silhouetted stage performers in red: https://images.unsplash.com/photo-1503095396549-807759245b35
- Electric guitar on stage: https://unsplash.com/photos/selective-focus-photography-of-man-playing-electric-guitar-on-stage-gioH4gHo0-g

The photos are **not publisher-owned news photography** and must not be represented as visual evidence for an article. No real celebrity likenesses, movie posters, album artwork, publisher logos or copyrighted movie stills are added. Unsplash photo licensing is distinct from article metadata publishing rights. For commercial operations, check any additional rights concerning recognizable persons, branded objects and depicted creative works.

## Launch requirements

- Keep the **Illustrative image** notice near generic stock imagery and preserve **DEMO / FICTIONAL** for seeded articles.
- For actual entertainment news photos, add a dedicated image permission record (license, permitted display contexts, attribution, expiry, takedown contacts). Do not infer permission from the image URL or the publisher's article page.
- Verify Unsplash licensing and individual photo context before deploying publicly; choose locally authored covers only if unsure.
- Stock-image URLs depend on external availability. You can disable external images by deleting `PHOTO` values in `frontend/lib/visuals.ts`; SVG artworks continue to display.
