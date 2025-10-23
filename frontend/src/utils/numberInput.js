/**
 * Utility functions for formatting number inputs with commas
 */

/**
 * Format a number with commas (e.g., 1000000 -> 1,000,000)
 * @param {string|number} value - The value to format
 * @returns {string} - Formatted value with commas
 */
export const formatNumberWithCommas = (value) => {
  if (!value && value !== 0) return '';
  
  // Remove all non-digit characters except decimal point
  const cleaned = String(value).replace(/[^\d.]/g, '');
  
  // Split on decimal point
  const parts = cleaned.split('.');
  
  // Add commas to the integer part
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  
  // Return with decimal part if it exists
  return parts.join('.');
};

/**
 * Parse a formatted number string to a raw number (e.g., 1,000,000 -> 1000000)
 * @param {string} value - The formatted value
 * @returns {number|null} - Raw number or null if invalid
 */
export const parseFormattedNumber = (value) => {
  if (!value) return null;
  
  // Remove all commas
  const cleaned = String(value).replace(/,/g, '');
  
  // Parse to float
  const parsed = parseFloat(cleaned);
  
  return isNaN(parsed) ? null : parsed;
};

/**
 * Handle input change for number fields with comma formatting
 * @param {Event} e - Input event
 * @param {Function} setter - State setter function
 */
export const handleNumberInput = (e, setter) => {
  const rawValue = e.target.value;
  const formatted = formatNumberWithCommas(rawValue);
  
  // Set the formatted value back to the input
  e.target.value = formatted;
  
  // Call the setter with the formatted value if provided
  if (setter) {
    setter(formatted);
  }
};

/**
 * Format currency with $ symbol and commas
 * @param {string|number} value - The value to format
 * @returns {string} - Formatted currency string
 */
export const formatCurrency = (value) => {
  const num = parseFormattedNumber(value);
  if (num === null || num === undefined) return '';
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
};
