import { Router } from 'express';
import {
  executeSupabaseCommands,
  getTablesByDocumentId,
  getTableData,
  queryTableData,
  saveDocumentToDatabase,
} from '../../services/databaseService';

const router = Router();

router.put('/:projectId', async (request, response) => {
  try {
    // Execute Supabase CLI commands
    const result = await executeSupabaseCommands({
      token: process.env.SUPABASE_TOKEN || '',
      projectRef: process.env.SUPABASE_PROJECT_ID || '',
      databasePassword: process.env.SUPABASE_DATABASE_PWD || '',
      workingDirectory: process.env.SUPABASE_WORKING_DIR || '',
    });

    if (!result.success) {
      console.error('Supabase CLI commands failed:', result.message);
      return response.status(500).json({
        success: false,
        data: { info: 'supabase connection failed', error: result.message },
      });
    }

    // If CLI commands succeed, return success response
    return response.status(200).json({
      success: true,
      data: { info: 'supabase connected', error: null },
    });
  } catch (error) {
    console.error('Error in Supabase route:', error);
    return response.status(500).json({
      success: false,
      data: {
        info: 'supabase connection failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    });
  }
});

// New endpoint to get tables by project ID
router.get('/:documentId/tables', async (request, response) => {
  const { documentId } = request.params;

  try {
    const result = await getTablesByDocumentId(documentId);

    if (!result.success) {
      return response.status(500).json({
        success: false,
        data: { info: 'Failed to fetch tables', error: result.message },
      });
    }

    return response.status(200).json({
      success: true,
      data: { info: 'Tables fetched successfully', tables: result.data },
    });
  } catch (error) {
    console.error('Error fetching tables:', error);
    return response.status(500).json({
      success: false,
      data: {
        info: 'Failed to fetch tables',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    });
  }
});

// Add new endpoint for table data
router.post('/:projectId/tables/:tableName/data', async (request, response) => {
  const { projectId, tableName } = request.params;
  const { columns } = request.body;

  try {
    const result = await getTableData(projectId, tableName, columns);

    if (!result.success) {
      return response.status(500).json({
        success: false,
        data: { info: 'Failed to fetch table data', error: result.message },
      });
    }

    return response.status(200).json({
      success: true,
      data: {
        info: 'Table data fetched successfully',
        rows: result.data,
        columns: result.columns,
      },
    });
  } catch (error) {
    console.error('Error fetching table data:', error);
    return response.status(500).json({
      success: false,
      data: {
        info: 'Failed to fetch table data',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    });
  }
});

// Query data endpoint
router.post(
  '/:projectId/tables/:tableName/query',
  async (request, response) => {
    const { tableName } = request.params;
    const { fields, conditions } = request.body;

    try {
      const result = await queryTableData(tableName, fields, conditions);

      if (!result.success) {
        return response.status(500).json({
          success: false,
          data: { info: 'Failed to query data', error: result.message },
        });
      }

      return response.status(200).json({
        success: true,
        data: { info: 'Data queried successfully', result: result.data },
      });
    } catch (error) {
      console.error('Error querying data:', error);
      return response.status(500).json({
        success: false,
        data: {
          info: 'Failed to query data',
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      });
    }
  }
);

// Add new endpoint for saving document to database
router.post('/:documentId/save', async (request, response) => {
  const { documentId } = request.params;
  const { content } = request.body;

  try {
    const result = await saveDocumentToDatabase(documentId, '', {});

    if (!result.success) {
      return response.status(500).json({
        success: false,
        data: {
          info: 'Failed to save document to database',
          error: result.message,
        },
      });
    }

    return response.status(200).json({
      success: true,
      data: {
        info: 'Document saved to database successfully',
        result: result.data,
      },
    });
  } catch (error) {
    console.error('Error saving document to database:', error);
    return response.status(500).json({
      success: false,
      data: {
        info: 'Failed to save document to database',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    });
  }
});

module.exports = {
  className: 'database',
  routes: router,
};
