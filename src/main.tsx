import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { MantineProvider } from '@mantine/core'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MantineProvider
      theme={{
        defaultRadius: 'sm',
        primaryColor: 'blue',
        components: {
          Button: {
            defaultProps: {
              variant: 'light',
            },
          },
        },
      }}
    >
      <App />
    </MantineProvider>
  </StrictMode>,
)
