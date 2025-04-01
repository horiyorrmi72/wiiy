import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

/**
 * Function to create a file structure based on parsed input
 * @param userId, docId The base directory where the "output" folder will be created
 * @param fileContent The string containing file structure and content information
 */
export async function saveAppFileStructure(docId: string, fileContent: string) {
  const curDir = __dirname;
  if (!docId || !fileContent) {
    console.log('in appGenUtil.return: empty fileContent, ', docId);
    return '';
  }
  try {
    // Create the app directory
    // const fullFilePath = path.join(curDir, 'output', docId + '.md');
    // fs.writeFileSync(fullFilePath, fileContent);
    // save file to s3
    // BUCKET_NAME = 'omniflow.team' for dev env, and 'omniflow-team' for prod env
    const BUCKET_NAME = process.env.BUCKET_NAME;
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: docId,
      Body: fileContent,
      ContentType: 'application/json',
    });

    const client = new S3Client({
      region: process.env.AWS_REGION,
    });
    const result = await client.send(command);
    console.log('file uploaded:', result);
    const fileUrl = `https://${BUCKET_NAME}.s3.amazonaws.com/${docId}.json`;
    console.log('App structure created successfully:', fileUrl);
    return fileUrl;
  } catch (err) {
    console.error('in appGenUtil.saveAppFileStructure error:', err);
    return '';
  }
}

/**
 * Parse file content to extract file paths and their contents
 * @param fileContent The input string containing file structure and content
 * @returns Array of objects containing file paths and their contents
 */
function parseFileContent(
  fileContent: string
): { filePath: string; content: string }[] {
  const files: { filePath: string; content: string }[] = [];
  const fileMatches = fileContent.matchAll(
    /\/\/ File: ([^\n]+)\s*\n([\s\S]*?)(?=\/\/ File:|$)/g
  );

  for (const match of fileMatches) {
    if (match.length >= 3) {
      const filePath = match[1].trim();
      const content = match[2].trim();

      if (filePath && content) {
        files.push({
          filePath,
          content,
        });
      }
    }
  }

  return files;
}

/**
 * Converts a JSON string representing files to a formatted string with file names and contents
 * @param jsonString - The JSON string containing file information
 * @returns A formatted string with file names and their contents
 */
export function convertJsonToCode(jsonString: string): string {
  try {
    // Parse the JSON string
    const parsedData = JSON.parse(jsonString);

    // Check if the expected structure exists
    if (!parsedData.files || !Array.isArray(parsedData.files)) {
      throw new Error("Invalid JSON structure: 'files' array not found");
    }

    // Initialize the output string
    let outputString = '';

    // Iterate through each file
    parsedData.files.forEach(
      (
        file: { path: string; type: string; content: string },
        index: number
      ) => {
        // Add separator between files (except for the first file)
        if (index > 0) {
          outputString += '\n\n';
        }

        // Add the file name with a comment
        outputString += `// ${file.path}\n`;

        // Add the file content
        outputString += file.content;
      }
    );

    return outputString;
  } catch (error) {
    if (error instanceof Error) {
      return `Error processing JSON: ${error.message}`;
    }
    return 'An unknown error occurred while processing the JSON';
  }
}

export function mergeCode(existingCodeStr: string, newCodeStr: string) {
  let existingCode = JSON.parse(existingCodeStr);
  let newCode = JSON.parse(newCodeStr);

  // Ensure existingCode.files is an object for easy merging
  const existingFilesMap = existingCode.files.reduce(
    (acc: { [key: string]: any }, file: any) => {
      acc[file.path] = file; // Map file paths to file objects
      return acc;
    },
    {}
  );

  (newCode.files || []).forEach((file: any) => {
    // Merge new file or update existing file
    existingFilesMap[file.path] = file; // This will add or update the file
  });

  // Convert the merged files back to an array
  existingCode.files = Object.values(existingFilesMap);

  return JSON.stringify(existingCode, null, 2);
}

export const defaultProjectCodeTemplate = {
  files: [
    {
      type: 'file',
      content:
        '{\n  "name": "",\n  "private": true,\n  "version": "0.0.1",\n  "type": "module",\n  "scripts": {\n    "dev": "vite",\n    "build": "tsc && vite build",\n    "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0",\n    "preview": "vite preview"\n  },\n  "dependencies": {\n    "@radix-ui/react-dialog": "^1.0.5",\n    "@radix-ui/react-label": "^2.0.2",\n    "@radix-ui/react-slot": "^1.0.2",\n    "@supabase/supabase-js": "^2.39.7",\n    "class-variance-authority": "^0.7.0",\n    "clsx": "^2.1.0",\n    "lucide-react": "^0.341.0",\n    "react": "^18.2.0",\n    "react-dom": "^18.2.0",\n    "tailwind-merge": "^2.2.1",\n    "tailwindcss-animate": "^1.0.7"\n  },\n  "devDependencies": {\n    "@types/node": "^20.11.26",\n    "@types/react": "^18.2.56",\n    "@types/react-dom": "^18.2.19",\n    "@typescript-eslint/eslint-plugin": "^7.0.2",\n    "@typescript-eslint/parser": "^7.0.2",\n    "@vitejs/plugin-react": "^4.2.1",\n    "autoprefixer": "^10.4.17",\n    "eslint": "^8.56.0",\n    "eslint-plugin-react-hooks": "^4.6.0",\n    "eslint-plugin-react-refresh": "^0.4.5",\n    "postcss": "^8.4.35",\n    "tailwindcss": "^3.4.1",\n    "typescript": "^5.2.2",\n    "vite": "^5.1.4"\n  }\n}',
      path: 'package.json',
    },
    {
      type: 'file',
      content:
        '{\n  "compilerOptions": {\n    "target": "ES2020",\n    "useDefineForClassFields": true,\n    "lib": ["ES2020", "DOM", "DOM.Iterable"],\n    "module": "ESNext",\n    "skipLibCheck": true,\n\n    /* Bundler mode */\n    "moduleResolution": "bundler",\n    "allowImportingTsExtensions": true,\n    "resolveJsonModule": true,\n    "isolatedModules": true,\n    "noEmit": true,\n    "jsx": "react-jsx",\n\n    /* Linting */\n    "strict": true,\n    "noImplicitAny":false,\n   "noUnusedLocals": false,\n    "noUnusedParameters": false,\n    "noFallthroughCasesInSwitch": true,\n    "baseUrl": ".",\n    "paths": {\n      "@/*": ["./src/*"]\n    }\n  },\n  "include": ["src"],\n  "references": [{ "path": "./tsconfig.node.json" }]\n}',
      path: 'tsconfig.json',
    },
    {
      type: 'file',
      content:
        '{\n  "compilerOptions": {\n    "composite": true,\n    "skipLibCheck": true,\n    "module": "ESNext",\n    "moduleResolution": "bundler",\n    "allowSyntheticDefaultImports": true,\n    "types": ["node", "vite/client"]\n  },\n  "include": ["vite.config.ts"]\n}',
      path: 'tsconfig.node.json',
    },
    {
      type: 'file',
      content:
        "/// <reference types=\"vite/client\" />\n\nimport { defineConfig } from 'vite'\nimport react from '@vitejs/plugin-react'\nimport path from 'path'\n\n// https://vitejs.dev/config/\nexport default defineConfig({\n  plugins: [react()],\n  resolve: {\n    alias: {\n      '@': path.resolve(__dirname, './src'),\n    },\n  },\n  server: {\n    host: '0.0.0.0',\n  },\n})",
      path: 'vite.config.ts',
    },
    {
      type: 'file',
      content:
        'export default {\n  plugins: {\n    tailwindcss: {},\n    autoprefixer: {},\n  },\n}',
      path: 'postcss.config.js',
    },
    {
      type: 'file',
      content:
        '/** @type {import(\'tailwindcss\').Config} */\nexport default {\n  darkMode: ["class"],\n  content: [\n    \'./pages/**/*.{ts,tsx}\',\n    \'./components/**/*.{ts,tsx}\',\n    \'./app/**/*.{ts,tsx}\',\n    \'./src/**/*.{ts,tsx}\',\n  ],\n  prefix: "",\n  theme: {\n    container: {\n      center: true,\n      padding: "2rem",\n      screens: {\n        "2xl": "1400px",\n      },\n    },\n    extend: {\n      colors: {\n        border: "hsl(var(--border))",\n        input: "hsl(var(--input))",\n        ring: "hsl(var(--ring))",\n        background: "hsl(var(--background))",\n        foreground: "hsl(var(--foreground))",\n        primary: {\n          DEFAULT: "hsl(var(--primary))",\n          foreground: "hsl(var(--primary-foreground))",\n        },\n        secondary: {\n          DEFAULT: "hsl(var(--secondary))",\n          foreground: "hsl(var(--secondary-foreground))",\n        },\n        destructive: {\n          DEFAULT: "hsl(var(--destructive))",\n          foreground: "hsl(var(--destructive-foreground))",\n        },\n        muted: {\n          DEFAULT: "hsl(var(--muted))",\n          foreground: "hsl(var(--muted-foreground))",\n        },\n        accent: {\n          DEFAULT: "hsl(var(--accent))",\n          foreground: "hsl(var(--accent-foreground))",\n        },\n        popover: {\n          DEFAULT: "hsl(var(--popover))",\n          foreground: "hsl(var(--popover-foreground))",\n        },\n        card: {\n          DEFAULT: "hsl(var(--card))",\n          foreground: "hsl(var(--card-foreground))",\n        },\n      },\n      borderRadius: {\n        lg: "var(--radius)",\n        md: "calc(var(--radius) - 2px)",\n        sm: "calc(var(--radius) - 4px)",\n      },\n      keyframes: {\n        "accordion-down": {\n          from: { height: "0" },\n          to: { height: "var(--radix-accordion-content-height)" },\n        },\n        "accordion-up": {\n          from: { height: "var(--radix-accordion-content-height)" },\n          to: { height: "0" },\n        },\n      },\n      animation: {\n        "accordion-down": "accordion-down 0.2s ease-out",\n        "accordion-up": "accordion-up 0.2s ease-out",\n      },\n    },\n  },\n  plugins: [require("tailwindcss-animate")],\n}',
      path: 'tailwind.config.js',
    },
    {
      type: 'file',
      content:
        '/// <reference types="vite/client" />\n\ninterface ImportMetaEnv {\n  readonly VITE_SUPABASE_URL: string; \n  readonly VITE_SUPABASE_ANON_KEY: string; \n  // Add any other environment variables you\'re using\n}\n\ninterface ImportMeta {\n  readonly env: ImportMetaEnv;\n}',
      path: 'src/vite-env.d.ts',
    },
  ],
};
