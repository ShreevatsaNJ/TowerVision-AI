// QualityMetricsCard Component — Technical Telemetry & Gate Assessment
const { useMemo } = React;

function QualityMetricsCard({ qualityData }) {
  if (!qualityData) {
    return (
      <div className="card-panel">
        <div className="card-header">
          <div className="card-title-group">
            <span className="stage-number">STAGE 1</span>
            <span className="card-title">Image Quality Assessment</span>
          </div>
          <span className="verdict-badge eval">Awaiting Ingestion</span>
        </div>
        <div className="card-body">
          <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-tertiary)' }}>
            Upload or select an inspection photo to run deterministic OpenCV quality gates.
          </div>
        </div>
      </div>
    );
  }

  const { is_usable, health_score, reasons, recommendations, metrics } = qualityData;

  const strokeDashoffset = useMemo(() => {
    const circumference = 2 * Math.PI * 34; // r = 34
    const clampedScore = Math.max(0, Math.min(100, health_score || 0));
    return circumference - (clampedScore / 100) * circumference;
  }, [health_score]);

  const blurPct = Math.min(100, ((metrics?.laplacian_variance || 0) / 250) * 100);
  const brightPct = Math.min(100, ((metrics?.mean_brightness || 0) / 255) * 100);
  const contrastPct = Math.min(100, ((metrics?.contrast_rms || 0) / 70) * 100);

  return (
    <div className="card-panel">
      <div className="card-header">
        <div className="card-title-group">
          <span className="stage-number">STAGE 1</span>
          <span className="card-title">Image Quality Assessment</span>
        </div>
        <span className={`verdict-badge ${is_usable ? 'pass' : 'fail'}`}>
          {is_usable ? 'GATE PASSED' : 'REJECTED (BAD QUALITY)'}
        </span>
      </div>

      <div className="card-body">
        {/* Circular Health Score */}
        <div className="health-score-box">
          <div className="health-gauge-wrap">
            <svg width="80" height="80" viewBox="0 0 80 80">
              <circle
                cx="40"
                cy="40"
                r="34"
                stroke="rgba(51, 65, 85, 0.5)"
                strokeWidth="7"
                fill="none"
              />
              <circle
                cx="40"
                cy="40"
                r="34"
                stroke={is_usable ? '#10b981' : '#ef4444'}
                strokeWidth="7"
                strokeDasharray={2 * Math.PI * 34}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="none"
                style={{
                  transition: 'stroke-dashoffset 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
                  transform: 'rotate(-90deg)',
                  transformOrigin: '50% 50%'
                }}
              />
            </svg>
            <div className="health-gauge-center">
              <div className="gauge-val">{Math.round(health_score || 0)}</div>
              <div className="gauge-max">/ 100</div>
            </div>
          </div>

          <div className="health-meta">
            <div style={{ fontSize: '13px', fontWeight: 600, color: is_usable ? 'var(--status-pass-light)' : 'var(--status-fail-light)' }}>
              {is_usable ? 'Suitable for Deep Learning' : 'Gating Exited: Defective Input'}
            </div>
            <div className="health-summary-text">
              {is_usable
                ? 'Image satisfies sharpness, luminance, and contrast thresholds for YOLO asset recognition.'
                : 'Input degraded by focus blur or lighting issues. Inference aborted to save compute and avoid hallucinations.'}
            </div>
          </div>
        </div>

        {/* Detailed Metrics Breakdown */}
        <div className="metrics-breakdown">
          <div className="metric-item">
            <div className="metric-header">
              <span className="metric-title">Laplacian Focus Measure (Sharpness)</span>
              <span className="metric-num">
                {metrics?.laplacian_variance?.toFixed(1) || '--'}{' '}
                <small style={{ color: 'var(--text-tertiary)' }}>(min 100)</small>
              </span>
            </div>
            <div className="meter-track">
              <div
                className={`meter-bar ${(metrics?.laplacian_variance || 0) >= 100 ? 'green' : 'red'}`}
                style={{ width: `${blurPct}%` }}
              ></div>
            </div>
          </div>

          <div className="metric-item">
            <div className="metric-header">
              <span className="metric-title">Mean Luminance (Exposure)</span>
              <span className="metric-num">
                {metrics?.mean_brightness?.toFixed(1) || '--'}{' '}
                <small style={{ color: 'var(--text-tertiary)' }}>(40 - 220)</small>
              </span>
            </div>
            <div className="meter-track">
              <div
                className={`meter-bar ${(metrics?.mean_brightness || 0) >= 40 && (metrics?.mean_brightness || 0) <= 220 ? 'green' : 'red'}`}
                style={{ width: `${brightPct}%` }}
              ></div>
            </div>
          </div>

          <div className="metric-item">
            <div className="metric-header">
              <span className="metric-title">RMS Dynamic Contrast</span>
              <span className="metric-num">
                {metrics?.contrast_rms?.toFixed(1) || '--'}{' '}
                <small style={{ color: 'var(--text-tertiary)' }}>(min 25)</small>
              </span>
            </div>
            <div className="meter-track">
              <div
                className={`meter-bar ${(metrics?.contrast_rms || 0) >= 25 ? 'green' : 'yellow'}`}
                style={{ width: `${contrastPct}%` }}
              ></div>
            </div>
          </div>

          <div className="metric-item">
            <div className="metric-header">
              <span className="metric-title">Resolution Fidelity</span>
              <span className="metric-num">
                {metrics?.width || '--'} &times; {metrics?.height || '--'} px
              </span>
            </div>
          </div>
        </div>

        {/* Rejection Diagnostics Box */}
        {!is_usable && reasons && reasons.length > 0 && (
          <div className="advisory-box">
            <div className="advisory-header">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              <span>Field Diagnostics & Recapture Action</span>
            </div>
            <ul className="advisory-list">
              {reasons.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
            {recommendations && (
              <div className="advisory-rec">
                <strong>Field Operator Action:</strong> {recommendations}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

window.QualityMetricsCard = QualityMetricsCard;
