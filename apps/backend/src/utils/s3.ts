import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3Region = process.env.S3_REGION || process.env.AWS_REGION || 'ap-south-1';

const s3Client = new S3Client({
  region: s3Region,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID || 'dummy',
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY || 'dummy',
  },
});

const getBucketName = () => process.env.S3_BUCKET_NAME || 'restaurant-os-assets';

export const generatePresignedUrl = async (fileName: string, fileType: string) => {
  const bucketName = getBucketName();
  const key = `menu-items/${Date.now()}-${fileName}`;

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    ContentType: fileType,
    CacheControl: 'max-age=31536000',
  });

  const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
  const publicUrl = `https://${process.env.CLOUDFRONT_DOMAIN || `${bucketName}.s3.${s3Region}.amazonaws.com`}/${key}`;

  return { signedUrl, publicUrl, key };
};

import sharp from 'sharp';

/**
 * Upload a file buffer directly to S3 from the server.
 * This avoids CORS issues since the upload happens server-to-server.
 * Automatically optimizes the image and converts it to WebP.
 */
export const uploadToS3 = async (
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string
): Promise<{ publicUrl: string; key: string }> => {
  const bucketName = getBucketName();
  
  // Optimize using sharp and convert to WebP
  let optimizedBuffer = fileBuffer;
  let finalMimeType = mimeType;
  let optimizedFileName = fileName;

  try {
    // Only process if it's an image (and not already an optimized vector like SVG)
    if (mimeType.startsWith('image/') && mimeType !== 'image/svg+xml') {
      optimizedBuffer = await sharp(fileBuffer)
        .webp({ quality: 80 })
        .toBuffer();
      finalMimeType = 'image/webp';
      // Replace extension with .webp
      optimizedFileName = fileName.replace(/\.[^/.]+$/, "") + ".webp";
    }
  } catch (error) {
    console.error('Error optimizing image with sharp:', error);
    // If sharp fails (e.g. invalid image), fallback to original buffer
  }

  const key = `menu-items/${Date.now()}-${optimizedFileName.replace(/\s+/g, '_')}`;

  await s3Client.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: optimizedBuffer,
      ContentType: finalMimeType,
      CacheControl: 'max-age=31536000',
    })
  );

  const publicUrl = `https://${process.env.CLOUDFRONT_DOMAIN || `${bucketName}.s3.${s3Region}.amazonaws.com`}/${key}`;
  return { publicUrl, key };
};
