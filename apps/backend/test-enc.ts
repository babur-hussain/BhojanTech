import mongoose from 'mongoose';
import { fieldEncryption } from 'mongoose-field-encryption';

const Schema = mongoose.Schema;
const UserSchema = new Schema({
    name: String,
    phone: String
});

UserSchema.plugin(fieldEncryption, {
    fields: ['phone'],
    secret: 'change-me-to-a-32-char-secret!!'
});

const User = mongoose.model('UserTest', UserSchema);

async function run() {
    await mongoose.connect('mongodb://localhost:27017/restaurant-system');
    const u = new User({ name: 'Bob', phone: '1234567890' });
    await u.save();
    console.log('Saved:', u.toObject());
    
    const fetched = await User.findById(u._id);
    console.log('Fetched:', fetched?.toObject());
    console.log('Fetched raw:', fetched);
    if (fetched && (fetched as any).decryptFieldsSync) {
        (fetched as any).decryptFieldsSync();
        console.log('After decrypt:', fetched.toObject());
    }
    
    process.exit(0);
}
run();
