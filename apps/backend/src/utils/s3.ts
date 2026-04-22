import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'ap-south-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'dummy',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'dummy',
  },
});

export const generatePresignedUrl = async (fileName: string, fileType: string) => {
  const bucketName = process.env.S3_BUCKET_NAME || 'restaurant-os-assets';
  const key = `menu-items/${Date.now()}-${fileName}`;

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    ContentType: fileType,
    // Add cache control if using CloudFront
    CacheControl: 'max-age=31536000',
  });

  const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
  const publicUrl = `https://${process.env.CLOUDFRONT_DOMAIN || `${bucketName}.s3.amazonaws.com`}/${key}`;

  return { signedUrl, publicUrl, key };
};
