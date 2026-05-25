import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import sharp from 'sharp';
import axios from 'axios';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

// Load env
dotenv.config();

// S3 Client Setup
const s3Region = process.env.S3_REGION || process.env.AWS_REGION || 'ap-south-1';
const s3Client = new S3Client({
  region: s3Region,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});
const bucketName = process.env.S3_BUCKET_NAME || 'restaurant-os-assets';
const cloudfrontDomain = process.env.CLOUDFRONT_DOMAIN || `${bucketName}.s3.${s3Region}.amazonaws.com`;

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/restaurant';

// Connect to MongoDB
const connectDB = async () => {
  await mongoose.connect(MONGODB_URI);
  console.log('MongoDB Connected');
};

const isTargetUrl = (url: string) => {
  if (!url) return false;
  if (!url.includes(cloudfrontDomain) && !url.includes('.amazonaws.com')) return false;
  if (url.toLowerCase().endsWith('.webp')) return false;
  return true;
};

const extractS3KeyFromUrl = (url: string) => {
  try {
    const parsedUrl = new URL(url);
    // Remove the leading slash to get the S3 key
    let key = parsedUrl.pathname;
    if (key.startsWith('/')) {
      key = key.substring(1);
    }
    // Handle cases where the bucket name is part of the path (if not using cloudfront)
    if (key.startsWith(`${bucketName}/`)) {
      key = key.substring(bucketName.length + 1);
    }
    return decodeURIComponent(key);
  } catch (e) {
    console.error('Error parsing URL', url);
    return null;
  }
};

const processImage = async (url: string): Promise<string | null> => {
  try {
    console.log(`Processing: ${url}`);
    
    // Download image
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    const buffer = Buffer.from(response.data);

    // Optimize
    const optimizedBuffer = await sharp(buffer)
      .webp({ quality: 80 })
      .toBuffer();

    // Generate new key
    const oldKey = extractS3KeyFromUrl(url);
    if (!oldKey) throw new Error('Could not extract S3 key');
    
    // Create new key by replacing extension
    const newKey = oldKey.replace(/\.[^/.]+$/, "") + ".webp";

    // Upload
    await s3Client.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: newKey,
        Body: optimizedBuffer,
        ContentType: 'image/webp',
        CacheControl: 'max-age=31536000',
      })
    );

    const newUrl = `https://${cloudfrontDomain}/${newKey}`;
    console.log(`Uploaded new WebP: ${newUrl}`);

    // Delete old
    try {
      await s3Client.send(
        new DeleteObjectCommand({
          Bucket: bucketName,
          Key: oldKey
        })
      );
      console.log(`Deleted original from S3: ${oldKey}`);
    } catch (e) {
      console.error(`Failed to delete old image ${oldKey}:`, e);
    }

    return newUrl;

  } catch (error) {
    console.error(`Error processing ${url}:`, error);
    return null;
  }
};

const run = async () => {
  await connectDB();

  // Process MenuCategories
  const MenuCategory = mongoose.connection.collection('menucategories');
  const categories = await MenuCategory.find({ imageUrl: { $exists: true, $ne: null } }).toArray();
  for (const cat of categories) {
    if (isTargetUrl(cat.imageUrl)) {
      const newUrl = await processImage(cat.imageUrl);
      if (newUrl) {
        await MenuCategory.updateOne({ _id: cat._id }, { $set: { imageUrl: newUrl } });
        console.log(`Updated MenuCategory ${cat._id}`);
      }
    }
  }

  // Process MenuItems
  const MenuItem = mongoose.connection.collection('menuitems');
  const items = await MenuItem.find({
    $or: [
      { imageUrl: { $exists: true, $ne: null } },
      { imageUrls: { $exists: true, $not: { $size: 0 } } }
    ]
  }).toArray();
  
  for (const item of items) {
    let updated = false;
    const updateData: any = {};

    if (item.imageUrl && isTargetUrl(item.imageUrl)) {
      const newUrl = await processImage(item.imageUrl);
      if (newUrl) {
        updateData.imageUrl = newUrl;
        updated = true;
      }
    }

    if (item.imageUrls && Array.isArray(item.imageUrls)) {
      const newUrls = [];
      let urlsUpdated = false;
      for (const url of item.imageUrls) {
        if (isTargetUrl(url)) {
          const newUrl = await processImage(url);
          if (newUrl) {
            newUrls.push(newUrl);
            urlsUpdated = true;
          } else {
            newUrls.push(url); // keep original if failed
          }
        } else {
          newUrls.push(url); // already processed or not target
        }
      }
      if (urlsUpdated) {
        updateData.imageUrls = newUrls;
        updated = true;
      }
    }

    if (updated) {
      await MenuItem.updateOne({ _id: item._id }, { $set: updateData });
      console.log(`Updated MenuItem ${item._id}`);
    }
  }

  // Process Restaurants
  const Restaurant = mongoose.connection.collection('restaurants');
  const restaurants = await Restaurant.find({ logoUrl: { $exists: true, $ne: null } }).toArray();
  for (const res of restaurants) {
    if (isTargetUrl(res.logoUrl)) {
      const newUrl = await processImage(res.logoUrl);
      if (newUrl) {
        await Restaurant.updateOne({ _id: res._id }, { $set: { logoUrl: newUrl } });
        console.log(`Updated Restaurant ${res._id}`);
      }
    }
  }

  // Process StaffMembers
  const StaffMember = mongoose.connection.collection('staffmembers');
  const staff = await StaffMember.find({ photoUrl: { $exists: true, $ne: null } }).toArray();
  for (const st of staff) {
    if (isTargetUrl(st.photoUrl)) {
      const newUrl = await processImage(st.photoUrl);
      if (newUrl) {
        await StaffMember.updateOne({ _id: st._id }, { $set: { photoUrl: newUrl } });
        console.log(`Updated StaffMember ${st._id}`);
      }
    }
  }

  console.log('Migration Completed.');
  process.exit(0);
};

run().catch(err => {
  console.error('Unhandled error', err);
  process.exit(1);
});
