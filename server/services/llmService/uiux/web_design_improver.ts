import 'dotenv/config';
import path from 'path';
import { promisify } from 'util';
import {
  readFromTextFile,
  getFn,
  checkCreateDir,
  renderTemplate,
  getClaudeSonnetResponse,
} from './ai_utils';
import fs from 'fs';
import { BaseMessage, HumanMessage } from '@langchain/core/messages';

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);

export async function improveWebDesign(
  userRequest: string,
  pageHtml: string,
  callBackFunc: (output: any) => void,
  chatHistory: BaseMessage[] = []
): Promise<string> {
  // limit userRequest to 10000 characters
  userRequest = userRequest.substring(0, 10000);

  const prompt = await renderHtmlImprovementPrompt(userRequest, pageHtml);
  // console.log("debug render_web_improvement_prompt prompt:\n", prompt);

  const promptWithChatHistory = [...chatHistory, new HumanMessage(prompt)];
  // use claude model
  const response = await getClaudeSonnetResponse(
    promptWithChatHistory,
    callBackFunc
  );

  return response;
}

export async function renderHtmlImprovementPrompt(
  userRequest: string,
  pageHtml: string
): Promise<string> {
  const templatePath = path.join(
    __dirname,
    'prompts',
    'html_improvement_prompt.txt'
  );
  return await renderTemplate(templatePath, {
    user_request: userRequest,
    page_html: pageHtml,
  });
}

async function main(): Promise<void> {
  const inputHtmlFile = 'data/website_htmls/API Documentation_page.html';
  const userRequest =
    'Can you 1. add sections on the left panel to make it easier to navigate the documentation  2. also make the sections move with the content scrolling  3. please make sure the section panel did not cover the content visually';

  const fileName = getFn(inputHtmlFile, false);
  const pageHtml = await readFromTextFile(inputHtmlFile);
  const improvedHtml = await improveWebDesign(userRequest, pageHtml, () => {});

  const saveDir = 'results/improved_html_results';
  checkCreateDir(saveDir);

  const outputPath = path.join(saveDir, `${fileName}_improved.html`);
  await writeFile(outputPath, improvedHtml);

  console.log(`Improved HTML saved to: ${outputPath}`);
}

// main().catch(console.error);
