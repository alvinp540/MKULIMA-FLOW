import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import useAuth from '../../hooks/useAuth'
import AuthLayout from '../../layouts/AuthLayout'
import RolePicker from '../../components/common/RolePicker'
import FormField from '../../components/common/FormField'
import FormError from '../../components/common/FormError'
import SubmitButton from '../../components/common/SubmitButton'

export default function LoginPage() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ username: '', password: '', role: 'farmer' })
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
      await signIn(form)
      navigate('/', { replace: true })
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthLayout
      description="Welcome back. Let’s get you where you need to be."
      eyebrow="WELCOME BACK"
      footer={<>New to MkulimaFlow? <Link className="font-bold text-[#346d4b] no-underline hover:text-[#28583c]" to="/signup">Create an account</Link></>}
      title="Sign in to your account"
    >
      <form className="grid gap-[17px]" onSubmit={submit}>
        <RolePicker onChange={(role) => setForm((current) => ({ ...current, role }))} value={form.role} />
        <FormField autoComplete="username" label="Username or email" name="username" onChange={update} value={form.username} />
        <FormField autoComplete="current-password" label="Password" name="password" onChange={update} type="password" value={form.password} />
        <FormError>{error}</FormError>
        <SubmitButton busy={busy}>{busy ? 'Signing in…' : 'Sign in'}</SubmitButton>
      </form>
    </AuthLayout>
  )
}
