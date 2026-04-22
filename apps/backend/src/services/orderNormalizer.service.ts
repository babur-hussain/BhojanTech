import mongoose from 'mongoose';
import { MenuItem } from '../models/MenuItem';

export async function normalizeZomatoOrder(payload: any, restaurantId: string, branchId: string) {
    // Extract standard Zomato order format details
    const externalOrderId = payload.orderId;
    const customerName = payload.customer?.name || 'Zomato Customer';
    const customerPhone = payload.customer?.phone || '';
    const totalAmountINR = payload.orderTotal || 0;

    const orderItems = [];
    if (payload.items && Array.isArray(payload.items)) {
        for (const item of payload.items) {
            // Find internal menu item matched to the specified zomatoId
            const internalMenu = await MenuItem.findOne({ zomatoItemId: item.zomatoId, restaurantId });
            if (internalMenu) {
                orderItems.push({
                    menuItemId: internalMenu._id,
                    name: internalMenu.name,
                    quantity: item.quantity || 1,
                    priceAtOrderTime: item.unitPrice || 0,
                    notes: item.specialInstructions || '',
                    sentToKitchen: false
                });
            } else {
                // Fallback for unmapped items - create a generic entry
                orderItems.push({
                    menuItemId: new mongoose.Types.ObjectId(), // Dummy ID, usually requires creating manual or tagging unmapped
                    name: `${item.name} (Unmapped)`,
                    quantity: item.quantity || 1,
                    priceAtOrderTime: item.unitPrice || 0,
                    notes: item.specialInstructions || '',
                    sentToKitchen: false
                });
            }
        }
    }

    return {
        restaurantId: new mongoose.Types.ObjectId(restaurantId),
        branchId: new mongoose.Types.ObjectId(branchId),
        isOnlineOrder: true,
        customerName,
        customerPhone,
        paymentMode: 'ONLINE',
        paymentStatus: payload.paymentStatus === 'PAID' ? 'PAID' : 'PENDING',
        items: orderItems,
        status: 'OPEN',
        totalAmountINR,
        deliveryPlatform: 'ZOMATO',
        externalOrderId,
        deliveryPartner: {
            name: payload.deliveryPartner?.name || '',
            phone: payload.deliveryPartner?.phone || ''
        },
        estimatedDeliveryTime: payload.estimatedDeliveryTime ? new Date(payload.estimatedDeliveryTime) : undefined,
        commissionEstimated: totalAmountINR * 0.20 // rough 20% estimate
    };
}

export async function normalizeSwiggyOrder(payload: any, restaurantId: string, branchId: string) {
    // Extract standard Swiggy order format details
    const externalOrderId = payload.order_id;
    const customerName = payload.customer?.name || 'Swiggy Customer';
    const customerPhone = payload.customer?.phone || '';
    const totalAmountINR = payload.bill || 0;

    const orderItems = [];
    if (payload.cart && Array.isArray(payload.cart.items)) {
        for (const item of payload.cart.items) {
            // Find internal menu item matched to the specified swiggyItemId
            const internalMenu = await MenuItem.findOne({ swiggyItemId: item.item_id, restaurantId });
            if (internalMenu) {
                orderItems.push({
                    menuItemId: internalMenu._id,
                    name: internalMenu.name,
                    quantity: item.quantity || 1,
                    priceAtOrderTime: item.price || 0,
                    notes: item.instructions || '',
                    sentToKitchen: false
                });
            } else {
                // Fallback for unmapped items
                orderItems.push({
                    menuItemId: new mongoose.Types.ObjectId(),
                    name: `${item.name} (Unmapped)`,
                    quantity: item.quantity || 1,
                    priceAtOrderTime: item.price || 0,
                    notes: item.instructions || '',
                    sentToKitchen: false
                });
            }
        }
    }

    return {
        restaurantId: new mongoose.Types.ObjectId(restaurantId),
        branchId: new mongoose.Types.ObjectId(branchId),
        isOnlineOrder: true,
        customerName,
        customerPhone,
        paymentMode: 'ONLINE',
        paymentStatus: payload.payment_status === 'PAID' ? 'PAID' : 'PENDING',
        items: orderItems,
        status: 'OPEN',
        totalAmountINR,
        deliveryPlatform: 'SWIGGY',
        externalOrderId,
        deliveryPartner: {
            name: payload.delivery_boy?.name || '',
            phone: payload.delivery_boy?.phone || ''
        },
        estimatedDeliveryTime: payload.eta ? new Date(payload.eta) : undefined,
        commissionEstimated: totalAmountINR * 0.22 // rough 22% estimate
    };
}

export async function normalizeOndcOrder(payload: any, restaurantId: string, branchId: string) {
    // ONDC format under `message.order`
    const order = payload.message?.order || {};
    const externalOrderId = order.id || `ONDC-${Date.now()}`;
    const customerName = order.billing?.name || 'ONDC Customer';
    const customerPhone = order.billing?.phone || '';
    const totalAmountINR = parseFloat(order.quote?.price?.value || '0');

    const orderItems = [];
    if (order.items && Array.isArray(order.items)) {
        for (const item of order.items) {
            // Find internal menu item matched to the specified ondcItemId
            const internalMenu = await MenuItem.findOne({ ondcItemId: item.id, restaurantId });
            if (internalMenu) {
                orderItems.push({
                    menuItemId: internalMenu._id,
                    name: internalMenu.name,
                    quantity: item.quantity?.count || 1,
                    priceAtOrderTime: parseFloat(item.price?.value || '0'),
                    notes: item.tags?.notes || '',
                    sentToKitchen: false
                });
            } else {
                orderItems.push({
                    menuItemId: new mongoose.Types.ObjectId(), // Unmapped
                    name: `${item.descriptor?.name || 'Unknown Item'} (Unmapped)`,
                    quantity: item.quantity?.count || 1,
                    priceAtOrderTime: parseFloat(item.price?.value || '0'),
                    notes: item.tags?.notes || '',
                    sentToKitchen: false
                });
            }
        }
    }

    // Find delivery partner details from fulfillments
    const deliveryFulfillment = order.fulfillments?.find((f: any) => f.type === 'Delivery');

    return {
        restaurantId: new mongoose.Types.ObjectId(restaurantId),
        branchId: new mongoose.Types.ObjectId(branchId),
        isOnlineOrder: true,
        customerName,
        customerPhone,
        paymentMode: 'ONLINE',
        paymentStatus: order.payment?.status === 'PAID' ? 'PAID' : 'PENDING',
        items: orderItems,
        status: 'OPEN',
        totalAmountINR,
        deliveryPlatform: 'ONDC',
        externalOrderId,
        deliveryPartner: {
            name: deliveryFulfillment?.agent?.name || '',
            phone: deliveryFulfillment?.agent?.phone || ''
        },
        estimatedDeliveryTime: undefined, // Requires more complex extraction
        commissionEstimated: totalAmountINR * 0.05 // ONDC typically has a much lower network fee
    };
}
