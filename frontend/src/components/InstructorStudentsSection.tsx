import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    ChevronDown, ChevronRight, Search
} from 'lucide-react'
import api from '../services/api'
import toast from 'react-hot-toast'
import { getMediaUrl } from '../utils/mediaUrl'

interface User {
    id: string
    username: string
    email: string
    first_name: string | null
    last_name: string | null
    role: string
    program: string
    year_level: string
    created_at: string
    is_active: boolean
    profile_picture?: string | null
}

interface Instructor extends User {
    student_count?: number
}

interface InstructorStudentsSectionProps {
    onViewUser?: (user: User) => void
}

function InstructorStudentsSection({ onViewUser }: InstructorStudentsSectionProps) {
    const navigate = useNavigate()
    const [instructors, setInstructors] = useState<Instructor[]>([])
    const [students, setStudents] = useState<User[]>([])
    const [loading, setLoading] = useState(true)
    const [expandedInstructor, setExpandedInstructor] = useState<string | null>(null)
    const [searchTerm, setSearchTerm] = useState('')
    const [programFilter, setProgramFilter] = useState('')
    const [yearFilter, setYearFilter] = useState('')
    const [viewMode, setViewMode] = useState<'instructors' | 'students'>('instructors')

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        setLoading(true)
        try {
            const response = await api.get('/admin/analytics/')
            const data = response.data
            setInstructors(data.users.instructors || [])
            setStudents(data.users.students || [])
        } catch (err: any) {
            console.error('Failed to fetch user data:', err)
            toast.error('Failed to load user data')
        } finally {
            setLoading(false)
        }
    }

    // Navigate to user profile page
    const handleViewUser = (user: User) => {
        if (onViewUser) onViewUser(user)
        navigate(`/user/${user.id}`)
    }

    const toggleInstructor = (instructorId: string) => {
        setExpandedInstructor(expandedInstructor === instructorId ? null : instructorId)
    }

    // Helper to get proper profile picture URL
    const getProfilePicUrl = (profilePic: string | null | undefined): string | null => {
        return getMediaUrl(profilePic)
    }

    // Avatar component with profile picture support
    const UserAvatar = ({ user, size = 'md', gradient = 'from-purple-500 to-blue-500' }: {
        user: User,
        size?: 'sm' | 'md' | 'lg',
        gradient?: string
    }) => {
        const sizeClasses = {
            sm: 'w-8 h-8 text-sm',
            md: 'w-12 h-12 text-lg',
            lg: 'w-24 h-24 text-3xl'
        }

        const profilePicUrl = getProfilePicUrl(user.profile_picture)

        if (profilePicUrl) {
            return (
                <img
                    src={profilePicUrl}
                    alt={user.username || 'User'}
                    className={`${sizeClasses[size]} rounded-full object-cover`}
                />
            )
        }

        return (
            <div className={`${sizeClasses[size]} rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center font-bold text-white`}>
                {(user.first_name?.[0] || user.username?.[0] || '?').toUpperCase()}
            </div>
        )
    }

    // Filter students
    const filteredStudents = students.filter(student => {
        const matchesSearch = !searchTerm ||
            student.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
            student.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (student.first_name && student.first_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (student.last_name && student.last_name.toLowerCase().includes(searchTerm.toLowerCase()))
        const matchesProgram = !programFilter || student.program === programFilter
        const matchesYear = !yearFilter || student.year_level === yearFilter
        return matchesSearch && matchesProgram && matchesYear
    })

    // Filter instructors
    const filteredInstructors = instructors.filter(instructor => {
        const matchesSearch = !searchTerm ||
            instructor.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
            instructor.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (instructor.first_name && instructor.first_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (instructor.last_name && instructor.last_name.toLowerCase().includes(searchTerm.toLowerCase()))
        const matchesProgram = !programFilter || instructor.program === programFilter
        return matchesSearch && matchesProgram
    })

    if (loading) {
        return (
            <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                    <div key={i} className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/30 rounded-2xl p-4 animate-pulse">
                        <div className="h-6 bg-slate-700 rounded w-1/3 mb-3"></div>
                        <div className="h-4 bg-slate-700 rounded w-1/2"></div>
                    </div>
                ))}
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* View Toggle and Filters */}
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <div className="flex gap-2">
                    <button
                        onClick={() => setViewMode('instructors')}
                        className={`px-4 py-2 rounded-lg transition-colors ${viewMode === 'instructors'
                            ? 'bg-purple-600 text-white'
                            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                            }`}
                    >
                        Instructors ({instructors.length})
                    </button>
                    <button
                        onClick={() => setViewMode('students')}
                        className={`px-4 py-2 rounded-lg transition-colors ${viewMode === 'students'
                            ? 'bg-green-600 text-white'
                            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                            }`}
                    >
                        Students ({students.length})
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/30 rounded-2xl p-4 shadow-lg">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search by name or email..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-purple-500"
                        />
                    </div>

                    {/* Program Filter */}
                    <select
                        value={programFilter}
                        onChange={(e) => setProgramFilter(e.target.value)}
                        className="px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                    >
                        <option value="">All Programs</option>
                        <option value="BSIT">BSIT</option>
                        <option value="BSCS">BSCS</option>
                        <option value="BSIS">BSIS</option>
                    </select>

                    {/* Year Filter (only for students) */}
                    {viewMode === 'students' && (
                        <select
                            value={yearFilter}
                            onChange={(e) => setYearFilter(e.target.value)}
                            className="px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                        >
                            <option value="">All Years</option>
                            <option value="1">1st Year</option>
                            <option value="2">2nd Year</option>
                            <option value="3">3rd Year</option>
                            <option value="4">4th Year</option>
                        </select>
                    )}

                    {/* Clear Filters */}
                    {(searchTerm || programFilter || yearFilter) && (
                        <button
                            onClick={() => {
                                setSearchTerm('')
                                setProgramFilter('')
                                setYearFilter('')
                            }}
                            className="px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg transition-colors"
                        >
                            Clear Filters
                        </button>
                    )}
                </div>
            </div>

            {/* Instructors List */}
            {viewMode === 'instructors' && (
                <div className="space-y-3">
                    {filteredInstructors.length === 0 ? (
                        <div className="text-center py-12 text-slate-400">
                            No instructors found matching your criteria
                        </div>
                    ) : (
                        filteredInstructors.map((instructor) => (
                            <div
                                key={instructor.id}
                                className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/30 rounded-2xl shadow-lg overflow-hidden"
                            >
                                {/* Instructor Header */}
                                <div
                                    className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-700/30 transition-colors"
                                    onClick={() => toggleInstructor(instructor.id)}
                                >
                                    <div
                                        className="flex items-center gap-4 cursor-pointer hover:opacity-80 transition-opacity"
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            handleViewUser(instructor)
                                        }}
                                    >
                                        <UserAvatar user={instructor} size="md" gradient="from-purple-500 to-blue-500" />
                                        <div>
                                            <h3 className="text-white font-semibold hover:text-purple-400 transition-colors">
                                                {instructor.first_name && instructor.last_name
                                                    ? `${instructor.first_name} ${instructor.last_name}`
                                                    : instructor.username}
                                            </h3>
                                            <p className="text-slate-400 text-sm">{instructor.email}</p>
                                        </div>
                                        <span className="hidden sm:inline-block px-3 py-1 bg-purple-900/50 text-purple-400 rounded-full text-xs font-medium">
                                            {instructor.program || 'No Program'}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {expandedInstructor === instructor.id ? (
                                            <ChevronDown className="w-5 h-5 text-slate-400" />
                                        ) : (
                                            <ChevronRight className="w-5 h-5 text-slate-400" />
                                        )}
                                    </div>
                                </div>

                                {/* Students List (Expandable) */}
                                {expandedInstructor === instructor.id && (
                                    <div className="border-t border-slate-700/50 bg-slate-900/30 p-4">
                                        <h4 className="text-sm font-medium text-slate-400 mb-3">
                                            Students ({students.length} total enrolled)
                                        </h4>
                                        <div className="space-y-2 max-h-64 overflow-y-auto">
                                            {students.slice(0, 10).map((student) => (
                                                <div
                                                    key={student.id}
                                                    className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-700/30 transition-colors cursor-pointer"
                                                    onClick={() => handleViewUser(student)}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <UserAvatar user={student} size="sm" gradient="from-green-500 to-teal-500" />
                                                        <div>
                                                            <p className="text-white text-sm hover:text-green-400 transition-colors">
                                                                {student.first_name && student.last_name
                                                                    ? `${student.first_name} ${student.last_name}`
                                                                    : student.username}
                                                            </p>
                                                            <p className="text-slate-400 text-xs">{student.program} • Year {student.year_level}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                            {students.length > 10 && (
                                                <p className="text-center text-slate-400 text-sm pt-2">
                                                    And {students.length - 10} more students...
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* Students List */}
            {viewMode === 'students' && (
                <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/30 rounded-2xl shadow-lg overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-slate-700/50">
                                <tr>
                                    <th className="text-left px-4 py-3 text-slate-300 font-medium text-sm">Student</th>
                                    <th className="text-left px-4 py-3 text-slate-300 font-medium text-sm hidden sm:table-cell">Program</th>
                                    <th className="text-left px-4 py-3 text-slate-300 font-medium text-sm hidden md:table-cell">Year</th>
                                    <th className="text-left px-4 py-3 text-slate-300 font-medium text-sm hidden lg:table-cell">Joined</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700/50">
                                {filteredStudents.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="text-center py-12 text-slate-400">
                                            No students found matching your criteria
                                        </td>
                                    </tr>
                                ) : (
                                    filteredStudents.map((student) => (
                                        <tr
                                            key={student.id}
                                            className="hover:bg-slate-700/30 transition-colors cursor-pointer"
                                            onClick={() => handleViewUser(student)}
                                        >
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-3">
                                                    <UserAvatar user={student} size="sm" gradient="from-green-500 to-teal-500" />
                                                    <div>
                                                        <p className="text-white font-medium hover:text-green-400 transition-colors">
                                                            {student.first_name && student.last_name
                                                                ? `${student.first_name} ${student.last_name}`
                                                                : student.username}
                                                        </p>
                                                        <p className="text-slate-400 text-xs">{student.email}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-slate-300 hidden sm:table-cell">{student.program || 'N/A'}</td>
                                            <td className="px-4 py-3 text-slate-300 hidden md:table-cell">Year {student.year_level || 'N/A'}</td>
                                            <td className="px-4 py-3 text-slate-400 text-sm hidden lg:table-cell">
                                                {new Date(student.created_at).toLocaleDateString()}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    )
}

export default InstructorStudentsSection
