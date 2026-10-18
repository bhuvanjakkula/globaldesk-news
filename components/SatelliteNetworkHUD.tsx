'use client';
import { useEffect, useState } from 'react';

export interface SatelliteNetwork {
  id: string;
  name: string;
  orbital_slot: string;
  band: string;
  downlink_freq: string;
  polarization: string;
  symbol_rate: string;
  fec: string;
  transponder: string;
  coverage: string;
  affiliated_agencies: string[];
  status: string;
  snr_db: number;
  bitrate_mbps: number;
  downlinked_articles_count: number;
  carrier_locked: boolean;
  signal_quality_percent: number;
}

const DEFAULT_NETWORKS: SatelliteNetwork[] = [
  {
    id: "intelsat-34",
    name: "Intelsat-34 Intercontinental Wire Uplink",
    orbital_slot: "55.5° W",
    band: "C-Band / DVB-S2X",
    downlink_freq: "4120.0 MHz",
    polarization: "Horizontal",
    symbol_rate: "30,000 kSps",
    fec: "3/4 LDPC",
    transponder: "TP-14C",
    coverage: "Transatlantic, North America, Europe & Latin America",
    affiliated_agencies: ["Reuters", "Reuters Business", "Bloomberg", "Associated Press (AP)"],
    status: "CARRIER_LOCKED",
    snr_db: 15.4,
    bitrate_mbps: 54.2,
    downlinked_articles_count: 88,
    carrier_locked: true,
    signal_quality_percent: 96,
  },
  {
    id: "ses-astra",
    name: "SES Astra 19.2°E / 28.2°E European Direct Broadcast Network",
    orbital_slot: "19.2° E / 28.2° E",
    band: "Ku-Band / DVB-S2",
    downlink_freq: "11954.0 MHz",
    polarization: "Horizontal",
    symbol_rate: "27,500 kSps",
    fec: "2/3",
    transponder: "Astra 2E TP-108",
    coverage: "United Kingdom, European Continent, Middle East & North Africa",
    affiliated_agencies: ["BBC World News", "Sky News UK", "The Guardian", "France 24", "Deutsche Welle (DW)", "Der Spiegel"],
    status: "CARRIER_LOCKED",
    snr_db: 16.8,
    bitrate_mbps: 68.4,
    downlinked_articles_count: 142,
    carrier_locked: true,
    signal_quality_percent: 98,
  },
  {
    id: "galaxy-19",
    name: "Galaxy-19 North American News Syndicate Sat",
    orbital_slot: "97.0° W",
    band: "Ku-Band / DVB-S2",
    downlink_freq: "12060.0 MHz",
    polarization: "Vertical",
    symbol_rate: "22,000 kSps",
    fec: "5/6",
    transponder: "G19-K22",
    coverage: "North America, United States, Canada & Caribbean",
    affiliated_agencies: ["Forbes", "The Wall Street Journal", "The New York Times", "Fox News", "ABC News", "CBS News", "The Washington Times", "MarketWatch", "Fortune Magazine"],
    status: "CARRIER_LOCKED",
    snr_db: 14.9,
    bitrate_mbps: 48.0,
    downlinked_articles_count: 228,
    carrier_locked: true,
    signal_quality_percent: 94,
  },
  {
    id: "eutelsat-hotbird",
    name: "Eutelsat HOTBIRD 13°E / Eurovision News Exchange (EVN)",
    orbital_slot: "13.0° E",
    band: "Ku-Band High Band",
    downlink_freq: "11240.0 MHz",
    polarization: "Vertical",
    symbol_rate: "29,900 kSps",
    fec: "3/4",
    transponder: "HB-13F TP-130",
    coverage: "Pan-European, Middle East, Mediterranean Basin",
    affiliated_agencies: ["Financial Times", "Le Monde", "Notes from Poland", "Al Jazeera English", "The Jerusalem Post", "Le News Switzerland"],
    status: "CARRIER_LOCKED",
    snr_db: 16.2,
    bitrate_mbps: 59.8,
    downlinked_articles_count: 85,
    carrier_locked: true,
    signal_quality_percent: 97,
  },
  {
    id: "asiasat-7",
    name: "AsiaSat 7 / 9 Trans-Pacific & Indian Ocean Satellite Wire",
    orbital_slot: "105.5° E",
    band: "C-Band Extended",
    downlink_freq: "3880.0 MHz",
    polarization: "Horizontal",
    symbol_rate: "28,100 kSps",
    fec: "3/4",
    transponder: "AS7-C11",
    coverage: "India, China, Japan, Southeast Asia, Australasia",
    affiliated_agencies: ["The Hindu", "NDTV World", "The Indian Express", "South China Morning Post", "The Japan Times", "CNA (Channel NewsAsia)", "ABC News Australia"],
    status: "CARRIER_LOCKED",
    snr_db: 15.1,
    bitrate_mbps: 52.0,
    downlinked_articles_count: 110,
    carrier_locked: true,
    signal_quality_percent: 95,
  },
  {
    id: "starlink-leo-direct",
    name: "Starlink LEO Direct-to-Cell Low-Latency Satellite Relay",
    orbital_slot: "550 km LEO Orbital Shells",
    band: "Ka / Ku Ultra-High Band",
    downlink_freq: "14.25 GHz",
    polarization: "Circular Dual",
    symbol_rate: "45,000 kSps",
    fec: "Adaptive Coding & Modulation (ACM)",
    transponder: "LEO-Beam-Cluster-7",
    coverage: "Global Oceanic & Terrestrial Edge Newsrooms",
    affiliated_agencies: ["TechCrunch", "The Verge", "Engadget", "Ars Technica Cyber & Tech", "Daily Maverick", "AllAfrica News Wire"],
    status: "CARRIER_LOCKED",
    snr_db: 18.2,
    bitrate_mbps: 124.6,
    downlinked_articles_count: 78,
    carrier_locked: true,
    signal_quality_percent: 99,
  },
  {
    id: "nasa-tdrs",
    name: "NASA TDRS Space-to-Ground Telemetry Satellite Link",
    orbital_slot: "Geosynchronous TDRS Constellation",
    band: "S / Ku / Ka Multi-Band",
    downlink_freq: "13.775 GHz",
    polarization: "Right-Hand Circular",
    symbol_rate: "50,000 kSps",
    fec: "Turbo Code 1/2",
    transponder: "TDRS-13 Forward Space Link",
    coverage: "Earth Orbit, ISS, Deep Space Mission Control",
    affiliated_agencies: ["NASA Space & Discovery", "IndieWire Cinema", "Deadline Hollywood", "Variety", "Billboard Music Wire", "SPIN Magazine"],
    status: "CARRIER_LOCKED",
    snr_db: 19.5,
    bitrate_mbps: 150.0,
    downlinked_articles_count: 62,
    carrier_locked: true,
    signal_quality_percent: 100,
  },
];

export interface SatelliteNetworkHUDProps {
  onSelectNetwork?: (networkId: string, agencies: string[]) => void;
  selectedNetworkId?: string;
}

export default function SatelliteNetworkHUD({ onSelectNetwork, selectedNetworkId }: SatelliteNetworkHUDProps) {
  const [networks, setNetworks] = useState<SatelliteNetwork[]>(DEFAULT_NETWORKS);
  const [totalSatArticles, setTotalSatArticles] = useState<number>(746);
  const [bandwidth, setBandwidth] = useState<number>(457.2);
  const [activeTab, setActiveTab] = useState<string>('all');
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [lastPing, setLastPing] = useState<string>('Live Synchronized');

  useEffect(() => {
    let isMounted = true;
    const fetchTelemetry = async () => {
      try {
        const res = await fetch('/api/satellite/networks');
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data.networks) {
            setNetworks(data.networks);
            setTotalSatArticles(data.total_satellite_articles || 0);
            setBandwidth(data.aggregate_bandwidth_mbps || 457.2);
            setLastPing(new Date().toLocaleTimeString());
          }
        }
      } catch {
        // silent retry
      }
    };

    void fetchTelemetry();
    const interval = setInterval(fetchTelemetry, 12000); // Poll telemetry every 12s
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const handleNetworkClick = (net: SatelliteNetwork) => {
    const next = activeTab === net.id ? 'all' : net.id;
    setActiveTab(next);
    if (onSelectNetwork) {
      onSelectNetwork(next, next === 'all' ? [] : net.affiliated_agencies);
    }
  };

  const handleReset = () => {
    setActiveTab('all');
    if (onSelectNetwork) onSelectNetwork('all', []);
  };

  return (
    <div className="satellite-teleport-deck">
      {/* Teleport Header */}
      <div className="teleport-banner-header">
        <div className="teleport-title-area">
          <div className="sat-dish-icon">
            <span className="dish-pulse" />
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 10a8 8 0 0 1 14.5-4.5" />
              <path d="M7 13a4 4 0 0 1 7-2.2" />
              <line x1="21" y1="21" x2="16" y2="16" />
              <circle cx="9" cy="9" r="1" fill="currentColor" />
            </svg>
          </div>
          <div>
            <div className="teleport-tagline">
              <span className="sat-beacon-live" /> TRANS-ORBITAL SATELLITE DOWNLINK NETWORK
            </div>
            <h3 className="teleport-heading">
              7 Connected International Broadcast Satellite Constellations
            </h3>
          </div>
        </div>

        <div className="teleport-meta-stats">
          <div className="stat-capsule">
            <span className="stat-label">CARRIER LOCK</span>
            <strong className="stat-val locked-green">100% SYNCHRONIZED</strong>
          </div>
          <div className="stat-capsule">
            <span className="stat-label">BANDWIDTH</span>
            <strong className="stat-val">{bandwidth} Mbps DVB-S2X</strong>
          </div>
          <div className="stat-capsule">
            <span className="stat-label">DOWNLINKED FEED</span>
            <strong className="stat-val">{totalSatArticles} ARTICLES</strong>
          </div>
          <button
            type="button"
            className="sat-expand-btn"
            onClick={() => setIsExpanded(!isExpanded)}
            title="Toggle Transponder Grid"
          >
            {isExpanded ? '▲ HIDE TRANSPONDERS' : '▼ VIEW SATELLITE TRANSPONDERS'}
          </button>
        </div>
      </div>

      {/* Satellite Constellation Quick-Filters */}
      <div className="sat-filter-pills-row">
        <button
          type="button"
          className={`sat-pill ${activeTab === 'all' ? 'is-active' : ''}`}
          onClick={handleReset}
        >
          <span className="sat-pill-dot" /> All Satellites ({totalSatArticles})
        </button>
        {networks.map((net) => (
          <button
            key={net.id}
            type="button"
            className={`sat-pill ${activeTab === net.id ? 'is-active' : ''}`}
            onClick={() => handleNetworkClick(net)}
            title={`${net.name} (${net.orbital_slot})`}
          >
            <span className="sat-pill-dot" />
            <strong>{net.id.toUpperCase()}</strong>
            <small>{net.orbital_slot}</small>
            <span className="sat-count-badge">{net.downlinked_articles_count}</span>
          </button>
        ))}
      </div>

      {/* Expanded Transponder Engineering Telemetry Cards */}
      {isExpanded && (
        <div className="transponder-grid">
          {networks.map((sat) => {
            const isSelected = activeTab === sat.id;
            return (
              <div
                key={sat.id}
                className={`transponder-card ${isSelected ? 'transponder-selected' : ''}`}
                onClick={() => handleNetworkClick(sat)}
              >
                <div className="transponder-header">
                  <div>
                    <span className="sat-orbital-badge">{sat.orbital_slot}</span>
                    <strong className="sat-callsign">{sat.name}</strong>
                  </div>
                  <span className="sat-lock-indicator">
                    <span className="green-ping" /> {sat.status}
                  </span>
                </div>

                <div className="transponder-specs">
                  <div className="spec-item">
                    <span>FREQ:</span> <b>{sat.downlink_freq}</b>
                  </div>
                  <div className="spec-item">
                    <span>POL:</span> <b>{sat.polarization}</b>
                  </div>
                  <div className="spec-item">
                    <span>BAND:</span> <b>{sat.band}</b>
                  </div>
                  <div className="spec-item">
                    <span>TP:</span> <b>{sat.transponder}</b>
                  </div>
                  <div className="spec-item">
                    <span>SNR:</span> <b style={{ color: '#38bdf8' }}>{sat.snr_db} dB</b>
                  </div>
                  <div className="spec-item">
                    <span>RATE:</span> <b>{sat.bitrate_mbps} Mbps</b>
                  </div>
                </div>

                <div className="sat-agencies-tags">
                  <span className="agencies-label">DOWNLINKING:</span>
                  {sat.affiliated_agencies.slice(0, 4).map((ag) => (
                    <span key={ag} className="sat-agency-chip">
                      {ag}
                    </span>
                  ))}
                  {sat.affiliated_agencies.length > 4 && (
                    <span className="sat-agency-chip more">
                      +{sat.affiliated_agencies.length - 4} more
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
