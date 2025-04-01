import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { Prisma } from '@prisma/client';
import { RedisSingleton } from './redis/redis';
import supabase from '../lib/supabase-helper';

export type MetaHistoryItem = {
  content: string;
  fileUrl: string;
};

const execAsync = promisify(exec);

interface SupabaseConfig {
  token: string;
  projectRef: string;
  databasePassword: string;
  workingDirectory: string;
}

interface Condition {
  field: string;
  operator:
    | 'eq'
    | 'neq'
    | 'gt'
    | 'gte'
    | 'lt'
    | 'lte'
    | 'like'
    | 'ilike'
    | 'in'
    | 'is';
  value: any;
}

interface DataRecord {
  [key: string]: any;
}

interface FileItem {
  path: string;
  content: string;
  type: 'file';
}

export async function getTablesByDocumentId(documentId: string) {
  try {
    const prefix = `${documentId}_`;
    const { data, error } = await supabase.rpc('get_tables_with_columns', {
      prefix_name: prefix,
    });

    if (error) {
      console.error('Error fetching tables:', error);
      return {
        success: false,
        message: error.message,
        data: null,
      };
    }

    // await saveDocumentToDatabase(documentId, '', metaObj);
    return {
      success: true,
      message: 'Tables fetched successfully',
      data,
    };
  } catch (error) {
    console.error('Error in getTablesByProjectId:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
      data: null,
    };
  }
}

export async function executeSupabaseCommands(config: SupabaseConfig) {
  const { token, projectRef, databasePassword, workingDirectory } = config;

  try {
    // Change to the working directory
    process.chdir(workingDirectory);
    console.log('Changed to working directory:', workingDirectory);

    // Execute Supabase login
    const loginCommand = `supabase login --no-browser --token ${token}`;
    console.log('Executing login command...');
    await execAsync(loginCommand);

    // Execute Supabase link
    const linkCommand = `supabase link --project-ref ${projectRef} -p ${databasePassword}`;
    console.log('Executing link command...');
    const { stdout: linkOutput } = await execAsync(linkCommand);
    console.log('Link output:', linkOutput);

    // Execute Supabase db push
    const pushCommand = `supabase db push -p ${databasePassword}`;
    console.log('Executing db push command...');
    const { stdout: pushOutput } = await execAsync(pushCommand);
    console.log('Push output:', pushOutput);

    return {
      success: true,
      message: 'Supabase commands executed successfully',
    };
  } catch (error) {
    console.error('Error executing Supabase commands:', error);
    return {
      success: false,
      message: `Failed to execute Supabase commands: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`,
    };
  }
}

export async function getTableData(
  documentId: string,
  tableName: string,
  columns: string[]
) {
  try {
    const { data, error } = await supabase
      .from(tableName)
      .select(columns.join(','));

    if (error) {
      console.error('Error fetching table data:', error);
      return {
        success: false,
        message: error.message,
        data: null,
        columns: null,
      };
    }

    console.log('Table data:', data);

    return {
      success: true,
      message: 'Table data fetched successfully',
      data,
      // columns: tableInfo,
    };
  } catch (error) {
    console.error('Error in getTableData:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
      data: null,
      columns: null,
    };
  }
}

// Read operation
export async function queryTableData(
  tableName: string,
  fields: string[],
  conditions: Condition[]
) {
  try {
    let query = supabase.from(tableName).select(fields.join(','));

    // Apply all conditions
    conditions.forEach((condition) => {
      switch (condition.operator) {
        case 'eq':
          query = query.eq(condition.field, condition.value);
          break;
        case 'neq':
          query = query.neq(condition.field, condition.value);
          break;
        case 'gt':
          query = query.gt(condition.field, condition.value);
          break;
        case 'gte':
          query = query.gte(condition.field, condition.value);
          break;
        case 'lt':
          query = query.lt(condition.field, condition.value);
          break;
        case 'lte':
          query = query.lte(condition.field, condition.value);
          break;
        case 'like':
          query = query.like(condition.field, `%${condition.value}%`);
          break;
        case 'ilike':
          query = query.ilike(condition.field, `%${condition.value}%`);
          break;
        case 'in':
          query = query.in(condition.field, condition.value);
          break;
        case 'is':
          query = query.is(condition.field, condition.value);
          break;
      }
    });

    const { data, error } = await query;

    if (error) {
      console.error('Error querying data:', error);
      return {
        success: false,
        message: error.message,
        data: null,
      };
    }

    return {
      success: true,
      message: 'Data queried successfully',
      data,
    };
  } catch (error) {
    console.error('Error in queryTableData:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
      data: null,
    };
  }
}

export async function saveDocumentToDatabase(
  documentId: string,
  generateContent: string,
  metaObj: Prisma.JsonObject
) {
  // Get existing migration keys
  const existingMigrationsForProj =
    (metaObj?.migrations as Record<string, boolean>) || {};
  const DBMigrationKey = 'SupabaseDBMigrations';
  // redis data shape: {SupbaseDBMigratins: {generated_sql_file_name: true }}
  const migratedRecords = JSON.parse(
    (await RedisSingleton.getData(DBMigrationKey)) || '{}'
  );

  console.log('Existing migrations:', migratedRecords);

  try {
    // Parse generateContent to get FileItem array
    const { files } = JSON.parse(generateContent);

    // Get all SQL files from the parsed content
    // file name: /src/supabase/timestamp_docid.sql
    const allSqlFiles = files.filter((file: FileItem) =>
      file.path.endsWith('.sql')
    );

    console.log(
      'All SQL files:',
      allSqlFiles.map((f: FileItem) => f.path)
    );

    // Find SQL files that don't exist in migration keys
    const newSqlFiles = allSqlFiles.filter(
      (file: FileItem) =>
        !migratedRecords.hasOwnProperty(file.path.split('/').pop())
    );

    console.log(
      'New SQL files to process:',
      newSqlFiles.map((f: FileItem) => f.path)
    );

    if (newSqlFiles.length === 0) {
      return existingMigrationsForProj;
    }

    // Create migrations directory
    const migrationsDir = path.join(
      process.env.SUPABASE_WORKING_DIR || '',
      'migrations'
    );

    // Ensure migrations directory exists
    if (!fs.existsSync(migrationsDir)) {
      fs.mkdirSync(migrationsDir, { recursive: true });
    }

    // Write all SQL files to migrations directory and store file mappings
    newSqlFiles.forEach((sqlFile: FileItem) => {
      const fileName = sqlFile.path.split('/').pop() as string;
      const filePath = path.join(migrationsDir, fileName);
      fs.writeFileSync(filePath, sqlFile.content);
      console.log(`Created migration file: ${fileName}`);
    });

    // Execute Supabase commands
    const result = await executeSupabaseCommands({
      token: process.env.SUPABASE_TOKEN || '',
      projectRef: process.env.SUPABASE_PROJECT_ID || '',
      databasePassword: process.env.SUPABASE_DATABASE_PWD || '',
      workingDirectory: process.env.SUPABASE_WORKING_DIR || '',
    });

    if (result.success) {
      console.log('migrations result:', result.success);

      // Update migration mappings in metaObj
      const updatedMigrationRecords: Record<string, boolean> = {
        ...migratedRecords,
      };

      // Add new mappings for SQL files
      newSqlFiles.forEach((sqlFile: FileItem) => {
        const fileName = sqlFile.path.split('/').pop() as string;
        updatedMigrationRecords[fileName] = true;
        existingMigrationsForProj[fileName] = true;
        console.log(`Added file to migration records: ${fileName}`);
      });

      // Update metaObj with new migrations
      console.log('Updated migration mappings:', updatedMigrationRecords);
      RedisSingleton.setData({
        key: DBMigrationKey,
        val: JSON.stringify(updatedMigrationRecords),
        expireInSec: 100 * 365 * 24 * 3600, // 100 years in seconds
      });
    }
    return existingMigrationsForProj;
  } catch (error) {
    console.error('Error in saveDocumentToDatabase:', error);
    return existingMigrationsForProj;
  }
}
