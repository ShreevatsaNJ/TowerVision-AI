// InventoryTable Component — Detailed Structural Asset Inventory & CSV Export
const { useState } = React;

function InventoryTable({
  detections,
  highlightedId,
  onHoverRow,
  minConfidence,
  selectedCategory
}) {
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = (detections || []).filter(d => {
    if (d.confidence < minConfidence) return false;
    if (selectedCategory && selectedCategory !== 'ALL' && d.class_name !== selectedCategory) return false;
    if (searchTerm && !d.class_name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const exportCSV = () => {
    if (!detections || detections.length === 0) return;

    const headers = ['ID', 'Class Name', 'Confidence (%)', 'Severity', 'X_Min', 'Y_Min', 'Width', 'Height'];
    const rows = detections.map(d => [
      d.id,
      `"${d.class_name}"`,
      (d.confidence * 100).toFixed(1),
      d.severity,
      d.bbox.x_min,
      d.bbox.y_min,
      d.bbox.width,
      d.bbox.height
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `towervision_audit_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="table-panel">
      <div className="card-header">
        <div className="card-title-group">
          <span className="card-title">Structural Component & Defect Inventory</span>
          <span className="mono" style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
            ({filtered.length} visible of {detections?.length || 0})
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <input
            type="text"
            placeholder="Search asset..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-default)',
              color: 'var(--text-primary)',
              padding: '4px 10px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '12px'
            }}
          />
          <button
            className="btn-secondary"
            onClick={exportCSV}
            disabled={!detections || detections.length === 0}
            style={{ padding: '4px 10px', fontSize: '12px' }}
          >
            Export CSV
          </button>
        </div>
      </div>

      <div className="table-responsive">
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Asset Category</th>
              <th>Confidence</th>
              <th>Condition / Severity</th>
              <th>Bounding Coordinates (px)</th>
              <th>Dimensions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-tertiary)' }}>
                  No structural assets matching current filter thresholds.
                </td>
              </tr>
            ) : (
              filtered.map(det => {
                const isHighlighted = highlightedId === det.id;
                const isCrit = det.severity === 'CRITICAL' || det.severity === 'WARNING';
                return (
                  <tr
                    key={det.id}
                    className={isHighlighted ? 'highlighted' : ''}
                    onMouseEnter={() => onHoverRow(det.id)}
                    onMouseLeave={() => onHoverRow(null)}
                  >
                    <td className="mono" style={{ fontWeight: 600 }}>#{det.id}</td>
                    <td>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <span className="tag-dot" style={{ backgroundColor: det.color }}></span>
                        <strong style={{ color: 'var(--text-primary)' }}>{det.class_name}</strong>
                      </span>
                    </td>
                    <td className="mono">
                      {(det.confidence * 100).toFixed(1)}%
                    </td>
                    <td>
                      <span className={`badge-tag ${isCrit ? 'critical' : 'info'}`}>
                        {det.severity}
                      </span>
                    </td>
                    <td className="mono" style={{ fontSize: '11.5px', color: 'var(--text-tertiary)' }}>
                      [{det.bbox.x_min}, {det.bbox.y_min}] &rarr; [{det.bbox.x_max}, {det.bbox.y_max}]
                    </td>
                    <td className="mono" style={{ fontSize: '11.5px' }}>
                      {det.bbox.width} &times; {det.bbox.height}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

window.InventoryTable = InventoryTable;
