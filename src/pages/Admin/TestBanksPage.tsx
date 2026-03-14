import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useFirestoreQuery } from '@/hooks/useFirestoreQuery'
import { getTestBanks, getTests, createTestBank, updateTestBank, deleteTestBank } from '@/services/db'
import { useToast } from '@/context/ToastContext'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

const QUARTERS = [1, 2, 3, 4] as const
const CURRENT_YEAR = new Date().getFullYear()
const YEAR_OPTIONS = Array.from({ length: 8 }, (_, i) => CURRENT_YEAR - 2 + i)

export function TestBanksPage() {
  const { data: banks, loading: loadingBanks, refetch } = useFirestoreQuery(() => getTestBanks())
  const { data: allTests, loading: loadingTests } = useFirestoreQuery(() => getTests())
  const { showSuccess, showError } = useToast()

  const [showCreate, setShowCreate] = useState(false)
  const [editingBank, setEditingBank] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [quarter, setQuarter] = useState<1 | 2 | 3 | 4>(1)
  const [academicYear, setAcademicYear] = useState(String(CURRENT_YEAR))
  const [submitting, setSubmitting] = useState(false)

  const getTestsCountForBank = (bankId: string) => {
    if (!allTests) return 0
    return allTests.filter((t) => t.testBankId === bankId).length
  }

  const getPublishedCountForBank = (bankId: string) => {
    if (!allTests) return 0
    return allTests.filter((t) => t.testBankId === bankId && t.published).length
  }

  const resetForm = () => {
    setName('')
    setQuarter(1)
    setAcademicYear(String(CURRENT_YEAR))
  }

  const openEdit = (bankId: string) => {
    const bank = banks?.find((b) => b.id === bankId)
    if (!bank) return
    setName(bank.name)
    setQuarter(bank.quarter)
    setAcademicYear(String(bank.academicYear))
    setEditingBank(bankId)
  }

  const handleCreate = async () => {
    if (!name.trim()) {
      showError('Укажите название')
      return
    }
    setSubmitting(true)
    try {
      await createTestBank({ name: name.trim(), quarter, academicYear: Number(academicYear) })
      showSuccess('Банк тестов создан')
      setShowCreate(false)
      resetForm()
      refetch()
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Ошибка создания')
    } finally {
      setSubmitting(false)
    }
  }

  const handleUpdate = async () => {
    if (!editingBank || !name.trim()) return
    setSubmitting(true)
    try {
      await updateTestBank(editingBank, { name: name.trim(), quarter, academicYear: Number(academicYear) })
      showSuccess('Банк обновлён')
      setEditingBank(null)
      resetForm()
      refetch()
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Ошибка обновления')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!confirmDelete) return
    try {
      await deleteTestBank(confirmDelete)
      showSuccess('Банк удалён')
      setConfirmDelete(null)
      refetch()
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Ошибка удаления')
    }
  }

  if (loadingBanks || loadingTests) return <LoadingSpinner />

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Банки тестов</h1>
        <Button onClick={() => { resetForm(); setShowCreate(true) }}>Создать банк</Button>
      </div>

      {banks && banks.length > 0 ? (
        <div className="grid grid-cols-1 gap-4">
          {banks.map((bank) => {
            const testsCount = getTestsCountForBank(bank.id)
            const publishedCount = getPublishedCountForBank(bank.id)
            return (
              <div key={bank.id} className="bg-white rounded-xl shadow-sm p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <Link to={`/admin/test-banks/${bank.id}`} className="font-medium text-gray-900 hover:text-blue-600">
                      {bank.name}
                    </Link>
                    <div className="flex items-center gap-3 mt-2 text-sm text-gray-500">
                      <span>{bank.quarter} четверть</span>
                      <span>{bank.academicYear}–{bank.academicYear + 1} уч. год</span>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="info">Тестов: {testsCount}</Badge>
                      {testsCount > 0 && (
                        <Badge variant="success">Опубликовано: {publishedCount}</Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link to={`/admin/test-banks/${bank.id}`}>
                      <Button variant="secondary" className="text-xs">Подробнее</Button>
                    </Link>
                    <Button variant="secondary" className="text-xs" onClick={() => openEdit(bank.id)}>
                      Редактировать
                    </Button>
                    <Button variant="danger" className="text-xs" onClick={() => setConfirmDelete(bank.id)}>
                      Удалить
                    </Button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">Банков тестов пока нет</p>
          <Button onClick={() => { resetForm(); setShowCreate(true) }}>Создать первый банк</Button>
        </div>
      )}

      {/* Create Modal */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Создать банк тестов">
        <div className="flex flex-col gap-4">
          <Input
            label="Название"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="3 четверть 2025"
          />
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Четверть</label>
              <select
                value={quarter}
                onChange={(e) => setQuarter(Number(e.target.value) as 1 | 2 | 3 | 4)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {QUARTERS.map((q) => (
                  <option key={q} value={q}>{q} четверть</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Учебный год</label>
              <select
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {YEAR_OPTIONS.map((y) => (
                  <option key={y} value={y}>{y}–{y + 1}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowCreate(false)}>Отмена</Button>
            <Button onClick={handleCreate} isLoading={submitting}>Создать</Button>
          </div>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={!!editingBank} onClose={() => { setEditingBank(null); resetForm() }} title="Редактировать банк">
        <div className="flex flex-col gap-4">
          <Input
            label="Название"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Четверть</label>
              <select
                value={quarter}
                onChange={(e) => setQuarter(Number(e.target.value) as 1 | 2 | 3 | 4)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {QUARTERS.map((q) => (
                  <option key={q} value={q}>{q} четверть</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Учебный год</label>
              <select
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {YEAR_OPTIONS.map((y) => (
                  <option key={y} value={y}>{y}–{y + 1}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => { setEditingBank(null); resetForm() }}>Отмена</Button>
            <Button onClick={handleUpdate} isLoading={submitting}>Сохранить</Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <Modal isOpen={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Удалить банк?">
        <p className="text-sm text-gray-600 mb-4">Удаление возможно только если в банке нет тестов.</p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setConfirmDelete(null)}>Отмена</Button>
          <Button variant="danger" onClick={handleDelete}>Удалить</Button>
        </div>
      </Modal>
    </div>
  )
}
