import { useEffect, type ReactNode } from 'react'
import { CloseIcon } from './icons'

type ModalProps = {
    titulo: ReactNode
    subtitulo?: string
    onClose: () => void
    children: ReactNode
    largura?: 'md' | 'lg' | 'xl'
}

const LARGURAS = {
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
}

export default function Modal({ titulo, subtitulo, onClose, children, largura = 'md' }: ModalProps) {
    useEffect(() => {
        const originalHtml = document.documentElement.style.overflow
        document.documentElement.style.overflow = 'hidden'

        function aoTeclar(e: KeyboardEvent) {
            if (e.key === 'Escape') onClose()
        }
        window.addEventListener('keydown', aoTeclar)

        return () => {
            document.documentElement.style.overflow = originalHtml
            window.removeEventListener('keydown', aoTeclar)
        }
    }, [onClose])

    return (
        <div className='fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 px-4 py-10' onClick={onClose}>
            <div
                className={`w-full ${LARGURAS[largura]} rounded-xl bg-white shadow-xl dark:bg-dark-surface`}
                onClick={(e) => e.stopPropagation()}
            >
                <div className='flex items-start justify-between gap-4 border-b border-gray-base/30 px-6 py-4 dark:border-dark-border'>
                    <div>
                        <h2 className='text-lg font-semibold text-gray-text dark:text-dark-text'>{titulo}</h2>
                        {subtitulo && <p className='mt-0.5 text-sm text-gray-dark dark:text-dark-text-muted'>{subtitulo}</p>}
                    </div>
                    <button
                        type='button'
                        onClick={onClose}
                        aria-label='Fechar'
                        className='rounded-lg p-1.5 text-gray-dark transition hover:bg-gray-base/10 dark:text-dark-text-muted dark:hover:bg-dark-border/30'
                    >
                        <CloseIcon className='h-5 w-5' />
                    </button>
                </div>

                <div className='px-6 py-5'>{children}</div>
            </div>
        </div>
    )
}
