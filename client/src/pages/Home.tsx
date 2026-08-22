import Sidebar from '../components/Sidebar'
import Footer from '../components/Footer'

export default function Home() {
    return (
        <div className='flex w-full min-h-screen bg-gray dark:bg-dark-bg'>
            <Sidebar isAdmin={false} />

            <main className='flex-1 min-w-0 flex flex-col lg:ml-64'>
                <section className='flex-1 w-full max-w-6xl mx-auto px-6 pt-20 pb-10 lg:pt-10'>
                    <h1 className='text-2xl font-semibold text-gray-text dark:text-dark-text mb-1'>
                        Comercial Novamix
                    </h1>
                    <p className='text-sm text-gray-dark dark:text-dark-text-muted mb-6'>
                        Módulo em construção.
                    </p>
                </section>

                <div className='pb-6'>
                    <Footer />
                </div>
            </main>
        </div>
    )
}
