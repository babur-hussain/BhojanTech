// Stub service for WhatsApp Notifications

export const sendWhatsAppNotification = async (phoneNumber: string, message: string) => {
    if (!phoneNumber) return;

    // In production, integrate with Twilio WhatsApp API or Meta Cloud API
    console.log(`[WhatsApp Stub] Sending to ${phoneNumber}: ${message}`);

    // Simulated delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    return { success: true, messageId: `wa_stub_${Date.now()}` };
};

export const sendOrderConfirmationWA = async (phone: string, orderId: string, estimatedTime: number) => {
    const msg = `🍽️ Thank you for your order! Your Order ID is #${orderId.slice(-6).toUpperCase()}. Estimated preparation time: ${estimatedTime} mins. We'll notify you when it's ready!`;
    return sendWhatsAppNotification(phone, msg);
};

export const sendOrderReadyWA = async (phone: string, orderId: string) => {
    const msg = `🎉 Your order #${orderId.slice(-6).toUpperCase()} is ready! Please collect it from the counter.`;
    return sendWhatsAppNotification(phone, msg);
};
