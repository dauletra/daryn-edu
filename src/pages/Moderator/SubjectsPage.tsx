import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useFirestoreQuery } from '@/hooks/useFirestoreQuery'
import { getSubjects, createSubject, deleteSubject } from '@/services/db'
import { useToast } from '@/context/ToastContext'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { validateField, required } from '@/utils/validation'

export function SubjectsPage() {
  const { user } = useAuth()
  const { data: subjects, loading, refetch } = useFirestoreQuery(() => getSubjects())
  const { showSuccess, showError } = useToast()
  const [modalOpen, setModalOpen] = useState(false)
  const [name, setName] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const resetForm = () => {
    setName('')
    setErrors({})
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    const nameErr = validateField(name, [required])
    if (nameErr) {
      setErrors({ name: nameErr })
      return
    }
    setSubmitting(true)
    try {
      await createSubject(name.trim(), user!.uid)
      showSuccess('Предмет создан')
      setModalOpen(false)
      resetForm()
      refetch()
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Ошибка создания')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteSubject(id)
      showSuccess('Предмет удалён')
      setConfirmDelete(null)
      refetch()
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Ошибка удаления')
    }
  }

  if (loading) return <LoadingSpinner />

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Предметы</h1>
        <Button onClick={() => setModalOpen(true)}>Добавить предмет</Button>
      </div>

      {subjects && subjects.length > 0 ? (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Название</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {subjects.map((subject) => (
                <tr key={subject.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-900">{subject.name}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setConfirmDelete(subject.id)}
                      className="text-sm text-red-600 hover:text-red-800 cursor-pointer"
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
        <p className="text-gray-500">Предметов пока нет</p>
      )}

      <Modal isOpen={modalOpen} onClose={() => { setModalOpen(false); resetForm() }} title="Новый предмет">
        <form onSubmit={handleCreate} className="flex flex-col gap-4">
          <Input label="Название" value={name} onChange={(e) => setName(e.target.value)} error={errors.name} placeholder="Математика" />
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="secondary" type="button" onClick={() => { setModalOpen(false); resetForm() }}>Отмена</Button>
            <Button type="submit" isLoading={submitting}>Создать</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Удалить предмет?">
        <p className="text-sm text-gray-600 mb-4">Это действие нельзя отменить.</p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setConfirmDelete(null)}>Отмена</Button>
          <Button variant="danger" onClick={() => confirmDelete && handleDelete(confirmDelete)}>Удалить</Button>
        </div>
      </Modal>
    </div>
  )
}
