/**
 * Admin Users Tab
 * 
 * User management functionality with search, filter, and actions
 */

import { Search, Power, Trash2 } from 'lucide-react'
import type { AdminUser } from './types'

interface AdminUsersTabProps {
    users: AdminUser[]
    filteredUsers: AdminUser[]
    userSearchTerm: string
    userRoleFilter: string
    userProgramFilter: string
    isUserDeleteEnabled: boolean
    onSearchChange: (term: string) => void
    onRoleFilterChange: (role: string) => void
    onProgramFilterChange: (program: string) => void
    onToggleUserStatus: (userId: string) => void
    onChangeUserRole: (userId: string, newRole: string) => void
    onOpenDeleteModal: (userId: string, username: string) => void
}

export default function AdminUsersTab({
    users,
    filteredUsers,
    userSearchTerm,
    userRoleFilter,
    userProgramFilter,
    isUserDeleteEnabled,
    onSearchChange,
    onRoleFilterChange,
    onProgramFilterChange,
    onToggleUserStatus,
    onChangeUserRole,
    onOpenDeleteModal
}: AdminUsersTabProps) {
    // Use filtered users if any filter is active, otherwise use all users
    const displayUsers = (userSearchTerm || userRoleFilter || userProgramFilter) ? filteredUsers : users

    return (
        <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4 sm:p-6">
            <h2 className="text-xl font-bold tracking-tight text-white mb-6">User Management</h2>

            {/* User Search and Filters */}
            <div className="mb-6 flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400 w-5 h-5" />
                        <input
                            type="text"
                            placeholder="Search users by name or email..."
                            value={userSearchTerm}
                            onChange={(e) => onSearchChange(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-neutral-900 border border-neutral-700 rounded-lg focus:outline-none focus:border-purple-500 text-white"
                        />
                    </div>
                </div>
                <select
                    value={userRoleFilter}
                    onChange={(e) => onRoleFilterChange(e.target.value)}
                    className="px-4 py-2 bg-neutral-900 border border-neutral-700 rounded-lg text-white"
                >
                    <option value="">All Roles</option>
                    <option value="student">Students</option>
                    <option value="instructor">Instructors</option>
                    <option value="admin">Admins</option>
                </select>
                <select
                    value={userProgramFilter}
                    onChange={(e) => onProgramFilterChange(e.target.value)}
                    className="px-4 py-2 bg-neutral-900 border border-neutral-700 rounded-lg text-white"
                >
                    <option value="">All Programs</option>
                    <option value="BSIT">BSIT</option>
                    <option value="BSCS">BSCS</option>
                    <option value="BSIS">BSIS</option>
                </select>
            </div>

            <div className="overflow-x-auto rounded-xl border border-neutral-800">
                <table className="w-full text-sm text-left text-neutral-300">
                    <thead className="text-xs font-semibold uppercase tracking-wider text-neutral-500 bg-neutral-900/60 border-b border-neutral-800">
                        <tr>
                            <th className="px-4 py-3">Username</th>
                            <th className="px-4 py-3">Email</th>
                            <th className="px-4 py-3">Program</th>
                            <th className="px-4 py-3">Role</th>
                            <th className="px-4 py-3">Status</th>
                            <th className="px-4 py-3">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-800/70">
                        {displayUsers.map((user) => (
                            <tr key={user.id} className="hover:bg-neutral-800/40 transition-colors">
                                <td className="px-4 py-3 font-medium text-white">{user.username}</td>
                                <td className="px-4 py-3">{user.email}</td>
                                <td className="px-4 py-3">{user.program || 'N/A'}</td>
                                <td className="px-4 py-3">
                                    <select
                                        value={user.role}
                                        onChange={(e) => onChangeUserRole(user.id, e.target.value)}
                                        className="px-3 py-1 bg-neutral-900 border border-neutral-700 rounded text-white text-xs focus:outline-none focus:border-purple-500"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <option value="student">Student</option>
                                        <option value="instructor">Instructor</option>
                                        <option value="admin">Admin</option>
                                    </select>
                                </td>
                                <td className="px-4 py-3">
                                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${user.is_active
                                        ? 'bg-green-500/15 text-green-300 border-green-500/30'
                                        : 'bg-red-500/15 text-red-300 border-red-500/30'
                                        }`}>
                                        {user.is_active ? 'Active' : 'Inactive'}
                                    </span>
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => onToggleUserStatus(user.id)}
                                            className={`p-1.5 rounded transition flex items-center gap-1 text-xs ${user.is_active
                                                ? 'bg-amber-600/20 text-amber-400 hover:bg-amber-600/30'
                                                : 'bg-green-600/20 text-green-400 hover:bg-green-600/30'
                                                }`}
                                            title={user.is_active ? 'Deactivate User' : 'Activate User'}
                                        >
                                            <Power size={16} />
                                            <span className="hidden sm:inline">{user.is_active ? 'Deactivate' : 'Activate'}</span>
                                        </button>
                                        {isUserDeleteEnabled && (
                                            <button
                                                onClick={() => onOpenDeleteModal(user.id, user.username)}
                                                className="p-1.5 rounded transition flex items-center gap-1 text-xs bg-red-600/20 text-red-400 hover:bg-red-600/30"
                                                title="Delete User Permanently"
                                            >
                                                <Trash2 size={16} />
                                                <span className="hidden sm:inline">Delete</span>
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {displayUsers.length === 0 && (
                    <div className="text-center py-12 text-neutral-400">
                        No users found matching your criteria
                    </div>
                )}
            </div>
        </div>
    )
}
