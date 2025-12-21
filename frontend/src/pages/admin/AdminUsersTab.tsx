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
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-4 sm:p-6 shadow-lg">
            <h2 className="text-2xl font-bold text-white mb-6">User Management</h2>

            {/* User Search and Filters */}
            <div className="mb-6 flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                        <input
                            type="text"
                            placeholder="Search users by name or email..."
                            value={userSearchTerm}
                            onChange={(e) => onSearchChange(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:outline-none focus:border-indigo-500 text-white"
                        />
                    </div>
                </div>
                <select
                    value={userRoleFilter}
                    onChange={(e) => onRoleFilterChange(e.target.value)}
                    className="px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                >
                    <option value="">All Roles</option>
                    <option value="student">Students</option>
                    <option value="instructor">Instructors</option>
                    <option value="admin">Admins</option>
                </select>
                <select
                    value={userProgramFilter}
                    onChange={(e) => onProgramFilterChange(e.target.value)}
                    className="px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                >
                    <option value="">All Programs</option>
                    <option value="BSIT">BSIT</option>
                    <option value="BSCS">BSCS</option>
                    <option value="BSIS">BSIS</option>
                </select>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-slate-300">
                    <thead className="text-xs uppercase bg-slate-700/50">
                        <tr>
                            <th className="px-4 py-3">Username</th>
                            <th className="px-4 py-3">Email</th>
                            <th className="px-4 py-3">Program</th>
                            <th className="px-4 py-3">Role</th>
                            <th className="px-4 py-3">Status</th>
                            <th className="px-4 py-3">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {displayUsers.map((user) => (
                            <tr key={user.id} className="border-b border-slate-700 hover:bg-slate-700/30">
                                <td className="px-4 py-3 font-medium text-white">{user.username}</td>
                                <td className="px-4 py-3">{user.email}</td>
                                <td className="px-4 py-3">{user.program || 'N/A'}</td>
                                <td className="px-4 py-3">
                                    <select
                                        value={user.role}
                                        onChange={(e) => onChangeUserRole(user.id, e.target.value)}
                                        className="px-3 py-1 bg-slate-700 border border-slate-600 rounded text-white text-xs focus:outline-none focus:border-indigo-500"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <option value="student">Student</option>
                                        <option value="instructor">Instructor</option>
                                        <option value="admin">Admin</option>
                                    </select>
                                </td>
                                <td className="px-4 py-3">
                                    <span className={`px-2 py-1 rounded-full text-xs ${user.is_active ? 'bg-green-600/20 text-green-400' : 'bg-red-600/20 text-red-400'
                                        }`}>
                                        {user.is_active ? 'Active' : 'Inactive'}
                                    </span>
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => onToggleUserStatus(user.id)}
                                            className={`p-1.5 rounded transition flex items-center gap-1 text-xs ${user.is_active
                                                ? 'bg-orange-600/20 text-orange-400 hover:bg-orange-600/30'
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
                    <div className="text-center py-12 text-slate-400">
                        No users found matching your criteria
                    </div>
                )}
            </div>
        </div>
    )
}
