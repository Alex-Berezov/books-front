/**
 * Validate slug format
 * Allows lowercase letters, numbers, and hyphens
 */
export const isValidSlug = (slug: string): boolean => {
  const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  return slugRegex.test(slug);
};

/**
 * Validate URL format
 */
export const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

/**
 * Validate ISBN-10 or ISBN-13
 */
export const isValidIsbn = (isbn: string): boolean => {
  // Remove hyphens and spaces
  const cleanIsbn = isbn.replace(/[-\s]/g, '');

  // ISBN-10
  if (cleanIsbn.length === 10) {
    if (!/^\d{9}[\dX]$/.test(cleanIsbn)) return false;

    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += parseInt(cleanIsbn[i]) * (10 - i);
    }
    const lastChar = cleanIsbn[9];
    sum += lastChar === 'X' ? 10 : parseInt(lastChar);

    return sum % 11 === 0;
  }

  // ISBN-13
  if (cleanIsbn.length === 13) {
    if (!/^\d{13}$/.test(cleanIsbn)) return false;

    let sum = 0;
    for (let i = 0; i < 12; i++) {
      sum += parseInt(cleanIsbn[i]) * (i % 2 === 0 ? 1 : 3);
    }
    const checkDigit = (10 - (sum % 10)) % 10;

    return checkDigit === parseInt(cleanIsbn[12]);
  }

  return false;
};
