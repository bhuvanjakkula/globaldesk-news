import re
from datetime import datetime, timezone
from pydantic import BaseModel, ConfigDict, Field, field_validator

class SourceOut(BaseModel):
    id: int
    name: str
    domain: str
    region: str
    model_config = ConfigDict(from_attributes=True)

class CategoryOut(BaseModel):
    slug: str
    name: str
    description: str
    model_config = ConfigDict(from_attributes=True)

class ArticleOut(BaseModel):
    slug: str
    title: str
    summary: str | None
    url: str | None
    image_url: str | None = None
    source: SourceOut
    category: CategoryOut
    country: str
    language: str
    published_at: datetime
    is_demo: bool
    model_config = ConfigDict(from_attributes=True)

    @field_validator('title', 'summary', mode='before')
    @classmethod
    def clean_text_fields(cls, value):
        if not value or not isinstance(value, str):
            return value
        text = value
        # Normalize mojibake
        mojibake = {
            'â€™': "'", 'â€œ': '"', 'â€\x9d': '"', 'â€"': '—', 'â€“': '–', 'â€˜': "'",
            'Ã©': 'é', 'Ã¨': 'è', 'Ã±': 'ñ', 'â€¦': '...', 'Â': '', '': "'",
        }
        for bad, good in mojibake.items():
            text = text.replace(bad, good)
        if text.count("'") > 8 and ("' '" in text or re.search(r"'[a-zA-Z0-9]'\s*'?", text)):
            text = text.replace("'", "")
        text = re.sub(r"(?<=\w)'(?=\w)", "", text)
        return re.sub(r'\s+', ' ', text).strip()

    @field_validator('published_at')
    @classmethod
    def publication_utc(cls, value):
        return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value.astimezone(timezone.utc)

class ArticlePage(BaseModel):
    items: list[ArticleOut]
    total: int = Field(ge=0)
    page: int = Field(ge=1)
    page_size: int = Field(ge=1)
