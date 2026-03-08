interface BadgeProps {
  variant?: 'info' | 'success' | 'warning' | 'danger'
  children: React.ReactNode
}

const variantClasses = {
  info: 'bg-blue-100 text-blue-700',
  success: 'bg-green-100 text-green-700',
  warning: 'bg-yellow-100 text-yellow-700',
  danger: 'bg-red-100 text-red-700',
}

export function Badge({ variant = 'info', children }: BadgeProps) {
  return (
    <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${variantClasses[variant]}`}>
      {children}
    </span>
  )
}
