document.addEventListener('DOMContentLoaded', () => {
    const renderer = new TowerCanvasRenderer('inspection-canvas');

    // UI Elements
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const loadingSpinner = document.getElementById('loading-spinner');
    const emptyState = document.getElementById('empty-state');
    const qualityCard = document.getElementById('quality-card');
    const detectionStats = document.getElementById('detection-stats');
    const btnToggleBoxes = document.getElementById('btn-toggle-boxes');
    const btnDownloadPdf = document.getElementById('btn-download-pdf');

    // Health UI Elements
    const healthRing = document.getElementById('health-ring');
    const healthScoreVal = document.getElementById('health-score-val');
    const healthVerdict = document.getElementById('health-verdict');
    const healthDesc = document.getElementById('health-desc');
    const qualityDecisionBadge = document.getElementById('quality-decision-badge');
    const barBlur = document.getElementById('bar-blur');
    const barBright = document.getElementById('bar-bright');
    const barContrast = document.getElementById('bar-contrast');
    const metricBlurVal = document.getElementById('metric-blur-val');
    const metricBrightVal = document.getElementById('metric-bright-val');
    const metricContrastVal = document.getElementById('metric-contrast-val');
    const rejectionBox = document.getElementById('rejection-box');
    const rejectionList = document.getElementById('rejection-list');
    const rejectionRec = document.getElementById('rejection-rec');

    // Stats Elements
    const statTotalObjs = document.getElementById('stat-total-objs');
    const statDefectStatus = document.getElementById('stat-defect-status');
    const statResolution = document.getElementById('stat-resolution');
    const classTagContainer = document.getElementById('class-tag-container');
    const tableBody = document.getElementById('detection-table-body');
    const inferenceTime = document.getElementById('inference-time');

    // Setup Dropzone Events
    dropZone.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFileUpload(e.target.files[0]);
        }
    });

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });

    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        if (e.dataTransfer.files.length > 0) {
            handleFileUpload(e.dataTransfer.files[0]);
        }
    });

    // Toggle Box Button
    btnToggleBoxes.addEventListener('click', () => {
        const isShown = renderer.toggleBoxes();
        btnToggleBoxes.textContent = isShown ? '👁️ Hide BBoxes' : '👁️ Show BBoxes';
    });

    // Preset Sample Handlers
    document.getElementById('btn-sample-good').addEventListener('click', () => {
        createSyntheticSample('good');
    });
    document.getElementById('btn-sample-blur').addEventListener('click', () => {
        createSyntheticSample('blur');
    });
    document.getElementById('btn-sample-dark').addEventListener('click', () => {
        createSyntheticSample('dark');
    });

    async function handleFileUpload(file) {
        showLoading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch('/api/v1/inspect', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Inspection failed');
            }

            const data = await response.json();
            await displayResults(data, file);
        } catch (error) {
            alert(`Error: ${error.message}`);
        } finally {
            showLoading(false);
        }
    }

    async function displayResults(data, file) {
        emptyState.classList.add('hidden');
        qualityCard.classList.remove('hidden');

        const q = data.quality_assessment;
        const m = q.metrics;

        // 1. Update Health Dial
        const score = Math.round(m.composite_health_score);
        healthScoreVal.textContent = score;
        const circumference = 2 * Math.PI * 40;
        const offset = circumference - (score / 100) * circumference;
        healthRing.style.strokeDashoffset = offset;

        if (q.is_usable) {
            healthRing.style.stroke = '#10b981';
            qualityDecisionBadge.className = 'badge badge-success';
            qualityDecisionBadge.textContent = 'PASSED (GOOD)';
            healthVerdict.textContent = 'High Quality Inspection Image';
            healthDesc.textContent = 'Image meets sharpness, exposure, and contrast standards.';
            rejectionBox.classList.add('hidden');
        } else {
            healthRing.style.stroke = '#ef4444';
            qualityDecisionBadge.className = 'badge badge-danger';
            qualityDecisionBadge.textContent = 'REJECTED (BAD)';
            healthVerdict.textContent = 'Quality Standards Not Met';
            healthDesc.textContent = 'Image failed quality gate. AI detection was aborted.';

            // Populate Rejection reasons
            rejectionList.innerHTML = q.rejection_reasons.map(r => `<li>${r}</li>`).join('');
            rejectionRec.textContent = q.recommendations.join(' ') || 'Please recapture under better conditions.';
            rejectionBox.classList.remove('hidden');
        }

        // 2. Metric Bars
        metricBlurVal.textContent = `${m.blur_score} (min: 100)`;
        barBlur.style.width = `${Math.min(100, (m.blur_score / 200) * 100)}%`;
        barBlur.style.background = m.is_sharp ? 'linear-gradient(90deg, #00d2ff, #38b000)' : '#ef4444';

        metricBrightVal.textContent = `${m.brightness_mean} / 255`;
        barBright.style.width = `${Math.min(100, (m.brightness_mean / 255) * 100)}%`;
        barBright.style.background = m.is_well_lit ? 'linear-gradient(90deg, #00d2ff, #38b000)' : '#ef4444';

        metricContrastVal.textContent = `${m.contrast_score} (min: 25)`;
        barContrast.style.width = `${Math.min(100, (m.contrast_score / 60) * 100)}%`;
        barContrast.style.background = m.is_good_contrast ? 'linear-gradient(90deg, #00d2ff, #38b000)' : '#ef4444';

        // 3. Load & Render Image on Canvas
        const imageUrl = URL.createObjectURL(file);
        await renderer.loadImage(imageUrl);

        // 4. Stage 2 Detections (if Accepted)
        if (q.is_usable && data.detection_summary) {
            detectionStats.classList.remove('hidden');
            btnToggleBoxes.disabled = false;
            btnToggleBoxes.textContent = '👁️ Hide BBoxes';

            const d = data.detection_summary;
            inferenceTime.textContent = `Inference: ${d.inference_time_ms}ms`;
            statTotalObjs.textContent = d.total_objects;
            statDefectStatus.textContent = d.has_defects ? '⚠️ DEFECTS DETECTED' : '✅ Optimal';
            statDefectStatus.style.color = d.has_defects ? '#ef4444' : '#10b981';
            statResolution.textContent = `${m.resolution[0]} x ${m.resolution[1]}px`;

            // Tags
            classTagContainer.innerHTML = Object.entries(d.class_counts)
                .map(([cls, count]) => `<span class="class-tag">${cls}: <strong>${count}</strong></span>`)
                .join('');

            // Table
            tableBody.innerHTML = d.detections.map(det => `
                <tr>
                    <td>#${det.id}</td>
                    <td><span style="color: ${det.color}; font-weight: bold;">●</span> ${det.class_name}</td>
                    <td>${Math.round(det.confidence * 100)}%</td>
                    <td><span class="badge ${det.severity === 'CRITICAL' ? 'badge-danger' : 'badge-glass'}">${det.severity}</span></td>
                    <td>(${det.bbox.x_min}, ${det.bbox.y_min}) - [${det.bbox.width}x${det.bbox.height}]</td>
                </tr>
            `).join('');

            renderer.setDetections(d.detections);
        } else {
            detectionStats.classList.add('hidden');
            btnToggleBoxes.disabled = true;
            renderer.setDetections([]);
        }

        // 5. PDF Download Link
        if (data.report_download_url) {
            btnDownloadPdf.classList.remove('hidden');
            btnDownloadPdf.href = data.report_download_url;
        }
    }

    function showLoading(isLoading) {
        if (isLoading) {
            loadingSpinner.classList.remove('hidden');
        } else {
            loadingSpinner.classList.add('hidden');
        }
    }

    // Creates synthetic demo canvas blob images for instantaneous testing
    function createSyntheticSample(type) {
        const offscreen = document.createElement('canvas');
        offscreen.width = 800;
        offscreen.height = 600;
        const ctx = offscreen.getContext('2d');

        if (type === 'good') {
            // High contrast, sharp tower structure with sky gradient
            const grad = ctx.createLinearGradient(0, 0, 0, 600);
            grad.addColorStop(0, '#1e3c72');
            grad.addColorStop(1, '#2a5298');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, 800, 600);

            // Draw crisp tower lattice
            ctx.strokeStyle = '#e2e8f0';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(300, 580); ctx.lineTo(380, 80); ctx.lineTo(420, 80); ctx.lineTo(500, 580);
            ctx.stroke();

            // Cross bars
            for (let y = 140; y < 580; y += 60) {
                ctx.beginPath();
                ctx.moveTo(340, y); ctx.lineTo(460, y + 30);
                ctx.moveTo(460, y); ctx.lineTo(340, y + 30);
                ctx.stroke();
            }
            // Antenna mounts
            ctx.fillStyle = '#ff0055';
            ctx.fillRect(360, 180, 20, 40);
        } else if (type === 'blur') {
            // Smooth solid wash with blurred edges
            ctx.fillStyle = '#64748b';
            ctx.fillRect(0, 0, 800, 600);
            ctx.filter = 'blur(15px)';
            ctx.fillStyle = '#94a3b8';
            ctx.beginPath();
            ctx.arc(400, 300, 150, 0, Math.PI * 2);
            ctx.fill();
        } else if (type === 'dark') {
            // Deep underexposed black image
            ctx.fillStyle = '#05070a';
            ctx.fillRect(0, 0, 800, 600);
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(380, 100, 40, 400);
        }

        offscreen.toBlob((blob) => {
            const file = new File([blob], `sample_${type}.jpg`, { type: 'image/jpeg' });
            handleFileUpload(file);
        }, 'image/jpeg', 0.95);
    }
});
