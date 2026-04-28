import { pgTable, text, boolean, timestamp, uuid, primaryKey, index, customType, jsonb } from 'drizzle-orm/pg-core';
export { user, session, account, verification } from './auth-schema.js';
import { user } from './auth-schema.js';

const bytea = customType<{ data: Uint8Array }>({ dataType: () => 'bytea' });

export const book = pgTable('book', {
    id: uuid('id').primaryKey().defaultRandom(),
    title: text('title').notNull(),
    description: text('description').notNull().default(''),
    createdById: text('created_by_id').notNull().references(() => user.id),
    initialMarkdown: text('initial_markdown').notNull().default(''),
    updatedById: text('updated_by_id').references(() => user.id),
    lastEditAt: timestamp('last_edit_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const assignment = pgTable('assignment', {
    bookId: uuid('book_id').notNull().references(() => book.id, { onDelete: 'cascade' }),
    userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
    role: text('role').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
}, (t) => ({ pk: primaryKey({ columns: [t.bookId, t.userId, t.role] }) }));

export const bookYjsState = pgTable('book_yjs_state', {
    bookId: uuid('book_id').primaryKey().references(() => book.id, { onDelete: 'cascade' }),
    state: bytea('state').notNull(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const bookSnapshot = pgTable('book_snapshot', {
    id: uuid('id').primaryKey().defaultRandom(),
    bookId: uuid('book_id').notNull().references(() => book.id, { onDelete: 'cascade' }),
    label: text('label').notNull(),
    state: bytea('state').notNull(),
    createdById: text('created_by_id').notNull().references(() => user.id),
    createdAt: timestamp('created_at').notNull().defaultNow(),
}, (t) => ({ byBook: index('book_snapshot_book_idx').on(t.bookId, t.createdAt) }));

export const commentThread = pgTable('comment_thread', {
    id: uuid('id').primaryKey().defaultRandom(),
    bookId: uuid('book_id').notNull().references(() => book.id, { onDelete: 'cascade' }),
    anchorId: text('anchor_id').notNull(),
    quote: text('quote').notNull().default(''),
    resolved: boolean('resolved').notNull().default(false),
    detachedAt: timestamp('detached_at'),
    createdById: text('created_by_id').notNull().references(() => user.id),
    createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const commentMessage = pgTable('comment_message', {
    id: uuid('id').primaryKey().defaultRandom(),
    threadId: uuid('thread_id').notNull().references(() => commentThread.id, { onDelete: 'cascade' }),
    authorId: text('author_id').notNull().references(() => user.id),
    body: text('body').notNull(),
    mentions: jsonb('mentions').$type<{ userIds: string[]; roles: string[] }>().notNull().default({ userIds: [], roles: [] }),
    editedAt: timestamp('edited_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
});
