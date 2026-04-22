import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartItem {
    id: string; // Unique timestamp or ID to differentiate identical standard items with different notes
    menuItemId: string;
    name: string;
    variantName?: string;
    price: number;
    quantity: number;
    notes?: string;
    isVeg: boolean;
}

interface CartState {
    restaurantId: string | null;
    tableNumber: string | null;
    items: CartItem[];
    customerName: string;
    customerPhone: string;

    setRestaurantContext: (resId: string, tableNum?: string) => void;
    setCustomerDetails: (name: string, phone: string) => void;
    addItem: (item: Omit<CartItem, 'id'>) => void;
    removeItem: (id: string) => void;
    updateQuantity: (id: string, delta: number) => void;
    clearCart: () => void;

    getTotal: () => number;
    getItemCount: () => number;
}

export const useCartStore = create<CartState>()(
    persist(
        (set, get) => ({
            restaurantId: null,
            tableNumber: null,
            items: [],
            customerName: '',
            customerPhone: '',

            setRestaurantContext: (restaurantId, tableNumber) => set({ restaurantId, tableNumber: tableNumber || null }),

            setCustomerDetails: (customerName, customerPhone) => set({ customerName, customerPhone }),

            addItem: (item) => set((state) => {
                // If exact item (same menu ID, same variant, same notes) exists, increment quantity
                const existingIndex = state.items.findIndex(
                    i => i.menuItemId === item.menuItemId && i.variantName === item.variantName && i.notes === item.notes
                );

                if (existingIndex >= 0) {
                    const newItems = [...state.items];
                    newItems[existingIndex].quantity += item.quantity;
                    return { items: newItems };
                }

                return { items: [...state.items, { ...item, id: Date.now().toString() }] };
            }),

            removeItem: (id) => set((state) => ({ items: state.items.filter(i => i.id !== id) })),

            updateQuantity: (id, delta) => set((state) => ({
                items: state.items.map(i => {
                    if (i.id === id) {
                        const newQ = Math.max(0, i.quantity + delta);
                        return { ...i, quantity: newQ };
                    }
                    return i;
                }).filter(i => i.quantity > 0)
            })),

            clearCart: () => set({ items: [] }),

            getTotal: () => get().items.reduce((sum, item) => sum + (item.price * item.quantity), 0),

            getItemCount: () => get().items.reduce((sum, item) => sum + item.quantity, 0),
        }),
        {
            name: 'restaurant-cart-storage',
        }
    )
);
