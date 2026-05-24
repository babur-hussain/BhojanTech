import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getSocket } from '../services/socket';
import { CheckCircle, Clock, ChefHat } from 'lucide-react';

export const Tracking = () => {
    const { orderId } = useParams();
    const navigate = useNavigate();
    const [status, setStatus] = useState('PENDING'); // PENDING | PREPARING | READY

    useEffect(() => {
        if (!orderId) {
            navigate('/menu');
            return;
        }

        const socket = getSocket();

        // In production we would join_order and get the current real status
        // For stub/demo we'll just listen or artificially advance
        socket.emit('join_order', orderId);

        // Mock progress after 5 seconds to show UI if backend isn't connected
        const timer = setTimeout(() => setStatus('PREPARING'), 5000);
        const timer2 = setTimeout(() => setStatus('READY'), 15000);

        socket.on('order_status_update', (data: any) => {
            if (data.orderId === orderId) {
                setStatus(data.status);
            }
        });

        return () => {
            socket.off('order_status_update');
            clearTimeout(timer);
            clearTimeout(timer2);
        };
    }, [orderId, navigate]);

    return (
        <div className="bg-gray-50 min-h-screen flex flex-col items-center justify-center p-6 text-center">

            {status === 'READY' && (
                <div className="mb-8 animate-bounce-slow text-green-500">
                    <CheckCircle size={80} />
                </div>
            )}

            {status === 'PREPARING' && (
                <div className="mb-8 text-brand-500 animate-pulse">
                    <ChefHat size={80} />
                </div>
            )}

            {status === 'PENDING' && (
                <div className="mb-8 text-amber-500 animate-pulse">
                    <Clock size={80} />
                </div>
            )}

            <h1 className="text-3xl font-black text-gray-900 mb-2">
                {status === 'PENDING' && 'Order Received!'}
                {status === 'PREPARING' && 'Preparing your food...'}
                {status === 'READY' && 'Your food is ready! 🍽️'}
            </h1>

            <p className="text-gray-500 mb-8 font-medium px-4">
                {status === 'PENDING' && 'We have received your order and the kitchen is reviewing it.'}
                {status === 'PREPARING' && "The chef is cooking your delicious meal right now. Hang tight!"}
                {status === 'READY' && "Please pick up your order from the counter or wait for the server."}
            </p>

            <div className="bg-white shadow-sm border border-gray-100 rounded-2xl w-full p-6 text-left">
                <p className="text-sm text-gray-500 uppercase font-bold tracking-wider mb-1">Order Number</p>
                <p className="text-2xl font-black font-mono">#{orderId?.slice(-6).toUpperCase()}</p>
            </div>

            <button onClick={() => navigate('/menu')} className="mt-10 font-bold text-brand-600 hover:text-brand-800">
                Browse Menu again
            </button>

            {/* Basic Confetti overlay on ready */}
            {status === 'READY' && (
                <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden flex justify-center">
                    {/* Simple confetti dots via CSS */}
                    <div className="w-2 h-2 bg-red-500 rounded-full absolute top-10 animate-bounce"></div>
                    <div className="w-2 h-2 bg-blue-500 rounded-full absolute top-20 right-10 animate-pulse"></div>
                    <div className="w-2 h-2 bg-yellow-500 rounded-full absolute top-10 left-10 animate-ping"></div>
                </div>
            )}
        </div>
    );
};
