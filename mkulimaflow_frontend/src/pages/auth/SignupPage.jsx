import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import useAuth from '../../hooks/useAuth'
import AuthLayout from '../../layouts/AuthLayout'
import RolePicker from '../../components/common/RolePicker'
import FormField from '../../components/common/FormField'
import FormError from '../../components/common/FormError'
import SubmitButton from '../../components/common/SubmitButton'

export default function SignupPage() {
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    username: '',
    email: '',
    password1: '',
    password2: '',
    role: 'farmer',
  })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  function update(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }))
  }

  async function submit(event) {
    event.preventDefault()
    setBusy(true)
    setError('')

    try {
      await signUp(form)
      navigate('/', { replace: true })
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthLayout
      description="Create your account and join a growing community."
      eyebrow="GET STARTED"
      footer={<>Already have an account? <Link className="font-bold text-[#346d4b] no-underline hover:text-[#28583c]" to="/login">Sign in</Link></>}
      title="Create your account"
    >
      <form className="grid gap-[17px]" onSubmit={submit}>
        <RolePicker onChange={(role) => setForm((current) => ({ ...current, role }))} value={form.role} />
        <FormField autoComplete="username" label="Username" name="username" onChange={update} value={form.username} />
        <FormField autoComplete="email" label="Email address" name="email" onChange={update} type="email" value={form.email} />
        <div className="grid grid-cols-2 gap-3 max-[410px]:grid-cols-1">
          <FormField autoComplete="new-password" label="Password" name="password1" onChange={update} type="password" value={form.password1} />
          <FormField autoComplete="new-password" label="Confirm password" name="password2" onChange={update} type="password" value={form.password2} />
        </div>
        <FormError>{error}</FormError>
        <SubmitButton busy={busy}>{busy ? 'Creating account…' : 'Create account'}</SubmitButton>
      </form>
    </AuthLayout>
  )
}
