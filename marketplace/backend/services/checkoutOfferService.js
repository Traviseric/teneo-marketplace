const fs = require('fs');
const path = require('path');
const { calculateDiscount, getCoupons } = require('../routes/couponsRoutes');

const BRANDS_PATH = path.join(__dirname, '../../frontend/brands');
const DEFAULT_NEXT_READ_COUPON = 'NEXTREAD15';

function sanitizeBrandId(brandId) {
  if (!brandId || typeof brandId !== 'string') return null;
  if (!/^[a-zA-Z0-9_-]+$/.test(brandId)) return null;
  return brandId;
}

function getBrandDirectories() {
  try {
    return fs.readdirSync(BRANDS_PATH).filter(entry => {
      try {
        return fs.statSync(path.join(BRANDS_PATH, entry)).isDirectory();
      } catch (e) {
        return false;
      }
    });
  } catch (error) {
    console.error('[checkoutOfferService] Failed reading brands directory:', error.message);
    return [];
  }
}

function loadCatalog(brandId) {
  const catalogPath = path.join(BRANDS_PATH, brandId, 'catalog.json');
  if (!fs.existsSync(catalogPath)) return null;

  try {
    return JSON.parse(fs.readFileSync(catalogPath, 'utf-8'));
  } catch (error) {
    console.error(`[checkoutOfferService] Invalid catalog for brand "${brandId}":`, error.message);
    return null;
  }
}

function resolveCatalogItem(itemId, brandId) {
  const safeBrandId = sanitizeBrandId(brandId);
  const brandsToSearch = safeBrandId ? [safeBrandId] : getBrandDirectories();

  for (const brand of brandsToSearch) {
    const catalog = loadCatalog(brand);
    if (!catalog) continue;

    const books = Array.isArray(catalog.books) ? catalog.books : [];
    const book = books.find(b => b && b.id === itemId);
    if (book) {
      return { type: 'book', item: book, brandId: brand, catalog };
    }

    const collections = Array.isArray(catalog.collections) ? catalog.collections : [];
    const collection = collections.find(c => c && c.id === itemId);
    if (collection) {
      return { type: 'collection', item: collection, brandId: brand, catalog };
    }
  }

  return null;
}

function lookupBookPrice(bookId, format, brandId) {
  const resolved = resolveCatalogItem(bookId, brandId);
  if (!resolved) return null;

  if (resolved.type === 'collection') {
    return Number(resolved.item.price);
  }

  const book = resolved.item;
  if (format === 'hardcover' && book.hardcoverPrice != null) {
    return Number(book.hardcoverPrice);
  }

  if (book.price == null) return null;
  return Number(book.price);
}

function applyCouponToPrice(basePrice, couponCode) {
  const price = Number(basePrice);
  if (!Number.isFinite(price) || price <= 0) {
    return {
      basePrice: 0,
      finalPrice: 0,
      couponCode: null,
      discountAmount: 0,
      applied: false
    };
  }

  const normalizedCode = typeof couponCode === 'string'
    ? couponCode.trim().toUpperCase()
    : '';

  if (!normalizedCode) {
    return {
      basePrice: price,
      finalPrice: price,
      couponCode: null,
      discountAmount: 0,
      applied: false
    };
  }

  const coupons = getCoupons();
  const coupon = coupons[normalizedCode];
  if (!coupon) {
    return {
      basePrice: price,
      finalPrice: price,
      couponCode: null,
      discountAmount: 0,
      applied: false
    };
  }

  const discountAmount = calculateDiscount(coupon, price);
  const finalPrice = Math.max(0.5, Math.round((price - discountAmount) * 100) / 100);

  return {
    basePrice: price,
    finalPrice,
    couponCode: normalizedCode,
    discountAmount: Math.round(discountAmount * 100) / 100,
    applied: discountAmount > 0
  };
}

function getNextReadOffer(bookId, brandId, couponCode = DEFAULT_NEXT_READ_COUPON) {
  const resolved = resolveCatalogItem(bookId, brandId);
  if (!resolved || resolved.type !== 'book') return null;

  const currentBook = resolved.item;
  const catalogBooks = Array.isArray(resolved.catalog.books) ? resolved.catalog.books : [];
  const candidates = catalogBooks.filter(book => {
    if (!book || book.id === currentBook.id) return false;
    return Number.isFinite(Number(book.price)) && Number(book.price) > 0;
  });

  if (candidates.length === 0) return null;

  candidates.sort((a, b) => {
    const aSameCategory = a.category && currentBook.category && a.category === currentBook.category ? 1 : 0;
    const bSameCategory = b.category && currentBook.category && b.category === currentBook.category ? 1 : 0;
    if (aSameCategory !== bSameCategory) return bSameCategory - aSameCategory;

    const aRating = Number(a.rating) || 0;
    const bRating = Number(b.rating) || 0;
    if (aRating !== bRating) return bRating - aRating;

    return Number(a.price) - Number(b.price);
  });

  const nextBook = candidates[0];
  const pricing = applyCouponToPrice(Number(nextBook.price), couponCode);

  const reason = nextBook.category && currentBook.category && nextBook.category === currentBook.category
    ? `Because you liked ${currentBook.category}, this is the strongest next step.`
    : 'Readers who complete this path tend to buy this title next.';

  return {
    bookId: nextBook.id,
    brandId: resolved.brandId,
    title: nextBook.title,
    author: nextBook.author,
    category: nextBook.category || '',
    coverImage: nextBook.coverImage || '',
    format: 'ebook',
    originalPrice: Number(nextBook.price),
    offerPrice: pricing.finalPrice,
    savings: Math.round((pricing.basePrice - pricing.finalPrice) * 100) / 100,
    couponCode: pricing.applied ? pricing.couponCode : null,
    reason
  };
}

module.exports = {
  DEFAULT_NEXT_READ_COUPON,
  sanitizeBrandId,
  resolveCatalogItem,
  lookupBookPrice,
  applyCouponToPrice,
  getNextReadOffer
};
