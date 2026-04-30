import { z } from 'zod';
import { BookRoleEnum } from '../../lib/permissions.js';

const Mentions = z.object({
    userIds: z.array(z.string()).default([]),
    roles: z.array(BookRoleEnum).default([]),
});

export const CommentAuthor = z.object({
    id: z.string(),
    email: z.string(),
    name: z.string(),
    color: z.string(),
    image: z.string().nullable().optional(),
}).openapi('CommentAuthor');

export const CommentMessageDto = z.object({
    id: z.string(),
    threadId: z.string(),
    authorId: z.string(),
    body: z.string(),
    mentions: Mentions,
    editedAt: z.string().nullable(),
    createdAt: z.string(),
    author: CommentAuthor,
}).openapi('CommentMessage');

export const CommentThreadDto = z.object({
    id: z.string(),
    bookId: z.string(),
    anchorId: z.string(),
    quote: z.string(),
    resolved: z.boolean(),
    detachedAt: z.string().nullable(),
    createdById: z.string(),
    createdAt: z.string(),
    messages: z.array(CommentMessageDto),
}).openapi('CommentThread');

export const CreateThreadBody = z.object({
    anchorId: z.string().min(1),
    quote: z.string().default(''),
    body: z.string().min(1),
    mentions: Mentions.optional(),
}).openapi('CreateThreadBody');

export const CreateReplyBody = z.object({
    body: z.string().min(1),
    mentions: Mentions.optional(),
}).openapi('CreateReplyBody');

export const EditMessageBody = z.object({
    body: z.string().min(1),
    mentions: Mentions.optional(),
}).openapi('EditMessageBody');

export const ResolveBody = z.object({ resolved: z.boolean() }).openapi('ResolveBody');

export const CommentsListQuery = z.object({
    status: z.enum(['active', 'resolved', 'all', 'detached']).default('active'),
    author: z.string().optional(),
    mentionsRole: BookRoleEnum.optional(),
    mentionsMe: z.coerce.boolean().optional(),
});
