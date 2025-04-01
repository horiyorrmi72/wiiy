import { Router } from 'express';
import { extractJsonObject, userProfileRequestHandler } from '../../lib/util';
import { ProfileResponse } from '../../types/response';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import multer from 'multer';
import path from 'path';
import {
  createChatSession,
  generateChatResponse,
  generateFullChatResponse,
  getOrCreateChatSession,
} from '../../services/llmService/chatAgent';
import { genDocumentAfterChat } from '../../services/documentService';
import prisma from '../../db/prisma';
import { GenerationMinimumCredit } from '../../services/llmService/llmUtil';
import { ChatMessage, LegacyDocumentOutput } from '../types/documentTypes';
import {
  ChatHistory,
  ChatSession,
  ChatSessionTargetEntityType,
  Prisma,
  RecordStatus,
} from '@prisma/client';
import dayjs from 'dayjs';
import { ChatSessionOutput } from '../types/chatTypes';

const router = Router();
router.use(userProfileRequestHandler);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
});

interface FileContent {
  fileContent: string;
  fileType: string;
  fileId: string;
}

router.get(
  '/',
  async function (request, response: ProfileResponse<ChatMessage[]>) {
    try {
      const { docId, chatSessionId } = request.query;
      console.log('api.chats.start:', request.query, docId, chatSessionId);
      let whereClause;
      if (docId) {
        whereClause = {
          targetEntityId: docId as string,
          status: RecordStatus.ACTIVE,
        };
      } else if (chatSessionId) {
        whereClause = {
          id: chatSessionId as string,
          status: RecordStatus.ACTIVE,
        };
      }
      const session = await prisma.chatSession.findFirst({
        where: whereClause,
      });

      if (!session) {
        throw new Error('Chat session not found for document: ' + docId);
      }

      const chats = await prisma.chatHistory.findMany({
        where: {
          sessionId: session.id,
        },
        orderBy: {
          createdAt: 'asc',
        },
      });
      console.log('chats before dedupe: =>', chats);

      // filter out duplicated message created due to postgres history from langchain
      for (let i = 0; i < chats.length - 2; i++) {
        let chat = chats[i].message as Prisma.JsonObject;
        if (
          chat.type === 'human' &&
          (chats[i + 1].message as Prisma.JsonObject).type === 'ai' &&
          (chats[i + 2].message as Prisma.JsonObject).content === chat.content
        ) {
          // remove the 3rd element (the human question) due to duplicate, also the 4th element which is the generated content
          chats.splice(i + 2, 2);
        }
      }
      console.log('chats after dedupe: => ', chats);

      const result = chats.reduce((acc: ChatMessage[], chat: ChatHistory) => {
        let message = chat.message as Prisma.JsonObject;
        let content = extractJsonObject(message.content as string);
        if (content) {
          // it's an API response in an object
          acc.push({
            type: message.type as string,
            message: content.message,
            createdAt: chat.createdAt,
          });
          if (content.success_message) {
            // add another record for generation success message
            acc.push({
              type: message.type as string,
              message: content.success_message,
              createdAt: dayjs(chat.createdAt).add(10, 's').toDate(),
            });
          }
        } else {
          // its a string message response
          acc.push({
            type: message.type as string,
            message: message.content as string,
            createdAt: chat.createdAt,
          });
        }
        return acc;
      }, []);

      console.log('chats after final transform: => ', result);

      response.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.log('in server.routes.api.chat.failure:', error);
      response.status(200).json({ success: true, data: [] });
    }
  }
);

router.get(
  '/sessions',
  async function (request, response: ProfileResponse<ChatSessionOutput[]>) {
    try {
      const { userId } = request.query;
      console.log('api.chats.sessions.start:', request.query, userId);

      const sessions = await prisma.chatSession.findMany({
        where: {
          userId: userId as string,
          status: RecordStatus.ACTIVE,
          targetEntityType: ChatSessionTargetEntityType.CHAT,
        },
        include: {
          user: {
            select: {
              username: true,
              id: true,
              email: true,
            },
          },
        },
      });

      if (!sessions) {
        throw new Error('Chat sessions not found for user: ' + userId);
      }

      console.log('chats after final transform: => ', sessions);

      response.status(200).json({
        success: true,
        data: sessions,
      });
    } catch (error) {
      console.log('in server.routes.api.chat.sessions.failure:', error);
      response.status(200).json({ success: true, data: [] });
    }
  }
);

router.post('/upsert', async (req, res: ProfileResponse<ChatSession>) => {
  const currentUser = res.locals.currentUser;
  const userId = currentUser.userId;
  let org = await prisma.organization.findUnique({
    where: { id: currentUser.organizationId },
  });
  if (!org) {
    res
      .status(500)
      .json({ success: false, errorMsg: 'Organization not found.' });
    return;
  } else if (org.credits < GenerationMinimumCredit) {
    res.status(500).json({ success: false, errorMsg: 'Insufficient credits.' });
    return;
  }
  try {
    const { id, name, access, status } = req.body;
    if (id) {
      let updateResult = await prisma.chatSession.update({
        where: {
          id,
        },
        data: {
          name,
          access,
          status: status || RecordStatus.ACTIVE,
        },
      });
      res.status(200).json({
        success: true,
        data: updateResult,
      });
    } else {
      let chatSession = await createChatSession({
        name,
        access,
        userId,
        userEmail: currentUser.email,
        targetEntityId: '',
        targetEntityType: ChatSessionTargetEntityType.CHAT,
        targetEntitySubType: '',
      });
      res.status(200).json({
        success: true,
        data: chatSession,
      });
    }
  } catch (error: any) {
    console.log('errorMsg:', error.toString());
    res.status(500).json({ success: false, errorMsg: error.toString() });
  }
});

router.post(
  '/full-message',
  async (req, res: ProfileResponse<LegacyDocumentOutput>) => {
    const currentUser = res.locals.currentUser;
    const userId = currentUser.userId;
    let org = await prisma.organization.findUnique({
      where: { id: currentUser.organizationId },
    });
    if (!org) {
      res
        .status(500)
        .json({ success: false, errorMsg: 'Organization not found.' });
      return;
    } else if (org.credits < GenerationMinimumCredit) {
      res
        .status(500)
        .json({ success: false, errorMsg: 'Insufficient credits.' });
      return;
    }
    try {
      const param = req.body;
      console.log('param', param);
      let chatContent = param.description ?? '';
      const entityId = param.entityId ?? '';
      const entityType = param.entityType || '';

      // get chat session id
      let chatSessionId = param.chatSessionId;
      // determine if this request is to generate a document or answer a message
      let intentReply = await generateFullChatResponse({
        chatContent,
        sessionId: chatSessionId,
        currentUser: res.locals.currentUser,
        docId: entityId,
        targetEntityType: entityType,
        docType: param.entitySubType,
        uploadedFileContent: param.uploadedFileContent,
        chosenDocumentIds: param.chosenDocumentIds,
      });
      console.log('api.chats.full-message.intentReply:', intentReply);
      res.status(200).json({
        success: true,
        data: { ...intentReply, chatSessionId },
      });
    } catch (error: any) {
      console.log('errorMsg:', error.toString());
      res.status(500).json({ success: false, errorMsg: error.toString() });
    }
  }
);

router.post(
  '/message',
  async (req, res: ProfileResponse<LegacyDocumentOutput>) => {
    const currentUser = res.locals.currentUser;
    const userId = currentUser.userId;
    let org = await prisma.organization.findUnique({
      where: { id: currentUser.organizationId },
    });
    if (!org) {
      res
        .status(500)
        .json({ success: false, errorMsg: 'Organization not found.' });
      return;
    } else if (org.credits < GenerationMinimumCredit) {
      res
        .status(500)
        .json({ success: false, errorMsg: 'Insufficient credits.' });
      return;
    }
    try {
      const param = req.body;
      console.log('param', param);
      let chatContent = param.description ?? '';
      const entityId = param.entityId ?? '';
      const entityType = param.entityType || '';

      // get chat session id
      let chatSessionId =
        param.chatSessionId ||
        (
          await getOrCreateChatSession({
            name: '',
            userId,
            chatContent,
            userEmail: currentUser.email,
            targetEntityId: entityId,
            targetEntityType: entityType,
            targetEntitySubType: param.entitySubType,
          })
        ).id;
      // determine if this request is to generate a document or answer a message
      let intentReply = await generateChatResponse({
        chatContent: param.description,
        sessionId: chatSessionId,
        currentUser: res.locals.currentUser,
        docId: entityId,
        targetEntityType: entityType,
        docType: req.body.entitySubType,
        uploadedFileContent: param.uploadedFileContent,
        chosenDocumentIds: param.chosenDocumentIds,
      });
      console.log('api.chat.intentReply:', intentReply);
      // continue doc gen if reply is DOCUMENT
      if (
        intentReply.intent === 'DOCUMENT' &&
        entityType === ChatSessionTargetEntityType.DOCUMENT
      ) {
        console.log('api.chat.intentReply.document:genDocumentAfterChat');
        genDocumentAfterChat(org, currentUser, {
          ...req.body,
          id: req.body.entityId,
          type: req.body.entitySubType,
          chatSessionId,
          docId: entityId,
        });
      }
      res.status(200).json({
        success: true,
        data: { ...intentReply, chatSessionId },
      });
    } catch (error: any) {
      console.log('errorMsg:', error.toString());
      res.status(500).json({ success: false, errorMsg: error.toString() });
    }
  }
);

router.post(
  '/upload-file',
  upload.single('file'),
  async function (req: Express.Request, response: ProfileResponse<string>) {
    const client = new S3Client({
      region: process.env.AWS_REGION,
      // region: 'us-east-2', // IF test, use this
    });

    try {
      console.log('req.file; ', req.file);

      const file = req.file;
      // const userId = '91cb9560-5081-7093-010f-17c6900bcbf7';
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

module.exports = {
  className: 'chats',
  routes: router,
};
