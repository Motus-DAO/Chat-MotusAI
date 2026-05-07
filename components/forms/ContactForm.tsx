'use client'

import { GlassCard } from '@/components/ui/GlassCard'
import { CTAButton } from '@/components/ui/CTAButton'
import { useState } from 'react'
import { Send, CheckCircle, AlertCircle } from 'lucide-react'
import { useUIStore } from '@/lib/store'

interface ContactFormProps {
  className?: string
}

export function ContactForm({ className }: ContactFormProps) {
  const { theme } = useUIStore()
  const isLight = theme === 'light'
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [submitError, setSubmitError] = useState<string>('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setSubmitStatus('idle')
    setSubmitError('')

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        setSubmitStatus('success')
        setFormData({ name: '', email: '', message: '' })
      } else {
        const payload = await response.json().catch(() => null)
        if (payload?.error) {
          setSubmitError(payload.error)
        }
        setSubmitStatus('error')
      }
    } catch (error) {
      console.error('Error submitting contact form:', error)
      setSubmitError('No se pudo conectar con el servidor.')
      setSubmitStatus('error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <GlassCard className={`p-6 ${className}`}>
      <h3 className="text-xl font-semibold mb-4">Contáctanos</h3>
      
      {submitStatus === 'success' && (
        <div className="mb-4 p-3 bg-green-500/20 border border-green-500/18 rounded-xl flex items-center space-x-2">
          <CheckCircle className={`w-5 h-5 ${isLight ? 'text-green-700' : 'text-green-500'}`} />
          <span className={`text-sm ${isLight ? 'text-green-800' : 'text-green-400'}`}>¡Mensaje enviado exitosamente!</span>
        </div>
      )}

      {submitStatus === 'error' && (
        <div className="mb-4 p-3 bg-red-500/20 border border-red-500/18 rounded-xl flex items-center space-x-2">
          <AlertCircle className={`w-5 h-5 ${isLight ? 'text-red-700' : 'text-red-500'}`} />
          <span className={`text-sm ${isLight ? 'text-red-800' : 'text-red-400'}`}>
            {submitError || 'Error al enviar el mensaje. Inténtalo de nuevo.'}
          </span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Nombre</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            required
            className="w-full p-3 glass border border-white/8 rounded-xl focus-ring smooth-transition"
            placeholder="Tu nombre completo"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Email</label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => handleInputChange('email', e.target.value)}
            required
            className="w-full p-3 glass border border-white/8 rounded-xl focus-ring smooth-transition"
            placeholder="tu@email.com"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Mensaje</label>
          <textarea
            value={formData.message}
            onChange={(e) => handleInputChange('message', e.target.value)}
            required
            rows={4}
            className="w-full p-3 glass border border-white/8 rounded-xl focus-ring smooth-transition resize-none"
            placeholder="Cuéntanos cómo podemos ayudarte..."
          />
        </div>

        <CTAButton
          type="submit"
          disabled={isSubmitting}
          className="w-full"
        >
          {isSubmitting ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
              Enviando...
            </>
          ) : (
            <>
              <Send className="w-4 h-4 mr-2" />
              Enviar Mensaje
            </>
          )}
        </CTAButton>
      </form>
    </GlassCard>
  )
}
