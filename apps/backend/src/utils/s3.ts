import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Readable } from 'stream';

const s3Region = process.env.S3_REGION || process.env.AWS_REGION || 'ap-south-1';

const s3Client = new S3Client({
  region: s3Region,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID || 'dummy',
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY || 'dummy',
  },
});

const getBucketName = () => process.env.S3_BUCKET_NAME || 'restaurant-os-assets';

/**
 * Extract the S3 key from a full S3/CloudFront URL or a proxy URL.
 * Returns the key portion (e.g. "menu-items/1234-image.webp").
 */
export const extractS3Key = (url: string): string | null => {
  // Handle proxy URLs: /api/media/menu-items/...
  const proxyMatch = url.match(/\/api\/media\/(.+)$/);
  if (proxyMatch) return decodeURIComponent(proxyMatch[1]);

  // Handle direct S3 URLs
  const bucketName = getBucketName();
  const s3Pattern = new RegExp(`${bucketName}\\.s3[^/]*\\.amazonaws\\.com/(.+)$`);
  const s3Match = url.match(s3Pattern);
  if (s3Match) return decodeURIComponent(s3Match[1]);

  // Handle CloudFront URLs
  if (process.env.CLOUDFRONT_DOMAIN) {
    const cfPattern = new RegExp(`${process.env.CLOUDFRONT_DOMAIN}/(.+)$`);
    const cfMatch = url.match(cfPattern);
    if (cfMatch) return decodeURIComponent(cfMatch[1]);
  }

  return null;
};

/**
 * Fetch an object from S3 and return its stream, content type, and content length.
 */
export const getS3Object = async (key: string): Promise<{
  body: Readable;
  contentType: string;
  contentLength: number | undefined;
  cacheControl: string | undefined;
}> => {
  const bucketName = getBucketName();
  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: key,
  });

  const response = await s3Client.send(command);
  return {
    body: response.Body as Readable,
    contentType: response.ContentType || 'application/octet-stream',
    contentLength: response.ContentLength,
    cacheControl: response.CacheControl,
  };
};

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
  // Return proxy URL so images are always accessible
  const publicUrl = getProxyUrl(key);

  return { signedUrl, publicUrl, key };
};

import sharp from 'sharp';

/**
 * Build the proxy URL for a given S3 key.
 * Uses the API_BASE_URL env var if set, otherwise falls back to a relative path.
 */
const getProxyUrl = (key: string): string => {
  const base = process.env.API_BASE_URL || '';
  return `${base}/api/media/${key}`;
};

/**
 * Upload a file buffer directly to S3 from the server.
 * This avoids CORS issues since the upload happens server-to-server.
 * Automatically optimizes the image and converts it to WebP.
 * Returns a proxy URL (/api/media/...) so images are served through the backend.
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

  const publicUrl = getProxyUrl(key);
  return { publicUrl, key };
};
