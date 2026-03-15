// Color and pixel constants shared across rendering modules

export const RGB_BYTE_MAX = 255;
export const RGB_CHANNELS = 3;
export const RGBA_CHANNELS = 4;
export const RGBA_BYTES_PER_PIXEL = RGBA_CHANNELS;
export const CMYK_PERCENTAGE_MAX = 100;
export const FULL_OPACITY = RGB_BYTE_MAX;
export const WHITE_RGBA = Object.freeze([RGB_BYTE_MAX, RGB_BYTE_MAX, RGB_BYTE_MAX, FULL_OPACITY]);
