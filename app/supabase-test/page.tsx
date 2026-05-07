import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'

export default async function SupabaseTestPage() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: todos, error } = await supabase.from('todos').select()

  if (error) {
    return (
      <main className="p-6">
        <h1 className="text-xl font-semibold">Supabase Test</h1>
        <p className="mt-2 text-red-600">{error.message}</p>
      </main>
    )
  }

  return (
    <main className="p-6">
      <h1 className="text-xl font-semibold">Supabase Test</h1>
      <ul className="mt-4 list-disc pl-6">
        {todos?.map((todo: { id: string; name: string }) => (
          <li key={todo.id}>{todo.name}</li>
        ))}
      </ul>
    </main>
  )
}
