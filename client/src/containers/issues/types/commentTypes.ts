import { Prisma } from '@prisma/client';
import { z } from 'zod';

// Copied from /server/routes/types/commentTypes.ts
export const CommentOutputInclude = {
  issue: false,
  user: true,
} satisfies Prisma.CommentInclude;
export type CommentOutput = Prisma.CommentGetPayload<{
  include: typeof CommentOutputInclude;
}>;

export const CommentPostSchema = z.object({
  content: z.string(),
  replyTo: z.string().optional(),
  issueId: z.string().optional(),
});

export type CommentInput = z.infer<typeof CommentPostSchema>;
