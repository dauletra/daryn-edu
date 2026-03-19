import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

export function LoginPage() {
  const { user, loading, signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (user) {
    return <Navigate to={`/${user.role}`} replace />
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!email.trim() || !password.trim()) {
      setError('Барлық өрістерді толтырыңыз')
      return
    }

    setIsSubmitting(true)
    try {
      await signIn(email, password)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Кіру қатесі'
      if (message.includes('auth/invalid-credential') || message.includes('auth/wrong-password') || message.includes('auth/user-not-found')) {
        setError('Қате email немесе құпиясөз')
      } else if (message.includes('auth/too-many-requests')) {
        setError('Тым көп әрекет. Кейінірек көріңіз')
      } else {
        setError(message)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex items-center justify-center h-screen bg-gray-50">
      <div className="w-full max-w-sm p-8 bg-white rounded-xl shadow-md">
        <h1 className="text-2xl font-bold text-center text-gray-900 mb-6">EduCore</h1>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@example.com"
            autoComplete="email"
          />
          <Input
            label="Құпиясөз"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Құпиясөзді енгізіңіз"
            autoComplete="current-password"
          />
          {error && (
            <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
              {error}
            </div>
          )}
          <Button type="submit" isLoading={isSubmitting}>
            Кіру
          </Button>
        </form>
      </div>
    </div>
  )
}
