// QualityMetricsCard Component — Technical Telemetry & Gate Assessment
const { useMemo } = React;

function QualityMetricsCard({ qualityData, detectionSummary }) {
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
            Upload or select an inspection photo to run deterministic OpenCV quality gating.
          </div>
        </div>
      </div>
    );
  }

  const is_usable = qualityData.is_usable !== false && qualityData.decision !== 'BAD';
  const metrics = qualityData.metrics || {};
  const healthScore = Math.round(
    metrics.composite_health_score ??
    qualityData.health_score ??
    qualityData.composite_health_score ??
    (is_usable ? 85 : 20)
  );

  const blurScore = metrics.blur_score ?? metrics.laplacian_variance ?? 0;
  const brightness = metrics.brightness_mean ?? metrics.mean_brightness ?? 0;
  const contrast = metrics.contrast_score ?? metrics.contrast_rms ?? 0;
  const resArray = metrics.resolution || [metrics.width || 0, metrics.height || 0];

  const reasons = qualityData.rejection_reasons || qualityData.reasons || [];
  const rawRecs = qualityData.recommendations || [];
  const recommendations = Array.isArray(rawRecs) ? rawRecs : (rawRecs ? [rawRecs] : []);
  const noTowerDetected = qualityData.is_usable !== false && detectionSummary?.total_objects === 0;

  const strokeDashoffset = useMemo(() => {
    const circumference = 2 * Math.PI * 34; // r = 34
    const clampedScore = Math.max(0, Math.min(100, healthScore));
    return circumference - (clampedScore / 100) * circumference;
  }, [healthScore]);

  const blurPct = Math.min(100, Math.max(5, (blurScore / 200) * 100));
  const brightPct = Math.min(100, (brightness / 255) * 100);
  const contrastPct = Math.min(100, Math.max(5, (contrast / 70) * 100));

  const isSharp = blurScore >= 80.0;
  const isVisible = brightness >= 8.0 && brightness <= 248.0;
  const isContrastOk = contrast >= 5.0;

  return (
    <div className="card-panel">
      <div className="card-header">
        <div className="card-title-group">
          <span className="stage-number">STAGE 1</span>
          <span className="card-title">Image Quality Assessment</span>
        </div>
        <span className={`verdict-badge ${is_usable ? 'pass' : 'fail'}`}>
          {is_usable ? 'GATE PASSED' : 'REJECTED (UNANALYZABLE)'}
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
                stroke="rgba(51, 65, 85, 0.2)"
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
              <div className="gauge-val">{healthScore}</div>
              <div className="gauge-max">/ 100</div>
            </div>
          </div>

          <div className="health-meta">
            <div style={{ fontSize: '13px', fontWeight: 700, color: is_usable ? 'var(--status-pass-light)' : 'var(--status-fail-light)' }}>
              {is_usable ? 'Image Analyzable — Deep Learning Active' : 'Image Rejected — Unanalyzable'}
            </div>
            <div className="health-summary-text">
              {is_usable
                ? 'Image visibility and sharpness meet requirements for structural feature extraction and YOLO detection.'
                : 'Image is too blurry, not visible (underexposed/overexposed), or unanalyzable. Deep learning inference aborted.'}
            </div>
          </div>
        </div>

        {noTowerDetected && (
          <div className="advisory-box">
            <div className="advisory-header" style={{ color: 'var(--status-fail-light)' }}>
              No Tower Detected
            </div>
            <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
              The image passed basic quality checks, but the model found no tower. It may be blurry, too distant, or contain no supported tower. Upload a sharper, closer tower photo.
            </p>
          </div>
        )}

        {/* Detailed Metrics Breakdown */}
        <div className="metrics-breakdown">
          <div className="metric-item">
            <div className="metric-header">
              <span className="metric-title">Laplacian Focus Measure (Sharpness)</span>
              <span className="metric-num">
                {blurScore.toFixed(1)}{' '}
                <small style={{ color: 'var(--text-tertiary)' }}>(min 80.0)</small>
              </span>
            </div>
            <div className="meter-track">
              <div
                className={`meter-bar ${isSharp ? 'green' : 'red'}`}
                style={{ width: `${blurPct}%` }}
              ></div>
            </div>
          </div>

          <div className="metric-item">
            <div className="metric-header">
              <span className="metric-title">Mean Luminance (Exposure)</span>
              <span className="metric-num">
                {brightness.toFixed(1)}{' '}
                <small style={{ color: 'var(--text-tertiary)' }}>(8 - 248)</small>
              </span>
            </div>
            <div className="meter-track">
              <div
                className={`meter-bar ${isVisible ? 'green' : 'red'}`}
                style={{ width: `${brightPct}%` }}
              ></div>
            </div>
          </div>

          <div className="metric-item">
            <div className="metric-header">
              <span className="metric-title">RMS Dynamic Contrast</span>
              <span className="metric-num">
                {contrast.toFixed(1)}{' '}
                <small style={{ color: 'var(--text-tertiary)' }}>(min 5.0)</small>
              </span>
            </div>
            <div className="meter-track">
              <div
                className={`meter-bar ${isContrastOk ? 'green' : 'red'}`}
                style={{ width: `${contrastPct}%` }}
              ></div>
            </div>
          </div>

          <div className="metric-item">
            <div className="metric-header">
              <span className="metric-title">Resolution Fidelity</span>
              <span className="metric-num">
                {resArray[0] || '--'} &times; {resArray[1] || '--'} px
              </span>
            </div>
          </div>
        </div>

        {/* Rejection Diagnostics Box */}
        {!is_usable && reasons.length > 0 && (
          <div className="advisory-box">
            <div className="advisory-header" style={{ color: 'var(--status-fail-light)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              <span>Quality Gate Rejection Diagnostic</span>
            </div>
            <ul className="advisory-list">
              {reasons.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
            {recommendations.length > 0 && (
              <div className="advisory-rec" style={{ marginTop: '8px' }}>
                <strong>Field Recapture Guidance:</strong>
                <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
                  {recommendations.map((rec, i) => (
                    <li key={i}>{rec}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Advisory Tips for Accepted Images */}
        {is_usable && recommendations.length > 0 && (
          <div className="advisory-box" style={{ background: 'rgba(30, 58, 95, 0.05)', borderColor: 'rgba(30, 58, 95, 0.15)' }}>
            <div className="advisory-header" style={{ color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M12 16v-4"></path>
                <path d="M12 8h.01"></path>
              </svg>
              <span>Quality Optimization Tips</span>
            </div>
            <ul className="advisory-list" style={{ color: 'var(--text-secondary)' }}>
              {recommendations.map((rec, i) => (
                <li key={i}>{rec}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

window.QualityMetricsCard = QualityMetricsCard;
