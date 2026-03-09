'use strict';

/**
 * PDF Stamping Service — watermarks PDFs with buyer identity for content protection.
 * Uses pdf-lib (pure JS, no native deps). Stamped PDFs are streamed, never cached to disk.
 */

const { PDFDocument, rgb, StandardFonts, degrees } = require('pdf-lib');

/**
 * Truncate email for privacy: j***@gmail.com
 * @param {string} email
 * @returns {string}
 */
function maskEmail(email) {
  if (!email || !email.includes('@')) return email || 'unknown';
  const [local, domain] = email.split('@');
  const masked = local.length <= 2
    ? local[0] + '***'
    : local[0] + '***' + local[local.length - 1];
  return `${masked}@${domain}`;
}

/**
 * Stamp all pages of a PDF buffer with a buyer-identity watermark.
 *
 * @param {Buffer} pdfBuffer  - Raw PDF file contents
 * @param {string} buyerEmail - Buyer's email address (will be masked)
 * @param {string} [buyerName] - Buyer's name (optional)
 * @returns {Promise<Buffer>} Stamped PDF as a Buffer
 */
async function stampPDF(pdfBuffer, buyerEmail, buyerName) {
  const pdfDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const pages = pdfDoc.getPages();

  const maskedEmail = maskEmail(buyerEmail);
  const label = buyerName
    ? `Licensed to ${buyerName} <${maskedEmail}>`
    : `Licensed to ${maskedEmail}`;

  for (const page of pages) {
    const { width, height } = page.getSize();

    // Diagonal watermark across the center of the page
    const fontSize = Math.min(width, height) * 0.03; // ~3% of smallest dimension
    const textWidth = font.widthOfTextAtSize(label, fontSize);

    page.drawText(label, {
      x: (width - textWidth) / 2,
      y: height / 2,
      size: fontSize,
      font,
      color: rgb(0.75, 0.75, 0.75), // light gray
      opacity: 0.4,
      rotate: degrees(45),
    });

    // Footer stamp on each page
    const footerFontSize = Math.max(7, Math.min(10, width * 0.012));
    page.drawText(label, {
      x: 20,
      y: 15,
      size: footerFontSize,
      font,
      color: rgb(0.6, 0.6, 0.6),
      opacity: 0.7,
    });
  }

  const stamped = await pdfDoc.save();
  return Buffer.from(stamped);
}

module.exports = { stampPDF, maskEmail };
