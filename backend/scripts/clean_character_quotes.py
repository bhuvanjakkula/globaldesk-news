import sqlite3
import re

DB_PATH = r"C:\Users\bhuva\.gemini\antigravity-ide\scratch\GlobalDesk\global-news-mvp\backend\local.db"

def clean_corrupted_text(text: str) -> str:
    if not text:
        return text
    
    # 1. Normalize common UTF-8 / Windows-1252 mojibake
    mojibake = {
        'â€™': "'",
        'â€œ': '"',
        'â€\x9d': '"',
        'â€"': '—',
        'â€“': '–',
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
    }
    for bad, good in mojibake.items():
        text = text.replace(bad, good)
        
    # Check if text suffers from character-separated single quotes e.g. 'S't'a'n'd'i'n'g'
    # Or high ratio of single quotes to length
    single_quote_count = text.count("'")
    has_char_quotes = bool(re.search(r"'[a-zA-Z0-9]'(\s*'?[a-zA-Z0-9]'?)*", text)) or bool(re.search(r"[a-zA-Z]'[a-zA-Z]'[a-zA-Z]", text))
    
    if (single_quote_count > 6 and has_char_quotes) or (single_quote_count > 15):
        # Text has character-level quoting corruption
        # E.g. 'S't'a'n'd'i'n'g' 'b'e'f'o'r'e' -> Standing before
        # If we remove single quotes surrounded by characters or at word boundaries:
        cleaned = text.replace("'", "")
        # Restore contractions if needed, or simply clean up spaces
        text = cleaned

    # Also clean regex pattern where individual letters or spaces were quoted
    # Remove orphan single quotes in words like b'e'f'o'r'e
    text = re.sub(r"(?<=\w)'(?=\w)", "", text) # removes internal single quotes in b'e'f'o'r'e -> before
    
    # Clean excessive whitespace
    text = re.sub(r'\s+', ' ', text).strip()
    return text

def run_fix():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute("SELECT id, title, summary FROM articles")
    rows = cursor.fetchall()
    
    fixed_count = 0
    print(f"Total articles to inspect: {len(rows)}")
    
    for row in rows:
        aid, title, summary = row
        new_title = clean_corrupted_text(title)
        new_summary = clean_corrupted_text(summary)
        
        if new_title != title or new_summary != summary:
            cursor.execute(
                "UPDATE articles SET title = ?, summary = ? WHERE id = ?",
                (new_title, new_summary, aid)
            )
            fixed_count += 1
            if fixed_count <= 10 or 'Acropolis' in (summary or '') or aid == 796:
                print(f"Fixed [ID:{aid}]:")
                print(f"  Old Summary sample: {(summary or '')[:80]}")
                print(f"  New Summary sample: {(new_summary or '')[:80]}")
                print("-" * 50)
                
    conn.commit()
    conn.close()
    print(f"Finished! Successfully cleaned and updated {fixed_count} articles in local.db.")

if __name__ == "__main__":
    run_fix()
