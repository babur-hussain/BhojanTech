import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load env
dotenv.config({ path: path.join(__dirname, '../../.env') });

import { Restaurant } from '../models/Restaurant';
import { Branch } from '../models/Branch';
import { User, IUser } from '../models/User';
import { Order } from '../models/Order';
import { KOT } from '../models/KOT';
import { MenuItem } from '../models/MenuItem';
import { Table } from '../models/Table';
import { StaffMember } from '../models/StaffMember';
import { InventoryItem } from '../models/InventoryItem';
import { Invoice } from '../models/Invoice';

async function migrate() {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/restaurant_mgmt';
    console.log(`Connecting to: ${uri}`);
    await mongoose.connect(uri);

    const restaurants = await Restaurant.find();
    for (const r of restaurants) {
        let branch = await Branch.findOne({ restaurantId: r._id, name: 'Main Branch' });
        if (!branch) {
            branch = new Branch({
                restaurantId: r._id,
                name: 'Main Branch',
                address: r.address || 'H.Q.',
                city: 'Unknown City',
                pincode: '000000',
                phone: '1234567890',
                gstin: r.gstin,
                fssaiNumber: r.fssaiNumber,
                managerId: r.ownerId,
                invoicePrefix: 'MAIN',
                isActive: true,
            });
            await branch.save();
            console.log(`Created Branch for Restaurant: ${r.name}`);
        }

        // Migrate Users (Owner to SUPER_OWNER, rest get branchId)
        await User.updateMany({ restaurantId: r._id, role: 'OWNER' }, { $set: { role: 'SUPER_OWNER' } });
        await User.updateMany({ restaurantId: r._id, role: 'MANAGER' }, { $set: { role: 'BRANCH_MANAGER' } });
        await User.updateMany(
            { restaurantId: r._id, branchId: { $exists: false } },
            { $set: { branchId: branch._id } }
        );

        const models = [Order, KOT, MenuItem, Table, StaffMember, InventoryItem, Invoice];
        for (const Model of models) {
            const result = await Model.updateMany(
                { restaurantId: r._id, branchId: { $exists: false } },
                { $set: { branchId: branch._id } },
                { strict: false } // Allows branchId setting if schema happens to not strictly validate nested
            );
            if (result.modifiedCount > 0) {
                console.log(`Migrated ${result.modifiedCount} ${Model.modelName}s`);
            }
        }
    }

    console.log('Migration complete.');
    process.exit(0);
}

migrate().catch(err => {
    console.error(err);
    process.exit(1);
});
