
export function formatCurrency(amount: number, currency = "USD", decimals?: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: decimals !== undefined ? decimals : 2,
    maximumFractionDigits: decimals !== undefined ? decimals : 2
  }).format(amount);
}

export function formatPercentage(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  }).format(value / 100);
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(date);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}

export function shortenText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

// Ensure dates are always formatted with 4-digit years
export function formatDateWithFourDigitYear(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric', // This ensures 4-digit year
    month: '2-digit',
    day: '2-digit'
  }).format(date);
}

// Helper for formatting date input strings consistently (MM/DD/YYYY)
export function formatDateInputString(input: string): string {
  // Remove any non-digit characters
  const digitsOnly = input.replace(/\D/g, "");
  
  // Add slashes as the user types, always ensuring FULL 4-digit years
  if (digitsOnly.length <= 2) {
    return digitsOnly;
  } else if (digitsOnly.length <= 4) {
    return `${digitsOnly.slice(0, 2)}/${digitsOnly.slice(2)}`;
  } else {
    const month = digitsOnly.slice(0, 2);
    const day = digitsOnly.slice(2, 4);
    
    // Make sure we always get 4-digit years
    let year = digitsOnly.slice(4);
    if (year.length <= 2) {
      // If user entered a 1 or 2-digit year, assume it's 2000+
      year = year.padStart(2, '0');
      if (Number(year) < 50) {
        year = `20${year}`;
      } else {
        year = `19${year}`;
      }
    } else {
      // If more than 2 digits, ensure it's padded to a full 4 digits
      year = year.padEnd(4, '0');
    }
    
    return `${month}/${day}/${year}`;
  }
}

// Parse dates from MM/DD/YYYY format - only accept 4-digit years
export function parseDateInput(dateString: string): Date | null {
  try {
    const parts = dateString.split("/");
    if (parts.length === 3) {
      const month = parseInt(parts[0], 10);
      const day = parseInt(parts[1], 10);
      const year = parseInt(parts[2], 10);
      
      // Validate parts
      if (isNaN(month) || isNaN(day) || isNaN(year)) return null;
      if (month < 1 || month > 12) return null;
      if (day < 1 || day > 31) return null;
      if (year < 1000 || year > 9999) return null; // Ensure 4-digit year
      
      // Create date with careful validation (month-1 because JS months are 0-based)
      const date = new Date(year, month - 1, day);
      
      // Verify the date is valid by checking if components match what we set
      if (
        date.getFullYear() !== year ||
        date.getMonth() !== month - 1 ||
        date.getDate() !== day
      ) {
        return null; // Invalid date (like Feb 31)
      }
      
      return date;
    }
    return null;
  } catch (error) {
    console.error("Date parsing error:", error);
    return null;
  }
}
