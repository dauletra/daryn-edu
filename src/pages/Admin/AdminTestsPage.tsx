import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useFirestoreQuery } from '@/hooks/useFirestoreQuery'
import { getTests, getUsers, getTestBanks, updateTest, deleteTest } from '@/services/db'
import { useToast } from '@/context/ToastContext'
import { formatTestTitle } from '@/utils/testTitle'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import type { Test } from '@/types'

export function AdminTestsPage() {
  const { data: tests, loading: loadingTests, refetch } = useFirestoreQuery(() => getTests())
  const { data: moderators, loading: loadingModerators } = useFirestoreQuery(() => getUsers('moderator'))
  const { data: testBanks, loading: loadingBanks } = useFirestoreQuery(() => getTestBanks())
  const { showSuccess, showError } = useToast()

  const [filterBankId, setFilterBankId] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; title: string } | null>(null)

  const filteredTests = useMemo(() => {
    if (!tests) return []
    if (!filterBankId) return tests
    return tests.filter((t) => t.testBankId === filterBankId)
  }, [tests, filterBankId])

  if (loadingTests || loadingModerators || loadingBanks) return <LoadingSpinner />

  const getCreatorName = (uid: string) => {
    const mod = moderators?.find((m) => m.uid === uid)
    return mod?.name ?? '—'
  }

  const getBankName = (bankId: string) => {
    const bank = testBanks?.find((b) => b.id === bankId)
    return bank?.name ?? '—'
  }

  const handlePublishToggle = async (test: Test) => {
    setSubmitting(true)
    try {
      await updateTest(test.id, { published: !test.published })
      showSuccess(test.published ? 'Тест жарияланымнан алынды' : 'Тест жарияланды')
      refetch()
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Қате')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteConfirm = async () => {
    if (!confirmDelete) return
    setSubmitting(true)
    try {
      await deleteTest(confirmDelete.id)
      showSuccess('Тест жойылды')
      setConfirmDelete(null)
      refetch()
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Жою қатесі')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Тесттер</h1>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Банк:</label>
          <select
            value={filterBankId}
            onChange={(e) => setFilterBankId(e.target.value)}
            className="px-2 py-1 border border-gray-300 rounded-lg text-sm"
          >
            <option value="">Барлығы</option>
            {testBanks?.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>
      </div>

      {filteredTests.length > 0 ? (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Атауы</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Банк</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Пән</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Автор</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Сұрақтар</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Мәртебе</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Әрекеттер</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredTests.map((test) => (
                <tr key={test.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-900">{formatTestTitle(test)}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{test.testBankId ? getBankName(test.testBankId) : '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{test.subject}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{getCreatorName(test.createdBy)}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{test.questionCount}</td>
                  <td className="px-4 py-3">
                    <Badge variant={test.published ? 'success' : 'warning'}>
                      {test.published ? 'Жарияланған' : 'Жоба'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Link
                        to={`/admin/tests/${test.id}/view`}
                        className="text-sm text-blue-600 hover:text-blue-800"
                      >
                        Қарау
                      </Link>
                      <button
                        onClick={() => void handlePublishToggle(test)}
                        disabled={submitting}
                        className="text-sm text-indigo-600 hover:text-indigo-800 disabled:opacity-40 cursor-pointer"
                      >
                        {test.published ? 'Алу' : 'Жариялау'}
                      </button>
                      <button
                        onClick={() => setConfirmDelete({ id: test.id, title: formatTestTitle(test) })}
                        disabled={submitting}
                        className="text-sm text-red-600 hover:text-red-800 disabled:opacity-40 cursor-pointer"
                      >
                        Жою
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-gray-500">Тесттер әлі жоқ</p>
      )}

      <Modal isOpen={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Тестті жою керек пе?">
        <p className="text-sm text-gray-600 mb-4">
          <strong>{confirmDelete?.title}</strong> тесті барлық сұрақтарымен жойылады. Бұл әрекетті болдырмауға болмайды.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setConfirmDelete(null)}>Болдырмау</Button>
          <Button variant="danger" isLoading={submitting} onClick={() => void handleDeleteConfirm()}>Жою</Button>
        </div>
      </Modal>
    </div>
  )
}
