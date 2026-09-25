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
    Evaluates raw metrics against configurable thresholds.
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
        
    # Composite Quality Health Score (0 - 100)
    # Weighted calculation
    blur_norm = min(100.0, (blur_score / (settings.MIN_LAPLACIAN_BLUR_SCORE * 2.0)) * 100.0)
    bright_norm = max(0.0, 100.0 - (abs(brightness - 128.0) / 128.0) * 100.0)
    contrast_norm = min(100.0, (contrast / 60.0) * 100.0)
    
    composite_score = round(0.45 * blur_norm + 0.30 * bright_norm + 0.25 * contrast_norm, 1)
    
    is_usable = is_res_ok and is_sharp and is_well_lit and is_contrast_ok
    
    return is_usable, reasons, recommendations, composite_score
