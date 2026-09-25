// TelemetryCharts Component — Multi-axial Image Quality Radar & Component Inventory Charts
const { useEffect, useRef } = React;

function TelemetryCharts({ qualityData, detectionSummary }) {
  const radarChartRef = useRef(null);
  const inventoryChartRef = useRef(null);
  const confidenceChartRef = useRef(null);

  const radarInstance = useRef(null);
  const inventoryInstance = useRef(null);
  const confidenceInstance = useRef(null);

  useEffect(() => {
    if (!radarChartRef.current || !window.Chart) return;
    if (radarInstance.current) radarInstance.current.destroy();

    const metrics = qualityData?.metrics;
    const resolution = metrics?.resolution || [0, 0];
    const blurScore = metrics ? Math.min(100, (metrics.blur_score / 250) * 100) : 0;
    const brightness = metrics?.brightness_mean ?? 0;
    const brightScore = metrics ? Math.max(0, 100 - Math.abs(brightness - 128) * (100 / 128)) : 0;
    const contrastScore = metrics ? Math.min(100, (metrics.contrast_score / 75) * 100) : 0;
    const resolutionScore = Math.min(100, (resolution[0] * resolution[1] / (1920 * 1080)) * 100);
    const compositeScore = metrics?.composite_health_score ?? 0;

    radarInstance.current = new Chart(radarChartRef.current.getContext('2d'), {
      type: 'radar',
      data: {
        labels: ['Sharpness', 'Exposure', 'Contrast', 'Resolution', 'Overall Quality'],
        datasets: [
          {
            label: 'Photo quality',
            data: [blurScore, brightScore, contrastScore, resolutionScore, compositeScore],
            backgroundColor: 'rgba(22, 138, 138, 0.18)',
            borderColor: '#168a8a',
            pointBackgroundColor: '#168a8a',
            borderWidth: 2,
            pointRadius: 4
          },
          {
            label: 'Reference level',
            data: [50, 50, 40, 60, 60],
            backgroundColor: 'rgba(200, 100, 70, 0.08)',
            borderColor: 'rgba(200, 100, 70, 0.6)',
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
            pointLabels: { color: '#595045', font: { family: 'Plus Jakarta Sans', size: 11, weight: 'bold' } },
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

    return () => radarInstance.current?.destroy();
  }, [qualityData]);

  // Tower detections by model class
  useEffect(() => {
    if (!inventoryChartRef.current || !window.Chart) return;

    if (inventoryInstance.current) {
      inventoryInstance.current.destroy();
    }

    const counts = detectionSummary?.class_counts || {};
    const labels = Object.keys(counts);
    const dataValues = Object.values(counts);

    const colorMap = {
      'monopole_tower': '#168a8a',
      'supporting_tower': '#c86446',
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
      type: 'bar',
      data: {
        labels: labels.length ? labels : ['No detections'],
        datasets: [{
          data: dataValues.length ? dataValues : [0],
          backgroundColor: labels.length ? backgroundColors : ['#2c2923'],
          borderColor: '#ffffff',
          borderWidth: 1,
          borderRadius: 4,
          maxBarThickness: 44
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y',
        scales: {
          x: {
            beginAtZero: true,
            ticks: { precision: 0, stepSize: 1, color: '#595045', font: { family: 'JetBrains Mono', size: 10 } },
            grid: { color: 'rgba(45, 38, 30, 0.08)' }
          },
          y: {
            grid: { display: false },
            ticks: { color: '#595045', font: { family: 'Plus Jakarta Sans', size: 10, weight: 'bold' } }
          }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => ` ${ctx.label}: ${ctx.raw} units`
            }
          }
        }
      }
    });

    return () => {
      if (inventoryInstance.current) inventoryInstance.current.destroy();
    };
  }, [detectionSummary]);

  useEffect(() => {
    if (!confidenceChartRef.current || !window.Chart) return;
    if (confidenceInstance.current) confidenceInstance.current.destroy();

    const buckets = [0, 0, 0, 0, 0];
    (detectionSummary?.detections || []).forEach(detection => {
      const confidence = detection.confidence * 100;
      if (confidence < 50) buckets[0]++;
      else if (confidence < 65) buckets[1]++;
      else if (confidence < 80) buckets[2]++;
      else if (confidence < 90) buckets[3]++;
      else buckets[4]++;
    });

    confidenceInstance.current = new Chart(confidenceChartRef.current.getContext('2d'), {
      type: 'bar',
      data: {
        labels: ['35-49%', '50-64%', '65-79%', '80-89%', '90-100%'],
        datasets: [{
          label: 'Detections',
          data: buckets,
          backgroundColor: ['#738b9b', '#168a8a', '#70aead', '#d4a03c', '#c86446'],
          borderRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: '#595045', font: { family: 'Plus Jakarta Sans', size: 10 } }
          },
          y: {
            beginAtZero: true,
            ticks: { stepSize: 1, color: '#595045', font: { family: 'JetBrains Mono', size: 10 } },
            grid: { color: 'rgba(45, 38, 30, 0.08)' }
          }
        },
        plugins: { legend: { display: false } }
      }
    });

    return () => confidenceInstance.current?.destroy();
  }, [detectionSummary]);

  return (
    <div className="charts-grid">
      <div className="chart-card chart-card-primary">
        <div className="chart-title">
          <span>Tower Detections by Class</span>
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
          <span>Image Quality Profile</span>
          <small className="mono">Quality metrics</small>
        </div>
        <div className="chart-canvas-wrap">
          <canvas ref={radarChartRef}></canvas>
        </div>
      </div>
      <div className="chart-card">
        <div className="chart-title">
          <span>Detection Confidence</span>
          <small className="mono">Model results</small>
        </div>
        <div className="chart-canvas-wrap">
          <canvas ref={confidenceChartRef}></canvas>
        </div>
      </div>
    </div>
  );
}

window.TelemetryCharts = TelemetryCharts;
