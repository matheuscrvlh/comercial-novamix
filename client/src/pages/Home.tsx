import Sidebar from '../components/Sidebar'
import Footer from '../components/Footer'
import { useMe } from '../hooks/useMe'

export default function Home() {
    const { me } = useMe()

    return (
        <div className='flex w-full min-h-screen bg-gray dark:bg-dark-bg'>
            <Sidebar isAdmin={me?.isAdmin ?? false} />

            <main className='flex-1 min-w-0 flex flex-col lg:ml-64'>
                <section className='flex-1 w-full max-w-6xl mx-auto px-6 pt-20 pb-10 lg:pt-10'>
                    <h1 className='text-2xl font-semibold text-gray-text dark:text-dark-text mb-1'>
                        Comercial Novamix
                    </h1>
                    <p className='text-sm text-gray-dark dark:text-dark-text-muted mb-6'>
                        Selecione uma tela no menu ao lado.
                    </p>
                </section>

                <div className='pb-6'>
                    <Footer />
                </div>
            </main>
        </div>
    )
}
