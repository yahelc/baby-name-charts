import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { MantineProvider, localStorageColorSchemeManager } from '@mantine/core'
import '@fontsource/inter/400.css'
import '@fontsource/inter/600.css'
import './index.css'
import App from './App.tsx'

const colorSchemeManager = localStorageColorSchemeManager({ key: 'baby-name-charts-color-scheme' });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MantineProvider
      colorSchemeManager={colorSchemeManager}
      defaultColorScheme="auto"
      theme={{
        fontFamily: 'Inter, system-ui, Avenir, Helvetica, Arial, sans-serif',
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
