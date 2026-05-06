import type { Role } from '@/editor/identity/types';

export enum CommentStatus {
    Open = 'open',
    Resolved = 'resolved',
    Orphan = 'orphan',
}

export interface OrphanMetadata {
    orphanedAt: number
    lastKnownQuote: string
    lastKnownAuthorId: string
}

export enum MentionKind {
    User = 'user',
    Role = 'role',
}

export interface MentionCandidate {
  display: string
  kind: MentionKind
}

export interface CommentThread {
  id: string
  authorId: string
  authorName: string
  authorRole: Role
  authorColor?: string
  targetRole: Role | null
  body: string
  originalQuote: string
  createdAt: number
  edited?: number
  status: CommentStatus
  resolvedBy?: string
  resolvedAt?: number
  reactions?: Record<string, string[]>
  replies: CommentReply[]
  orphan?: OrphanMetadata
}

export interface CommentReply {
  id: string
  authorId: string
  authorName: string
  authorRole: Role
  authorColor?: string
  body: string
  createdAt: number
  edited?: number
  reactions?: Record<string, string[]>
}
