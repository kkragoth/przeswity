import { z } from 'zod';
import type { InferSelectModel } from 'drizzle-orm';
import { commentThread, commentMessage } from '../../db/schema.js';
import { toIso, toIsoOrThrow } from '../../lib/dto.js';
import { CommentThreadDto } from './schemas.js';

export type CommentThreadRow = InferSelectModel<typeof commentThread>;
export type CommentMessageRow = InferSelectModel<typeof commentMessage>;
export type PublicAuthor = { id: string; email: string; name: string; color: string | null; image: string | null };
export type MessageWithAuthor = CommentMessageRow & { author: PublicAuthor };
export type ThreadDto = z.infer<typeof CommentThreadDto>;
type DtoMentions = ThreadDto['messages'][number]['mentions'];

export function buildThreadDto(thread: CommentThreadRow, messages: MessageWithAuthor[]): ThreadDto {
    return {
        id: thread.id,
        bookId: thread.bookId,
        anchorId: thread.anchorId,
        quote: thread.quote,
        resolved: thread.resolved,
        detachedAt: toIso(thread.detachedAt),
        createdById: thread.createdById,
        createdAt: toIsoOrThrow(thread.createdAt),
        messages: messages
            .slice()
            .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
            .map((m) => ({
                id: m.id,
                threadId: m.threadId,
                authorId: m.authorId,
                body: m.body,
                mentions: (m.mentions ?? { userIds: [], roles: [] }) as DtoMentions,
                editedAt: toIso(m.editedAt),
                createdAt: toIsoOrThrow(m.createdAt),
                author: {
                    id: m.author.id,
                    email: m.author.email,
                    name: m.author.name,
                    color: m.author.color ?? '#7c3aed',
                    image: m.author.image,
                },
            })),
    };
}
