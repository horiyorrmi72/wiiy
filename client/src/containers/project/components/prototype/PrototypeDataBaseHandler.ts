import { getTablesList } from '../../api/databaseApi';

export interface TableInfo {
  table: string;
  columns: string[];
}

export async function handleViewDatabase(
  documentId: string
): Promise<TableInfo[]> {
  try {
    // Get all tables for the document
    const resultData = await getTablesList(documentId);
    const tables = resultData.data.tables;
    console.log('tables: ', tables);
    if (!tables) {
      throw new Error('No tables found');
    }

    // Get columns for each table

    return tables;
  } catch (error) {
    console.error('Error in handleViewDatabase:', error);
    throw error;
  }
}
