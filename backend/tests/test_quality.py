import numpy as np
import cv2
import pytest
from app.quality.metrics import (
    compute_laplacian_variance,
    compute_brightness_mean,
    compute_contrast_rms
)
from app.quality.rules import evaluate_quality_rules

def test_sharp_vs_blurry_image():
    # Create sharp image with high frequency edges
    sharp_img = np.zeros((400, 400, 3), dtype=np.uint8)
    for i in range(0, 400, 20):
        sharp_img[i:i+10, :] = 255
        
    # Create blurred image
    blurry_img = cv2.GaussianBlur(sharp_img, (35, 35), 0)
    
    sharp_score = compute_laplacian_variance(sharp_img)
    blur_score = compute_laplacian_variance(blurry_img)
    
    assert sharp_score > blur_score
    assert sharp_score > 100.0

def test_underexposed_image():
    # Dark image (mean luminance < 20)
    dark_img = np.full((400, 400, 3), 15, dtype=np.uint8)
    brightness = compute_brightness_mean(dark_img)
    
    assert brightness < 40.0
    
    is_usable, reasons, recs, score = evaluate_quality_rules(
        blur_score=150.0,
        brightness=brightness,
        contrast=30.0,
        width=400,
        height=400,
        shadow_clip=10.0,
        highlight_clip=0.0
    )
    
    assert is_usable is False
    assert any("underexposed" in r.lower() for r in reasons)

def test_good_quality_image():
    is_usable, reasons, recs, score = evaluate_quality_rules(
        blur_score=250.0,
        brightness=120.0,
        contrast=55.0,
        width=1920,
        height=1080,
        shadow_clip=0.5,
        highlight_clip=0.2
    )
    
    assert is_usable is True
    assert len(reasons) == 0
    assert score > 70.0
