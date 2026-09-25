import cv2
import numpy as np

def compute_laplacian_variance(image_np: np.ndarray) -> float:
    """
    Computes the variance of the Laplacian filter over the grayscale image.
    Higher values mean sharper edges (in focus). Low values (<100) indicate blur.
    """
    if len(image_np.shape) == 3:
        gray = cv2.cvtColor(image_np, cv2.COLOR_BGR2GRAY)
    else:
        gray = image_np
    
    laplacian = cv2.Laplacian(gray, cv2.CV_64F)
    variance = float(laplacian.var())
    return round(variance, 2)

def compute_brightness_mean(image_np: np.ndarray) -> float:
    """
    Computes average luminance in the Y/L channel (0-255).
    """
    if len(image_np.shape) == 3:
        # Convert to LAB or HSV to get true luminance
        lab = cv2.cvtColor(image_np, cv2.COLOR_BGR2LAB)
        l_channel = lab[:, :, 0]
        mean_brightness = float(np.mean(l_channel))
    else:
        mean_brightness = float(np.mean(image_np))
    return round(mean_brightness, 2)

def compute_contrast_rms(image_np: np.ndarray) -> float:
    """
    Computes Root-Mean-Square (RMS) contrast — standard deviation of gray pixel values.
    """
    if len(image_np.shape) == 3:
        gray = cv2.cvtColor(image_np, cv2.COLOR_BGR2GRAY)
    else:
        gray = image_np
    rms_contrast = float(gray.std())
    return round(rms_contrast, 2)

def compute_exposure_clipping(image_np: np.ndarray) -> tuple[float, float]:
    """
    Calculates percentage of clipped shadow (underexposed) and highlight (overexposed) pixels.
    Returns: (shadow_clip_pct, highlight_clip_pct)
    """
    if len(image_np.shape) == 3:
        gray = cv2.cvtColor(image_np, cv2.COLOR_BGR2GRAY)
    else:
        gray = image_np
    
    total_pixels = gray.size
    shadow_clip = np.sum(gray <= 5) / total_pixels * 100.0
    highlight_clip = np.sum(gray >= 250) / total_pixels * 100.0
    return round(float(shadow_clip), 2), round(float(highlight_clip), 2)
