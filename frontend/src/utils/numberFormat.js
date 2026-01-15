/**
 * Utility functions for number formatting with commas
 */

/**
 * Format number with commas (e.g., 1234567 -> "1,234,567")
 * @param {string|number} value - The value to format
 * @returns {string} - Formatted string with commas
 */
export const formatNumberWithCommas = (value) => {
  if (!value && value !== 0) return '';
  
  // Remove any existing commas and non-numeric characters except decimal point
  const numStr = String(value).replace(/[^\d.]/g, '');
  
  // Split into integer and decimal parts
  const parts = numStr.split('.');
  const integerPart = parts[0];
  const decimalPart = parts[1];
  
  // Add commas to integer part
  const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  
  // Reconstruct with decimal if present
  return decimalPart !== undefined ? `${formattedInteger}.${decimalPart}` : formattedInteger;
};

/**
 * Remove commas from formatted number string
 * @param {string} value - The formatted string
 * @returns {string} - String without commas
 */
export const removeCommas = (value) => {
  if (!value) return '';
  return String(value).replace(/,/g, '');
};

/**
 * Parse formatted number to float
 * @param {string} value - The formatted string
 * @returns {number} - Parsed number
 */
export const parseFormattedNumber = (value) => {
  if (!value || value === '' || value === '0') return null;
  const cleaned = removeCommas(value);
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? null : parsed;
};

/**
 * Format currency with $ and commas
 * @param {string|number} value - The value to format
 * @param {number} decimals - Number of decimal places (default: 0)
 * @returns {string} - Formatted currency string
 */
export const formatCurrency = (value, decimals = 0) => {
  if (!value && value !== 0) return '$0';
  
  const num = typeof value === 'string' ? parseFormattedNumber(value) : value;
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
};

/**
 * Handle input change for formatted number fields
 * @param {Event} e - The input event
 * @param {Function} setter - State setter function
 */
export const handleFormattedNumberInput = (e, setter) => {
  const value = e.target.value;
  
  // Allow empty value
  if (value === '') {
    setter('');
    return;
  }
  
  // Remove commas and validate
  const cleanValue = removeCommas(value);
  
  // Only allow numbers and one decimal point
  if (!/^\d*\.?\d*$/.test(cleanValue)) {
    return; // Don't update if invalid
  }
  
  // Format and set
  setter(formatNumberWithCommas(cleanValue));
};

/**
 * Calculate price per square foot
 * @param {string|number} price - Total price
 * @param {string|number} sqft - Square footage
 * @returns {string} - Formatted price per sqft (e.g., "$437.50/sqft")
 */
export const calculatePricePerSqft = (price, sqft) => {
  const priceNum = typeof price === 'string' ? parseFormattedNumber(price) : price;
  const sqftNum = typeof sqft === 'string' ? parseFormattedNumber(sqft) : sqft;
  
  if (!priceNum || !sqftNum || sqftNum === 0) return '$0.00/sqft';
  
  const pricePerSqft = priceNum / sqftNum;
  
  return `${formatCurrency(pricePerSqft, 2)}/sqft`;
};
