
/**
 * Normalize Nigerian phone numbers to:
 * +234XXXXXXXXXX
 *
 * Accepted:
 * 08012345678
 * 8012345678
 * 2348012345678
 * +2348012345678
 */
export const normalizeNigerianPhone = (
  phone: string,
): string => {
  let value = phone.trim();

  // Remove spaces, hyphens, brackets, etc.
  value = value.replace(/\D/g, "");

  // 08012345678 -> 2348012345678
  if (value.startsWith("0")) {
    value = `234${value.slice(1)}`;
  }

  // 8012345678 -> 2348012345678
  else if (
    value.startsWith("8") ||
    value.startsWith("7") ||
    value.startsWith("9")
  ) {
    value = `234${value}`;
  }

  // Already 2348012345678
  if (value.startsWith("234")) {
    return `+${value}`;
  }

  return phone.trim();
};

/**
 * Validate a Nigerian phone number.
 */
export const isValidNigerianPhone = (
  phone: string,
): boolean => {
  const normalized =
    normalizeNigerianPhone(phone);

  return /^\+234[789]\d{9}$/.test(
    normalized,
  );
};

