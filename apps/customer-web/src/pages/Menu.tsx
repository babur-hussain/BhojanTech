import { useState, useMemo } from 'react';
import { useCartStore } from '../store/cartStore';
import { MenuItemCard } from '../components/MenuItemCard';
import { CartBottomSheet } from '../components/CartBottomSheet';
import { useNavigate } from 'react-router-dom';
import { UserCircle } from 'lucide-react';

export const Menu = () => {
    const { tableNumber } = useCartStore();
    const navigate = useNavigate();

    const handleProfileClick = () => {
        if (localStorage.getItem('customer_token')) {
            navigate('/my-account');
        } else {
            navigate('/login');
        }
    };

    // Real app would fetch these from api.fetchMenu()
    const [categories] = useState(['All', 'Starters', 'Mains', 'Breads', 'Desserts']);
    const [activeCategory, setActiveCategory] = useState('All');
    const [isVegOnly, setIsVegOnly] = useState(false);

    // Stub data
    const menuItems = [
        {
            id: '1',
            name: 'Paneer Butter Masala',
            description: 'Rich and creamy curry made with paneer, spices, onions, tomatoes.',
            isVeg: true,
            spiceLevel: 'MILD',
            isBestseller: true,
            category: 'Mains',
            variants: [{ name: 'Half', priceINR: 180 }, { name: 'Full', priceINR: 320 }],
            imageUrl: 'https://images.unsplash.com/photo-1631515243349-e0cb75fb8d3a?w=500&q=80'
        },
        {
            id: '2',
            name: 'Chicken Tikka Masala',
            description: 'Roasted marinated chicken chunks in spiced curry sauce.',
            isVeg: false,
            spiceLevel: 'SPICY',
            isBestseller: true,
            category: 'Mains',
            variants: [{ name: 'Regular', priceINR: 350 }]
        },
        {
            id: '3',
            name: 'Garlic Naan',
            isVeg: true,
            category: 'Breads',
            variants: [{ name: 'Piece', priceINR: 45 }]
        }
    ];

    const filteredItems = useMemo(() => {
        return menuItems.filter(item => {
            if (isVegOnly && !item.isVeg) return false;
            if (activeCategory !== 'All' && item.category !== activeCategory) return false;
            return true;
        });
    }, [isVegOnly, activeCategory]);

    return (
        <div className="pb-32 bg-gray-50 min-h-screen">
            {/* Header */}
            <header className="bg-white px-4 py-4 shadow-sm sticky top-0 z-30">
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-2xl font-black text-gray-900 leading-tight">Great Indian Eats</h1>
                        {tableNumber ? (
                            <p className="text-sm font-semibold text-brand-700 bg-red-50 inline-block px-3 py-1 mt-2 rounded-lg">
                                Dining at Table {tableNumber}
                            </p>
                        ) : (
                            <p className="text-sm font-semibold text-gray-500 mt-2">Takeaway / Delivery Menu</p>
                        )}
                    </div>
                    <button onClick={handleProfileClick} className="p-2 bg-gray-50 rounded-full text-brand-700 hover:bg-red-50 transition-colors border border-gray-100 shadow-sm">
                        <UserCircle size={26} strokeWidth={1.5} />
                    </button>
                </div>

                {/* Veg Only Toggle */}
                <div className="flex items-center gap-3 mt-4">
                    <span className="text-sm font-bold text-gray-700">Veg Only</span>
                    <button
                        onClick={() => setIsVegOnly(!isVegOnly)}
                        className={`w-12 h-6 rounded-full p-1 transition-colors ${isVegOnly ? 'bg-green-500' : 'bg-gray-300'}`}
                    >
                        <div className={`w-4 h-4 bg-white rounded-full transition-transform ${isVegOnly ? 'translate-x-6' : 'translate-x-0'}`} />
                    </button>
                </div>

                {/* Categories (horizontal scroll) */}
                <div className="flex gap-3 overflow-x-auto mt-4 pb-2 scrollbar-hide">
                    {categories.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setActiveCategory(cat)}
                            className={`whitespace-nowrap px-4 py-1.5 rounded-full font-semibold transition-all border ${activeCategory === cat
                                ? 'bg-gray-900 border-gray-900 text-white shadow-md'
                                : 'bg-white border-gray-200 text-gray-600'
                                }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </header>

            {/* Menu List */}
            <main className="p-4">
                {filteredItems.map(item => (
                    <MenuItemCard key={item.id} item={item} />
                ))}
                {filteredItems.length === 0 && (
                    <div className="text-center text-gray-500 py-10">No items match your filters.</div>
                )}
            </main>

            <CartBottomSheet />
        </div>
    );
};
