import { useState, useCallback } from 'react';
import { api } from '../services/api';
import { Endpoints } from '../constants/api';
import { Order, OrderItem } from '../types';

export function useOrders() {
    const [isSubmitting, setIsSubmitting] = useState(false);

    const createOrder = useCallback(async (tableId: string, tableNumber: string) => {
        setIsSubmitting(true);
        try {
            const order = await api<Order>(Endpoints.ORDERS, {
                method: 'POST',
                body: { tableId, tableNumber },
            });
            return order;
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    const addItemsToOrder = useCallback(async (orderId: string, items: Partial<OrderItem>[]) => {
        return api<Order>(`${Endpoints.ORDERS}/${orderId}/items`, {
            method: 'POST',
            body: { items },
        });
    }, []);

    const sendKOT = useCallback(async (orderId: string) => {
        setIsSubmitting(true);
        try {
            return await api(`${Endpoints.ORDERS}/${orderId}/kot`, { method: 'POST' });
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    return { createOrder, addItemsToOrder, sendKOT, isSubmitting };
}
