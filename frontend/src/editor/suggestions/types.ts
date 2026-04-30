import type { Role } from '@/editor/identity/types';

export type SuggestionType = 'insertion' | 'deletion'

export interface Suggestion {
  id: string
  type: SuggestionType
  authorId: string
  authorName: string
  authorRole: Role
  authorColor: string
  timestamp: number
}
