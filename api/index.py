import os
import sys
from pathlib import Path

# Add backend and project root to Python path
ROOT_DIR = Path(__file__).resolve().parent.parent
BACKEND_DIR = ROOT_DIR / "backend"

if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

# Signal Vercel serverless environment
os.environ.setdefault("VERCEL", "1")

from backend.app.main import app
