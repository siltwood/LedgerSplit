import validator from 'validator';

// Email validation
export const isValidEmail = (email: string): boolean => {
  return validator.isEmail(email);
};

// Sanitize string input (remove HTML, trim whitespace)
export const sanitizeString = (input: string): string => {
  if (!input) return '';
  // Strip HTML tags and trim
  return validator.trim(validator.stripLow(input));
};

// Validate UUID
export const isValidUUID = (id: string): boolean => {
  return validator.isUUID(id);
};

// Sanitize and validate password
export const validatePassword = (password: string): { valid: boolean; error?: string } => {
  if (!password || password.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters.' };
  }
  if (password.length > 128) {
    return { valid: false, error: 'Password must be less than 128 characters.' };
  }
  return { valid: true };
};

// Validate and sanitize name (for register endpoint - 40 char limit)
export const validateName = (name: string): { valid: boolean; sanitized: string; error?: string } => {
  const sanitized = sanitizeString(name);

  if (!sanitized || sanitized.length === 0) {
    return { valid: false, sanitized: '', error: 'Name is required.' };
  }

  if (sanitized.length > 40) {
    return { valid: false, sanitized: '', error: 'Name must be 40 characters or less.' };
  }

  return { valid: true, sanitized };
};

// Validate amount (for splits)
export const validateAmount = (amount: any): { valid: boolean; value?: number; error?: string } => {
  const parsed = parseFloat(amount);

  if (isNaN(parsed) || parsed <= 0) {
    return { valid: false, error: 'Amount must be a positive number.' };
  }

  if (parsed > 1000000) {
    return { valid: false, error: 'Amount must be less than 1,000,000.' };
  }

  return { valid: true, value: parsed };
};

// Sanitize text fields (description, notes)
export const sanitizeText = (text: string, maxLength = 1000): { valid: boolean; sanitized: string; error?: string } => {
  if (!text) return { valid: true, sanitized: '' };

  const sanitized = sanitizeString(text);

  if (sanitized.length > maxLength) {
    return { valid: false, sanitized: '', error: `Text must be less than ${maxLength} characters` };
  }

  return { valid: true, sanitized };
};
