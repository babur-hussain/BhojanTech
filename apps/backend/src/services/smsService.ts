import axios from 'axios';

interface SMSOptions {
    authKey: string;
    senderId?: string;
    language?: 'EN' | 'HI';
}

// MSG91 API base
const MSG91_BASE = 'https://api.msg91.com/api/v5';

/**
 * Send OTP via MSG91
 */
export async function sendOTP(phone: string, otp: string, opts: SMSOptions): Promise<boolean> {
    try {
        const { authKey, senderId = 'RSTRNT', language = 'EN' } = opts;
        const message =
            language === 'HI'
                ? `आपका OTP है: ${otp}. यह 10 मिनट में एक्सपायर हो जाएगा। किसी से साझा न करें।`
                : `Your OTP is ${otp}. Valid for 10 minutes. Do not share.`;

        await axios.get(`${MSG91_BASE}/sendotp.php`, {
            params: {
                authkey: authKey,
                mobile: `91${phone}`,
                message,
                otp,
                sender: senderId,
                otp_length: 6,
                otp_expiry: 10,
            },
        });
        return true;
    } catch (err) {
        console.error('[SMS] sendOTP error:', err);
        return false;
    }
}

/**
 * Send bulk campaign SMS via MSG91
 */
export async function sendBulkSMS(
    phones: string[],
    message: string,
    opts: SMSOptions
): Promise<{ sent: number; failed: number }> {
    const { authKey, senderId = 'RSTRNT', language = 'EN' } = opts;
    let sent = 0;
    let failed = 0;

    // MSG91 supports up to 1000 numbers per batch
    const batches: string[][] = [];
    for (let i = 0; i < phones.length; i += 1000) {
        batches.push(phones.slice(i, i + 1000));
    }

    for (const batch of batches) {
        try {
            const mobiles = batch.map((p) => `91${p}`).join(',');
            await axios.get(`https://api.msg91.com/api/sendhttp.php`, {
                params: {
                    authkey: authKey,
                    mobiles,
                    message,
                    sender: senderId,
                    route: 4,          // transactional route
                    unicode: language === 'HI' ? 1 : 0,
                    country: 91,
                },
            });
            sent += batch.length;
        } catch (err) {
            console.error('[SMS] sendBulkSMS batch error:', err);
            failed += batch.length;
        }
    }

    return { sent, failed };
}

/**
 * Send points notification after visit
 */
export async function sendPointsNotification(
    phone: string,
    pointsEarned: number,
    newBalance: number,
    restaurantName: string,
    opts: SMSOptions
): Promise<boolean> {
    const { authKey, senderId = 'RSTRNT', language = 'EN' } = opts;
    const message =
        language === 'HI'
            ? `${restaurantName}: आपने ${pointsEarned} पॉइंट्स अर्जित किए। कुल बैलेंस: ${newBalance} पॉइंट्स। धन्यवाद!`
            : `${restaurantName}: You earned ${pointsEarned} loyalty points! Total balance: ${newBalance} pts. Thank you!`;

    await sendBulkSMS([phone], message, { authKey, senderId, language });
    return true;
}

/**
 * Send feedback request link
 */
export async function sendFeedbackRequest(
    phone: string,
    feedbackUrl: string,
    restaurantName: string,
    opts: SMSOptions
): Promise<boolean> {
    const { authKey, senderId = 'RSTRNT', language = 'EN' } = opts;
    const message =
        language === 'HI'
            ? `${restaurantName}: आपकी यात्रा कैसी रही? हमें फीडबैक दें: ${feedbackUrl}`
            : `${restaurantName}: How was your visit? Rate us: ${feedbackUrl}`;

    await sendBulkSMS([phone], message, { authKey, senderId, language });
    return true;
}
