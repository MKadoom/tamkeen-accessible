/**
 * Tamkeen — WhatsApp ordering helpers.
 *
 * Single source of truth for building WhatsApp order/inquiry links.
 * The store number is printed once in layouts/master.twig as `window.tamkeen.whatsapp`
 * (theme setting `whatsapp_number` → store contacts → store social), never hard-coded here.
 */

export const GREETING = 'مرحبًا، أرغب بالاستفسار أو الطلب لهذا المنتج';
export const LABEL_ORDER = 'اطلب عبر واتساب';
export const LABEL_INQUIRE = 'استفسر عبر واتساب';

export function getWhatsappNumber() {
  return String(window.tamkeen?.whatsapp || '').replace(/\D/g, '');
}

export function hasWhatsappNumber() {
  return getWhatsappNumber().length >= 8;
}

/**
 * Builds a wa.me link. When the store has no WhatsApp number configured we fall back to the
 * contact page so the button never points to an invalid chat.
 */
export function buildWhatsappUrl(text) {
  const number = getWhatsappNumber();
  if (!number) {
    return window.tamkeen?.contactUrl || '#';
  }
  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
}

/**
 * Salla money helpers may return HTML (e.g. the riyal symbol as an icon). WhatsApp needs plain text.
 */
export function toPlainPrice(value) {
  if (!value) {
    return '';
  }
  // DOMParser documents are inert: no scripts run and no images load.
  const holder = new DOMParser().parseFromString(String(value), 'text/html').body;
  holder.querySelectorAll('.sicon-sar, [class*="sar"]').forEach(icon => icon.replaceWith(' ر.س'));
  return holder.textContent.replace(/\s+/g, ' ').trim();
}

/**
 * @param {{name: string, url?: string, price?: string, options?: Array<{name: string, value: string}>, quantity?: number|string, note?: string}} product
 */
export function buildProductMessage({name, url, price, options = [], quantity, note}) {
  const lines = [GREETING, '', `▪️ المنتج: ${name}`];

  const plainPrice = toPlainPrice(price);
  if (plainPrice && plainPrice !== '-') {
    lines.push(`▪️ السعر: ${plainPrice}`);
  }

  options.filter(option => option && option.value).forEach(option => {
    lines.push(`▪️ ${option.name}: ${option.value}`);
  });

  if (quantity && Number(quantity) > 1) {
    lines.push(`▪️ الكمية: ${quantity}`);
  }

  if (note) {
    lines.push(`▪️ ملاحظة: ${note}`);
  }

  if (url) {
    lines.push(`▪️ الرابط: ${url}`);
  }

  return lines.join('\n');
}

export function buildProductWhatsappUrl(product) {
  return buildWhatsappUrl(buildProductMessage(product));
}

/** Opens WhatsApp in a new tab, falling back to same-tab navigation when popups are blocked. */
export function openWhatsapp(url) {
  // `noopener` in the features string makes window.open() return null, so detach the opener manually.
  const win = window.open(url, '_blank');
  if (win) {
    win.opener = null;
  } else {
    window.location.href = url;
  }
}
