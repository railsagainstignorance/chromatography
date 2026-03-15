// Color and pixel constants shared across rendering modules

export const RGB_BYTE_MAX = 255;
export const RGB_CHANNELS = 3;
export const RGBA_CHANNELS = 4;
export const RGBA_BYTES_PER_PIXEL = RGBA_CHANNELS;
export const CMYK_PERCENTAGE_MAX = 100;
export const FULL_OPACITY = RGB_BYTE_MAX;
export const WHITE_RGBA = Object.freeze([RGB_BYTE_MAX, RGB_BYTE_MAX, RGB_BYTE_MAX, FULL_OPACITY]);

// Gamma correction exponent for rendering: boosts mid-tone dye concentrations
// toward full saturation, producing richer colors instead of pale pastels.
// Values < 1.0 brighten mid-tones (e.g., 0.45 maps 0.1 → 0.35, 0.3 → 0.58).
export const RENDERING_GAMMA = 0.45;
