/**
 * Validates Indian mobile number (10 digits, starts with 6-9)
 */
export function isValidIndianPhone(phone: string): boolean {
    const digits = phone.replace(/\D/g, '');
    return /^[6-9]\d{9}$/.test(digits);
}

/**
 * Validates 6-digit OTP
 */
export function isValidOTP(otp: string): boolean {
    return /^\d{6}$/.test(otp.trim());
}
