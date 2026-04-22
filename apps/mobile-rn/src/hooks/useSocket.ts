import { useEffect } from 'react';
import { onSocketEvent } from '../services/socket';
import { SocketEvents } from '../constants/socketEvents';
import { useOrdersStore } from '../store/ordersStore';
import { useTablesStore } from '../store/tablesStore';
import { useNotificationsStore } from '../store/notificationsStore';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

export function useSocket() {
    const addOrder = useOrdersStore((s) => s.addOrder);
    const updateOrder = useOrdersStore((s) => s.updateOrder);
    const updateTableStatus = useTablesStore((s) => s.updateTableStatus);
    const incrementUnread = useNotificationsStore((s) => s.increment);

    useEffect(() => {
        const unsubs = [
            onSocketEvent(SocketEvents.NEW_ORDER, (data: any) => {
                addOrder(data);
                incrementUnread();
                // ReactNativeHapticFeedback.trigger('notificationSuccess');
            }),
            onSocketEvent(SocketEvents.ORDER_UPDATED, (data: any) => {
                updateOrder(data);
            }),
            onSocketEvent(SocketEvents.TABLE_STATUS_CHANGED, (data: any) => {
                updateTableStatus(data.tableId, data.status, data.currentOrderId);
            }),
            onSocketEvent(SocketEvents.ITEM_STATUS_CHANGED, (data: any) => {
                // Kitchen or waiter notification
                incrementUnread();
                // ReactNativeHapticFeedback.trigger('notificationWarning');
            }),
            onSocketEvent(SocketEvents.INVENTORY_ALERT, (data: any) => {
                incrementUnread();
            }),
        ];

        return () => unsubs.forEach((unsub) => unsub());
    }, []);
}
