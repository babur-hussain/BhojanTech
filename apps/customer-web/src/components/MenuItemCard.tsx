import { useState } from 'react';
import { useCartStore } from '../store/cartStore';

export const MenuItemCard = ({ item }: { item: any }) => {
    const [showVariants, setShowVariants] = useState(false);
    const addItem = useCartStore(s => s.addItem);

    const handleAdd = (variant?: any) => {
        addItem({
            menuItemId: item._id || item.id,
            name: item.name,
            variantName: variant ? variant.name : undefined,
            price: variant ? variant.priceINR : item.variants[0]?.priceINR || 0,
            quantity: 1,
            isVeg: item.isVeg,
        });
        setShowVariants(false);
    };

    const mainPrice = item.variants?.length ? item.variants[0].priceINR : 0;

    return (
        <div className="bg-white p-4 rounded-xl shadow-sm mb-4 border border-gray-100 flex gap-4">
            <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                    <div className={`w-3 h-3 rounded-full border border-gray-300 flex items-center justify-center p-[2px]`}>
                        <div className={`w-full h-full rounded-full ${item.isVeg ? 'bg-green-500' : 'bg-red-500'}`} />
                    </div>
                    {item.isBestseller && <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded">Bestseller</span>}
                    {item.spiceLevel === 'SPICY' && <span className="text-red-500 text-xs">🌶️</span>}
                </div>

                <h3 className="font-bold text-gray-900 text-lg">{item.name}</h3>
                {item.hindiName && <p className="text-sm text-gray-500 mb-1">{item.hindiName}</p>}

                <p className="text-brand-600 font-semibold mb-2">₹{mainPrice}</p>
                <p className="text-sm text-gray-500 line-clamp-2">{item.description}</p>
            </div>

            <div className="relative">
                {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.name} className="w-28 h-28 object-cover rounded-xl shadow-sm" />
                ) : (
                    <div className="w-28 h-28 bg-brand-50 rounded-xl flex items-center justify-center text-brand-200">No Image</div>
                )}

                <div className="absolute -bottom-3 left-1/2 -translate-x-1/2">
                    {item.variants?.length > 1 ? (
                        <button
                            onClick={() => setShowVariants(!showVariants)}
                            className="bg-white text-brand-600 border border-brand-100 shadow-md font-bold text-sm px-6 py-1.5 rounded-lg"
                        >
                            ADD +
                        </button>
                    ) : (
                        <button
                            onClick={() => handleAdd()}
                            className="bg-brand-600 text-white shadow-md font-bold text-sm px-6 py-1.5 rounded-lg"
                        >
                            ADD
                        </button>
                    )}
                </div>
            </div>

            {showVariants && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center">
                    <div className="bg-white w-full max-w-md rounded-t-2xl p-6 bottom-sheet-up">
                        <h3 className="text-xl font-bold mb-4">Select Variant</h3>
                        <div className="space-y-3">
                            {item.variants.map((v: any, idx: number) => (
                                <div key={idx} className="flex justify-between items-center p-3 border rounded-xl border-gray-100">
                                    <div>
                                        <p className="font-semibold">{v.name}</p>
                                        <p className="text-brand-600">₹{v.priceINR}</p>
                                    </div>
                                    <button
                                        onClick={() => handleAdd(v)}
                                        className="bg-brand-50 text-brand-700 px-4 py-2 font-bold rounded-lg"
                                    >
                                        Add
                                    </button>
                                </div>
                            ))}
                        </div>
                        <button onClick={() => setShowVariants(false)} className="mt-6 w-full py-3 font-semibold text-gray-500">Cancel</button>
                    </div>
                </div>
            )}
        </div>
    );
};
