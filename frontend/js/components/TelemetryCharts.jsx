// TelemetryCharts Component — Multi-axial Image Quality Radar & Component Inventory Charts
const { useEffect, useRef } = React;

function TelemetryCharts({ qualityData, detectionSummary, activeCategory, onSelectCategory }) {
  const radarChartRef = useRef(null);
  const inventoryChartRef = useRef(null);
  const confidenceChartRef = useRef(null);

  const radarInstance = useRef(null);
  const inventoryInstance = useRef(null);
  const confidenceInstance = useRef(null);

  // 1. Quality Radar Chart
  useEffect(() => {
    if (!radarChartRef.current || !window.Chart) return;

    if (radarInstance.current) {
      radarInstance.current.destroy();
    }

    const metrics = qualityData?.metrics;
    const blurScore = metrics ? Math.min(100, (metrics.laplacian_variance / 200.0) * 100) : 0;
    const brightScore = metrics ? Math.max(0, 100 - Math.abs(metrics.mean_brightness - 128) * (100 / 128)) : 0;
    const contrastScore = metrics ? Math.min(100, (metrics.contrast_rms / 60.0) * 100) : 0;
    const compositeScore = metrics?.composite_health_score || 0;
    const resScore = metrics && metrics.width >= 1000 ? 95 : (metrics && metrics.width >= 400 ? 70 : 30);

    const ctx = radarChartRef.current.getContext('2d');
    radarInstance.current = new Chart(ctx, {
      type: 'radar',
      data: {
        labels: ['Sharpness (Focus)', 'Luminance Balance', 'RMS Contrast', 'Resolution Fidelity', 'Composite Health'],
        datasets: [
          {
            label: 'Image Telemetry',
            data: [blurScore, brightScore, contrastScore, resScore, compositeScore],
            backgroundColor: 'rgba(30, 58, 95, 0.15)',
            borderColor: '#1e3a5f',
            pointBackgroundColor: '#1e3a5f',
            pointBorderColor: '#ffffff',
            pointHoverBackgroundColor: '#ffffff',
            pointHoverBorderColor: '#1e3a5f',
            borderWidth: 2,
            pointRadius: 4
          },
          {
            label: 'Acceptable Baseline',
            data: [50, 50, 42, 60, 60],
            backgroundColor: 'rgba(46, 125, 50, 0.08)',
            borderColor: 'rgba(46, 125, 50, 0.6)',
            borderDash: [4, 4],
            borderWidth: 1.5,
            pointRadius: 0
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          r: {
            angleLines: { color: 'rgba(45, 38, 30, 0.12)' },
            grid: { color: 'rgba(45, 38, 30, 0.08)' },
            pointLabels: {
              color: '#595045',
              font: { family: 'Plus Jakarta Sans', size: 10, weight: 'bold' }
            },
            ticks: { display: false, min: 0, max: 100 }
          }
        },
        plugins: {
          legend: {
            position: 'bottom',
            labels: { color: '#595045', font: { size: 11, family: 'Plus Jakarta Sans', weight: 'bold' }, boxWidth: 12 }
          }
        }
      }
    });

    return () => {
      if (radarInstance.current) radarInstance.current.destroy();
    };
  }, [qualityData]);

  // 2. Component Inventory Doughnut / Bar Chart
  useEffect(() => {
    if (!inventoryChartRef.current || !window.Chart) return;

    if (inventoryInstance.current) {
      inventoryInstance.current.destroy();
    }

    const counts = detectionSummary?.class_counts || {};
    const labels = Object.keys(counts);
    const dataValues = Object.values(counts);

    const colorMap = {
      'Tower Mast': '#7aa8c4',
      'Antenna': '#b09cd4',
      'Mount Bracket': '#6b9b7a',
      'Insulator': '#d4a03c',
      'Rust / Corrosion': '#c75c4a',
      'Surface Defect': '#d4705e'
    };

    const backgroundColors = labels.map(l => colorMap[l] || '#b0a898');

    const ctx = inventoryChartRef.current.getContext('2d');
    inventoryInstance.current = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labels.length ? labels : ['No Assets Detected'],
        datasets: [{
          data: dataValues.length ? dataValues : [1],
          backgroundColor: labels.length ? backgroundColors : ['#2c2923'],
          borderColor: '#1a1814',
          borderWidth: 2,
          hoverOffset: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { color: '#94a3b8', font: { size: 11, family: 'Plus Jakarta Sans' }, boxWidth: 10 }
          },
          tooltip: {
            callbacks: {
              label: (ctx) => ` ${ctx.label}: ${ctx.raw} units`
            }
          }
        },
        cutout: '68%'
      }
    });

    return () => {
      if (inventoryInstance.current) inventoryInstance.current.destroy();
    };
  }, [detectionSummary]);

  // 3. Confidence Spread Histogram / Bar Chart
  useEffect(() => {
    if (!confidenceChartRef.current || !window.Chart) return;

    if (confidenceInstance.current) {
      confidenceInstance.current.destroy();
    }

    const detections = detectionSummary?.detections || [];
    // Buckets: 35-50%, 50-65%, 65-80%, 80-90%, 90-100%
    const buckets = [0, 0, 0, 0, 0];
    detections.forEach(d => {
      const c = d.confidence * 100;
      if (c < 50) buckets[0]++;
      else if (c < 65) buckets[1]++;
      else if (c < 80) buckets[2]++;
      else if (c < 90) buckets[3]++;
      else buckets[4]++;
    });

    const ctx = confidenceChartRef.current.getContext('2d');
    confidenceInstance.current = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['35-49%', '50-64%', '65-79%', '80-89%', '90-100%'],
        datasets: [{
          label: 'Identified Objects',
          data: buckets,
          backgroundColor: ['#64748b', '#0284c7', '#38bdf8', '#10b981', '#34d399'],
          borderRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: '#94a3b8', font: { family: 'Plus Jakarta Sans', size: 10 } }
          },
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(51, 65, 85, 0.4)' },
            ticks: { stepSize: 1, color: '#94a3b8', font: { family: 'JetBrains Mono', size: 10 } }
          }
        },
        plugins: {
          legend: { display: false }
        }
      }
    });

    return () => {
      if (confidenceInstance.current) confidenceInstance.current.destroy();
    };
  }, [detectionSummary]);

  return (
    <div className="charts-grid">
      <div className="chart-card">
        <div className="chart-title">
          <span>Quality Envelope Radar</span>
          <small className="mono" style={{ color: '#64748b' }}>CV Telemetry</small>
        </div>
        <div className="chart-canvas-wrap">
          <canvas ref={radarChartRef}></canvas>
        </div>
      </div>

      <div className="chart-card">
        <div className="chart-title">
          <span>Asset Inventory Breakdown</span>
          <small className="mono" style={{ color: '#64748b' }}>
            {detectionSummary?.total_objects || 0} Assets
          </small>
        </div>
        <div className="chart-canvas-wrap">
          <canvas ref={inventoryChartRef}></canvas>
        </div>
      </div>

      <div className="chart-card">
        <div className="chart-title">
          <span>Detection Confidence Spread</span>
          <small className="mono" style={{ color: '#64748b' }}>YOLO Distribution</small>
        </div>
        <div className="chart-canvas-wrap">
          <canvas ref={confidenceChartRef}></canvas>
        </div>
      </div>
    </div>
  );
}

window.TelemetryCharts = TelemetryCharts;
