import { Router, Request, Response } from 'express';
import { getS3Object } from '../utils/s3';

const router: Router = Router();

/**
 * GET /api/media/*
 * 
 * Image proxy endpoint — streams S3 objects through the backend.
 * This avoids needing public S3 bucket access or CloudFront.
 * 
 * Supports aggressive caching since image URLs include timestamps
 * and are immutable once uploaded.
 */
router.get('/*', async (req: Request, res: Response) => {
  try {
    // Extract the S3 key from the URL path after /api/media/
    const key = req.params[0];
    if (!key) {
      return res.status(400).json({ error: 'No media key specified' });
    }

    // Security: only allow access to known prefixes
    const allowedPrefixes = ['menu-items/', 'categories/', 'restaurant/', 'uploads/'];
    const isAllowed = allowedPrefixes.some(prefix => key.startsWith(prefix));
    if (!isAllowed) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const s3Object = await getS3Object(key);

    // Set appropriate headers
    res.setHeader('Content-Type', s3Object.contentType);
    if (s3Object.contentLength) {
      res.setHeader('Content-Length', s3Object.contentLength);
    }
    // Aggressive caching — images are immutable (URL contains timestamp)
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    // Allow cross-origin access for images
    res.setHeader('Access-Control-Allow-Origin', '*');

    // Stream the S3 object body to the response
    s3Object.body.pipe(res);
  } catch (error: any) {
    if (error?.name === 'NoSuchKey' || error?.$metadata?.httpStatusCode === 404) {
      return res.status(404).json({ error: 'Image not found' });
    }
    console.error('[media-proxy] Error streaming S3 object:', error);
    return res.status(500).json({ error: 'Failed to fetch image' });
  }
});

export default router;
