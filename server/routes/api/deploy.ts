import { Router } from 'express';
import {
  deployVercelApp,
  checkDeploymentStatus,
  uploadWebpageAssetsToS3,
} from '../../services/deployService';
import { ProjectFile } from '../../../shared/types/supabaseTypes';

const router = Router();

router.post('/deployToVercel', async (req, res) => {
  try {
    const { documentId, files } = req.body as {
      documentId: string;
      files: ProjectFile[];
    };

    if (!documentId || !files || !Array.isArray(files)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request: documentId and files array are required',
      });
    }

    const result = await deployVercelApp(documentId, files);
    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('Error in Vercel deployment route:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to deploy to Vercel',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

router.get(
  '/checkDeploymentStatus/:deploymentId/:documentId',
  async (req, res) => {
    try {
      const { deploymentId, documentId } = req.params;
      if (!deploymentId) {
        return res.status(400).json({
          success: false,
          error: 'Deployment ID is required',
        });
      }

      const result = await checkDeploymentStatus(deploymentId, documentId);
      res.json({
        success: true,
        ...result,
      });
    } catch (error) {
      console.error('Error checking deployment status:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to check deployment status',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

router.post('/uploadWebpageAssets', async (req, res) => {
  try {
    const { documentId, sourceUrl } = req.body as {
      documentId: string;
      sourceUrl: string;
    };

    if (!documentId || !sourceUrl) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request: documentId and sourceUrl are required',
      });
    }

    await uploadWebpageAssetsToS3({
      sourceUrl,
      s3Bucket: process.env.BUCKET_NAME || '',
      s3Prefix: '', //'webpage-assets/'
      docId: documentId,
    });

    const fileUrl = `https://${process.env.BUCKET_NAME}.s3.amazonaws.com/${documentId}.json`;
    res.json({
      success: true,
      fileUrl,
    });
  } catch (error) {
    console.error('Error uploading webpage assets:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to upload webpage assets',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

module.exports = {
  className: 'deploy',
  routes: router,
};
