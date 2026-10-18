# Release notes — Entertainment & Culture expansion

This is an update of the original public Global News MVP, not a separate application.

- Added Entertainment, Movies, Films, Hollywood, Music, Pop, Rock and Arts to the backend categories, seeded fictional articles, and GDELT discovery topic templates.
- `GET /api/v1/news?category=entertainment` combines all culture subtopics; Music includes Pop and Rock, Movies includes Films and Hollywood.
- Added 8 pending-rights entertainment publisher candidates in `config/sources.json`. Nothing was automatically authorized.
- Added a secondary Culture & Entertainment navigation bar, image-rich topic pages, cinema/music/art showcase, genre gallery, and illustrated story cards.
- Added 8 original offline SVG category covers with optional generic Unsplash stock photo overlays, source credits and a public image-credits page. Photos are illustrative, not evidence of real reporting.
- Fixed frontend Dockerfile copy paths for `build: ./frontend` in `compose.yaml`.
- Added backend aggregation, category and permission tests. Initial API seed has 14 categories, 20 registered sources and 24 demo stories.
- See README.md for local setup, usage and rights limitations.
