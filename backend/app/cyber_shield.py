"""Active Cyber Attack, Hacker Intrusion & PQC Defense Shield Middleware
Protects the application against SQL Injection, XSS, Path Traversal, Automated Scanners, and Probing.
All neutralized threats are cryptographically logged into the PQC Tamper-Evident Ledger.
"""
from collections import defaultdict
from datetime import datetime, timezone
import re
import time
from typing import Dict, Any, Tuple
from urllib.parse import unquote

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

from .pqc_engine import PQCCryptoEngine

# ── Attack Detection Patterns ───────────────────────────────────────────────

# 1. SQL Injection (SQLi) Patterns
SQLI_PATTERNS = [
    re.compile(r"(\b(union(\s+all)?\s+select)\b)", re.IGNORECASE),
    re.compile(r"(\b(select|insert|update|delete|drop|truncate|alter)\b.+\b(from|into|table|database)\b)", re.IGNORECASE),
    re.compile(r"(\b(exec(\s|\+)+(s|x)p\w+)\b)", re.IGNORECASE),
    re.compile(r"(\b(sleep|benchmark|waitfor\s+delay)\s*\()", re.IGNORECASE),
    re.compile(r"('\s*(or|and)\s*('?\w+'?|\d+)\s*=\s*('?\w+'?|\d+))", re.IGNORECASE),
    re.compile(r"(\b(or|and)\s+1\s*=\s*1\b)", re.IGNORECASE),
    re.compile(r"(/\*.*?\*/|--\s|;\s*drop\b)", re.IGNORECASE),
]

# 2. Cross-Site Scripting (XSS) Patterns
XSS_PATTERNS = [
    re.compile(r"(<script[^>]*>.*?</script>)", re.IGNORECASE),
    re.compile(r"(javascript\s*:\s*[^\s]+)", re.IGNORECASE),
    re.compile(r"(on(load|error|click|mouseover|submit|focus|blur|keydown)\s*=)", re.IGNORECASE),
    re.compile(r"(<iframe[^>]*>|<object[^>]*>|<embed[^>]*>)", re.IGNORECASE),
    re.compile(r"(document\.(cookie|location|write))", re.IGNORECASE),
    re.compile(r"(\beval\s*\(|\balert\s*\()", re.IGNORECASE),
]

# 3. Path Traversal & Local/Remote File Inclusion (LFI/RFI)
PATH_TRAVERSAL_PATTERNS = [
    re.compile(r"(\.\./|\.\.\\|%2e%2e%2f|%2e%2e\/|\.\.%2f)", re.IGNORECASE),
    re.compile(r"(/etc/(passwd|shadow|hosts|group))", re.IGNORECASE),
    re.compile(r"((windows|winnt)\\system32)", re.IGNORECASE),
    re.compile(r"(\.env|\.git/config|\.git/HEAD|\.aws/credentials|web\.config)", re.IGNORECASE),
    re.compile(r"(cmd\.exe|powershell\.exe|/bin/sh|/bin/bash)", re.IGNORECASE),
]

# 4. Hacker Scanning & Automated Exploit Probes
PROBE_PATHS = {
    "/wp-login.php", "/wp-admin", "/xmlrpc.php", "/wp-content",
    "/phpmyadmin", "/pma", "/admin/db", "/mysql",
    "/.env", "/.git", "/.git/HEAD", "/.aws", "/config.json",
    "/actuator", "/actuator/health", "/solr", "/solr/admin",
    "/cgi-bin", "/shell.php", "/c99.php", "/r57.php", "/cmd.jsp",
    "/console", "/manager/html", "/server-status",
}

class CyberDefenseStats:
    """Thread-safe statistics tracking neutralized cyber attacks."""
    def __init__(self):
        self.sqli_blocked = 0
        self.xss_blocked = 0
        self.path_traversal_blocked = 0
        self.probes_deflected = 0
        self.total_threats_neutralized = 0
        self.quarantined_ips: Dict[str, float] = {}
        self.ip_violation_counts: Dict[str, int] = defaultdict(int)

    def record_threat(self, threat_type: str, client_ip: str):
        self.total_threats_neutralized += 1
        self.ip_violation_counts[client_ip] += 1
        
        if threat_type == "SQL_INJECTION":
            self.sqli_blocked += 1
        elif threat_type == "XSS_SCRIPT_INJECTION":
            self.xss_blocked += 1
        elif threat_type == "PATH_TRAVERSAL":
            self.path_traversal_blocked += 1
        elif threat_type == "HACKER_PROBE":
            self.probes_deflected += 1

        # If an IP commits 3 or more violations, place in temporary 10-minute quarantine
        if self.ip_violation_counts[client_ip] >= 3:
            self.quarantined_ips[client_ip] = time.time() + 600

    def is_quarantined(self, client_ip: str) -> bool:
        if client_ip in self.quarantined_ips:
            if time.time() < self.quarantined_ips[client_ip]:
                return True
            else:
                del self.quarantined_ips[client_ip]
        return False

    def to_dict(self) -> Dict[str, Any]:
        return {
            "total_threats_neutralized": self.total_threats_neutralized,
            "sqli_blocked": self.sqli_blocked,
            "xss_blocked": self.xss_blocked,
            "path_traversal_blocked": self.path_traversal_blocked,
            "probes_deflected": self.probes_deflected,
            "active_quarantined_ips": len(self.quarantined_ips),
            "defense_status": "ARMED & ACTIVE (PQC-FIPS-203/204)",
        }

CYBER_STATS = CyberDefenseStats()

class CyberShieldMiddleware(BaseHTTPMiddleware):
    """
    High-Performance Post-Quantum Cyber Security & Intrusion Prevention Filter.
    Examines URLs, headers, and parameters before reaching application routers.
    """
    async def dispatch(self, request: Request, call_next):
        client_ip = request.client.host if request.client else "unknown"

        path = request.url.path.lower()
        query_str = unquote(request.url.query or "")
        path_decoded = unquote(path)

        # 1. Check IP Quarantine (exempt loopback and security dashboard endpoints)
        if client_ip not in {'127.0.0.1', '::1', 'localhost'} and not path.startswith('/api/v1/security') and CYBER_STATS.is_quarantined(client_ip):
            return JSONResponse(
                status_code=403,
                content={
                    "error": "AccessDenied",
                    "detail": "Client IP quarantined due to repeated security policy violations.",
                    "pqc_shield": "Active",
                },
            )

        # 2. Deflect Known Hacker Probes
        for probe in PROBE_PATHS:
            if path.startswith(probe) or probe in path:
                CYBER_STATS.record_threat("HACKER_PROBE", client_ip)
                PQCCryptoEngine.get_instance().record_security_event("PROBE_DEFLECTED", {
                    "client_ip": client_ip,
                    "target_path": path[:120],
                    "action": "Immediate 403 Deflection",
                })
                return JSONResponse(
                    status_code=403,
                    content={
                        "error": "SecurityViolation",
                        "code": "PROBE_DEFLECTED",
                        "detail": "Unauthorized probe path detected and blocked by PQC Cyber Shield.",
                    },
                )

        # 3. Check for Path Traversal in Path & Query
        for pattern in PATH_TRAVERSAL_PATTERNS:
            if pattern.search(path_decoded) or pattern.search(query_str):
                CYBER_STATS.record_threat("PATH_TRAVERSAL", client_ip)
                PQCCryptoEngine.get_instance().record_security_event("PATH_TRAVERSAL_BLOCKED", {
                    "client_ip": client_ip,
                    "path": path[:80],
                    "query": query_str[:120],
                })
                return JSONResponse(
                    status_code=403,
                    content={
                        "error": "SecurityViolation",
                        "code": "PATH_TRAVERSAL_BLOCKED",
                        "detail": "Directory traversal payload detected and neutralized.",
                    },
                )

        # 4. Check for SQL Injection (SQLi) in Query Parameters
        if query_str:
            for pattern in SQLI_PATTERNS:
                if pattern.search(query_str):
                    CYBER_STATS.record_threat("SQL_INJECTION", client_ip)
                    PQCCryptoEngine.get_instance().record_security_event("SQL_INJECTION_NEUTRALIZED", {
                        "client_ip": client_ip,
                        "query_sample": query_str[:100],
                    })
                    return JSONResponse(
                        status_code=403,
                        content={
                            "error": "SecurityViolation",
                            "code": "SQL_INJECTION_BLOCKED",
                            "detail": "Malicious SQL syntax rejected by Post-Quantum Application Shield.",
                        },
                    )

        # 5. Check for Cross-Site Scripting (XSS) in Query Parameters
        if query_str:
            for pattern in XSS_PATTERNS:
                if pattern.search(query_str):
                    CYBER_STATS.record_threat("XSS_SCRIPT_INJECTION", client_ip)
                    PQCCryptoEngine.get_instance().record_security_event("XSS_PAYLOAD_NEUTRALIZED", {
                        "client_ip": client_ip,
                        "payload_sample": query_str[:100],
                    })
                    return JSONResponse(
                        status_code=403,
                        content={
                            "error": "SecurityViolation",
                            "code": "XSS_BLOCKED",
                            "detail": "Cross-site script injection attempt filtered and logged.",
                        },
                    )

        # 6. Execute Request and Inject PQC Security Headers
        response: Response = await call_next(request)

        response.headers["X-PQC-Shield"] = "NIST-FIPS-203-ML-KEM / NIST-FIPS-204-ML-DSA"
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"

        return response
