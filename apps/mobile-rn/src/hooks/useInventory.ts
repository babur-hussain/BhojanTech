import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Endpoints } from '../constants/api';
import { InventoryItem } from '../types';

export function useInventory() {
    const [items, setItems] = useState<InventoryItem[]>([]);
    const [lowStockItems, setLowStockItems] = useState<InventoryItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const fetchInventory = async () => {
        setIsLoading(true);
        try {
            const data = await api<InventoryItem[]>(Endpoints.INVENTORY_ITEMS);
            setItems(data);
            setLowStockItems(data.filter((i) => i.currentQty <= i.minThreshold));
        } catch (err) {
            console.warn('Could not fetch inventory:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchLowStock = async () => {
        try {
            const data = await api<InventoryItem[]>(Endpoints.INVENTORY_LOW_STOCK);
            setLowStockItems(data);
        } catch { }
    };

    useEffect(() => {
        fetchInventory();
    }, []);

    return { items, lowStockItems, isLoading, refreshInventory: fetchInventory, fetchLowStock };
}
