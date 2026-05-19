import { redirect } from 'next/navigation'
import { getSession } from '@/lib/get-session'
import DashboardNav from '@/components/DashboardNav'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getSession()

  if (!user) redirect('/login')

  return (
    <div className="relative z-10 min-h-screen flex flex-col">
      <DashboardNav email={user.email} />
      <main className="flex-1 pt-14 min-h-[calc(100vh-3.5rem)]">
        {children}
      </main>
    </div>
  )
}
