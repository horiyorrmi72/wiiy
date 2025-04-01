import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { ChatAnthropic } from '@langchain/anthropic';
import Handlebars from 'handlebars';
import { BaseMessage, HumanMessage } from '@langchain/core/messages';
import axios from 'axios';
import { ChatOpenAI } from '@langchain/openai';
import { convertToOpenAIFormat, processLLMEndCallback } from '../llmUtil';
import { AuthenticatedUserWithProfile } from '../../../types/authTypes';

export const ACTIVE_CLAUDE_MODEL_ID = 'claude-3-7-sonnet-latest';

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);

// Utility function to encode image to base64
async function encodeImage(imageUrlOrPath: string): Promise<string> {
  let imageBuffer: Buffer;
  if (imageUrlOrPath.startsWith('http')) {
    const response = await axios.get(imageUrlOrPath, {
      responseType: 'arraybuffer',
    });
    imageBuffer = Buffer.from(response.data, 'binary');
  } else {
    imageBuffer = fs.readFileSync(imageUrlOrPath);
  }
  return imageBuffer.toString('base64');
}

// Utility function to get media type of the image
function getMediaType(imageUrlOrPath: string): string {
  const ext = path.extname(imageUrlOrPath).toLowerCase();
  switch (ext) {
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.png':
      return 'image/png';
    case '.gif':
      return 'image/gif';
    default:
      throw new Error('Unsupported image format');
  }
}

// Function to encode the image as a data URL
async function encodeImageToDataURL(imageUrlOrPath: string): Promise<string> {
  const mediaType = getMediaType(imageUrlOrPath);
  const base64Image = await encodeImage(imageUrlOrPath);
  return `data:${mediaType};base64,${base64Image}`;
}

export async function getClaudeSonnetResponse(
  prompt: BaseMessage[],
  callbackFunc: (output: any) => void
): Promise<string> {
  // Instantiate the ChatAnthropic model
  const llm = new ChatAnthropic({
    model: ACTIVE_CLAUDE_MODEL_ID,
    maxTokens: 40_000,
    // thinking: { type: 'enabled', budget_tokens: 6_000 },
    // thinking: { type: 'disabled' },
    // cache: new RedisCache(RedisSingleton.getClient()),
    // verbose: true,
    streaming: true,
    clientOptions: {
      defaultHeaders: {
        'X-Api-Key': process.env.ANTHROPIC_API_KEY as string, // Ensure the API key is set in the environment variables
      },
    },
    callbacks: [
      {
        handleLLMEnd: async (output) => {
          console.log('in ai_util.callback:', output);
          callbackFunc(output.llmOutput);
        },
      },
    ],
  });

  try {
    let stream;
    const openAIFormattedMessages = convertToOpenAIFormat(prompt); // trims message
    stream = await llm.stream(openAIFormattedMessages);

    // Collect the response
    let aiMsg = '';
    for await (const chunk of stream) {
      aiMsg += chunk.content;
    }
    return aiMsg;
  } catch (error) {
    console.error('Error in getClaudeSonnetResponse:', error);
    throw new Error('Failed to get response from LangChain API');
  }
}

export async function getClaude35SonnetResponseWithImageInput(
  textPrompt: string,
  base64ImageURL: string,
  callbackFunc: (output: any) => void
): Promise<string> {
  // Instantiate the ChatAnthropic model
  const model = new ChatAnthropic({
    model: ACTIVE_CLAUDE_MODEL_ID,
    maxTokens: 4096,
    temperature: 0,
    clientOptions: {
      defaultHeaders: {
        'X-Api-Key': process.env.ANTHROPIC_API_KEY as string,
      },
    },
    callbacks: [
      {
        handleLLMEnd: async (output) => {
          console.log('in ai_util.callback:', output);
          callbackFunc(output.llmOutput);
        },
      },
    ],
  });

  try {
    // Construct the message with text and image
    const message = new HumanMessage({
      content: [
        {
          type: 'text',
          text: textPrompt,
        },
        {
          type: 'image_url',
          image_url: {
            url: base64ImageURL,
          },
        },
      ],
    });

    // Invoke the model with the message
    const response = await model.invoke([message]);

    // Check and return the response content
    if (response && response.content) {
      return String(response.content);
    } else {
      throw new Error('Unexpected response structure from LangChain API');
    }
  } catch (error) {
    console.error(
      'Error in getClaude35SonnetResponseWithImageInput:',
      base64ImageURL
    );
    console.error(error);
    throw new Error('Failed to get response from LangChain API');
  }
}

async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function readFromTextFile(filePath: string): Promise<string> {
  return await readFile(filePath, 'utf8');
}

export function getFn(filePath: string, includeExtension = false): string {
  if (includeExtension) {
    return path.basename(filePath);
  } else {
    return path.basename(filePath, path.extname(filePath));
  }
}

export function checkCreateDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export async function renderTemplate(
  templatePath: string,
  data: any
): Promise<string> {
  try {
    const templateContent = await readFile(templatePath, 'utf8');
    const template = Handlebars.compile(templateContent);
    return template(data);
  } catch (error) {
    console.error(`Error reading or rendering template ${templatePath}:`);
    console.error(error);
    throw error;
  }
}

export async function chatAIMessage(
  content: string,
  currentUser: AuthenticatedUserWithProfile
): Promise<any> {
  const model = new ChatOpenAI({
    modelName: 'gpt-4o-mini',
    temperature: 0,
    // verbose: true,
    callbacks: [
      {
        handleLLMEnd: async (output) => {
          processLLMEndCallback(output.llmOutput, 'gpt-4o-mini', {
            currentUser,
            docId: '',
            docType: 'orgInfoUpdate',
          });
        },
      },
    ],
  });
  return await model.invoke([new HumanMessage({ content })]);
}
