/**
 * Color Contrast Utilities
 * 
 * Utilities for verifying WCAG AA contrast ratios and ensuring accessibility.
 * 
 * Requirements: 16.3 (Verify WCAG AA contrast ratios)
 */

/**
 * Convert hex color to RGB
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

/**
 * Calculate relative luminance of a color
 * https://www.w3.org/TR/WCAG20/#relativeluminancedef
 */
function getLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const sRGB = c / 255;
    return sRGB <= 0.03928 ? sRGB / 12.92 : Math.pow((sRGB + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Calculate contrast ratio between two colors
 * https://www.w3.org/TR/WCAG20/#contrast-ratiodef
 */
export function getContrastRatio(color1: string, color2: string): number {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);

  if (!rgb1 || !rgb2) {
    throw new Error('Invalid color format. Use hex format (e.g., #FFFFFF)');
  }

  const lum1 = getLuminance(rgb1.r, rgb1.g, rgb1.b);
  const lum2 = getLuminance(rgb2.r, rgb2.g, rgb2.b);

  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Check if contrast ratio meets WCAG AA standards
 * - Normal text: 4.5:1
 * - Large text (18pt+ or 14pt+ bold): 3:1
 */
export function meetsWCAGAA(
  color1: string,
  color2: string,
  isLargeText = false
): boolean {
  const ratio = getContrastRatio(color1, color2);
  const threshold = isLargeText ? 3 : 4.5;
  return ratio >= threshold;
}

/**
 * Check if contrast ratio meets WCAG AAA standards
 * - Normal text: 7:1
 * - Large text: 4.5:1
 */
export function meetsWCAGAAA(
  color1: string,
  color2: string,
  isLargeText = false
): boolean {
  const ratio = getContrastRatio(color1, color2);
  const threshold = isLargeText ? 4.5 : 7;
  return ratio >= threshold;
}

/**
 * Verify dashboard color palette meets WCAG AA standards
 */
export function verifyDashboardColors(): {
  passed: boolean;
  results: Array<{
    name: string;
    foreground: string;
    background: string;
    ratio: number;
    meetsAA: boolean;
    meetsAAA: boolean;
  }>;
} {
  const tests = [
    {
      name: 'Primary text on dark background',
      foreground: '#FFFFFF',
      background: '#0b0b0b',
    },
    {
      name: 'Racing red on dark background',
      foreground: '#C8102E',
      background: '#0b0b0b',
    },
    {
      name: 'Gray text on dark background',
      foreground: '#9CA3AF',
      background: '#0b0b0b',
    },
    {
      name: 'White text on racing red',
      foreground: '#FFFFFF',
      background: '#C8102E',
    },
    {
      name: 'White text on gray-900',
      foreground: '#FFFFFF',
      background: '#111827',
    },
    {
      name: 'Gray-400 text on gray-900',
      foreground: '#9CA3AF',
      background: '#111827',
    },
  ];

  const results = tests.map((test) => {
    const ratio = getContrastRatio(test.foreground, test.background);
    return {
      ...test,
      ratio,
      meetsAA: meetsWCAGAA(test.foreground, test.background),
      meetsAAA: meetsWCAGAAA(test.foreground, test.background),
    };
  });

  const passed = results.every((r) => r.meetsAA);

  return { passed, results };
}

/**
 * Log color contrast verification results to console
 */
export function logColorContrastResults(): void {
  const { passed, results } = verifyDashboardColors();

  console.group('🎨 Color Contrast Verification (WCAG AA)');
  console.log(`Overall: ${passed ? '✅ PASSED' : '❌ FAILED'}`);
  console.log('');

  results.forEach((result) => {
    const status = result.meetsAA ? '✅' : '❌';
    const aaaStatus = result.meetsAAA ? '(AAA ✅)' : '(AAA ❌)';
    console.log(
      `${status} ${result.name}: ${result.ratio.toFixed(2)}:1 ${aaaStatus}`
    );
    console.log(`   ${result.foreground} on ${result.background}`);
  });

  console.groupEnd();
}
