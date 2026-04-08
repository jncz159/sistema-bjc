// src/app/layout.js

export const metadata = {
  title: 'B J Importaciones | Panel de Gestión',
  description: 'Sistema administrativo oficial de B J Importaciones Chiclayo',
  icons: {
    icon: '/favicon.ico', // Aquí es donde le dices qué imagen usar como ícono
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  )
}