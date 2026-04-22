import { ShoppingBag, ChevronRight } from 'lucide-react';
import { useCartStore } from '../store/cartStore';
import { useNavigate } from 'react-router-dom';

export const CartBottomSheet = () => {
    const { getItemCount, getTotal } = useCartStore();
    const navigate = useNavigate();

    const count = getItemCount();
    const total = getTotal();

    if (count === 0) return null;

    return (
        <div className="fixed bottom-0 left-0 right-0 w-full z-40 px-4 pb-4 max-w-md mx-auto">
            <div
                onClick={() => navigate('/checkout')}
                className="bg-brand-700 hover:bg-brand-800 cursor-pointer text-white p-4 rounded-2xl shadow-xl flex items-center justify-between transition-colors"
            >
                <div className="flex items-center gap-3">
                    <div className="bg-white/20 p-2 rounded-full relative">
                        <ShoppingBag size={24} />
                        <span className="absolute -top-1 -right-1 bg-white text-brand-700 text-xs font-black rounded-full h-5 w-5 flex items-center justify-center">
                            {count}
                        </span>
                    </div>
                    <div>
                        <p className="text-xs text-brand-100 uppercase tracking-wider font-semibold">Total Amount</p>
                        <p className="font-bold text-xl">₹{total}</p>
                    </div>
                </div>

                <div className="flex items-center gap-1 font-bold text-lg">
                    View Cart <ChevronRight size={20} />
                </div>
            </div>
        </div>
    );
};
