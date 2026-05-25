import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, ChevronRight, ShoppingBag } from 'lucide-react';
import { useCartStore } from '../store/cartStore';

const SpiceLabel: Record<string, string> = {
    MILD: '🌿 Mild',
    MEDIUM: '🌶️ Medium',
    SPICY: '🌶️🌶️ Spicy',
};

const AllergenEmoji: Record<string, string> = {
    nuts: '🥜 Nuts',
    dairy: '🥛 Dairy',
    gluten: '🌾 Gluten',
    egg: '🥚 Egg',
    soy: '🫘 Soy',
    seafood: '🦐 Seafood',
};

export const ItemDetail = () => {
    const { state } = useLocation();
    const navigate = useNavigate();
    const addItem = useCartStore(s => s.addItem);
    const cartCount = useCartStore(s => s.getItemCount());

    const item = state?.item;
    if (!item) {
        navigate('/menu', { replace: true });
        return null;
    }

    const images: string[] = [
        ...(item.imageUrls || []),
        ...(item.imageUrl && !(item.imageUrls || []).includes(item.imageUrl) ? [item.imageUrl] : []),
    ].filter(Boolean);

    const [currentImage, setCurrentImage] = useState(0);
    const [selectedVariant, setSelectedVariant] = useState(0);
    const [added, setAdded] = useState(false);

    const variant = item.variants?.[selectedVariant];
    const price = variant?.specialPriceINR || variant?.priceINR || 0;
    const originalPrice = variant?.priceINR || 0;
    const hasDiscount = variant?.specialPriceINR && variant.specialPriceINR < originalPrice;

    const handleAdd = () => {
        addItem({
            menuItemId: item._id || item.id,
            name: item.name,
            variantName: item.variants?.length > 1 ? variant?.name : undefined,
            price,
            quantity: 1,
            isVeg: item.isVeg,
            gstSlab: item.gstSlab ?? 0,
        });
        setAdded(true);
        setTimeout(() => {
            setAdded(false);
            navigate('/checkout');
        }, 500);
    };

    return (
        <div className="min-h-screen bg-white flex flex-col">
            {/* Image Gallery */}
            <div className="relative bg-gray-100" style={{ height: '55vw', maxHeight: 320 }}>
                {images.length > 0 ? (
                    <>
                        <img
                            src={images[currentImage]}
                            alt={item.name}
                            className="w-full h-full object-cover"
                        />
                        {images.length > 1 && (
                            <>
                                <button
                                    onClick={() => setCurrentImage(i => Math.max(0, i - 1))}
                                    disabled={currentImage === 0}
                                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/40 text-white rounded-full p-1 disabled:opacity-30"
                                >
                                    <ChevronLeft size={20} />
                                </button>
                                <button
                                    onClick={() => setCurrentImage(i => Math.min(images.length - 1, i + 1))}
                                    disabled={currentImage === images.length - 1}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/40 text-white rounded-full p-1 disabled:opacity-30"
                                >
                                    <ChevronRight size={20} />
                                </button>
                                {/* Dots */}
                                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                                    {images.map((_, i) => (
                                        <button
                                            key={i}
                                            onClick={() => setCurrentImage(i)}
                                            className={`w-2 h-2 rounded-full transition-all ${i === currentImage ? 'bg-white scale-125' : 'bg-white/50'}`}
                                        />
                                    ))}
                                </div>
                            </>
                        )}
                        {/* Thumbnail strip */}
                        {images.length > 1 && (
                            <div className="absolute bottom-0 left-0 right-0 flex gap-2 px-3 pb-8 overflow-x-auto scrollbar-hide">
                                {images.map((img, i) => (
                                    <button key={i} onClick={() => setCurrentImage(i)}>
                                        <img
                                            src={img}
                                            alt=""
                                            className={`w-12 h-12 object-cover rounded-lg border-2 transition-all ${i === currentImage ? 'border-white opacity-100' : 'border-transparent opacity-60'}`}
                                        />
                                    </button>
                                ))}
                            </div>
                        )}
                    </>
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300 text-4xl">🍽️</div>
                )}

                {/* Back + Cart header overlay */}
                <div className="absolute top-0 left-0 right-0 flex justify-between items-center p-3">
                    <button
                        onClick={() => navigate(-1)}
                        className="bg-black/40 text-white rounded-full p-2 backdrop-blur-sm"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <button
                        onClick={() => navigate('/checkout')}
                        className="bg-black/40 text-white rounded-full p-2 backdrop-blur-sm relative"
                    >
                        <ShoppingBag size={20} />
                        {cartCount > 0 && (
                            <span className="absolute -top-1 -right-1 bg-brand-600 text-white text-[10px] font-black rounded-full h-4 w-4 flex items-center justify-center">
                                {cartCount}
                            </span>
                        )}
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 px-4 pt-4 pb-32">
                {/* Title row */}
                <div className="flex items-start gap-3 mb-2">
                    <div className={`mt-1 w-4 h-4 flex-shrink-0 border-2 flex items-center justify-center ${item.isVeg ? 'border-green-600' : 'border-red-600'}`}>
                        <div className={`w-2 h-2 rounded-full ${item.isVeg ? 'bg-green-600' : 'bg-red-600'}`} />
                    </div>
                    <h1 className="text-2xl font-black text-gray-900 leading-tight">{item.name}</h1>
                </div>

                {item.hindiName && <p className="text-gray-400 text-sm mb-3 pl-7">{item.hindiName}</p>}

                {/* Badges */}
                <div className="flex flex-wrap gap-2 mb-4 pl-7">
                    {item.isBestseller && (
                        <span className="bg-amber-100 text-amber-800 text-xs font-bold px-2.5 py-1 rounded-full">⭐ Bestseller</span>
                    )}
                    {item.isChefSpecial && (
                        <span className="bg-purple-100 text-purple-800 text-xs font-bold px-2.5 py-1 rounded-full">👨‍🍳 Chef's Special</span>
                    )}
                    {item.spiceLevel && item.spiceLevel !== 'MILD' && (
                        <span className="bg-red-50 text-red-700 text-xs font-bold px-2.5 py-1 rounded-full">
                            {SpiceLabel[item.spiceLevel] || item.spiceLevel}
                        </span>
                    )}
                    {item.preparationTime && (
                        <span className="bg-blue-50 text-blue-700 text-xs font-bold px-2.5 py-1 rounded-full">⏱ {item.preparationTime} min</span>
                    )}
                    {item.calories && (
                        <span className="bg-green-50 text-green-700 text-xs font-bold px-2.5 py-1 rounded-full">🔥 {item.calories} kcal</span>
                    )}
                </div>

                {/* Description */}
                {item.description && (
                    <p className="text-gray-600 text-sm leading-relaxed mb-5">{item.description}</p>
                )}

                {/* Allergens */}
                {item.allergenTags?.length > 0 && (
                    <div className="mb-5">
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Allergens</p>
                        <div className="flex flex-wrap gap-2">
                            {item.allergenTags.map((tag: string) => (
                                <span key={tag} className="bg-yellow-50 border border-yellow-200 text-yellow-800 text-xs px-2.5 py-1 rounded-full font-medium">
                                    {AllergenEmoji[tag.toLowerCase()] || tag}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {/* Dietary Tags */}
                {item.dietaryTags?.length > 0 && (
                    <div className="mb-5">
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Dietary Info</p>
                        <div className="flex flex-wrap gap-2">
                            {item.dietaryTags.map((tag: string) => (
                                <span key={tag} className="bg-green-50 border border-green-200 text-green-800 text-xs px-2.5 py-1 rounded-full font-medium capitalize">{tag}</span>
                            ))}
                        </div>
                    </div>
                )}

                {/* Variants */}
                {item.variants?.length > 0 && (
                    <div className="mb-5">
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                            {item.variants.length > 1 ? 'Choose Variant' : 'Pricing'}
                        </p>
                        <div className="space-y-2">
                            {item.variants.map((v: any, idx: number) => {
                                const vPrice = v.specialPriceINR || v.priceINR;
                                const vOriginal = v.priceINR;
                                const vHasDiscount = v.specialPriceINR && v.specialPriceINR < vOriginal;
                                return (
                                    <button
                                        key={idx}
                                        onClick={() => setSelectedVariant(idx)}
                                        className={`w-full flex justify-between items-center p-3 rounded-xl border-2 transition-all ${selectedVariant === idx
                                            ? 'border-brand-600 bg-brand-50'
                                            : 'border-gray-100 bg-gray-50'
                                            }`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${selectedVariant === idx ? 'border-brand-600' : 'border-gray-300'}`}>
                                                {selectedVariant === idx && <div className="w-2 h-2 rounded-full bg-brand-600" />}
                                            </div>
                                            <span className="font-semibold text-gray-800">{v.name}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-gray-900">₹{vPrice}</span>
                                            {vHasDiscount && <span className="text-xs text-gray-400 line-through">₹{vOriginal}</span>}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* GST notice */}
                {item.gstSlab > 0 && (
                    <p className="text-xs text-gray-400 text-center mb-2">+ {item.gstSlab}% GST applicable at checkout</p>
                )}
            </div>

            {/* Sticky Add to Cart */}
            <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto p-4 bg-white border-t border-gray-100 shadow-lg">
                <div className="flex items-center justify-between mb-3">
                    <div>
                        <span className="text-2xl font-black text-gray-900">₹{price}</span>
                        {hasDiscount && <span className="text-sm text-gray-400 line-through ml-2">₹{originalPrice}</span>}
                    </div>
                    {hasDiscount && (
                        <span className="text-xs bg-green-100 text-green-700 font-bold px-2 py-1 rounded-full">
                            {Math.round((1 - price / originalPrice) * 100)}% off
                        </span>
                    )}
                </div>
                <button
                    onClick={handleAdd}
                    className={`w-full py-4 rounded-2xl font-black text-lg shadow-lg transition-all ${added
                        ? 'bg-green-500 text-white scale-95'
                        : 'bg-brand-600 hover:bg-brand-700 text-white'
                        }`}
                >
                    {added ? '✓ Added to Cart!' : `Add to Cart · ₹${price}`}
                </button>
            </div>
        </div>
    );
};
