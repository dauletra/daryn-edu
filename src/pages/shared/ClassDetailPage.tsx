import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useFirestoreQuery } from '@/hooks/useFirestoreQuery'
import {
  getClass, getTests, getUsers, getTestBanks,
  assignTestToClass, removeTestFromClass,
  removeStudentFromClass, createStudentsBulk,
} from '@/services/db'
import { useToast } from '@/context/ToastContext'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

export function ClassDetailPage({ backTo, backLabel }: { backTo: string; backLabel: string }) {
  const { id } = useParams<{ id: string }>()
  const { data: cls, loading: loadingClass, refetch } = useFirestoreQuery(
    () => getClass(id!),
    [id]
  )
  const { data: tests } = useFirestoreQuery(() => getTests())
  const { data: testBanks } = useFirestoreQuery(() => getTestBanks())
  const { data: allStudents, refetch: refetchStudents } = useFirestoreQuery(() => getUsers('student'))
  const { showSuccess, showError } = useToast()

  const [assignModalOpen, setAssignModalOpen] = useState(false)
  const [addStudentsModalOpen, setAddStudentsModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Assign test form — bank selection + checkboxes
  const [selectedBankId, setSelectedBankId] = useState('')
  const [selectedTestIds, setSelectedTestIds] = useState<Set<string>>(new Set())

  // Bulk add students
  const [bulkNames, setBulkNames] = useState('')
  const [credentialsModalOpen, setCredentialsModalOpen] = useState(false)
  const [createdStudents, setCreatedStudents] = useState<{ name: string; email: string; password: string }[]>([])
  const [bulkErrors, setBulkErrors] = useState<string[]>([])

  // Remove student
  const [confirmRemove, setConfirmRemove] = useState<{ studentId: string; studentName: string } | null>(null)

  const classStudents = allStudents?.filter((s) => cls?.studentIds?.includes(s.uid)) ?? []
  const alreadyAssigned = new Set(cls?.assignedTests ?? [])

  // Tests in selected bank (published only, not already assigned)
  const bankTests = tests
    ?.filter((t) => t.testBankId === selectedBankId && t.published && !alreadyAssigned.has(t.id))
    ?? []

  const getTestTitle = (testId: string) => {
    return tests?.find((t) => t.id === testId)?.title ?? testId
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
      showSuccess(`Назначено тестов: ${selectedTestIds.size}`)
      setAssignModalOpen(false)
      setSelectedBankId('')
      setSelectedTestIds(new Set())
      refetch()
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Ошибка назначения')
    } finally {
      setSubmitting(false)
    }
  }

  const handleRemoveTest = async (testId: string) => {
    if (!cls) return
    setSubmitting(true)
    try {
      await removeTestFromClass(cls.id, testId)
      showSuccess('Тест удалён из класса')
      refetch()
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Ошибка удаления')
    } finally {
      setSubmitting(false)
    }
  }

  const handleBulkAddStudents = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!cls) return
    const names = bulkNames.split('\n').map((n) => n.trim()).filter(Boolean)
    if (names.length === 0) {
      showError('Введите хотя бы одного ученика')
      return
    }
    setSubmitting(true)
    try {
      const result = await createStudentsBulk(names, cls.id)
      setCreatedStudents(result.created)
      setBulkErrors(result.errors)
      if (result.created.length > 0) {
        showSuccess(`Добавлено ${result.created.length} учеников`)
      }
      if (result.skipped.length > 0) {
        setBulkErrors((prev) => [
          ...prev,
          ...result.skipped.map((n) => `${n}: уже существует в этом классе`),
        ])
      }
      if (result.errors.length > 0) {
        showError(`Ошибки: ${result.errors.length}`)
      }
      setAddStudentsModalOpen(false)
      setBulkNames('')
      setCredentialsModalOpen(true)
      refetch()
      refetchStudents()
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Ошибка')
    } finally {
      setSubmitting(false)
    }
  }

  const handleRemoveStudent = async () => {
    if (!confirmRemove || !cls) return
    try {
      await removeStudentFromClass(cls.id, confirmRemove.studentId)
      showSuccess(`${confirmRemove.studentName} удалён из класса`)
      setConfirmRemove(null)
      refetch()
      refetchStudents()
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Ошибка удаления')
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
<html><head><meta charset="utf-8"><title>${cls?.name} — Логины</title>
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
<p>Данные для входа учеников</p>
<table><thead><tr><th>#</th><th>Имя</th><th>Email</th><th>Пароль</th></tr></thead><tbody>${rows}</tbody></table>
<script>window.onload=()=>{window.print()}</script>
</body></html>`
    const w = window.open('', '_blank')
    if (w) { w.document.write(html); w.document.close() }
  }

  if (loadingClass) return <LoadingSpinner />

  if (!cls) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Класс не найден</p>
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
      </div>

      {/* Students Section */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Ученики <Badge variant="info">{classStudents.length}</Badge>
          </h2>
          <div className="flex items-center gap-2">
            {classStudents.length > 0 && (
              <Button
                variant="secondary"
                className="text-xs"
                onClick={handlePrintCredentials}
              >
                Печать логинов
              </Button>
            )}
            <Button
              variant="secondary"
              className="text-xs"
              onClick={() => setAddStudentsModalOpen(true)}
            >
              Добавить учеников
            </Button>
          </div>
        </div>

        {classStudents.length > 0 ? (
          <div className="overflow-hidden rounded-lg border border-gray-200">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-2 text-sm font-medium text-gray-500 w-10">#</th>
                  <th className="text-left px-4 py-2 text-sm font-medium text-gray-500">Имя</th>
                  <th className="text-left px-4 py-2 text-sm font-medium text-gray-500">Email</th>
                  <th className="text-left px-4 py-2 text-sm font-medium text-gray-500">Пароль</th>
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
                        Удалить
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-gray-400">Нет учеников</p>
        )}
      </div>

      {/* Assigned Tests Section */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Назначенные тесты <Badge variant="success">{cls.assignedTests?.length ?? 0}</Badge>
          </h2>
          <Button
            variant="secondary"
            className="text-xs"
            onClick={() => setAssignModalOpen(true)}
          >
            Назначить тест
          </Button>
        </div>

        {cls.assignedTests?.length > 0 ? (
          <div className="flex flex-col gap-2">
            {cls.assignedTests.map((testId) => (
              <div key={testId} className="flex items-center justify-between text-sm bg-gray-50 px-4 py-3 rounded-lg">
                <span className="text-gray-900">{getTestTitle(testId)}</span>
                <button
                  onClick={() => handleRemoveTest(testId)}
                  className="text-red-500 hover:text-red-700 text-xs cursor-pointer"
                >
                  Убрать
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400">Нет назначенных тестов</p>
        )}
      </div>

      {/* Assign Test Modal — Bank selection + Checkboxes */}
      <Modal
        isOpen={assignModalOpen}
        onClose={() => { setAssignModalOpen(false); setSelectedBankId(''); setSelectedTestIds(new Set()) }}
        title={`Назначить тесты — ${cls.name}`}
      >
        <form onSubmit={handleAssignTests} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Банк тестов</label>
            <select
              value={selectedBankId}
              onChange={(e) => { setSelectedBankId(e.target.value); setSelectedTestIds(new Set()) }}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Выберите банк тестов</option>
              {testBanks?.map((bank) => (
                <option key={bank.id} value={bank.id}>
                  {bank.name} — {bank.quarter} четв. {bank.academicYear}
                </option>
              ))}
            </select>
          </div>

          {selectedBankId && (
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Тесты</label>
              {bankTests.length > 0 ? (
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
                        <p className="text-sm text-gray-900 truncate">{t.title}</p>
                        <p className="text-xs text-gray-500">{t.subject} &middot; {t.classLevel} кл. &middot; {t.questionCount} вопросов</p>
                      </div>
                    </label>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400 py-2">
                  Нет доступных опубликованных тестов в этом банке (или все уже назначены)
                </p>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 mt-2">
            <Button variant="secondary" type="button" onClick={() => { setAssignModalOpen(false); setSelectedBankId(''); setSelectedTestIds(new Set()) }}>
              Отмена
            </Button>
            <Button type="submit" isLoading={submitting} disabled={selectedTestIds.size === 0}>
              Назначить ({selectedTestIds.size})
            </Button>
          </div>
        </form>
      </Modal>

      {/* Bulk Add Students Modal */}
      <Modal
        isOpen={addStudentsModalOpen}
        onClose={() => { setAddStudentsModalOpen(false); setBulkNames('') }}
        title={`Добавить учеников — ${cls.name}`}
      >
        <form onSubmit={handleBulkAddStudents} className="flex flex-col gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700">Список учеников</label>
            <p className="text-xs text-gray-400 mb-2">Каждая строка — один ученик (Фамилия Имя)</p>
            <textarea
              value={bulkNames}
              onChange={(e) => setBulkNames(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              rows={8}
              placeholder={"Иванов Петр\nСидорова Мария\nКозлов Андрей"}
            />
          </div>
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="secondary" type="button" onClick={() => { setAddStudentsModalOpen(false); setBulkNames('') }}>Отмена</Button>
            <Button type="submit" isLoading={submitting}>Добавить</Button>
          </div>
        </form>
      </Modal>

      {/* Credentials Modal */}
      <Modal
        isOpen={credentialsModalOpen}
        onClose={() => { setCredentialsModalOpen(false); setCreatedStudents([]); setBulkErrors([]) }}
        title="Данные для входа учеников"
      >
        <div className="flex flex-col gap-4">
          {bulkErrors.length > 0 && (
            <div className="bg-red-50 rounded-lg p-3">
              <p className="text-sm font-medium text-red-700 mb-1">Ошибки:</p>
              {bulkErrors.map((err, i) => (
                <p key={i} className="text-xs text-red-600">{err}</p>
              ))}
            </div>
          )}
          {createdStudents.length > 0 && (
            <div className="bg-white rounded-lg overflow-hidden">
              <p className="text-sm text-gray-600 mb-2">Сохраните эти данные и раздайте ученикам:</p>
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium text-gray-500">Имя</th>
                    <th className="text-left px-3 py-2 font-medium text-gray-500">Email</th>
                    <th className="text-left px-3 py-2 font-medium text-gray-500">Пароль</th>
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
            <Button onClick={() => { setCredentialsModalOpen(false); setCreatedStudents([]); setBulkErrors([]) }}>Закрыть</Button>
          </div>
        </div>
      </Modal>

      {/* Remove Student Confirmation */}
      <Modal isOpen={!!confirmRemove} onClose={() => setConfirmRemove(null)} title="Удалить ученика из класса?">
        <p className="text-sm text-gray-600 mb-4">
          <strong>{confirmRemove?.studentName}</strong> будет удалён из класса.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setConfirmRemove(null)}>Отмена</Button>
          <Button variant="danger" onClick={handleRemoveStudent}>Удалить</Button>
        </div>
      </Modal>
    </div>
  )
}
