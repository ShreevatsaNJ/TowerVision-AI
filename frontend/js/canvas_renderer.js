class TowerCanvasRenderer {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.image = null;
        this.detections = [];
        this.showBoxes = true;
        this.hoveredBoxId = null;

        this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
    }

    loadImage(imageUrl) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.onload = () => {
                this.image = img;
                this.canvas.width = img.naturalWidth;
                this.canvas.height = img.naturalHeight;
                this.render();
                resolve();
            };
            img.onerror = reject;
            img.src = imageUrl;
        });
    }

    setDetections(detections) {
        this.detections = detections || [];
        this.render();
    }

    toggleBoxes() {
        this.showBoxes = !this.showBoxes;
        this.render();
        return this.showBoxes;
    }

    render() {
        if (!this.image) return;

        // 1. Draw Base Image
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.drawImage(this.image, 0, 0);

        if (!this.showBoxes || !this.detections.length) return;

        // 2. Draw Bounding Boxes
        this.detections.forEach((det) => {
            const b = det.bbox;
            const isHovered = this.hoveredBoxId === det.id;
            const color = det.color || '#00d2ff';

            this.ctx.save();

            // Box outline
            this.ctx.lineWidth = isHovered ? 4 : 2.5;
            this.ctx.strokeStyle = color;
            if (isHovered) {
                this.ctx.shadowColor = color;
                this.ctx.shadowBlur = 12;
            }
            this.ctx.strokeRect(b.x_min, b.y_min, b.width, b.height);

            // Semi-transparent fill for hovered box
            if (isHovered) {
                this.ctx.fillStyle = color + '33';
                this.ctx.fillRect(b.x_min, b.y_min, b.width, b.height);
            }

            // Label Badge
            const label = `${det.class_name} (${Math.round(det.confidence * 100)}%)`;
            this.ctx.font = 'bold 13px "JetBrains Mono", sans-serif';
            const textWidth = this.ctx.measureText(label).width;

            const badgeHeight = 22;
            const badgeWidth = textWidth + 14;
            const badgeY = Math.max(0, b.y_min - badgeHeight);

            this.ctx.fillStyle = color;
            this.ctx.fillRect(b.x_min, badgeY, badgeWidth, badgeHeight);

            this.ctx.fillStyle = '#0a0e17';
            this.ctx.fillText(label, b.x_min + 7, badgeY + 15);

            this.ctx.restore();
        });
    }

    handleMouseMove(e) {
        if (!this.detections.length || !this.showBoxes) return;

        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;

        const mouseX = (e.clientX - rect.left) * scaleX;
        const mouseY = (e.clientY - rect.top) * scaleY;

        let foundId = null;
        for (let i = this.detections.length - 1; i >= 0; i--) {
            const b = this.detections[i].bbox;
            if (
                mouseX >= b.x_min &&
                mouseX <= b.x_max &&
                mouseY >= b.y_min &&
                mouseY <= b.y_max
            ) {
                foundId = this.detections[i].id;
                break;
            }
        }

        if (this.hoveredBoxId !== foundId) {
            this.hoveredBoxId = foundId;
            this.render();
        }
    }
}
