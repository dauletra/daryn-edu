import { Fragment, useState, useMemo } from 'react'
import { useFirestoreQuery } from '@/hooks/useFirestoreQuery'
import {
  getUsers, getClasses, updateUser,
  addStudentToClass, removeStudentFromClass, deleteStudents,
} from '@/services/db'
import { useToast } from '@/context/ToastContext'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Badge } from '@/components/ui/Badge'

export function StudentsPage() {
  const { data: students, loading: loadingStudents, refetch } = useFirestoreQuery(() => getUsers('student'))
  const { data: classes, loading: loadingClasses } = useFirestoreQuery(() => getClasses())
  const { showSuccess, showError } = useToast()

  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editingStudent, setEditingStudent] = useState<{ uid: string; name: string; classId: string } | null>(null)

  const [name, setName] = useState('')
  const [classId, setClassId] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Multi-select
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Search
  const [search, setSearch] = useState('')

  const filteredStudents = useMemo(() => {
    if (!students) return []

    // Build class name lookup for sorting
    const classMap = new Map<string, string>()
    classes?.forEach((c) => classMap.set(c.id, c.name))

    // Filter by search
    const filtered = search.trim()
      ? students.filter((s) => {
          const q = search.toLowerCase()
          return s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q)
        })
      : students

    // Sort: by class name first, then by student name
    return [...filtered].sort((a, b) => {
      // Students without a class go to the very end (U+FFFF sorts last)
      const clsA = a.classId ? (classMap.get(a.classId) ?? '\uffff') : '\uffff'
      const clsB = b.classId ? (classMap.get(b.classId) ?? '\uffff') : '\uffff'
      const clsCmp = clsA.localeCompare(clsB, 'ru')
      if (clsCmp !== 0) return clsCmp
      return a.name.localeCompare(b.name, 'ru')
    })
  }, [students, classes, search])

  // Group sorted students by class for rendering with headers
  const studentGroups = useMemo(() => {
    const groups: { classId: string; className: string; students: typeof filteredStudents }[] = []
    for (const student of filteredStudents) {
      const cid = student.classId ?? ''
      const last = groups[groups.length - 1]
      if (last && last.classId === cid) {
        last.students.push(student)
      } else {
        const className = cid ? (classes?.find((c) => c.id === cid)?.name ?? '—') : 'Сыныпсыз'
        groups.push({ classId: cid, className, students: [student] })
      }
    }
    return groups
  }, [filteredStudents, classes])

  const allVisibleSelected = filteredStudents.length > 0 && filteredStudents.every((s) => selectedIds.has(s.uid))

  const toggleSelect = (uid: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(uid)) next.delete(uid)
      else next.add(uid)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (allVisibleSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev)
        filteredStudents.forEach((s) => next.delete(s.uid))
        return next
      })
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev)
        filteredStudents.forEach((s) => next.add(s.uid))
        return next
      })
    }
  }

  const resetForm = () => {
    setName('')
    setClassId('')
  }

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingStudent) return
    setSubmitting(true)
    try {
      const newName = name.trim()
      const newClassId = classId

      if (newName !== editingStudent.name) {
        await updateUser(editingStudent.uid, { name: newName })
      }

      if (newClassId !== editingStudent.classId) {
        if (editingStudent.classId) {
          await removeStudentFromClass(editingStudent.classId, editingStudent.uid)
        }
        if (newClassId) {
          await addStudentToClass(newClassId, editingStudent.uid)
        }
      }

      showSuccess('Оқушы жаңартылды')
      setEditModalOpen(false)
      setEditingStudent(null)
      resetForm()
      refetch()
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Жаңарту қатесі')
    } finally {
      setSubmitting(false)
    }
  }

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return
    setDeleting(true)
    try {
      await deleteStudents(Array.from(selectedIds))
      showSuccess(`${selectedIds.size} оқушы жойылды`)
      setSelectedIds(new Set())
      setConfirmDeleteOpen(false)
      refetch()
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Жою қатесі')
    } finally {
      setDeleting(false)
    }
  }

  const openEditModal = (student: { uid: string; name: string; classId?: string }) => {
    setEditingStudent({ uid: student.uid, name: student.name, classId: student.classId || '' })
    setName(student.name)
    setClassId(student.classId || '')
    setEditModalOpen(true)
  }

  const getClassName = (cId?: string) => {
    if (!cId || !classes) return '—'
    const cls = classes.find((c) => c.id === cId)
    return cls?.name ?? '—'
  }

  if (loadingStudents || loadingClasses) return <LoadingSpinner />

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Оқушылар <Badge variant="info">{students?.length ?? 0}</Badge>
        </h1>
      </div>

      {/* Search + bulk actions bar */}
      <div className="flex items-center gap-3 mb-4">
        <input
          type="text"
          placeholder="Аты-жөні немесе email бойынша іздеу..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {selectedIds.size > 0 && (
          <Button variant="danger" onClick={() => setConfirmDeleteOpen(true)}>
            Таңдалғандарды жою ({selectedIds.size})
          </Button>
        )}
      </div>

      {filteredStudents.length > 0 ? (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange={toggleSelectAll}
                    className="rounded border-gray-300 cursor-pointer"
                  />
                </th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Аты-жөні</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Email</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Құпиясөз</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Сынып</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-gray-500 w-28"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {studentGroups.map((group) => (
                <Fragment key={`group-${group.classId || 'none'}`}>
                  {/* Class header row */}
                  <tr>
                    <td colSpan={6} className="px-4 py-1.5 bg-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wide border-t border-gray-200">
                      {group.className}
                      <span className="ml-2 font-normal normal-case text-gray-400">{group.students.length} оқ.</span>
                    </td>
                  </tr>
                  {/* Student rows */}
                  {group.students.map((student) => (
                    <tr
                      key={student.uid}
                      className={`hover:bg-gray-50 ${selectedIds.has(student.uid) ? 'bg-blue-50' : ''}`}
                    >
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(student.uid)}
                          onChange={() => toggleSelect(student.uid)}
                          className="rounded border-gray-300 cursor-pointer"
                        />
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">{student.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-500 font-mono text-xs">{student.email}</td>
                      <td className="px-4 py-3 text-sm text-gray-500 font-mono text-xs">{student.plainPassword ?? '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{getClassName(student.classId)}</td>
                      <td className="px-4 py-3 text-right flex items-center justify-end gap-3">
                        <button
                          onClick={() => openEditModal(student)}
                          className="text-sm text-blue-600 hover:text-blue-800 cursor-pointer"
                        >
                          Өңдеу
                        </button>
                        <button
                          onClick={() => {
                            setSelectedIds(new Set([student.uid]))
                            setConfirmDeleteOpen(true)
                          }}
                          className="text-sm text-red-600 hover:text-red-800 cursor-pointer"
                        >
                          Жою
                        </button>
                      </td>
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-gray-500 text-center py-8">
          {search ? 'Ештеңе табылмады' : 'Оқушылар әлі жоқ'}
        </p>
      )}

      {/* Edit Student Modal */}
      <Modal isOpen={editModalOpen} onClose={() => { setEditModalOpen(false); resetForm() }} title="Оқушыны өңдеу">
        <form onSubmit={handleEdit} className="flex flex-col gap-4">
          <Input label="Аты-жөні" value={name} onChange={(e) => setName(e.target.value)} />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Сынып</label>
            <select
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Сыныпсыз</option>
              {classes?.map((cls) => (
                <option key={cls.id} value={cls.id}>{cls.name}</option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="secondary" type="button" onClick={() => { setEditModalOpen(false); resetForm() }}>
              Болдырмау
            </Button>
            <Button type="submit" isLoading={submitting}>Сақтау</Button>
          </div>
        </form>
      </Modal>

      {/* Confirm Delete Modal */}
      <Modal
        isOpen={confirmDeleteOpen}
        onClose={() => { setConfirmDeleteOpen(false) }}
        title="Оқушыларды жою керек пе?"
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-gray-600">
            {selectedIds.size === 1
              ? `Оқушы тест нәтижелерімен бірге толығымен жойылады.`
              : `${selectedIds.size} оқушы жойылады. Олардың барлық тест нәтижелері де жойылады.`}
          </p>
          {selectedIds.size <= 10 && (
            <div className="bg-red-50 rounded-lg p-3">
              <ul className="text-sm text-red-700 list-disc list-inside">
                {Array.from(selectedIds).map((uid) => {
                  const s = students?.find((st) => st.uid === uid)
                  return <li key={uid}>{s?.name ?? uid}</li>
                })}
              </ul>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setConfirmDeleteOpen(false)}>Болдырмау</Button>
            <Button variant="danger" isLoading={deleting} onClick={handleBulkDelete}>
              Жою {selectedIds.size > 1 ? `(${selectedIds.size})` : ''}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
