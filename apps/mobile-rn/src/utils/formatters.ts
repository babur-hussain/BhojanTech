/**
 * Indian currency formatter: ₹1,23,456.00
 */
export function inrFormat(amount: number): string {
    return '₹' + new Intl.NumberFormat('en-IN', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
}

/**
 * Short INR: ₹1.2L, ₹84.5K
 */
export function shortInr(amount: number): string {
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
    if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`;
    return `₹${amount}`;
}

/**
 * Indian phone number formatter: +91 98765 43210
 */
export function formatPhoneIN(phone: string): string {
    const digits = phone.replace(/\D/g, '');
    if (digits.length === 10) {
        return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
    }
    return phone;
}

/**
 * Percentage formatter: +12.4% / -3.2%
 */
export function pctFormat(value: number): string {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
}

/**
 * Time ago (e.g., "just now", "5m ago", "2h ago")
 */
export function timeAgo(date: Date | string): string {
    const mins = Math.floor((Date.now() - new Date(date).getTime()) / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    if (mins < 1440) return `${Math.floor(mins / 60)}h ago`;
    return `${Math.floor(mins / 1440)}d ago`;
}
