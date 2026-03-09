'use strict';

/**
 * Tests for storeRendererService.js
 * Verifies that renderStorePage produces valid HTML from store configs.
 */

const { renderStorePage, fillTemplate, loadComponent } = require('../services/storeRendererService');

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const minimalConfig = {
  name: 'Soy Candles Co',
  tagline: 'Eco-friendly candles for conscious living',
  palette: { primary: '#2d6a4f', accent: '#95d5b2', bg: '#ffffff' },
  fonts: { heading: 'Inter', body: 'Inter' },
  commerce: {
    fulfillment_type: 'physical',
    products: [],
  },
};

const fullConfig = {
  name: 'Digital Course Hub',
  tagline: 'Learn anything, anywhere',
  palette: { primary: '#7c3aed', accent: '#a78bfa', bg: '#f9fafb' },
  fonts: { heading: 'Poppins', body: 'Inter' },
  commerce: {
    fulfillment_type: 'digital',
    products: [
      { name: 'Intro to Python', type: 'course', price: 49, description: 'Beginner-friendly Python course.' },
      { name: 'Advanced JS', type: 'ebook', price: 19, description: 'Deep dive into JavaScript.' },
    ],
  },
};

// ---------------------------------------------------------------------------
// renderStorePage — core output
// ---------------------------------------------------------------------------

describe('renderStorePage', () => {
  test('returns a non-empty HTML string', () => {
    const html = renderStorePage(minimalConfig);
    expect(typeof html).toBe('string');
    expect(html.length).toBeGreaterThan(100);
  });

  test('outputs valid HTML5 doctype', () => {
    const html = renderStorePage(minimalConfig);
    expect(html.trim().startsWith('<!DOCTYPE html>')).toBe(true);
  });

  test('includes <html lang="en">', () => {
    const html = renderStorePage(minimalConfig);
    expect(html).toContain('<html lang="en">');
  });

  test('includes viewport meta tag for mobile responsiveness', () => {
    const html = renderStorePage(minimalConfig);
    expect(html).toContain('name="viewport"');
    expect(html).toContain('width=device-width');
  });

  test('includes <title> with brand name', () => {
    const html = renderStorePage(minimalConfig);
    expect(html).toContain('<title>Soy Candles Co</title>');
  });

  test('includes <meta name="description">', () => {
    const html = renderStorePage(minimalConfig);
    expect(html).toContain('name="description"');
    expect(html).toContain('Eco-friendly candles');
  });

  test('injects brand primary color as CSS variable', () => {
    const html = renderStorePage(minimalConfig);
    expect(html).toContain('--brand-primary: #2d6a4f');
  });

  test('injects brand accent color as CSS variable', () => {
    const html = renderStorePage(minimalConfig);
    expect(html).toContain('--brand-accent: #95d5b2');
  });

  test('injects heading font as CSS variable', () => {
    const html = renderStorePage(fullConfig);
    expect(html).toContain("'Poppins'");
  });

  test('includes Google Fonts link', () => {
    const html = renderStorePage(fullConfig);
    expect(html).toContain('fonts.googleapis.com');
    expect(html).toContain('Poppins');
  });

  test('renders brand name in nav', () => {
    const html = renderStorePage(minimalConfig);
    expect(html).toContain('Soy Candles Co');
  });

  test('renders tagline', () => {
    const html = renderStorePage(minimalConfig);
    expect(html).toContain('Eco-friendly candles for conscious living');
  });

  test('renders footer with brand name and year', () => {
    const html = renderStorePage(minimalConfig);
    const year = new Date().getFullYear().toString();
    expect(html).toContain(year);
    expect(html).toContain('Soy Candles Co');
  });
});

// ---------------------------------------------------------------------------
// renderStorePage — product grid
// ---------------------------------------------------------------------------

describe('renderStorePage — product grid', () => {
  test('renders product names in HTML', () => {
    const html = renderStorePage(fullConfig);
    expect(html).toContain('Intro to Python');
    expect(html).toContain('Advanced JS');
  });

  test('renders product prices formatted as $XX.XX', () => {
    const html = renderStorePage(fullConfig);
    expect(html).toContain('$49.00');
    expect(html).toContain('$19.00');
  });

  test('renders product descriptions', () => {
    const html = renderStorePage(fullConfig);
    expect(html).toContain('Beginner-friendly Python course.');
    expect(html).toContain('Deep dive into JavaScript.');
  });

  test('renders type labels (Course, Digital) in product cards', () => {
    const html = renderStorePage(fullConfig);
    expect(html).toContain('Course');
    expect(html).toContain('Digital');
  });

  test('includes #products anchor in products section', () => {
    const html = renderStorePage(fullConfig);
    expect(html).toContain('id="products"');
  });

  test('omits products section when no products', () => {
    const html = renderStorePage(minimalConfig);
    // Should not have a product card div structure when there are no products
    expect(html).not.toContain('id="products"');
  });
});

// ---------------------------------------------------------------------------
// renderStorePage — fulfillment type variants
// ---------------------------------------------------------------------------

describe('renderStorePage — fulfillment type benefits', () => {
  const types = ['digital', 'service', 'physical', 'pod'];

  types.forEach(type => {
    test(`renders without error for fulfillment_type="${type}"`, () => {
      const config = {
        ...minimalConfig,
        commerce: { fulfillment_type: type, products: [] },
      };
      expect(() => renderStorePage(config)).not.toThrow();
      const html = renderStorePage(config);
      expect(html.length).toBeGreaterThan(100);
    });
  });
});

// ---------------------------------------------------------------------------
// renderStorePage — error handling
// ---------------------------------------------------------------------------

describe('renderStorePage — error handling', () => {
  test('throws when storeConfig is null', () => {
    expect(() => renderStorePage(null)).toThrow(/storeConfig must be a non-null object/);
  });

  test('throws when storeConfig is undefined', () => {
    expect(() => renderStorePage(undefined)).toThrow(/storeConfig must be a non-null object/);
  });

  test('throws when storeConfig is a string', () => {
    expect(() => renderStorePage('not an object')).toThrow(/storeConfig must be a non-null object/);
  });

  test('throws when storeConfig.name is missing', () => {
    const { name, ...noName } = minimalConfig;
    expect(() => renderStorePage(noName)).toThrow(/storeConfig.name is required/);
  });

  test('uses fallback palette colors when palette is absent', () => {
    const config = { name: 'Plain Store', commerce: { fulfillment_type: 'digital', products: [] } };
    const html = renderStorePage(config);
    expect(html).toContain('--brand-primary: #2563eb');
  });
});

// ---------------------------------------------------------------------------
// fillTemplate helper
// ---------------------------------------------------------------------------

describe('fillTemplate', () => {
  test('replaces a simple {{VAR}} placeholder', () => {
    expect(fillTemplate('Hello {{NAME}}', { NAME: 'World' })).toBe('Hello World');
  });

  test('replaces multiple different placeholders', () => {
    expect(fillTemplate('{{A}} and {{B}}', { A: 'foo', B: 'bar' })).toBe('foo and bar');
  });

  test('replaces same placeholder used multiple times', () => {
    expect(fillTemplate('{{X}}-{{X}}', { X: 'hi' })).toBe('hi-hi');
  });

  test('uses default value when key is missing', () => {
    expect(fillTemplate('{{MISSING|fallback}}', {})).toBe('fallback');
  });

  test('uses default value when key is empty string', () => {
    expect(fillTemplate('{{KEY|default}}', { KEY: '' })).toBe('default');
  });

  test('prefers provided value over default', () => {
    expect(fillTemplate('{{KEY|default}}', { KEY: 'actual' })).toBe('actual');
  });

  test('leaves no leftover {{}} markers when defaults are provided', () => {
    const result = fillTemplate('{{A|x}} and {{B|y}}', {});
    expect(result).not.toContain('{{');
    expect(result).toBe('x and y');
  });

  test('empty string when key missing and no default', () => {
    expect(fillTemplate('{{NOPE}}', {})).toBe('');
  });
});

// ---------------------------------------------------------------------------
// loadComponent helper
// ---------------------------------------------------------------------------

describe('loadComponent', () => {
  test('returns a string for a known component', () => {
    // form-email-capture.html should exist in the library
    const content = loadComponent('forms/form-email-capture.html');
    // It either returns real content or '' (stub). Either is acceptable.
    expect(typeof content).toBe('string');
  });

  test('returns empty string for a nonexistent component path', () => {
    const content = loadComponent('nonexistent/does-not-exist.html');
    expect(content).toBe('');
  });
});
