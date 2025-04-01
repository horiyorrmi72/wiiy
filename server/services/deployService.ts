import axios from 'axios';
import { ProjectFile } from '../../shared/types/supabaseTypes';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import * as url from 'url';
import * as fs from 'fs';
import * as path from 'path';
import * as cheerio from 'cheerio';
// import { HttpsProxyAgent } from 'https-proxy-agent';
import { JSDOM } from 'jsdom';
import prisma from '../db/prisma';
import { Prisma } from '@prisma/client';
import { Element } from 'domhandler';

export async function addEnvVariables(documentId: string) {
  try {
    const response = await axios.get(
      `https://api.vercel.com/v9/projects/${encodeURIComponent(documentId)}`,

      {
        headers: {
          Authorization: `Bearer ${process.env.VERCEL_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        // httpsAgent: new HttpsProxyAgent(proxyUrl),
      }
    );
    console.log('projectResult:', response);
    if (response.status === 200) {
      const payloadUrl = {
        key: 'VITE_SUPABASE_URL',
        value: process.env.VITE_SUPABASE_URL,
        type: 'plain',
        target: ['preview', 'development', 'production'],
      };

      const payloadKey = {
        key: 'VITE_SUPABASE_ANON_KEY',
        value: process.env.VITE_SUPABASE_ANON_KEY,
        type: 'plain',
        target: ['preview', 'development', 'production'],
      };

      await axios.post(
        `https://api.vercel.com/v10/projects/${encodeURIComponent(
          documentId
        )}/env?upsert=true`,
        payloadUrl,
        {
          headers: {
            Authorization: `Bearer ${process.env.VERCEL_API_TOKEN}`,
            'Content-Type': 'application/json',
          },
          // httpsAgent: new HttpsProxyAgent(proxyUrl),
        }
      );

      await axios.post(
        `https://api.vercel.com/v10/projects/${encodeURIComponent(
          documentId
        )}/env?upsert=true`,
        payloadKey,
        {
          headers: {
            Authorization: `Bearer ${process.env.VERCEL_API_TOKEN}`,
            'Content-Type': 'application/json',
          },
          // httpsAgent: new HttpsProxyAgent(proxyUrl),
        }
      );
    }

    return response.data.id;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      // 404
      if (error.response?.status === 404) {
        const createPayload = {
          name: documentId,
          environmentVariables: [
            {
              key: 'VITE_SUPABASE_URL',
              value: process.env.VITE_SUPABASE_URL,
              type: 'plain',
              target: ['preview', 'development', 'production'],
            },
            {
              key: 'VITE_SUPABASE_ANON_KEY',
              value: process.env.VITE_SUPABASE_ANON_KEY,
              type: 'plain',
              target: ['preview', 'development', 'production'],
            },
          ],
        };
        const projectResult = await axios.post(
          `https://api.vercel.com/v11/projects`,
          createPayload,
          {
            headers: {
              Authorization: `Bearer ${process.env.VERCEL_API_TOKEN}`,
              'Content-Type': 'application/json',
            },
            // httpsAgent: new HttpsProxyAgent(proxyUrl),
          }
        );
        console.log('projectResult create: ', projectResult);

        console.log('projectResult data: ', projectResult.data);
        return projectResult.data.id;
      }
    }
    throw new Error(`Vercel API error: ${error}`);
  }
}

export async function deployCodeToVercel(
  docId: string,
  generatedCodeInStr: string
) {
  let sourceUrl = '';
  const { files } = JSON.parse(generatedCodeInStr);
  if (files) {
    const deploymentResult = await deployVercelApp(docId, files);
    console.log(
      'documentServices.genDocumentAfterChat.previewUrl:',
      deploymentResult
    );
    const { url } = await checkDeploymentStatus(deploymentResult.id, docId);
    console.log('checkDeploymentStatus.sourceUrl:', url);
    sourceUrl = url;
  }
  return sourceUrl.startsWith('http') ? sourceUrl : `https://${sourceUrl}`;
}

export async function deployVercelApp(
  documentId: string,
  sourceFiles: ProjectFile[]
) {
  try {
    console.log('addEnvVariables', documentId);
    const projectId = await addEnvVariables(documentId);
    console.log('✅ Environment variables added:', projectId);
    // 1. Transform file format
    const files = prepareVercelFiles(sourceFiles);
    // 2. Add project configuration
    const payload = {
      name: documentId,
      project: projectId,
      files,

      projectSettings: {
        framework: 'vite',
        installCommand: 'npm install',
        buildCommand: 'npm run build',
        outputDirectory: 'dist',
      },
    };

    // 3. Call Vercel API
    const response = await axios.post(
      'https://api.vercel.com/v13/deployments',
      payload,
      {
        headers: {
          Authorization: `Bearer ${process.env.VERCEL_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        // httpsAgent: new HttpsProxyAgent(proxyUrl),
      }
    );

    console.log('✅ Deployment successful! URL:', response.data.url);

    return response.data;
  } catch (error) {
    console.error('❌ Deployment failed:', error);
    throw error;
  }
}

const prepareVercelFiles = (sourceFiles: ProjectFile[]) => {
  return sourceFiles.map((file) => ({
    file: file.path,
    data: file.content,
    encoding: 'utf-8',
  }));
};

export async function checkDeploymentStatus(
  deploymentId: string,
  documentId: string
) {
  try {
    let status = '';
    let retries = 0;
    const maxRetries = 10; // Maximum retry attempts (prevent infinite loop)

    const updatedResult = await updateVercelPreviewSettings(documentId);
    console.log('✅ Project settings updated:', updatedResult);

    while (status !== 'READY' && retries < maxRetries) {
      const response = await axios.get(
        `https://api.vercel.com/v13/deployments/${deploymentId}`,
        {
          headers: {
            Authorization: `Bearer ${process.env.VERCEL_API_TOKEN}`,
          },
        }
      );

      status = response.data.readyState;
      console.log(`Current status: ${status}`);

      retries++;

      if (status === 'READY') {
        console.log('✅ Deployment completed! URL:', response.data.url);
        return response.data;
      } else if (status === 'ERROR') {
        throw new Error('Deployment failed: ' + response.data.errorMessage);
      }

      await new Promise((resolve) => setTimeout(resolve, 5000)); // Check every 5 seconds
    }

    throw new Error('Deployment timeout');
  } catch (error) {
    console.error(
      '❌ Status check failed:',
      error instanceof Error ? error.message : 'Unknown error'
    );
    return { status: 'ERROR', url: '' };
  }
}

export async function updateVercelPreviewSettings(documentId: string) {
  try {
    const response = await axios.patch(
      `https://api.vercel.com/v9/projects/${encodeURIComponent(documentId)}`,
      {
        ssoProtection: null,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.VERCEL_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        // httpsAgent: new HttpsProxyAgent(proxyUrl),
      }
    );

    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error(
        'Vercel API request failed:',
        error.response?.data?.error?.message || error.message
      );
      throw new Error(
        `Failed to update project settings: ${
          error.response?.data?.error?.message || error.message
        }`
      );
    }
    throw error;
  }
}

interface UploadOptions {
  sourceUrl: string;
  s3Bucket: string;
  s3Prefix?: string;
  docId: string;
}

interface AssetInfo {
  originalUrl: string;
  resolvedUrl: string;
  type: 'script' | 'css';
}

export async function uploadWebpageAssetsToS3(
  options: UploadOptions
): Promise<void> {
  const { sourceUrl, s3Bucket, s3Prefix = '', docId } = options;

  console.log(`Starting asset extraction from URL: ${sourceUrl}`);

  // Create S3 client
  const s3Client = new S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
  });

  // 1. Create output directory
  fs.mkdirSync(path.join(process.cwd(), 'build-assets'), { recursive: true });

  // 2. Get page HTML and parse resources
  console.log(`Fetching HTML from ${sourceUrl}...`);
  let html: string;
  try {
    const response = await axios.get<string>(sourceUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
      timeout: 10000,
      // httpsAgent: new HttpsProxyAgent(proxyUrl),
    });
    html = response.data;
  } catch (error) {
    console.error('Failed to fetch HTML:', error);
    throw error;
  }

  // Initialize files array with HTML content
  const files: ProjectFile[] = [
    {
      path: 'index.html',
      content: html,
      type: 'file',
    },
  ];

  // 修正后的Cheerio类型声明
  let $: cheerio.CheerioAPI;
  // Safer DOM parsing with error handling
  try {
    $ = cheerio.load(html);
    // Create JSDOM instance separately to avoid conflicts
    const dom = new JSDOM(html);
    console.log('✅ HTML fetched and parsed successfully');
  } catch (error) {
    console.error('Failed to parse HTML:', error);
    throw error;
  }

  // Parse the source URL to resolve relative paths
  const parsedUrl = url.parse(sourceUrl);
  const baseUrl = `${parsedUrl.protocol}//${parsedUrl.host}`;

  // Function to resolve relative URLs
  const resolveUrl = (assetPath: string): string | null => {
    if (!assetPath) return null;
    assetPath = assetPath.trim();
    if (!assetPath) return null;

    if (assetPath.startsWith('http://') || assetPath.startsWith('https://')) {
      return assetPath;
    }

    if (assetPath.startsWith('/')) {
      return `${baseUrl}${assetPath}`;
    }

    const dirname = path.dirname(parsedUrl.pathname || '');
    return `${baseUrl}${path.join(dirname, assetPath)}`;
  };

  // Collect asset information with safer DOM traversal
  const assets: AssetInfo[] = [];

  // Extract JavaScript files with error handling
  const scriptElements = $('script[src]');
  if (scriptElements.length) {
    scriptElements.each((i: number, el: Element) => {
      try {
        const element = $(el);
        if (!element.length) return;

        const originalSrc = element.attr('src');
        if (originalSrc) {
          const resolvedUrl = resolveUrl(originalSrc);
          if (resolvedUrl) {
            assets.push({
              originalUrl: originalSrc,
              resolvedUrl,
              type: 'script',
            });
          }
        }
      } catch (error) {
        console.error('Error processing script element:', error);
      }
    });
  }

  // Extract CSS files with error handling
  const cssElements = $('link[rel="stylesheet"]');
  if (cssElements.length) {
    cssElements.each((i: number, el: Element) => {
      try {
        const element = $(el);
        if (!element.length) return;

        const originalHref = element.attr('href');
        if (originalHref) {
          const resolvedUrl = resolveUrl(originalHref);
          if (resolvedUrl) {
            assets.push({
              originalUrl: originalHref,
              resolvedUrl,
              type: 'css',
            });
          }
        }
      } catch (error) {
        console.error('Error processing stylesheet element:', error);
      }
    });
  }

  console.log(`Found ${assets.length} assets to process:`);
  assets.forEach((asset) => {
    console.log(
      `- ${asset.type}: ${asset.originalUrl} (Resolved: ${asset.resolvedUrl})`
    );
  });

  // Download and process assets with better error handling
  for (const asset of assets) {
    try {
      console.log(`Downloading ${asset.type}: ${asset.resolvedUrl}`);
      const assetResponse = await axios.get(asset.resolvedUrl, {
        responseType: 'arraybuffer',
        timeout: 15000, // Increased timeout
        // httpsAgent: new HttpsProxyAgent(proxyUrl),
      });

      const content = assetResponse.data.toString('utf-8');

      // Sanitize path and ensure it's relative
      let assetPath = asset.originalUrl;
      if (assetPath.startsWith('http://') || assetPath.startsWith('https://')) {
        const urlObj = new URL(assetPath);
        assetPath = urlObj.pathname.startsWith('/')
          ? urlObj.pathname.substring(1)
          : urlObj.pathname;
      } else if (assetPath.startsWith('/')) {
        assetPath = assetPath.substring(1);
      }

      files.push({
        path: assetPath,
        content,
        type: 'file',
      });

      console.log(`✓ Downloaded ${asset.type}: ${asset.originalUrl}`);
    } catch (error) {
      console.error(
        `Failed to download ${asset.type} file ${asset.resolvedUrl}:`,
        error instanceof Error ? error.message : 'Unknown error'
      );
      // Continue with other assets even if one fails
    }
  }

  // Upload files array to S3
  try {
    const key = `${s3Prefix}${docId}.json`.replace(/\/\//g, '/');
    const fileUrl = `https://${s3Bucket}.s3.amazonaws.com/${key}`;

    const uploadParams = {
      Bucket: s3Bucket,
      Key: key,
      Body: JSON.stringify({ files }),
      ContentType: 'application/json',
    };

    const command = new PutObjectCommand(uploadParams);
    await s3Client.send(command);

    console.log(`✓ Uploaded files array to ${fileUrl}`);

    // Update document metadata
    try {
      const docMeta = await prisma.document.findUnique({
        where: { id: docId },
        select: { meta: true },
      });

      await prisma.document.update({
        where: { id: docId },
        data: {
          meta: {
            ...(docMeta?.meta as Prisma.JsonObject),
            builtFileUrl: fileUrl,
          },
        },
      });

      console.log(`✓ Updated document with builtFileUrl: ${fileUrl}`);
    } catch (prismaError) {
      console.error('Failed to update document metadata:', prismaError);
      // Don't throw here as the S3 upload succeeded
    }
  } catch (error) {
    console.error('Failed to upload files array to S3:', error);
    throw error;
  }
}
