import axios from 'axios';

// Get base URL for backend API. In production, this might be relative if proxy is used
const API_URL = import.meta.env.VITE_API_URL || 'https://server.bhojantech.lfvs.in/api';

export const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

export const fetchMenu = async (restaurantId: string) => {
    const { data } = await api.get(`/menu/public/${restaurantId}`);
    return data;
};

export const createOrder = async (orderData: any) => {
    const { data } = await api.post('/online-orders/create', orderData);
    return data;
};

export const getLiveTableOrder = async (tableId: string) => {
    const { data } = await api.get(`/online-orders/table/${tableId}`);
    return data;
};

export const getTableInfo = async (tableId: string) => {
    const { data } = await api.get(`/online-orders/table-info/${tableId}`);
    return data;
};

export const payOnlineOrder = async (orderId: string) => {
    const { data } = await api.post(`/online-orders/${orderId}/pay`);
    return data;
};

export const requestBill = async (orderId: string) => {
    const { data } = await api.post(`/online-orders/${orderId}/request-bill`);
    return data;
};

// Razorpay Script loader
export const loadRazorpay = () => {
    return new Promise((resolve) => {
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.body.appendChild(script);
    });
};

export const lookupCustomer = async (restaurantId: string, phone: string) => {
    const { data } = await api.get(`/online-orders/${restaurantId}/customer/${phone}`);
    return data;
};
