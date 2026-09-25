// CanvasViewer Component — Interactive HTML5 Canvas with Zoom, Pan, BBox Rendering & Hover HUD
const { useEffect, useRef, useState, useCallback } = React;
const { IconEye, IconEyeOff, IconZoomIn, IconZoomOut, IconTower } = window;

function CanvasViewer({
  imageUrl,
  detections,
  highlightedId,
  onHoverDetection,
  minConfidence,
  onChangeMinConfidence,
  selectedCategory,
  onSelectCategory,
  isLoading
}) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const imgRef = useRef(null);

  const [showBoxes, setShowBoxes] = useState(true);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });
  const [hoveredBox, setHoveredBox] = useState(null);

  // Filter detections by threshold & category
  const filteredDetections = (detections || []).filter(d => {
    if (d.confidence < minConfidence) return false;
    if (selectedCategory && selectedCategory !== 'ALL' && d.class_name !== selectedCategory) return false;
    return true;
  });

  // Load Image into ref
  useEffect(() => {
    if (!imageUrl) {
      imgRef.current = null;
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imageUrl;
    img.onload = () => {
      imgRef.current = img;
      resetView();
    };
  }, [imageUrl]);

  const resetView = () => {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
  };

  // Re-draw Canvas
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 540;
    if (canvas.width !== width) canvas.width = width;
    if (canvas.height !== height) canvas.height = height;

    ctx.clearRect(0, 0, width, height);

    if (!imgRef.current) return;

    const img = imgRef.current;

    // Calculate maximum aspect-ratio fit to fill the container neatly
    const imgAspect = img.width / img.height;
    const padding = 8;
    const availW = Math.max(100, width - padding * 2);
    const availH = Math.max(100, height - padding * 2);

    let drawW, drawH;
    if (availW / availH > imgAspect) {
      drawH = availH;
      drawW = drawH * imgAspect;
    } else {
      drawW = availW;
      drawH = drawW / imgAspect;
    }

    const drawX = (width - drawW) / 2 + panOffset.x;
    const drawY = (height - drawH) / 2 + panOffset.y;

    // Apply zoom transformation
    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.scale(zoomLevel, zoomLevel);
    ctx.translate(-width / 2, -height / 2);

    // Draw background image smoothly
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, drawX, drawY, drawW, drawH);

    // Render bounding boxes if enabled
    if (showBoxes && filteredDetections.length > 0) {
      const scaleX = drawW / img.width;
      const scaleY = drawH / img.height;

      filteredDetections.forEach(det => {
        const { bbox, color, class_name, confidence, id, severity } = det;
        const x = drawX + bbox.x_min * scaleX;
        const y = drawY + bbox.y_min * scaleY;
        const w = bbox.width * scaleX;
        const h = bbox.height * scaleY;

        const isHovered = (hoveredBox && hoveredBox.id === id) || highlightedId === id;

        // BBox Stroke
        ctx.strokeStyle = isHovered ? '#ffffff' : color;
        ctx.lineWidth = isHovered ? 3 : 2;

        if (isHovered) {
          ctx.shadowColor = color;
          ctx.shadowBlur = 12;
        } else {
          ctx.shadowBlur = 0;
        }

        ctx.strokeRect(x, y, w, h);

        // Fill overlay for highlight
        if (isHovered) {
          ctx.globalAlpha = 0.22;
          ctx.fillStyle = color;
          ctx.fillRect(x, y, w, h);
          ctx.globalAlpha = 1;
        }

        // Pill Tag Header
        const labelText = `${class_name} ${(confidence * 100).toFixed(0)}%`;
        ctx.font = '600 11.5px Plus Jakarta Sans, sans-serif';
        const textMetrics = ctx.measureText(labelText);
        const tagH = 19;
        const tagW = textMetrics.width + 14;

        ctx.fillStyle = isHovered ? '#ffffff' : color;
        ctx.fillRect(x, Math.max(0, y - tagH), tagW, tagH);

        ctx.fillStyle = '#0f172a';
        ctx.textBaseline = 'middle';
        ctx.fillText(labelText, x + 7, Math.max(0, y - tagH) + tagH / 2);

        // Defect highlight
        if (severity === 'CRITICAL' || severity === 'WARNING') {
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 2;
          ctx.strokeRect(x - 2, y - 2, w + 4, h + 4);
        }
      });
    }

    ctx.restore();
  }, [imgRef.current, zoomLevel, panOffset, showBoxes, filteredDetections, hoveredBox, highlightedId]);

  useEffect(() => {
    draw();
  }, [draw]);

  // Handle Resize
  useEffect(() => {
    const handleResize = () => draw();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [draw]);

  // Handle Mouse Hover on Canvas for BBox detection
  const handleMouseMove = (e) => {
    if (isPanning) {
      setPanOffset({
        x: e.clientX - startPan.x,
        y: e.clientY - startPan.y
      });
      return;
    }

    if (!imgRef.current || !canvasRef.current || !showBoxes) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const width = canvas.width;
    const height = canvas.height;
    const img = imgRef.current;
    const imgAspect = img.width / img.height;
    const padding = 8;
    const availW = Math.max(100, width - padding * 2);
    const availH = Math.max(100, height - padding * 2);

    let drawW, drawH;
    if (availW / availH > imgAspect) {
      drawH = availH;
      drawW = drawH * imgAspect;
    } else {
      drawW = availW;
      drawH = drawW / imgAspect;
    }
    const drawX = (width - drawW) / 2 + panOffset.x;
    const drawY = (height - drawH) / 2 + panOffset.y;

    const scaleX = drawW / img.width;
    const scaleY = drawH / img.height;

    // Convert mouse coords taking zoom into account
    const centerX = width / 2;
    const centerY = height / 2;
    const adjustedX = (mouseX - centerX) / zoomLevel + centerX;
    const adjustedY = (mouseY - centerY) / zoomLevel + centerY;

    let found = null;
    for (let i = filteredDetections.length - 1; i >= 0; i--) {
      const det = filteredDetections[i];
      const x = drawX + det.bbox.x_min * scaleX;
      const y = drawY + det.bbox.y_min * scaleY;
      const w = det.bbox.width * scaleX;
      const h = det.bbox.height * scaleY;

      if (adjustedX >= x && adjustedX <= x + w && adjustedY >= y && adjustedY <= y + h) {
        found = det;
        break;
      }
    }

    setHoveredBox(found);
    if (onHoverDetection) {
      onHoverDetection(found ? found.id : null);
    }
  };

  const handleMouseDown = (e) => {
    if (e.button === 0 && e.shiftKey) {
      setIsPanning(true);
      setStartPan({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoomLevel(prev => Math.min(3.5, Math.max(0.6, prev + delta)));
  };

  // Distinct classes for category bar
  const categories = ['ALL', ...new Set((detections || []).map(d => d.class_name))];

  return (
    <div className="card-panel canvas-panel">
      <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="card-title-group">
          <span className="stage-number">STAGE 2</span>
          <span className="card-title">Inspection Viewport</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            className={`filter-tag-pill ${showBoxes ? 'active' : ''}`}
            onClick={() => setShowBoxes(!showBoxes)}
            style={{ fontSize: '11.5px', padding: '5px 12px' }}
          >
            {showBoxes ? <><IconEye size={13} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} /> BBoxes Visible</> : <><IconEyeOff size={13} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} /> BBoxes Hidden</>}
          </button>
          <button
            className="filter-tag-pill"
            onClick={resetView}
            style={{ fontSize: '11.5px', padding: '5px 12px' }}
          >
            Fit View
          </button>
        </div>
      </div>

      <div
        className="canvas-viewport-container"
        ref={containerRef}
        onWheel={handleWheel}
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => {
          setIsPanning(false);
          setHoveredBox(null);
          if (onHoverDetection) onHoverDetection(null);
        }}
      >
        {isLoading ? (
          <div className="viewport-placeholder">
            <div className="spinner"></div>
            <div>
              <p style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Evaluating Image & Running Inferences...</p>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>OpenCV Quality Metrics &rarr; YOLO Structural Model</p>
            </div>
          </div>
        ) : !imageUrl ? (
          <div className="viewport-placeholder">
            <div className="placeholder-icon">
              <IconTower size={44} color="var(--amber-gold)" />
            </div>
            <div>
              <p style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Inspection Viewport Offline</p>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Ingest a tower photo to activate AI bounding box visualizer
              </p>
            </div>
          </div>
        ) : (
          <canvas id="inspection-canvas" ref={canvasRef}></canvas>
        )}

        {/* Hover Inspection Tooltip HUD */}
        {hoveredBox && (
          <div
            className="canvas-hud-tooltip"
            style={{
              left: '16px',
              bottom: '16px',
              borderColor: hoveredBox.color
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontWeight: 700, color: hoveredBox.color }}>{hoveredBox.class_name}</span>
              <span className="badge-tag info">ID #{hoveredBox.id}</span>
            </div>
            <div className="mono" style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
              Confidence: {(hoveredBox.confidence * 100).toFixed(1)}% | Severity: {hoveredBox.severity}
            </div>
            <div className="mono" style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>
              Box: [{hoveredBox.bbox.x_min}, {hoveredBox.bbox.y_min}, {hoveredBox.bbox.width} &times; {hoveredBox.bbox.height} px]
            </div>
          </div>
        )}
      </div>

      {/* Category Filter Tags */}
      {categories.length > 1 && (
        <div className="filter-tags-wrap">
          <span className="filter-tags-label">Filter:</span>
          {categories.map(cat => (
            <button
              key={cat}
              className={`filter-tag-pill ${selectedCategory === cat ? 'active' : ''}`}
              onClick={() => onSelectCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

window.CanvasViewer = CanvasViewer;
