"""Public PQC & Cyber Security capability report; live threat shield telemetry & self-test."""
from datetime import datetime, timezone
import cryptography
from fastapi import APIRouter
from .pqc_engine import PQCCryptoEngine, ML_KEM_SUITE, ML_DSA_SUITE
from .cyber_shield import CYBER_STATS
from .settings import APP_ENV, API_REQUESTS_PER_MINUTE, API_GLOBAL_REQUESTS_PER_MINUTE

router = APIRouter(prefix='/api/v1/security', tags=['security'])

@router.get('/posture')
def posture():
    engine = PQCCryptoEngine.get_instance()
    # Execute fast live verification if not already recorded
    test_result = engine.execute_live_self_test()
    cyber_data = CYBER_STATS.to_dict()

    return {
        'version': '0.9.0-PQC',
        'environment': APP_ENV,
        'fips_standards': ['NIST FIPS 203 (ML-KEM)', 'NIST FIPS 204 (ML-DSA)'],
        'controls': [
            {'name': 'Post-Quantum Key Encapsulation (ML-KEM-768)', 'status': 'operational', 'detail': 'NIST FIPS 203 quantum-resistant key encapsulation mechanism coupled with HKDF-SHA384 and authenticated AES-256-GCM symmetric encryption.'},
            {'name': 'Dual-Signature PQC Integrity (ML-DSA-65)', 'status': 'operational', 'detail': 'NIST FIPS 204 post-quantum lattice signatures paired with Ed25519 for dual-algorithm tamper resistance.'},
            {'name': 'Active Web Application Cyber Shield', 'status': 'armed & shielding', 'detail': 'Real-time deep packet inspection blocking SQL Injection, Cross-Site Scripting (XSS), Path Traversal, and Automated Exploitation Probes.'},
            {'name': 'Tamper-Evident PQC Audit Ledger', 'status': 'immutable chained', 'detail': 'Monotonically increasing SHA-384 hash-chained audit ledger signed with ML-DSA-65; all neutralized attacks are permanently recorded.'},
            {'name': 'API host & request validation', 'status': 'implemented', 'detail': 'Explicit configured hosts; wildcard host lists refused. Bounded query length and offset limits.'},
            {'name': 'Per-process request budgets', 'status': 'implemented', 'detail': f'{API_REQUESTS_PER_MINUTE} units/client/minute, {API_GLOBAL_REQUESTS_PER_MINUTE} globally. Intelligence analysis and mutations cost 10 units.'},
            {'name': 'Strict HTTP security headers', 'status': 'enforced', 'detail': 'X-PQC-Shield, nosniff, frame denial, strict-dynamic CSP nonces, strict-origin referrer policy.'},
        ],
        'pqc': {
            'suite': f"{ML_KEM_SUITE} + {ML_DSA_SUITE}",
            'kem_suite': ML_KEM_SUITE,
            'dsa_suite': ML_DSA_SUITE,
            'library_version': cryptography.__version__,
            'scope': 'Quantum-resistant key encapsulation (ML-KEM-768), dual signatures (ML-DSA-65/Ed25519), and active cyber defense shield',
            'self_test': test_result,
            'host_key_id': engine.host_key_id,
            'production_signing_identity': f"PQC-HOST-ID:{engine.host_key_id}",
            'trust_model': 'NIST Post-Quantum Cryptographic Standards (FIPS 203 / FIPS 204) verified by dual-signature and hash-chained audit proofs.',
        },
        'cyber_shield': cyber_data,
        'remaining': [
            'Production deployment should terminate edge HTTPS with quantum-safe hybrid TLS (X25519+ML-KEM-768).',
            'Independent external penetration testing and formal FIPS 140-3 laboratory certification remain recommended for enterprise banking deployments.',
        ],
    }

@router.post('/self-test')
@router.get('/self-test')
def run_self_test():
    """Trigger a live, real-time PQC cryptographic self-test and return detailed latency benchmarks."""
    engine = PQCCryptoEngine.get_instance()
    return engine.execute_live_self_test()

@router.get('/audit-chain')
def audit_chain(limit: int = 25):
    """Return the recent blocks of the immutable, tamper-evident PQC audit ledger."""
    engine = PQCCryptoEngine.get_instance()
    blocks = engine.audit_ledger[-max(1, min(limit, 100)):]
    return {
        'total_blocks': len(engine.audit_ledger),
        'host_key_id': engine.host_key_id,
        'suite': ML_DSA_SUITE,
        'blocks': list(reversed(blocks)),
    }

@router.get('/shield-telemetry')
def shield_telemetry():
    """Return real-time threat defense counters and IP quarantine status."""
    return CYBER_STATS.to_dict()
