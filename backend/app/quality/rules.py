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
    Returns: (is_usable, rejection_reasons, recommendations, composite_score)
    """
    reasons = []
    recommendations = []
    
    # 1. Resolution Check
    is_res_ok = width >= settings.MIN_IMAGE_WIDTH and height >= settings.MIN_IMAGE_HEIGHT
    if not is_res_ok:
        reasons.append(f"Low Resolution ({width}x{height}px). Minimum required is {settings.MIN_IMAGE_WIDTH}x{settings.MIN_IMAGE_HEIGHT}px.")
        recommendations.append("Capture the image in high-definition format (at least 1080p).")
        
    # 2. Blur / Sharpness Check
    is_sharp = blur_score >= settings.MIN_LAPLACIAN_BLUR_SCORE
    if not is_sharp:
        reasons.append(f"Image is out of focus or blurry (Blur score: {blur_score:.1f}, Min threshold: {settings.MIN_LAPLACIAN_BLUR_SCORE}).")
        recommendations.append("Ensure camera focus is locked on the tower structure and stabilize the drone/device.")
        
    # 3. Brightness / Exposure Check
    is_well_lit = (brightness >= settings.MIN_BRIGHTNESS) and (brightness <= settings.MAX_BRIGHTNESS)
    if brightness < settings.MIN_BRIGHTNESS:
        reasons.append(f"Image is heavily underexposed/too dark (Luminance: {brightness:.1f}, Min: {settings.MIN_BRIGHTNESS}).")
        recommendations.append("Increase exposure or capture during daylight hours with adequate ambient lighting.")
    elif brightness > settings.MAX_BRIGHTNESS:
        reasons.append(f"Image is overexposed/washed out by glare (Luminance: {brightness:.1f}, Max: {settings.MAX_BRIGHTNESS}).")
        recommendations.append("Avoid direct sun glare or reduce camera exposure bias.")
        
    # 4. Contrast Check
    is_contrast_ok = contrast >= settings.MIN_CONTRAST_RMS
    if not is_contrast_ok:
        reasons.append(f"Low contrast / foggy visual (RMS Contrast: {contrast:.1f}, Min: {settings.MIN_CONTRAST_RMS}).")
        recommendations.append("Avoid capturing through heavy fog, smoke, or dirty camera lenses.")

    is_usable = is_res_ok and is_sharp and is_well_lit and is_contrast_ok
    
    # Composite Quality Health Score (0 - 100) — Dynamic Continuous Calculation
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
        composite_score = round(min(98.8, max(62.0, raw_score)), 1)
    else:
        raw_score = 0.45 * blur_part + 0.35 * bright_part + 0.20 * contrast_part
        composite_score = round(min(58.5, max(12.0, raw_score)), 1)
    
    return is_usable, reasons, recommendations, composite_score

