import { useState, useMemo, useEffect } from 'react';
import { useCartStore } from '../store/cartStore';
import { MenuItemCard } from '../components/MenuItemCard';
import { CartBottomSheet } from '../components/CartBottomSheet';
import { useNavigate } from 'react-router-dom';
import { UserCircle } from 'lucide-react';
import { getTableInfo, getLiveTableOrder, fetchMenu } from '../services/api';

export const Menu = () => {
    const { tableNumber, restaurantId, items } = useCartStore();
    const navigate = useNavigate();

    const [tableName, setTableName] = useState<string | null>(null);
    const [hasLiveOrder, setHasLiveOrder] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 40);
        };
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        if (tableNumber) {
            getTableInfo(tableNumber).then(data => {
                setTableName(data.number || null);
            }).catch(console.error);

            getLiveTableOrder(tableNumber).then(order => {
                if (order && (order.status === 'OPEN' || order.status === 'BILLED')) {
                    setHasLiveOrder(true);
                }
            }).catch(() => {
                setHasLiveOrder(false);
            });
        }
    }, [tableNumber]);

    const handleProfileClick = () => {
        if (localStorage.getItem('customer_token')) {
            navigate('/my-account');
        } else {
            navigate('/login');
        }
    };

    const [categories, setCategories] = useState<any[]>([]);
    const [menuItems, setMenuItems] = useState<any[]>([]);
    const [activeCategory, setActiveCategory] = useState<string>('all');
    const [isVegOnly, setIsVegOnly] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (restaurantId) {
            fetchMenu(restaurantId).then(data => {
                const fetchedCategories = data.categories || [];
                const fetchedItems = data.items || [];
                
                setCategories([{ _id: 'all', name: 'All' }, ...fetchedCategories]);
                setMenuItems(fetchedItems);
                setLoading(false);
            }).catch(e => {
                console.error('Error fetching menu:', e);
                setLoading(false);
            });
        }
    }, [restaurantId]);

    const filteredItems = useMemo(() => {
        return menuItems.filter(item => {
            if (isVegOnly && !item.isVeg) return false;
            if (activeCategory !== 'all' && item.categoryId !== activeCategory) return false;
            return true;
        });
    }, [isVegOnly, activeCategory, menuItems]);

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
                <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin mb-4" />
                <p className="text-gray-500 font-medium">Loading menu...</p>
            </div>
        );
    }

    return (
        <div className="pb-32 bg-gray-50 min-h-screen">
            {/* Header */}
            <header className="bg-white px-4 py-4 shadow-sm sticky top-0 z-30">
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-2xl font-black text-gray-900 leading-tight">Great Indian Eats</h1>
                        {tableNumber ? (
                            <p className="text-sm font-semibold text-brand-700 bg-red-50 inline-block px-3 py-1 mt-2 rounded-lg">
                                Dining at Table {tableName || '...'}
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
                            key={cat._id}
                            onClick={() => setActiveCategory(cat._id)}
                            className={`whitespace-nowrap px-4 py-1.5 rounded-full font-semibold transition-all border ${activeCategory === cat._id
                                ? 'bg-gray-900 border-gray-900 text-white shadow-md'
                                : 'bg-white border-gray-200 text-gray-600'
                                }`}
                        >
                            {cat.name}
                        </button>
                    ))}
                </div>
            </header>

            {/* Menu List */}
            <main className="p-4">
                {filteredItems.map(item => (
                    <MenuItemCard key={item._id} item={item} />
                ))}
                {filteredItems.length === 0 && (
                    <div className="text-center text-gray-500 py-10">No items match your filters.</div>
                )}
            </main>

            {hasLiveOrder && (
                <div className={`fixed left-0 right-0 px-4 z-40 max-w-md mx-auto transition-all duration-500 flex justify-end ${items.length > 0 ? 'bottom-24' : 'bottom-6'}`}>
                    <button 
                        onClick={() => navigate('/table-order')}
                        className={`bg-gray-900 text-white font-bold shadow-2xl flex items-center transition-all duration-500 overflow-hidden
                            ${isScrolled ? 'w-14 h-14 rounded-full justify-center p-0' : 'w-full py-3.5 px-5 rounded-2xl justify-between'}`}
                    >
                        {isScrolled ? (
                            <span className="relative flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                            </span>
                        ) : (
                            <>
                                <span className="flex items-center gap-2 whitespace-nowrap">
                                    <span className="relative flex h-3 w-3">
                                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                      <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                                    </span>
                                    Live Table Session
                                </span>
                                <span className="text-sm whitespace-nowrap">View Bill &rarr;</span>
                            </>
                        )}
                    </button>
                </div>
            )}

            <CartBottomSheet />
        </div>
    );
};
