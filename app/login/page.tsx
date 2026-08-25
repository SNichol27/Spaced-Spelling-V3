import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { LoginForm } from './login-form';

export default async function LoginPage() {
  const supabase = createServerSupabaseClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (user) {
    redirect('/dashboard');
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center px-4">
      <section className="card w-full p-8">
        <h1 className="text-2xl font-semibold text-slate-900">Teacher Sign In</h1>
        <p className="mt-1 text-sm text-slate-600">Use your school-issued account credentials.</p>
        <div className="mt-6">
          <LoginForm />
        </div>
      </section>
    </main>
  );
}
