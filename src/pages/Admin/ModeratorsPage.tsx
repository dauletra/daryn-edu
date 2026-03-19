import { useState } from 'react'
import { useFirestoreQuery } from '@/hooks/useFirestoreQuery'
import { getUsers, createModerator, toggleModeratorStatus } from '@/services/db'
import { useToast } from '@/context/ToastContext'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { validateField, required, emailRule, minLength } from '@/utils/validation'

export function ModeratorsPage() {
  const { data: moderators, loading, refetch } = useFirestoreQuery(() => getUsers('moderator'))
  const { showSuccess, showError } = useToast()
  const [modalOpen, setModalOpen] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)

  const resetForm = () => {
    setName('')
    setEmail('')
    setPassword('')
    setErrors({})
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    const newErrors: Record<string, string> = {}
    const nameErr = validateField(name, [required])
    const emailErr = validateField(email, [required, emailRule])
    const passErr = validateField(password, [required, minLength(6)])
    if (nameErr) newErrors.name = nameErr
    if (emailErr) newErrors.email = emailErr
    if (passErr) newErrors.password = passErr
    setErrors(newErrors)
    if (Object.keys(newErrors).length > 0) return

    setSubmitting(true)
    try {
      await createModerator(name.trim(), email.trim(), password)
      showSuccess('Модератор жасалды')
      setModalOpen(false)
      resetForm()
      refetch()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Жасау қатесі'
      if (msg.includes('email-already-in-use')) {
        showError('Бұл email тіркелген')
      } else {
        showError(msg)
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleToggleStatus = async (uid: string, currentDisabled: boolean) => {
    try {
      await toggleModeratorStatus(uid, !currentDisabled)
      showSuccess(!currentDisabled ? 'Модератор бұғатталды' : 'Модератор бұғаттан шығарылды')
      refetch()
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Қате')
    }
  }

  if (loading) return <LoadingSpinner />

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Модераторлар</h1>
        <Button onClick={() => setModalOpen(true)}>Модератор қосу</Button>
      </div>

      {moderators && moderators.length > 0 ? (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Аты-жөні</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Email</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Мәртебе</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Әрекеттер</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {moderators.map((mod) => (
                <tr key={mod.uid} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-900">{mod.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{mod.email}</td>
                  <td className="px-4 py-3">
                    <Badge variant={mod.disabled ? 'danger' : 'success'}>
                      {mod.disabled ? 'Бұғатталған' : 'Белсенді'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleToggleStatus(mod.uid, !!mod.disabled)}
                      className={`text-sm cursor-pointer ${mod.disabled ? 'text-green-600 hover:text-green-800' : 'text-red-600 hover:text-red-800'}`}
                    >
                      {mod.disabled ? 'Бұғаттан шығару' : 'Бұғаттау'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-gray-500">Модераторлар әлі жоқ</p>
      )}

      <Modal isOpen={modalOpen} onClose={() => { setModalOpen(false); resetForm() }} title="Жаңа модератор">
        <form onSubmit={handleCreate} className="flex flex-col gap-4">
          <Input label="Аты-жөні" value={name} onChange={(e) => setName(e.target.value)} error={errors.name} />
          <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email} />
          <Input label="Құпиясөз" type="password" value={password} onChange={(e) => setPassword(e.target.value)} error={errors.password} />
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="secondary" type="button" onClick={() => { setModalOpen(false); resetForm() }}>
              Болдырмау
            </Button>
            <Button type="submit" isLoading={submitting}>Жасау</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
