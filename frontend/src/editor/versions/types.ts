export interface VersionSnapshot {
  id: string
  label: string
  authorName: string
  createdAt: number
  state: number[]
  auto?: boolean
}
