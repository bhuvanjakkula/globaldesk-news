import Link from 'next/link';
import { getSecurityPosture, getPQCAuditChain } from '@/lib/api';
import PQCCyberShieldClient from '@/components/PQCCyberShieldClient';

export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'PQC Cyber Security & Post-Quantum Defense · GlobalDesk',
  description: 'NIST FIPS 203 ML-KEM-768 and FIPS 204 ML-DSA-65 post-quantum cryptography, active intrusion prevention shield, and tamper-evident audit ledger.',
};

export default async function SecurityPage() {
  let posture;
  let auditChain: { total_blocks: number; host_key_id: string; suite: string; blocks: import('@/lib/api').AuditBlock[] } = {
    total_blocks: 0,
    host_key_id: '',
    suite: '',
    blocks: [],
  };

  try {
    posture = await getSecurityPosture();
    auditChain = await getPQCAuditChain(15);
  } catch {
    return (
      <div className="container page-pad">
        <div className="empty-state">
          <h1>Security Operations Center Offline</h1>
          <p>The post-quantum security API could not be reached. Security status cannot be confirmed.</p>
          <Link href="/security">Retry Connection →</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="intelligence-workspace">
      <div className="container page-pad">
        {/* Header */}
        <div className="intel-heading">
          <div>
            <span className="eyebrow">GLOBALDESK / CYBER SECURITY COMMAND CENTER</span>
            <h1>Post-Quantum Cyber Security &amp; Defense</h1>
            <p>
              Military-grade post-quantum cryptography (<strong>NIST FIPS 203 / 204</strong>), real-time deep packet
              inspection against zero-day exploits, SQL injection, XSS, and tamper-evident hash-chained audit ledgers.
            </p>
          </div>
          <span className="intel-status">
            SHIELD: ARMED · {posture.environment.toUpperCase()} · v{posture.version}
          </span>
        </div>

        {/* Interactive PQC Cyber Shield & Threat Radar Component */}
        <PQCCyberShieldClient initialPosture={posture} initialAudit={auditChain} />

        {/* Layered Controls & Boundaries */}
        <div className="section-head" style={{ marginTop: '50px' }}>
          <div>
            <span className="section-kicker">COMPREHENSIVE DEFENSE MATRIX</span>
            <h2>Active Cyber Security Controls</h2>
          </div>
        </div>

        <div className="security-controls">
          {posture.controls.map((control) => (
            <article key={control.name}>
              <span className="control-status-tag">{control.status.toUpperCase()}</span>
              <h3>{control.name}</h3>
              <p>{control.detail}</p>
            </article>
          ))}
        </div>

        {/* Evidence Seal Workflow */}
        <section className="security-workflow">
          <div>
            <span className="eyebrow">POST-QUANTUM DUAL-SEAL PROTOCOL</span>
            <h2>NIST FIPS 203 + FIPS 204 Architecture</h2>
            <p>
              When quantum computers become operational, standard RSA and Elliptic Curve signatures can be compromised
              in polynomial time. GlobalDesk implements lattice-based post-quantum algorithms to ensure long-term data
              confidentiality and digital signature authenticity.
            </p>
          </div>
          <ol>
            <li>
              <strong>NIST FIPS 203: ML-KEM-768</strong>
              <p>
                Module-Lattice Key Encapsulation Mechanism provides IND-CCA2 quantum-resistant symmetric key exchange,
                preventing Harvest-Now-Decrypt-Later state-level surveillance.
              </p>
            </li>
            <li>
              <strong>NIST FIPS 204: ML-DSA-65 Dual Signature</strong>
              <p>
                Lattice-based digital signature algorithm combined with Ed25519; both cryptographic signatures must
                independently verify for all administrative actions and public news snapshots.
              </p>
            </li>
            <li>
              <strong>Tamper-Evident SHA-384 Ledger</strong>
              <p>
                Security events, intercepted intrusion attempts, and cryptographic verification receipts are
                monotonically hash-chained and signed with ML-DSA-65.
              </p>
            </li>
          </ol>
        </section>

        {/* Deployment Readiness */}
        <div className="section-head">
          <div>
            <span className="section-kicker">DEPLOYMENT ROADMAP</span>
            <h2>Next Steps for Edge Cloud Production</h2>
          </div>
        </div>
        <ul className="security-remaining">
          {posture.remaining.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>

        <div style={{ marginTop: '30px' }}>
          <Link className="subtle-link" href="/intelligence">
            ← Return to Live Intelligence Lab
          </Link>
        </div>
      </div>
    </div>
  );
}
