# Source permissions and editorial safeguards

## Hard boundary: discovery is not republication permission

The GDELT Project may permit use/redistribution of **its own datasets** under its published terms, with attribution. Underlying publisher stories, images, and sometimes feed content are controlled by separate licences and legal rules. Do not infer permission to display an article title, reproduce article text, reuse an image, scrape a publisher site, or AI-summarize its content from the mere fact that GDELT or a search engine indexed it.

## Rights statuses

- `demo`: original sample fixtures owned by this starter. Fictional and visibly labeled.
- `pending_review`: new discovered domains and example publisher registrations. No public visibility.
- `approved`: explicit publisher metadata-display right documented by a responsible human reviewer.
- `blocked`: future use to deny all public display and ingestion if required by terms or removal requests.

Default for recognized publisher names in `config/sources.json` is `pending_review`, not approval. `public_metadata_allowed` and `ai_processing_allowed` are separate boolean rights. Source approvals in the CLI **always leave AI disabled**.

## Editorial obligations before public launch

- Confirm title/snippet/photo use and update intervals with each source.
- Include publisher name, article date, and canonical original URL.
- Treat discovery titles as *metadata*, not verified facts; link out to originals.
- Avoid AI summarization unless the relevant licence or applicable legal basis clearly permits it.
- Build a corrections and takedown route with real contact details.
- Clearly distinguish facts from opinions, advertisements, and hypothetical examples.
- Vet election, security and financial-sensitive reporting prior to original editorial publication.
- Ensure attribution to GDELT where its dataset is used.
- Document your jurisdiction-specific legal obligations, including privacy notices and publishing laws.

## Incident response

If a source revokes rights or asks for removal, stop ingestion, change source permission to blocked, hide matching articles, retain audit records as appropriate, and respond through an authenticated operations process. The MVP deliberately does not offer a public mutation endpoint.
