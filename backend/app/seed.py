"""Idempotent initial fixtures. DEMO articles are original and fictional."""
import json
from datetime import datetime, timedelta, timezone
from pathlib import Path
from sqlalchemy import select
from .db import SessionLocal
from .models import Article, Category, Source, SourcePermission

REGISTRY = Path(__file__).resolve().parents[2] / 'config' / 'sources.json'
CATEGORIES = [
    ('world', 'World', 'Global affairs and international developments.'),
    ('business', 'Business', 'Companies, management, finance and trade.'),
    ('economy', 'Economy', 'Inflation, jobs, GDP and monetary policy.'),
    ('politics', 'Politics', 'Governments, diplomacy, elections and policy.'),
    ('technology', 'Technology', 'AI, cybersecurity, software and emerging technology.'),
    ('marketing', 'Marketing', 'Advertising, branding and consumer behavior.'),
    ('entertainment', 'Entertainment', 'Cinema, music, celebrity culture, performing arts and creativity.'),
    ('movies', 'Movies', 'Moviegoing, storytelling, reviews and cinema culture.'),
    ('films', 'Films', 'Filmmaking, festivals, documentaries and international cinema.'),
    ('hollywood', 'Hollywood', 'Film studios, red carpets, awards and the entertainment industry.'),
    ('music', 'Music', 'Artists, live performances, releases and the music business.'),
    ('pop', 'Pop', 'Pop music, chart culture and popular performers.'),
    ('rock', 'Rock', 'Rock music, guitars, bands and live shows.'),
    ('arts', 'Arts', 'Visual art, exhibitions, museums and creative culture.'),
]
# Original sample headlines and analyses. These are NOT current news reports.
FIXTURES = [
    ('world', 'What makes a global story matter across borders?', 'An illustrative guide to evaluating international developments. Compare primary facts, the countries affected, and the differences between sources before drawing conclusions.', 'Global'),
    ('business', 'Inside a hypothetical company expansion decision', 'An imaginary multinational business weighs financing, supply chains, staffing and regulatory questions before opening in another region. This is a demonstration, not a reported event.', 'Global'),
    ('economy', 'How interest-rate changes can affect households', 'A fictional economic explainer illustrates how borrowing costs, savings returns and currency markets may react to central-bank decisions.', 'Global'),
    ('politics', 'Understanding the stages of a diplomatic negotiation', 'This educational example traces a fictional diplomatic process from initial talks through agreements and verification. No specific real-world negotiation is being reported.', 'Global'),
    ('technology', 'A sample framework for evaluating new AI tools', 'An illustrative technology briefing examines benchmarks, safety practices, privacy controls and deployment costs. It does not assess any real product announcement.', 'Global'),
    ('marketing', 'How a fictional brand might test a new campaign', 'A sample marketing analysis covers customer segmentation, creative experiments, measurement and brand lift for an invented campaign.', 'Global'),
    ('world', 'Why comparing sources improves international coverage', 'This demonstration shows how editors can separate facts, quotations, analysis and uncertainty when reviewing articles about the same event.', 'Europe'),
    ('business', 'Explainer: reading a company balance sheet', 'A non-news example describes assets, liabilities and shareholder equity for readers who are learning to interpret corporate reporting.', 'Americas'),
    ('economy', 'A model for comparing inflation across countries', 'An educational overview of CPI baskets, measurement periods, exchange rates and purchasing power; figures are intentionally omitted in this mock record.', 'Asia'),
    ('technology', 'Demo briefing: what is a software supply chain?', 'A conceptual story explains package dependencies, software bills of materials and update policies in an imaginary engineering team.', 'Asia'),
    ('marketing', 'The difference between reach and conversion', 'A sample briefing explains the distinction between audience reach, impressions, click-through and post-click outcomes.', 'Americas'),
    ('politics', 'How policy proposals become formal rules', 'A fictional legislative workflow illustrates consultation, drafting, debate, adoption and implementation, with no claims about current laws.', 'Africa'),
    ('entertainment', 'A guide to the global entertainment landscape', 'An editorial demonstration exploring the connections between screen culture, music, performing arts and creative industries. This is not a report of a current event.', 'Global'),
    ('movies', 'What makes a memorable night at the movies?', 'A fictional feature explores the shared experience of cinema, from immersive sound and cinematography to audience storytelling.', 'Americas'),
    ('films', 'Inside an imaginary independent film festival', 'This sample festival guide explains how filmmakers present features, shorts and documentaries, with no real festival announcements implied.', 'Europe'),
    ('hollywood', 'Behind the scenes of a fictional movie premiere', 'A fictional feature examines how premiere events, publicity teams and production crews work together on a film launch.', 'Americas'),
    ('music', 'How live music brings audiences together', 'An educational feature about concerts, stage production, touring logistics and the power of performance.', 'Global'),
    ('pop', 'Why a great pop chorus stays with us', 'A sample music analysis examines melody, songwriting, production and how listeners discover new artists. No actual chart claims are made.', 'Global'),
    ('rock', 'From rehearsal room to rock stage', 'A fictional band story demonstrates guitar arrangements, live sound checks and the creative process behind a show.', 'Europe'),
    ('arts', 'Discovering contemporary art in a gallery', 'An original illustration-led guide to color, composition and the experience of visiting an exhibition; not a current exhibition listing.', 'Global'),
    ('movies', 'A beginner’s guide to film genres', 'This imaginary movie-desk feature compares drama, documentary, comedy and science fiction through their storytelling conventions.', 'Asia'),
    ('pop', 'The changing sounds of pop production', 'An illustrative overview of synthesizers, vocal arrangement, collaboration and music discovery.', 'Asia'),
    ('rock', 'How electric guitars shape rock music', 'A sample explainer looks at tone, amplification, riffs and onstage performance.', 'Americas'),
    ('arts', 'Art beyond the canvas: texture and light', 'A demonstration explores how artists work with sculpture, installations, photography and moving images.', 'Europe'),

]

def seed():
    with SessionLocal() as db:
        for slug, name, description in CATEGORIES:
            if not db.scalar(select(Category).where(Category.slug == slug)):
                db.add(Category(slug=slug, name=name, description=description))
        db.flush()
        registry = json.loads(REGISTRY.read_text(encoding='utf-8'))
        for item in registry['sources']:
            source = db.scalar(select(Source).where(Source.domain == item['domain']))
            if source is None:
                source = Source(name=item['name'], domain=item['domain'], region=item.get('region', 'Global'), source_type=item.get('source_type', 'publisher'))
                db.add(source)
                db.flush()
                db.add(SourcePermission(
                    source_id=source.id,
                    access_method=item.get('access_method', 'gdelt_discovery'),
                    status=item.get('status', 'pending_review'),
                    public_metadata_allowed=item.get('public_metadata_allowed', False),
                    ai_processing_allowed=item.get('ai_processing_allowed', False),
                    rights_basis=item.get('rights_basis', 'Unverified'),
                    notes=item.get('notes', 'Requires source-specific legal and technical review before public display.'),
                ))
        db.flush()
        example_source = db.scalar(select(Source).where(Source.domain == 'example.org'))
        categories = {c.slug: c for c in db.scalars(select(Category)).all()}
        now = datetime.now(timezone.utc)
        for idx, (category, title, summary, country) in enumerate(FIXTURES):
            slug = f'demo-{category}-{idx+1}'
            if not db.scalar(select(Article.id).where(Article.slug == slug)):
                db.add(Article(
                    slug=slug, title=title, summary=summary, source_id=example_source.id,
                    category_id=categories[category].id, country=country, language='English',
                    published_at=now - timedelta(hours=idx*3+1), created_at=now,
                    status='published', is_demo=True, origin='fixture',
                ))
        db.commit()
    print(f'Seed complete: {len(CATEGORIES)} categories, {len(registry["sources"])} registry sources, {len(FIXTURES)} demo items (idempotent).')

if __name__ == '__main__':
    seed()
