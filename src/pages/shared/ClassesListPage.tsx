import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useFirestoreQuery } from '@/hooks/useFirestoreQuery'
import { getClasses, createClass } from '@/services/db'
import { useToast } from '@/context/ToastContext'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { validateField, required } from '@/utils/validation'

export function ClassesListPage({ basePath }: { basePath: string }) {
  const { data: classes, loading, refetch } = useFirestoreQuery(() => getClasses())
  const { showSuccess, showError } = useToast()

  const [modalOpen, setModalOpen] = useState(false)
  const [className, setClassName] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)

  const resetForm = () => {
    setClassName('')
    setErrors({})
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    const nameErr = validateField(className, [required])
    if (nameErr) {
      setErrors({ name: nameErr })
      return
    }
    setSubmitting(true)
    try {
      await createClass(className.trim())
      showSuccess('Класс создан')
      setModalOpen(false)
      resetForm()
      refetch()
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Ошибка создания')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <LoadingSpinner />

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Классы</h1>
        <Button onClick={() => setModalOpen(true)}>Создать класс</Button>
      </div>

      {classes && classes.length > 0 ? (
        <div className="grid grid-cols-1 gap-4">
          {classes.map((cls) => (
            <Link
              key={cls.id}
              to={`${basePath}/${cls.id}`}
              className="bg-white rounded-xl shadow-sm p-4 hover:bg-gray-50 transition-colors block"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="font-medium text-gray-900">{cls.name}</span>
                  <Badge variant="info">{cls.studentIds?.length ?? 0} учеников</Badge>
                  <Badge variant="success">{cls.assignedTests?.length ?? 0} тестов</Badge>
                </div>
                <span className="text-sm text-blue-600">Открыть</span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">Классов пока нет</p>
          <Button onClick={() => setModalOpen(true)}>Создать первый класс</Button>
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={() => { setModalOpen(false); resetForm() }} title="Новый класс">
        <form onSubmit={handleCreate} className="flex flex-col gap-4">
          <Input
            label="Название класса"
            value={className}
            onChange={(e) => setClassName(e.target.value)}
            error={errors.name}
            placeholder="11А"
          />
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="secondary" type="button" onClick={() => { setModalOpen(false); resetForm() }}>Отмена</Button>
            <Button type="submit" isLoading={submitting}>Создать</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
