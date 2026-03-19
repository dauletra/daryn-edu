import { useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { useFirestoreQuery } from '@/hooks/useFirestoreQuery'
import {
  getClass, getTests, getUsers, getTestBanks,
  assignTestToClass, removeTestFromClass,
  removeStudentFromClass, createStudentsBulk, deleteClass, updateClass,
} from '@/services/db'
import { useToast } from '@/context/ToastContext'
import { useAuth } from '@/hooks/useAuth'
import { useBank } from '@/context/BankContext'
import { formatTestTitle } from '@/utils/testTitle'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

export function ClassDetailPage({ backTo, backLabel }: { backTo: string; backLabel: string }) {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { data: cls, loading: loadingClass, refetch } = useFirestoreQuery(
    () => getClass(id!),
    [id]
  )
  const { data: tests } = useFirestoreQuery(() => getTests())
  const { data: testBanks } = useFirestoreQuery(() => getTestBanks())
  const { data: allStudents, refetch: refetchStudents } = useFirestoreQuery(() => getUsers('student'))
  const { showSuccess, showError } = useToast()
  const { selectedBankId, selectedBank: contextBank } = useBank()

  const [assignModalOpen, setAssignModalOpen] = useState(false)
  const [addStudentsModalOpen, setAddStudentsModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Assign test form — checkboxes only (bank comes from context)
  const [selectedTestIds, setSelectedTestIds] = useState<Set<string>>(new Set())

  // Bulk add students
  const [bulkNames, setBulkNames] = useState('')
  const [credentialsModalOpen, setCredentialsModalOpen] = useState(false)
  const [createdStudents, setCreatedStudents] = useState<{ name: string; email: string; password: string }[]>([])
  const [bulkErrors, setBulkErrors] = useState<string[]>([])

  // Active bank
  const [changeBankModalOpen, setChangeBankModalOpen] = useState(false)
  const [newBankId, setNewBankId] = useState('')

  // Remove student
  const [confirmRemove, setConfirmRemove] = useState<{ studentId: string; studentName: string } | null>(null)
  const [confirmDeleteClass, setConfirmDeleteClass] = useState(false)

  const classStudents = allStudents?.filter((s) => cls?.studentIds?.includes(s.uid)) ?? []
  const alreadyAssigned = new Set(cls?.assignedTests ?? [])
  const canDeleteClass =
    user?.role === 'admin' ||
    (user?.role === 'moderator' && cls?.createdBy === user?.uid)

  // Tests in selected bank (published only, not already assigned)
  // Moderators see only their own tests; admin sees all
  const bankTests = tests
    ?.filter((t) => {
      if (t.testBankId !== selectedBankId || !t.published || alreadyAssigned.has(t.id)) return false
      return true
    })
    ?? []

  // Active bank helpers
  const activeBank = testBanks?.find((b) => b.id === cls?.activeBankId) ?? null
  const activeBankLabel = activeBank
    ? `${activeBank.name} — ${activeBank.quarter} тоқс. ${activeBank.academicYear}-${activeBank.academicYear + 1}`
    : 'Таңдалмаған'

  // Assigned tests filtered by active bank (for display)
  const visibleAssignedTestIds = cls?.activeBankId
    ? (cls.assignedTests ?? []).filter((testId) => {
        const t = tests?.find((x) => x.id === testId)
        return t?.testBankId === cls.activeBankId
      })
    : (cls?.assignedTests ?? [])

  const handleChangeBank = async () => {
    if (!cls || !newBankId) return
    setSubmitting(true)
    try {
      await updateClass(cls.id, { activeBankId: newBankId })
      showSuccess('Белсенді банк жаңартылды')
      setChangeBankModalOpen(false)
      setNewBankId('')
      refetch()
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Қате')
    } finally {
      setSubmitting(false)
    }
  }

  const getTestTitle = (testId: string) => {
    const t = tests?.find((x) => x.id === testId)
    return t ? formatTestTitle(t) : testId
  }

  const toggleTestSelection = (testId: string) => {
    setSelectedTestIds((prev) => {
      const next = new Set(prev)
      if (next.has(testId)) {
        next.delete(testId)
      } else {
        next.add(testId)
      }
      return next
    })
  }

  const handleAssignTests = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!cls || selectedTestIds.size === 0) return
    setSubmitting(true)
    try {
      for (const testId of selectedTestIds) {
        await assignTestToClass(cls.id, testId)
      }
      showSuccess(`${selectedTestIds.size} тест тағайындалды`)
      setAssignModalOpen(false)
      setSelectedTestIds(new Set())
      refetch()
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Тағайындау қатесі')
    } finally {
      setSubmitting(false)
    }
  }

  const handleRemoveTest = async (testId: string) => {
    if (!cls) return
    setSubmitting(true)
    try {
      await removeTestFromClass(cls.id, testId)
      showSuccess('Тест сыныптан алынды')
      refetch()
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Жою қатесі')
    } finally {
      setSubmitting(false)
    }
  }

  const handleBulkAddStudents = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!cls) return
    const names = bulkNames.split('\n').map((n) => n.trim()).filter(Boolean)
    if (names.length === 0) {
      showError('Кем дегенде бір оқушыны енгізіңіз')
      return
    }
    setSubmitting(true)
    try {
      const result = await createStudentsBulk(names, cls.id)
      setCreatedStudents(result.created)
      setBulkErrors(result.errors)
      if (result.created.length > 0) {
        showSuccess(`${result.created.length} оқушы қосылды`)
      }
      if (result.skipped.length > 0) {
        setBulkErrors((prev) => [
          ...prev,
          ...result.skipped.map((n) => `${n}: бұл сыныпта бар`),
        ])
      }
      if (result.errors.length > 0) {
        showError(`Қателер: ${result.errors.length}`)
      }
      setAddStudentsModalOpen(false)
      setBulkNames('')
      setCredentialsModalOpen(true)
      refetch()
      refetchStudents()
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Қате')
    } finally {
      setSubmitting(false)
    }
  }

  const handleRemoveStudent = async () => {
    if (!confirmRemove || !cls) return
    try {
      await removeStudentFromClass(cls.id, confirmRemove.studentId)
      showSuccess(`${confirmRemove.studentName} сыныптан шығарылды`)
      setConfirmRemove(null)
      refetch()
      refetchStudents()
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Жою қатесі')
    }
  }

  const handleDeleteClass = async () => {
    if (!cls) return
    try {
      await deleteClass(cls.id)
      showSuccess('Сынып жойылды')
      navigate(backTo)
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Жою қатесі')
    }
  }

  const handlePrintCredentials = () => {
    if (classStudents.length === 0) return
    const rows = classStudents
      .map((s, i) =>
        `<tr><td>${i + 1}</td><td>${s.name}</td><td>${s.email}</td><td>${s.plainPassword ?? '—'}</td></tr>`
      )
      .join('')
    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${cls?.name} — Кіру деректері</title>
<style>
  body { font-family: Arial, sans-serif; padding: 20px; }
  h2 { margin-bottom: 4px; }
  p { color: #666; margin-bottom: 16px; font-size: 14px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th, td { border: 1px solid #ccc; padding: 6px 10px; text-align: left; }
  th { background: #f5f5f5; font-weight: 600; }
  td:first-child { width: 30px; text-align: center; }
  @media print { body { padding: 0; } }
</style></head><body>
<h2>${cls?.name}</h2>
<p>Оқушылардың кіру деректері</p>
<table><thead><tr><th>#</th><th>Аты-жөні</th><th>Email</th><th>Құпиясөз</th></tr></thead><tbody>${rows}</tbody></table>
<script>window.onload=()=>{window.print()}</script>
</body></html>`
    const w = window.open('', '_blank')
    if (w) { w.document.write(html); w.document.close() }
  }

  if (loadingClass) return <LoadingSpinner />

  if (!cls) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Сынып табылмады</p>
        <Link to={backTo}>
          <Button variant="secondary" className="mt-4">{backLabel}</Button>
        </Link>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link to={backTo} className="text-sm text-blue-600 hover:text-blue-800">
          {backLabel}
        </Link>
        <span className="text-gray-400">/</span>
        <h1 className="text-2xl font-bold text-gray-900">{cls.name}</h1>
        {canDeleteClass && (
          <Button variant="danger" className="text-xs ml-auto" onClick={() => setConfirmDeleteClass(true)}>
            Сыныпты жою
          </Button>
        )}
      </div>

      {/* Students Section */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Оқушылар <Badge variant="info">{classStudents.length}</Badge>
          </h2>
          <div className="flex items-center gap-2">
            {classStudents.length > 0 && (
              <Button
                variant="secondary"
                className="text-xs"
                onClick={handlePrintCredentials}
              >
                Кіру деректерін басып шығару
              </Button>
            )}
            <Button
              variant="secondary"
              className="text-xs"
              onClick={() => setAddStudentsModalOpen(true)}
            >
              Оқушы қосу
            </Button>
          </div>
        </div>

        {classStudents.length > 0 ? (
          <div className="overflow-hidden rounded-lg border border-gray-200">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-2 text-sm font-medium text-gray-500 w-10">#</th>
                  <th className="text-left px-4 py-2 text-sm font-medium text-gray-500">Аты-жөні</th>
                  <th className="text-left px-4 py-2 text-sm font-medium text-gray-500">Email</th>
                  <th className="text-left px-4 py-2 text-sm font-medium text-gray-500">Құпиясөз</th>
                  <th className="text-right px-4 py-2 text-sm font-medium text-gray-500 w-20"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {classStudents.map((s, index) => (
                  <tr key={s.uid} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-sm text-gray-400">{index + 1}</td>
                    <td className="px-4 py-2 text-sm text-gray-900">{s.name}</td>
                    <td className="px-4 py-2 text-sm text-gray-500 font-mono text-xs">{s.email}</td>
                    <td className="px-4 py-2 text-sm text-gray-500 font-mono text-xs">{s.plainPassword ?? '—'}</td>
                    <td className="px-4 py-2 text-right">
                      <button
                        onClick={() => setConfirmRemove({ studentId: s.uid, studentName: s.name })}
                        className="text-red-500 hover:text-red-700 text-xs cursor-pointer"
                      >
                        Жою
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-gray-400">Оқушылар жоқ</p>
        )}
      </div>

      {/* Active Bank Section */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-sm font-medium text-gray-700">Оқушыларға арналған белсенді банк: </span>
            <span className="text-sm text-gray-900">{activeBankLabel}</span>
          </div>
          <div className="flex items-center gap-2">
            {selectedBankId && selectedBankId !== cls.activeBankId && contextBank && (
              <Button
                variant="secondary"
                className="text-xs"
                isLoading={submitting}
                onClick={() => void (async () => {
                  setSubmitting(true)
                  try {
                    await updateClass(cls.id, { activeBankId: selectedBankId })
                    showSuccess(`Белсенді банк: ${contextBank.name}`)
                    refetch()
                  } catch (err) {
                    showError(err instanceof Error ? err.message : 'Қате')
                  } finally {
                    setSubmitting(false)
                  }
                })()}
              >
                Ағымдағыны қолдану
              </Button>
            )}
            <Button
              variant="secondary"
              className="text-xs"
              onClick={() => { setNewBankId(cls.activeBankId ?? ''); setChangeBankModalOpen(true) }}
            >
              Банкті ауыстыру
            </Button>
          </div>
        </div>
      </div>

      {/* Assigned Tests Section */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Тағайындалған тесттер <Badge variant="success">{visibleAssignedTestIds.length}</Badge>
          </h2>
          <Button
            variant="secondary"
            className="text-xs"
            onClick={() => setAssignModalOpen(true)}
          >
            Тест тағайындау
          </Button>
        </div>

        {visibleAssignedTestIds.length > 0 ? (
          <div className="flex flex-col gap-2">
            {visibleAssignedTestIds.map((testId) => {
              const testExists = tests?.some((t) => t.id === testId)
              return (
              <div key={testId} className="flex items-center justify-between text-sm bg-gray-50 px-4 py-3 rounded-lg">
                <span className={testExists ? 'text-gray-900' : 'text-red-400 italic'}>
                  {testExists ? getTestTitle(testId) : 'Тест жойылды'}
                </span>
                <button
                  onClick={() => handleRemoveTest(testId)}
                  className="text-red-500 hover:text-red-700 text-xs cursor-pointer"
                >
                  Алу
                </button>
              </div>
              )
            })}
          </div>
        ) : (
          <p className="text-sm text-gray-400">
            {cls.activeBankId ? 'Белсенді банкте тағайындалған тесттер жоқ' : 'Тағайындалған тесттер жоқ'}
          </p>
        )}
      </div>

      {/* Change Active Bank Modal */}
      <Modal isOpen={changeBankModalOpen} onClose={() => setChangeBankModalOpen(false)} title="Белсенді банкті ауыстыру">
        <div className="flex flex-col gap-4">
          <p className="text-sm text-gray-600">
            Банкті ауыстырғаннан кейін оқушылар тек жаңа банктен тесттерді көреді. Ескі тесттер сақталады, бірақ жасырылады.
          </p>
          <select
            value={newBankId}
            onChange={(e) => setNewBankId(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Тест банкін таңдаңыз</option>
            {testBanks?.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} — {b.quarter} тоқс. {b.academicYear}-{b.academicYear + 1}
              </option>
            ))}
          </select>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setChangeBankModalOpen(false)}>Болдырмау</Button>
            <Button isLoading={submitting} disabled={!newBankId} onClick={() => void handleChangeBank()}>Сақтау</Button>
          </div>
        </div>
      </Modal>

      {/* Assign Test Modal — Checkboxes from current bank */}
      <Modal
        isOpen={assignModalOpen}
        onClose={() => { setAssignModalOpen(false); setSelectedTestIds(new Set()) }}
        title={`Тесттерді тағайындау — ${cls.name}`}
      >
        <form onSubmit={handleAssignTests} className="flex flex-col gap-4">
          {contextBank && (
            <p className="text-sm text-gray-500">
              Тест банкі: <span className="font-medium text-gray-700">{contextBank.name}</span>
              {' '}· {contextBank.quarter} тоқс. · {contextBank.academicYear}–{contextBank.academicYear + 1}
            </p>
          )}

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Тесттер</label>
            {!selectedBankId ? (
              <p className="text-sm text-gray-400 py-2">Беттің жоғарғы жағынан тест банкін таңдаңыз</p>
            ) : bankTests.length > 0 ? (
              <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
                {bankTests.map((t) => (
                  <label
                    key={t.id}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedTestIds.has(t.id)}
                      onChange={() => toggleTestSelection(t.id)}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900 truncate">{formatTestTitle(t)}</p>
                      <p className="text-xs text-gray-500">{t.questionCount} сұрақ · {t.timeLimit} мин</p>
                    </div>
                  </label>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 py-2">
                Бұл банкте қолжетімді жарияланған тесттер жоқ (немесе барлығы тағайындалды)
              </p>
            )}
          </div>

          <div className="flex justify-end gap-2 mt-2">
            <Button variant="secondary" type="button" onClick={() => { setAssignModalOpen(false); setSelectedTestIds(new Set()) }}>
              Болдырмау
            </Button>
            <Button type="submit" isLoading={submitting} disabled={selectedTestIds.size === 0}>
              Тағайындау ({selectedTestIds.size})
            </Button>
          </div>
        </form>
      </Modal>

      {/* Bulk Add Students Modal */}
      <Modal
        isOpen={addStudentsModalOpen}
        onClose={() => { setAddStudentsModalOpen(false); setBulkNames('') }}
        title={`Оқушы қосу — ${cls.name}`}
      >
        <form onSubmit={handleBulkAddStudents} className="flex flex-col gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700">Оқушылар тізімі</label>
            <p className="text-xs text-gray-400 mb-2">Әр жол — бір оқушы (Тегі Аты)</p>
            <textarea
              value={bulkNames}
              onChange={(e) => setBulkNames(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              rows={8}
              placeholder={"Иванов Петр\nСидорова Мария\nКозлов Андрей"}
            />
          </div>
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="secondary" type="button" onClick={() => { setAddStudentsModalOpen(false); setBulkNames('') }}>Болдырмау</Button>
            <Button type="submit" isLoading={submitting}>Қосу</Button>
          </div>
        </form>
      </Modal>

      {/* Credentials Modal */}
      <Modal
        isOpen={credentialsModalOpen}
        onClose={() => { setCredentialsModalOpen(false); setCreatedStudents([]); setBulkErrors([]) }}
        title="Оқушылардың кіру деректері"
      >
        <div className="flex flex-col gap-4">
          {bulkErrors.length > 0 && (
            <div className="bg-red-50 rounded-lg p-3">
              <p className="text-sm font-medium text-red-700 mb-1">Қателер:</p>
              {bulkErrors.map((err, i) => (
                <p key={i} className="text-xs text-red-600">{err}</p>
              ))}
            </div>
          )}
          {createdStudents.length > 0 && (
            <div className="bg-white rounded-lg overflow-hidden">
              <p className="text-sm text-gray-600 mb-2">Бұл деректерді сақтап, оқушыларға таратыңыз:</p>
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium text-gray-500">Аты-жөні</th>
                    <th className="text-left px-3 py-2 font-medium text-gray-500">Email</th>
                    <th className="text-left px-3 py-2 font-medium text-gray-500">Құпиясөз</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {createdStudents.map((s, i) => (
                    <tr key={i}>
                      <td className="px-3 py-2 text-gray-900">{s.name}</td>
                      <td className="px-3 py-2 text-gray-500 font-mono text-xs">{s.email}</td>
                      <td className="px-3 py-2 text-gray-500 font-mono text-xs">{s.password}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="flex justify-end">
            <Button onClick={() => { setCredentialsModalOpen(false); setCreatedStudents([]); setBulkErrors([]) }}>Жабу</Button>
          </div>
        </div>
      </Modal>

      {/* Delete Class Confirmation */}
      <Modal isOpen={confirmDeleteClass} onClose={() => setConfirmDeleteClass(false)} title="Сыныпты жою керек пе?">
        <p className="text-sm text-gray-600 mb-4">
          <strong>{cls.name}</strong> сыныбы жойылады. Сынып оқушылары жойылмайды, бірақ сыныппен байланысын жоғалтады.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setConfirmDeleteClass(false)}>Болдырмау</Button>
          <Button variant="danger" onClick={handleDeleteClass}>Жою</Button>
        </div>
      </Modal>

      {/* Remove Student Confirmation */}
      <Modal isOpen={!!confirmRemove} onClose={() => setConfirmRemove(null)} title="Оқушыны сыныптан шығару керек пе?">
        <p className="text-sm text-gray-600 mb-4">
          <strong>{confirmRemove?.studentName}</strong> сыныптан шығарылады.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setConfirmRemove(null)}>Болдырмау</Button>
          <Button variant="danger" onClick={handleRemoveStudent}>Жою</Button>
        </div>
      </Modal>
    </div>
  )
}
