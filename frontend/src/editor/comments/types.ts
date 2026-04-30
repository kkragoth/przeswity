import type { Role } from '@/editor/identity/types';

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
  status: 'open' | 'resolved'
  resolvedBy?: string
  resolvedAt?: number
  reactions?: Record<string, string[]>
  replies: CommentReply[]
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
