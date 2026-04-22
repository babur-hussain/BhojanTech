import axios from 'axios';

// Get base URL for backend API. In production, this might be relative if proxy is used
const API_URL = import.meta.env.VITE_API_URL || '';

export const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

export const fetchMenu = async (restaurantId: string) => {
    const { data } = await api.get(`/menu/${restaurantId}`);
    return data;
};

export const createOrder = async (orderData: any) => {
    const { data } = await api.post('/online-orders/create', orderData);
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
