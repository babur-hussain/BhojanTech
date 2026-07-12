import { Request, Response } from 'express';
import { MenuCategory } from '../models/MenuCategory';
import { MenuItem } from '../models/MenuItem';

export const deduplicateMenu = async (req: Request, res: Response) => {
  try {
    const categories = await MenuCategory.find().lean();
    
    const duplicates: string[] = [];
    let deletedCount = 0;
    
    // Group by restaurantId + branchId + name
    const grouped = new Map<string, any[]>();
    for (const cat of categories) {
      const key = `${cat.restaurantId}_${cat.branchId || 'global'}_${cat.name}`;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(cat);
    }
    
    for (const [key, cats] of Array.from(grouped.entries())) {
      if (cats.length > 1) {
        cats.sort((a: any, b: any) => (a.isAvailable === b.isAvailable ? 0 : a.isAvailable ? -1 : 1));
        const keep = cats[0];
        const removeIds = cats.slice(1).map((c: any) => c._id);
        
        await MenuCategory.deleteMany({ _id: { $in: removeIds } });
        
        await MenuItem.updateMany(
          { categoryId: { $in: removeIds } },
          { $set: { categoryId: keep._id } }
        );
        
        deletedCount += removeIds.length;
        duplicates.push(`Kept ${keep.name}, deleted ${removeIds.length} copies.`);
      }
    }
    
    const items = await MenuItem.find().lean();
    const itemGroup = new Map<string, any[]>();
    let deletedItemsCount = 0;
    
    for (const item of items) {
      const key = `${item.restaurantId}_${item.branchId || 'global'}_${item.categoryId}_${item.name}`;
      if (!itemGroup.has(key)) itemGroup.set(key, []);
      itemGroup.get(key)!.push(item);
    }
    
    for (const [key, itms] of Array.from(itemGroup.entries())) {
      if (itms.length > 1) {
        itms.sort((a: any, b: any) => (a.isAvailable === b.isAvailable ? 0 : a.isAvailable ? -1 : 1));
        const keep = itms[0];
        const removeIds = itms.slice(1).map((i: any) => i._id);
        
        await MenuItem.deleteMany({ _id: { $in: removeIds } });
        deletedItemsCount += removeIds.length;
        duplicates.push(`Kept item ${keep.name}, deleted ${removeIds.length} copies.`);
      }
    }

    res.json({
      success: true,
      message: `Deleted ${deletedCount} duplicate categories and ${deletedItemsCount} duplicate items.`,
      details: duplicates
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: String(error) });
  }
};
