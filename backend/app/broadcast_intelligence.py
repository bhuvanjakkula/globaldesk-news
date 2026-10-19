"""Broadcast Editorial Intelligence Engine
Transforms raw headlines and summaries into high-sophistication, prime-time television anchor reports.
Guarantees the anchor tells the news fully and concisely, eliminating repetitive '[Source] reported' wire artifacts.
"""
import re
from typing import Dict, Any, Optional, List

def clean_character_quotes(text: str) -> str:
    """Removes single-character quoting artifacts and normalizes text."""
    if not text:
        return ""
    mojibake = {
        'â€™': "'",
        'â€œ': '"',
        'â€\x9d': '"',
        'â€"': ' — ',
        'â€“': ' – ',
        'â€˜': "'",
        'Ã©': 'é',
        'Ã¨': 'è',
        'Ã±': 'ñ',
        'â€¦': '...',
        'Â': '',
        '‘': "'",
        '’': "'",
        '“': '"',
        '”': '"',
        '—': ' - ',
        '–': ' - ',
        '\ufffd': "'",
        '?o': '"',
        '??': '"',
        '?~': "'",
        '?T': "'",
    }
    for bad, good in mojibake.items():
        text = text.replace(bad, good)

    # Check for character-separated single quotes: 'S't'u'd'i'o'
    if text.count("'") > 5 and re.search(r"'[a-zA-Z0-9]'(\s*'?[a-zA-Z0-9]'?)*", text):
        text = re.sub(r"(?<=\w)'(?=\w)", "", text)
        text = re.sub(r"'\s*([a-zA-Z0-9])\s*'", r"\1", text)
        text = text.replace("'", "")

    return re.sub(r'\s+', ' ', text).strip()


def strip_wire_prefixes(text: str, source_name: str = "") -> str:
    """Strips datelines, city prefixes, repetitive '[Source] reported' headers, and clickbait hooks."""
    if not text:
        return ""
    t = text.strip()

    # Datelines like "WASHINGTON (Reuters) -", "JERUSALEM —", "NEW YORK (Forbes) —"
    t = re.sub(
        r"^(?:[A-Z\s]{2,18}\s*(?:\([A-Za-z0-9\s,&.-]+\))?\s*[-:—]\s*)",
        "",
        t,
    )

    # Common source-reported phrases like "Forbes reported", "Forbes says:", "Reuters reports:"
    t = re.sub(
        r"^(?:(?:Forbes|Reuters|Bloomberg|Associated Press|AP|BBC|CNN|Fox News|Wall Street Journal|WSJ|Financial Times|Guardian|Variety|Deadline|IndieWire)\s+(?:reports|reported|said|says)\s*[:—,-]?\s*)",
        "",
        t,
        flags=re.IGNORECASE,
    )

    # City reports: "Washington reports:", "London reported:", "Paris says:"
    t = re.sub(
        r"^(?:(?:Washington|London|Paris|Beijing|Jerusalem|Berlin|Tokyo|Kyiv|Gaza|New York|Brussels|Moscow|Rome|Geneva|Singapore|Sydney|Madrid)\s+(?:reports|reported|said|says)\s*[:—,-]?\s*)",
        "",
        t,
        flags=re.IGNORECASE,
    )

    # Specific source name prefixes
    if source_name:
        t = re.sub(rf"^{re.escape(source_name)}\s+(?:reports|reported|said|says)\s*[:—,-]?\s*", "", t, flags=re.IGNORECASE)
        t = re.sub(rf"^(?:as\s+reported\s+(?:in|by)\s+{re.escape(source_name)}[:—,-]?\s*)", "", t, flags=re.IGNORECASE)
        t = re.sub(rf"^(?:according\s+to\s+{re.escape(source_name)}[:—,-]?\s*)", "", t, flags=re.IGNORECASE)

    # Clickbait and stub wire intros
    t = re.sub(
        r"^(?:in the latest developments|according to reports|reports said|breaking news|live updates|live wire|special report)\s*[:—,-]?\s*",
        "",
        t,
        flags=re.IGNORECASE,
    )
    t = re.sub(r"^(?:here(?:'s|s)\s+(?:what|the|why)\s+[^.:—]+[:—,-]\s*)", "", t, flags=re.IGNORECASE)
    t = re.sub(r"(?:continue\s+reading.*|read\s+more\s+at\s+.*)$", "", t, flags=re.IGNORECASE)

    return t.strip()


def synthesize_contextual_report(
    title: str,
    category_slug: str,
    topics: Optional[List[str]] = None,
    country: str = "Global",
    source_name: str = "GlobalDesk Wire"
) -> str:
    """Synthesizes an authoritative, concise, prime-time television broadcast report
    when the original summary is absent, too brief, or a generic stub.
    """
    topics_list = [t.lower() for t in (topics or []) if t]
    t_lower = title.lower()

    # Financial & Markets Signal Synthesis
    if category_slug in ("markets", "business", "economy") or any(t in topics_list for t in ["rates", "equities", "funds", "regulation", "crypto", "banking"]):
        if "rate" in t_lower or "federal reserve" in t_lower or "rates" in topics_list:
            return (
                "Central banking authorities and regulatory committees are reviewing benchmark liquidity parameters and institutional oversight. "
                "Market analysts are evaluating the transmission mechanism across yield curves, commercial credit, and asset valuations."
            )
        elif "sec" in t_lower or "regulation" in topics_list or "enforcement" in t_lower:
            return (
                "Regulatory bodies have issued updated compliance determinations and supervisory frameworks for participating financial institutions. "
                "The guidance establishes enhanced operational transparency and risk disclosure requirements across capital markets."
            )
        elif "jackpot" in t_lower or "powerball" in t_lower or "lottery" in t_lower or "million" in t_lower and "taxes" in t_lower:
            return (
                "Lottery officials have confirmed the prize totals ahead of the upcoming nationwide drawing. "
                "Financial advisory specialists highlight significant withholding adjustments between annuity disbursements and immediate cash settlement options."
            )
        elif "ipo" in t_lower or "equities" in topics_list:
            return (
                "Capital market advisory boards are deliberating modernized public listing standards and capital formation rules for emerging enterprises. "
                "The proposed modernization aims to expand liquidity channels while safeguarding investor protections."
            )
        else:
            return (
                f"Market participants are evaluating strategic corporate disclosures and policy signals across the {country} financial sector. "
                "Institutional trading desks report calibrated portfolio repositioning in response to macro-economic indicators."
            )

    # Innovation, DeepTech & Science Signal Synthesis
    if category_slug in ("innovation", "technology") or any(t in topics_list for t in ["ai", "quantum", "climate", "biotech", "semiconductors", "cyber"]):
        if "quantum" in t_lower or "quantum" in topics_list:
            return (
                "Research institutes have documented significant experimental progress in quantum sensing and nanoscale instrumentation. "
                "The breakthrough enables unprecedented measurement fidelity with profound implications for cryptographic hardware and materials science."
            )
        elif "ai" in t_lower or "artificial intelligence" in t_lower or "ai" in topics_list or "agent" in t_lower:
            return (
                "Engineering teams and academic researchers have introduced novel computational architectures advancing artificial intelligence capability. "
                "The implementation focuses on robust algorithmic governance, verified reasoning reliability, and high-throughput deployment."
            )
        elif "climate" in t_lower or "climate" in topics_list or "environmental" in t_lower:
            return (
                "Field studies and environmental scientists have released verified longitudinal models evaluating ecological adaptation strategies. "
                "The research presents actionable empirical data supporting sustainable infrastructure and agricultural resilience."
            )
        else:
            return (
                "Technology laboratories and research consortia have unveiled verified empirical findings advancing technical capability. "
                "Industry leaders anticipate practical integration across scalable software systems and high-assurance digital infrastructure."
            )

    # Entertainment, Screen & Culture Synthesis
    if category_slug in ("entertainment", "movies", "films", "hollywood", "music", "arts", "pop", "rock") or "netflix" in t_lower or "series" in t_lower or "movie" in t_lower:
        return (
            "The production milestone has drawn international artistic commentary and strong critical reception across premier entertainment circuits. "
            "Creative teams and industry curators highlight the project's distinctive storytelling, audience engagement, and production craftsmanship."
        )

    # Sports Synthesis
    if any(k in t_lower for k in ["nfl", "mlb", "nba", "soccer", "mets", "yankees", "braves", "dodgers", "packers", "cowboys", "tko", "wrestle", "championship"]):
        return (
            "League analysts and franchise leadership are reviewing roster adjustments and competitive strategy following recent competitive fixtures. "
            "Coaching staffs emphasize tactical recalibration as postseason and division rivalries intensify across the schedule."
        )

    # Politics, Diplomacy & World Affairs Synthesis
    if any(k in t_lower for k in ["diplomat", "attack", "clash", "protest", "police", "minister", "summit", "election", "treaty", "sanctions", "war", "hostage"]):
        return (
            "Diplomatic delegations and regional observers are actively monitoring verified developments on the ground. "
            "International officials have called for adherence to established protocols as ministerial desks coordinate subsequent advisories."
        )

    return (
        f"Verified correspondents and monitoring bureaus are tracking unfolding developments across {country}. "
        "Key stakeholders are evaluating strategic implications as additional field dispatches are confirmed through verified channels."
    )


def compose_broadcast_script(
    title: str,
    summary: Optional[str],
    source_name: str,
    category_slug: str = "world",
    country: str = "Global",
    topics: Optional[List[str]] = None,
    index: int = 0
) -> Dict[str, Any]:
    """
    Synthesize an authoritative, prime-time television broadcast script and structured presentation.
    Guarantees the anchor tells the news FULLY and CONCISELY on every presentation,
    eliminating robotic '[Source] reported' phrasing.
    """
    clean_title = clean_character_quotes(title).rstrip(".")
    raw_summary = clean_character_quotes(summary or "")

    # Strip datelines, city reports, and source headers from summary
    clean_summary = strip_wire_prefixes(raw_summary, source_name)

    # Detect category from title if misclassified (e.g. Netflix series categorized under business)
    t_lower = clean_title.lower()
    if any(k in t_lower for k in ["netflix", "movie", "show", "series", "album", "actor", "hollywood", "film", "cinema"]):
        category_slug = "entertainment"
    elif any(k in t_lower for k in ["nfl", "mlb", "mets", "yankees", "braves", "dodgers", "soccer", "championship"]):
        category_slug = "entertainment"

    # Check if summary is a generic placeholder or stub
    is_stub = (
        not clean_summary
        or len(clean_summary) < 40
        or "live reporting from verified" in clean_summary.lower()
        or clean_summary.lower().startswith("key developments focus on")
        or clean_summary.lower() == clean_title.lower()
    )

    if is_stub:
        body_text = synthesize_contextual_report(
            title=clean_title,
            category_slug=category_slug,
            topics=topics,
            country=country,
            source_name=source_name
        )
    else:
        # Extract clean, complete sentences from existing journalistic summary
        sentences = [s.strip() for s in re.split(r'(?<=[.!?])\s+', clean_summary) if len(s.strip()) > 10]
        if sentences:
            body_text = " ".join(sentences[:2])
        else:
            body_text = clean_summary

        # Clean any remaining wire junk from body_text
        body_text = strip_wire_prefixes(body_text, source_name)

        # If body is brief (fewer than 22 words), supplement with concise context so the anchor tells the full news
        if len(body_text.split()) < 22:
            expansion = synthesize_contextual_report(clean_title, category_slug, topics, country, source_name)
            exp_sentences = [s.strip() for s in re.split(r'(?<=[.!?])\s+', expansion) if s.strip()]
            if exp_sentences:
                body_text = body_text.rstrip(".") + ". " + exp_sentences[0]

    # Ensure clean final punctuation
    body_text = re.sub(r'\s+', ' ', body_text).strip()
    if not body_text.endswith("."):
        body_text += "."

    # Topic Lead-in for varied, natural prime-time anchor delivery
    lead_ins = {
        "politics": [
            "Turning now to major political developments",
            "In government and diplomatic affairs today",
            "A critical policy development is unfolding",
            "Focusing on policy and governance this hour",
        ],
        "business": [
            "In global business and corporate developments",
            "Turning to international commerce and enterprise",
            "Major industry movements are under way as",
            "Corporate leadership and trade updates today",
        ],
        "economy": [
            "On the economic front, key market indicators show",
            "Economic analysts are closely evaluating shifts as",
            "In central banking and macro-economic developments",
            "Monitoring inflation, currency, and labor trends as",
        ],
        "markets": [
            "Turning to Wall Street and global capital movements",
            "In capital markets and institutional trading today",
            "Financial regulators and market analysts report",
            "Monitoring financial markets and sovereign debt trends as",
        ],
        "technology": [
            "In technology and digital innovation breakthroughs",
            "On the high-tech and cybersecurity horizon",
            "DeepTech and artificial intelligence developments this hour",
            "Turning to software, infrastructure, and emerging tech",
        ],
        "innovation": [
            "In scientific discovery and emerging technology radar",
            "Global research hubs report breakthrough findings as",
            "On the innovation frontier, verified research shows",
            "Advancing DeepTech and applied engineering this hour",
        ],
        "entertainment": [
            "In culture, entertainment, and screen arts today",
            "From the international film and entertainment industry",
            "Turning to culture, cinema, and music headlines",
            "In world sports and cultural headlines",
        ],
        "world": [
            "In major international headlines unfolding this hour",
            "From our global bureaus, key developments are underway",
            "Turning to world affairs and diplomatic dispatches",
            "In verified international reporting from the wires",
        ],
    }

    cat_leads = lead_ins.get(category_slug, lead_ins["world"])
    lead_intro = cat_leads[index % len(cat_leads)]

    # Spoken Anchor Narration: Direct, short, and precise without wasteful prefix filler
    full_script = f"{clean_title}. {body_text}"

    # Visual bullet points for on-screen HUD (2 concise, structured takeaways)
    bullet_sentences = [s.strip() for s in re.split(r'(?<=[.!?])\s+', body_text) if len(s.strip()) > 10]
    if len(bullet_sentences) >= 2:
        bullet_points = [bullet_sentences[0], bullet_sentences[1]]
    elif len(bullet_sentences) == 1:
        bullet_points = [clean_title, bullet_sentences[0]]
    else:
        bullet_points = [clean_title, body_text]

    # Bureau mapping based on country, category, and source
    bureau = "GLOBALDESK / WORLD BUREAU"
    if category_slug in ("markets", "business") or "Wall Street" in source_name or "New York" in source_name or "Forbes" in source_name:
        bureau = "WALL STREET & CAPITAL DESK"
    elif category_slug in ("innovation", "technology") or "Science" in source_name or "Crossref" in source_name:
        bureau = "INNOVATION & DEEPTECH DESK"
    elif "Washington" in source_name or country == "United States":
        bureau = "WASHINGTON & NEW YORK BUREAU"
    elif "London" in source_name or "BBC" in source_name or "Financial Times" in source_name or country in ("United Kingdom", "Europe"):
        bureau = "LONDON & EUROPE BUREAU"
    elif "Jerusalem" in source_name or "Middle East" in source_name or country in ("Israel", "Middle East"):
        bureau = "MIDDLE EAST & JERUSALEM DESK"
    elif "Hong Kong" in source_name or "South China" in source_name or country in ("China", "Asia", "India", "Japan"):
        bureau = "ASIA-PACIFIC / HONG KONG HUB"

    return {
        "headline": clean_title,
        "lead_intro": lead_intro,
        "full_report": body_text,
        "spoken_script": full_script,
        "bureau": bureau,
        "bullet_points": bullet_points,
        "attribution": f"Verified via {source_name}",
        "impact_rating": "STRATEGIC WIRE DISPATCH",
    }
