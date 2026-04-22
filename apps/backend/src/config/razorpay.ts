import Razorpay from 'razorpay';
import dotenv from 'dotenv';

dotenv.config();

const key_id = process.env.RAZORPAY_KEY_ID || '';
const key_secret = process.env.RAZORPAY_KEY_SECRET || '';

let razorpayInstance: Razorpay | null = null;

if (key_id && key_secret) {
  razorpayInstance = new Razorpay({
    key_id,
    key_secret,
  });
  console.log('Razorpay initialized.');
} else {
  console.warn('Razorpay keys are missing. Payments will not work.');
}

export const razorpay = razorpayInstance;
