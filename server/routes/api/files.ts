import { Router } from 'express';
import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';

import multer from 'multer';
import { userProfileRequestHandler } from '../../lib/util';
import { ProfileResponse } from '../../types/response';
import path from 'path';

const client = new S3Client({
  region: process.env.AWS_REGION,
  // region: 'us-east-2', // IF test, use this
});
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
});

const router = Router();
router.use(userProfileRequestHandler);

router.get('/', async function (req, res) {
  res.send('file');
});
// Upload image to s3
router.post(
  '/upload',
  upload.single('file'),
  async function (req: Express.Request, response: ProfileResponse<string>) {
    try {
      const file = req.file;
      const { userId } = response.locals.currentUser;
      if (!file) {
        throw new Error('No file uploaded.');
      }

      console.log('file=', file);

      const fileExt = path.extname(file.originalname);
      const key = `images/${userId}/${file.originalname.split(
        '.'[0]
      )}_${Date.now()}${fileExt}`;

      console.log('file key=', key);

      // BUCKET_NAME = 'omniflow.team' for dev env, and 'omniflow-team' for prod env
      const BUCKET_NAME = process.env.BUCKET_NAME;
      const command = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        Body: file.buffer,
      });

      const result = await client.send(command);
      console.log('file uploaded:', result);
      const fileUrl = `https://${BUCKET_NAME}.s3.amazonaws.com/${key}`;
      response.status(201).json({
        success: true,
        data: fileUrl,
      });
    } catch (error) {
      console.error('Error in POST /files/single-upload', error);
      response.status(500).json({
        success: false,
        errorMsg: (error as string | Error).toString(),
      });
    }
  }
);

// Upload built to s3
router.post(
  '/upload-built-file/:docId',
  upload.single('file'),
  async function (
    req: Express.Request & { params: { docId: string } },
    response: ProfileResponse<string>
  ) {
    try {
      const file = req.file;
      if (!file) {
        throw new Error('No file uploaded.');
      }

      const { docId } = req.params;

      console.log('file=', file);

      const key = `${docId}.json`;

      // BUCKET_NAME = 'omniflow.team' for dev env, and 'omniflow-team' for prod env
      const BUCKET_NAME = process.env.BUCKET_NAME;
      const command = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        Body: file.buffer,
      });

      const result = await client.send(command);
      console.log('file uploaded:', result);
      const fileUrl = `https://${BUCKET_NAME}.s3.amazonaws.com/${key}`;
      response.status(201).json({
        success: true,
        data: fileUrl,
      });
    } catch (error) {
      console.error('Error in POST /files/single-upload', error);
      response.status(500).json({
        success: false,
        errorMsg: (error as string | Error).toString(),
      });
    }
  }
);

// Modify proxy download route
router.get(
  '/proxy-download/:docId',
  async function (
    req: Express.Request & { params: { docId: string } },
    response: ProfileResponse<any>
  ) {
    try {
      const { docId } = req.params;

      if (!docId) {
        return response.status(400).json({
          success: false,
          errorMsg: 'Document ID is required',
        });
      }

      // Construct S3 file path using docId
      const key = `${docId}.json`;

      const command = new GetObjectCommand({
        Bucket: process.env.BUCKET_NAME,
        Key: key,
      });

      try {
        const s3Response = await client.send(command);
        const content = await s3Response.Body?.transformToString();

        if (!content) {
          throw new Error('Failed to read file content');
        }

        // Try to parse JSON content
        const jsonContent = JSON.parse(content);

        response.status(200).json({
          success: true,
          data: jsonContent,
        });
      } catch (error) {
        if ((error as any).name === 'NoSuchKey') {
          // If file doesn't exist, return empty data
          response.status(200).json({
            success: true,
            data: null,
          });
        } else {
          throw error;
        }
      }
    } catch (error) {
      console.error('Error in GET /files/proxy-download:', error);
      response.status(500).json({
        success: false,
        errorMsg: (error as Error).message || 'Failed to fetch file content',
      });
    }
  }
);

module.exports = {
  className: 'files',
  routes: router,
};
