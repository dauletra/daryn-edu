import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useFirestoreQuery } from '@/hooks/useFirestoreQuery'
import { getSubjects, createSubject, deleteSubject, getUsers } from '@/services/db'
import { useToast } from '@/context/ToastContext'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { validateField, required } from '@/utils/validation'

export function AdminSubjectsPage() {
  const { user } = useAuth()
  const { data: subjects, loading: loadingSubjects, refetch } = useFirestoreQuery(() => getSubjects())
  const { data: moderators, loading: loadingModerators } = useFirestoreQuery(() => getUsers('moderator'))
  const { showSuccess, showError } = useToast()
  const [modalOpen, setModalOpen] = useState(false)
  const [name, setName] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null)

  const resetForm = () => {
    setName('')
    setErrors({})
  }

  const getCreatorName = (uid: string) => {
    const mod = moderators?.find((m) => m.uid === uid)
    return mod?.name ?? '—'
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
      showSuccess('Пән жасалды')
      setModalOpen(false)
      resetForm()
      refetch()
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Жасау қатесі')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!confirmDelete) return
    try {
      await deleteSubject(confirmDelete.id)
      showSuccess('Пән жойылды')
      setConfirmDelete(null)
      refetch()
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Жою қатесі')
    }
  }

  if (loadingSubjects || loadingModerators) return <LoadingSpinner />

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Пәндер</h1>
        <Button onClick={() => setModalOpen(true)}>Пән қосу</Button>
      </div>

      {subjects && subjects.length > 0 ? (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Атауы</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Жасаған</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Әрекеттер</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {subjects.map((subject) => (
                <tr key={subject.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-900">{subject.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{getCreatorName(subject.createdBy)}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setConfirmDelete({ id: subject.id, name: subject.name })}
                      className="text-sm text-red-600 hover:text-red-800 cursor-pointer"
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
        <p className="text-gray-500">Пәндер әлі жоқ</p>
      )}

      <Modal isOpen={modalOpen} onClose={() => { setModalOpen(false); resetForm() }} title="Жаңа пән">
        <form onSubmit={handleCreate} className="flex flex-col gap-4">
          <Input label="Атауы" value={name} onChange={(e) => setName(e.target.value)} error={errors.name} placeholder="Математика" />
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="secondary" type="button" onClick={() => { setModalOpen(false); resetForm() }}>Болдырмау</Button>
            <Button type="submit" isLoading={submitting}>Жасау</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Пәнді жою керек пе?">
        <p className="text-sm text-gray-600 mb-4">
          <strong>{confirmDelete?.name}</strong> пәні жойылады. Бұл әрекетті болдырмауға болмайды.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setConfirmDelete(null)}>Болдырмау</Button>
          <Button variant="danger" onClick={() => void handleDelete()}>Жою</Button>
        </div>
      </Modal>
    </div>
  )
}
