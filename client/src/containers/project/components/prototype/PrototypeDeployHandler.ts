import { message } from 'antd';

import { uploadWebpageAssets } from '../../api/deployApi';

export async function handleDeploy(
  docId: string,
  sourceUrl: string
): Promise<boolean> {
  try {
    if (!sourceUrl) {
      throw new Error('Source URL is required');
    }

    message.info('Building project...');

    // Upload webpage assets to S3
    const { fileUrl } = await uploadWebpageAssets(docId, sourceUrl);
    console.log('Webpage assets uploaded to:', fileUrl);

    message.success('Deployment completed successfully!');
    return true;
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    message.error('Deployment failed: ' + errorMessage);

    return false;
  }
}
