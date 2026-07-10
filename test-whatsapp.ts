import { sendWhatsAppNotification } from './apps/backend/src/services/whatsappService';
async function test() {
  const res = await sendWhatsAppNotification('1234567890', 'test message');
  console.log(res);
}
test();
