import './globals.css'
import { cookies } from 'next/headers'
import Navbar from '../components/layout/Navbar'

export const metadata = {
    title: 'Knowledge Hub OS',
    description: 'AI-Powered Career & Productivity Engine',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
    const cookieStore = await cookies();
    const token = cookieStore.get('kh_os_token')?.value;

    return (
        <html lang="en" suppressHydrationWarning>
            <body className="min-h-screen bg-background text-textMain antialiased flex flex-col" suppressHydrationWarning>
                <Navbar isLoggedIn={!!token} />


                {/* Page Content */}
                <main className="flex-1 max-w-7xl mx-auto p-6 w-full">
                    {children}
                </main>
            </body>
        </html>
    )
}
