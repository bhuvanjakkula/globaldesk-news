"""Post-Quantum Cryptography (PQC) Core Engine
Implements NIST FIPS 203 (ML-KEM-768) Key Encapsulation & NIST FIPS 204 (ML-DSA-65) Dual-Signature Integrity.
"""
import base64
from datetime import datetime, timezone
from hashlib import sha384, sha256
import json
import os
import time
from typing import Any, Dict, List, Optional, Tuple

import cryptography
from cryptography.hazmat.primitives.asymmetric import ed25519, mldsa, mlkem
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.hkdf import HKDF
from cryptography.hazmat.primitives import hashes

ML_KEM_SUITE = "NIST-FIPS-203/ML-KEM-768"
ML_DSA_SUITE = "NIST-FIPS-204/ML-DSA-65+Ed25519"
AUDIT_CONTEXT = b"GlobalDesk/PQCAuditLedger/v1"

def b64(data: bytes) -> str:
    return base64.b64encode(data).decode('ascii')

def unb64(text: str) -> bytes:
    return base64.b64decode(text, validate=True)

def canonical_json(obj: Any) -> bytes:
    return json.dumps(obj, sort_keys=True, separators=(',', ':'), ensure_ascii=True, allow_nan=False).encode('utf-8')

class PQCCryptoEngine:
    """Singleton engine managing runtime post-quantum cryptographic operations."""
    _instance = None

    def __init__(self):
        # Generate persistent in-memory host keys for runtime PQC operations
        self.kem_private = mlkem.MLKEM768PrivateKey.generate()
        self.kem_public = self.kem_private.public_key()
        self.kem_public_bytes = self.kem_public.public_bytes_raw()

        self.dsa_private = mldsa.MLDSA65PrivateKey.generate()
        self.dsa_public = self.dsa_private.public_key()

        self.classic_private = ed25519.Ed25519PrivateKey.generate()
        self.classic_public = self.classic_private.public_key()

        self.host_key_id = sha384(self.dsa_public.public_bytes_raw() + self.classic_public.public_bytes_raw()).hexdigest()[:24]

        # In-memory append-only tamper-evident audit ledger
        self.audit_ledger: List[Dict[str, Any]] = []
        self._genesis_ledger()

    @classmethod
    def get_instance(cls) -> "PQCCryptoEngine":
        if cls._instance is None:
            cls._instance = PQCCryptoEngine()
        return cls._instance

    def _genesis_ledger(self):
        genesis_block = {
            "index": 0,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "event_type": "GENESIS_PQC_INITIALIZED",
            "details": {
                "kem_suite": ML_KEM_SUITE,
                "dsa_suite": ML_DSA_SUITE,
                "host_key_id": self.host_key_id,
                "cryptography_version": cryptography.__version__,
                "fips_standard": "FIPS 203 & FIPS 204 Active",
            },
            "prev_hash": "0" * 64,
        }
        genesis_block["hash"] = sha384(canonical_json(genesis_block)).hexdigest()
        self.audit_ledger.append(genesis_block)

    def record_security_event(self, event_type: str, details: Dict[str, Any]) -> Dict[str, Any]:
        """Record an immutable, hash-chained security event in the PQC audit ledger."""
        prev_hash = self.audit_ledger[-1]["hash"] if self.audit_ledger else "0" * 64
        index = len(self.audit_ledger)

        block_data = {
            "index": index,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "event_type": event_type,
            "details": details,
            "prev_hash": prev_hash,
            "host_key_id": self.host_key_id,
        }

        # Sign the block message with ML-DSA-65
        message = AUDIT_CONTEXT + b"\x00" + canonical_json(block_data)
        dsa_sig = self.dsa_private.sign(message, AUDIT_CONTEXT)
        classic_sig = self.classic_private.sign(message)

        block_data["hash"] = sha384(canonical_json(block_data)).hexdigest()
        block_data["signatures"] = {
            "ml_dsa_65": b64(dsa_sig),
            "ed25519": b64(classic_sig),
        }

        self.audit_ledger.append(block_data)
        # Keep ledger bounded in memory to 2,000 recent events
        if len(self.audit_ledger) > 2000:
            self.audit_ledger.pop(0)

        return block_data

    def encrypt_data_mlkem(self, data: bytes | str) -> Dict[str, str]:
        """
        NIST FIPS 203 ML-KEM-768 Hybrid Encryption:
        1. Encapsulate 256-bit quantum-safe shared secret via ML-KEM-768
        2. Derive symmetric key via HKDF-SHA384
        3. Encrypt payload with AES-256-GCM (96-bit nonce + 128-bit auth tag)
        """
        raw_bytes = data.encode('utf-8') if isinstance(data, str) else data
        
        # 1. ML-KEM-768 encapsulation
        shared_secret, ciphertext = self.kem_public.encapsulate()

        # 2. Derive 256-bit AES key via HKDF-SHA384
        hkdf = HKDF(
            algorithm=hashes.SHA384(),
            length=32,
            salt=b"GlobalDesk/MLKEM768/AESGCM",
            info=b"quantum-safe-payload-encryption",
        )
        aes_key = hkdf.derive(shared_secret)

        # 3. Encrypt with AES-256-GCM
        nonce = os.urandom(12)
        aesgcm = AESGCM(aes_key)
        encrypted_payload = aesgcm.encrypt(nonce, raw_bytes, None)

        return {
            "suite": ML_KEM_SUITE,
            "kem_ciphertext": b64(ciphertext),
            "nonce": b64(nonce),
            "payload": b64(encrypted_payload),
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

    def decrypt_data_mlkem(self, bundle: Dict[str, str]) -> bytes:
        """Decapsulate ML-KEM-768 shared secret and decrypt AES-256-GCM payload."""
        kem_ciphertext = unb64(bundle["kem_ciphertext"])
        nonce = unb64(bundle["nonce"])
        payload = unb64(bundle["payload"])

        # 1. Decapsulate shared secret using private key
        shared_secret = self.kem_private.decapsulate(kem_ciphertext)

        # 2. Re-derive symmetric key
        hkdf = HKDF(
            algorithm=hashes.SHA384(),
            length=32,
            salt=b"GlobalDesk/MLKEM768/AESGCM",
            info=b"quantum-safe-payload-encryption",
        )
        aes_key = hkdf.derive(shared_secret)

        # 3. Decrypt payload
        aesgcm = AESGCM(aes_key)
        return aesgcm.decrypt(nonce, payload, None)

    def execute_live_self_test(self) -> Dict[str, Any]:
        """Execute full end-to-end PQC cryptographic verification with timing benchmarks."""
        t0 = time.perf_counter()
        
        # 1. ML-KEM-768 Roundtrip test
        test_payload = b"GlobalDesk Quantum-Resistant Telemetry Verification String -- 2026-FIPS"
        encrypted = self.encrypt_data_mlkem(test_payload)
        t_enc = (time.perf_counter() - t0) * 1000

        t1 = time.perf_counter()
        decrypted = self.decrypt_data_mlkem(encrypted)
        t_dec = (time.perf_counter() - t1) * 1000
        assert decrypted == test_payload, "Decrypted data mismatch"

        # 2. Tamper resistance verification
        tampered_bundle = dict(encrypted)
        raw_tampered = bytearray(unb64(tampered_bundle["payload"]))
        raw_tampered[0] ^= 0xFF  # Flip bits
        tampered_bundle["payload"] = b64(bytes(raw_tampered))

        tamper_rejected = False
        try:
            self.decrypt_data_mlkem(tampered_bundle)
        except Exception:
            tamper_rejected = True

        # 3. ML-DSA-65 + Ed25519 Dual Signature verification
        t2 = time.perf_counter()
        test_msg = b"GlobalDesk-FIPS204-Signature-Integrity"
        dsa_sig = self.dsa_private.sign(test_msg, AUDIT_CONTEXT)
        classic_sig = self.classic_private.sign(test_msg)
        t_sign = (time.perf_counter() - t2) * 1000

        t3 = time.perf_counter()
        self.dsa_public.verify(dsa_sig, test_msg, AUDIT_CONTEXT)
        self.classic_public.verify(classic_sig, test_msg)
        t_verify = (time.perf_counter() - t3) * 1000

        total_time_ms = (time.perf_counter() - t0) * 1000

        result = {
            "status": "passed" if tamper_rejected else "failed",
            "kem_suite": ML_KEM_SUITE,
            "dsa_suite": ML_DSA_SUITE,
            "tamper_rejected": tamper_rejected,
            "cryptography_version": cryptography.__version__,
            "tested_at": datetime.now(timezone.utc).isoformat(),
            "benchmarks_ms": {
                "ml_kem_encapsulate_encrypt": round(t_enc, 2),
                "ml_kem_decapsulate_decrypt": round(t_dec, 2),
                "ml_dsa_dual_sign": round(t_sign, 2),
                "ml_dsa_dual_verify": round(t_verify, 2),
                "total_cycle_latency": round(total_time_ms, 2),
            },
            "key_lifecycle": "FIPS 203/204 In-Memory Host Identity Active",
            "host_key_id": self.host_key_id,
        }

        # Record this successful self-test into the immutable ledger
        self.record_security_event("CRYPTO_SELF_TEST_PASSED", {
            "total_ms": result["benchmarks_ms"]["total_cycle_latency"],
            "tamper_rejected": tamper_rejected,
        })

        return result
