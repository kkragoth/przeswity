import * as Y from 'yjs'
import type { CommentThread } from './types'

export function getThreadMap(doc: Y.Doc): Y.Map<CommentThread> {
  return doc.getMap('comments') as Y.Map<CommentThread>
}
