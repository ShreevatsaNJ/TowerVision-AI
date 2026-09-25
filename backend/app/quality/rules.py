import math
from typing import List, Tuple
from app.config import settings

def evaluate_quality_rules(
    blur_score: float,
    brightness: float,
    contrast: float,
    width: int,
    height: int,
    shadow_clip: float,
    highlight_clip: float
) -> Tuple[bool, List[str], List[str], float]:
    """
    Evaluates raw OpenCV quality metrics against configurable thresholds.
    
    Philosophy: Only REJECT if the image is truly unanalyzable (extreme blur,
    pitch black, completely washed out). Normal photos — even slightly dark,
    slightly blurry, or low-contrast — should PASS with quality warnings.
    
    Returns: (is_usable, rejection_reasons, recommendations, composite_score)
    """
    reasons = []
    recommendations = []
    
    # ── HARD REJECT CRITERIA (truly unanalyzable) ──
    
    # 1. Resolution too small to extract any features (cannot access or analyze)
    is_res_ok = width >= settings.MIN_IMAGE_WIDTH and height >= settings.MIN_IMAGE_HEIGHT
    if not is_res_ok:
        reasons.append(f"Image cannot be analyzed: Resolution too small ({width}x{height}px). Minimum {settings.MIN_IMAGE_WIDTH}x{settings.MIN_IMAGE_HEIGHT}px required.")
        recommendations.append("Use a higher resolution camera or image source.")
    
    # 2. Extreme blur — image is too blurry to analyze
    is_sharp_enough = blur_score >= settings.MIN_LAPLACIAN_BLUR_SCORE
    if not is_sharp_enough:
        reasons.append(f"Image rejected: Image is too blurry to analyze (Blur score: {blur_score:.1f} < {settings.MIN_LAPLACIAN_BLUR_SCORE}). Structural components cannot be recognized.")
        recommendations.append("Stabilize the camera, lock focus on the tower mast, and retake the photo.")
    
    # 3. Near-pitch-black or completely washed out white — image is not visible
    is_visible = brightness >= settings.MIN_BRIGHTNESS and brightness <= settings.MAX_BRIGHTNESS
    if brightness < settings.MIN_BRIGHTNESS:
        reasons.append(f"Image rejected: Image is not visible / too dark (Luminance: {brightness:.1f} < {settings.MIN_BRIGHTNESS}). Infrastructure cannot be seen.")
        recommendations.append("Ensure adequate daytime lighting or drone spotlight illumination.")
    elif brightness > settings.MAX_BRIGHTNESS:
        reasons.append(f"Image rejected: Image is not visible / completely washed out white (Luminance: {brightness:.1f} > {settings.MAX_BRIGHTNESS}).")
        recommendations.append("Reduce camera exposure and prevent direct sun glare into the lens.")
    
    # 4. Flat uniform color — no edges or structure
    is_contrast_ok = contrast >= settings.MIN_CONTRAST_RMS
    if not is_contrast_ok:
        reasons.append(f"Image rejected: Image has no visible contrast / flat uniform color (Contrast RMS: {contrast:.1f} < {settings.MIN_CONTRAST_RMS}).")
        recommendations.append("Ensure the camera is framed directly on structural assets rather than empty sky.")

    # Only reject if the image is truly unanalyzable
    is_usable = is_res_ok and is_sharp_enough and is_visible and is_contrast_ok
    
    # ── SOFT QUALITY WARNINGS (do NOT reject, just inform) ──
    if is_usable:
        if blur_score < 80:
            recommendations.append(f"Tip: Image sharpness is moderate ({blur_score:.0f}). A sharper capture may improve detection accuracy.")
        if brightness < 50 or brightness > 200:
            recommendations.append(f"Tip: Exposure is suboptimal (Luminance: {brightness:.0f}). Better lighting improves results.")
        if contrast < 30:
            recommendations.append(f"Tip: Low scene contrast ({contrast:.0f}). Clearer conditions help detection.")

    # ── COMPOSITE QUALITY HEALTH SCORE (0 - 100) ──
    if blur_score <= 0:
        blur_part = 0.0
    else:
        blur_part = min(100.0, max(5.0, (math.log10(max(1.0, blur_score)) / 3.0) * 100.0))

    luminance_dev = abs(brightness - 128.0)
    bright_part = max(0.0, 100.0 - (luminance_dev / 128.0) * 85.0 - (shadow_clip + highlight_clip) * 1.5)
    contrast_part = min(100.0, (contrast / 75.0) * 100.0)
    res_part = min(100.0, ((width * height) / (1920 * 1080)) * 100.0)
    
    if is_usable:
        raw_score = 0.40 * blur_part + 0.30 * bright_part + 0.20 * contrast_part + 0.10 * res_part
        composite_score = round(min(98.8, max(55.0, raw_score)), 1)
    else:
        raw_score = 0.45 * blur_part + 0.35 * bright_part + 0.20 * contrast_part
        composite_score = round(min(45.0, max(5.0, raw_score)), 1)
    
    return is_usable, reasons, recommendations, composite_score

