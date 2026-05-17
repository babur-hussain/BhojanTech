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
        let cleanupFn: (() => void) | null = null;

        if (tableNumber) {
            getTableInfo(tableNumber).then(data => {
                setTableName(data.number || null);
            }).catch(console.error);

            getLiveTableOrder(tableNumber).then(order => {
                if (order && (order.status === 'OPEN' || order.status === 'BILLED')) {
                    setHasLiveOrder(true);
                    
                    // Listen to real-time updates for this order so banner disappears
                    import('../services/socket').then(({ getSocket, joinOrderRoom }) => {
                        const socket = getSocket();
                        joinOrderRoom(order._id);
                        
                        const handleOrderUpdate = (data: any) => {
                            if (data.type === 'ORDER_PAID' || data.type === 'ORDER_COMPLETED' || data.type === 'ORDER_CANCELLED') {
                                setHasLiveOrder(false);
                            }
                        };
                        
                        socket.on('order_update', handleOrderUpdate);
                        
                        cleanupFn = () => {
                            socket.off('order_update', handleOrderUpdate);
                        };
                    });
                }
            }).catch(() => {
                setHasLiveOrder(false);
            });
        }

        return () => {
            if (cleanupFn) cleanupFn();
        };
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
    const [restaurantName, setRestaurantName] = useState<string>('Restaurant Menu');

    useEffect(() => {
        if (restaurantId) {
            fetchMenu(restaurantId).then(data => {
                const fetchedCategories = data.categories || [];
                const fetchedItems = data.items || [];

                if (data.restaurant?.name) {
                    setRestaurantName(data.restaurant.name);
                }

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

    if (!restaurantId) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center">
                <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mb-4">
                    <span className="text-2xl font-bold">!</span>
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">No Restaurant Selected</h2>
                <p className="text-gray-500">Please scan a table QR code or use a valid restaurant link to view the menu.</p>
            </div>
        );
    }

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
                        <h1 className="text-2xl font-black text-gray-900 leading-tight">{restaurantName}</h1>
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
                <div className="mt-4 -mx-4 px-4 overflow-x-auto scrollbar-hide">
                    <div className="flex gap-3 pb-2 w-max">
                        {categories.map(cat => {
                            const isActive = activeCategory === cat._id;
                            return (
                                <button
                                    key={cat._id}
                                    onClick={() => setActiveCategory(cat._id)}
                                    className={`w-[86px] flex flex-col overflow-hidden rounded-xl transition-all border-2
                                        ${isActive
                                            ? 'border-brand-600 shadow-lg scale-[1.03]'
                                            : 'border-gray-200 shadow-sm'
                                        }`}
                                >
                                    {/* Image or letter placeholder */}
                                    <div className="w-full h-[68px] overflow-hidden bg-gray-100">
                                        {cat.imageUrl ? (
                                            <img src={cat.imageUrl} alt={cat.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full bg-gradient-to-br from-gray-50 to-gray-200 flex items-center justify-center">
                                                <span className="text-3xl font-black text-gray-300 uppercase select-none">
                                                    {cat.name?.charAt(0)}
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Name */}
                                    <div className={`px-1.5 py-1.5 text-center transition-colors ${isActive ? 'bg-brand-600' : 'bg-white'}`}>
                                        <span className={`text-[12px] font-extrabold leading-tight block ${isActive ? 'text-white' : 'text-gray-900'}`}>
                                            {cat.name}
                                        </span>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
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
