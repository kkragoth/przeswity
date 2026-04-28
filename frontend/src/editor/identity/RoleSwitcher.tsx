import type { Role, User } from './types'
import { ROLE_PERMISSIONS } from './types'

interface RoleSwitcherProps {
  user: User
  onUserChange: (user: User) => void
  suggestingMode: boolean
  onSuggestingModeChange: (mode: boolean) => void
}

const ROLES: Role[] = [
  'translator',
  'author',
  'editor',
  'proofreader',
  'typesetter',
  'coordinator',
  'admin',
]

export function RoleSwitcher({
  user,
  onUserChange,
  suggestingMode,
  onSuggestingModeChange,
}: RoleSwitcherProps) {
  const perms = ROLE_PERMISSIONS[user.role]

  const proofreaderForced = user.role === 'proofreader' || user.role === 'author'

  return (
    <div className="role-switcher">
      <label className="role-field">
        <span className="role-label">Name</span>
        <input
          type="text"
          value={user.name}
          onChange={(e) => onUserChange({ ...user, name: e.target.value })}
        />
      </label>
      <label className="role-field">
        <span className="role-label">Role</span>
        <select
          value={user.role}
          onChange={(e) => onUserChange({ ...user, role: e.target.value as Role })}
        >
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </label>
      <label className="role-field role-toggle">
        <input
          type="checkbox"
          checked={suggestingMode || proofreaderForced}
          disabled={proofreaderForced || (!perms.canSuggest && !perms.canEdit)}
          onChange={(e) => onSuggestingModeChange(e.target.checked)}
        />
        <span>Suggesting mode {proofreaderForced && '(forced for this role)'}</span>
      </label>
    </div>
  )
}
