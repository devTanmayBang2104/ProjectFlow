import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { BrowserRouter } from 'react-router-dom'
import { store } from './app/store.js'
import { Provider } from 'react-redux'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false, // Prevent query spam when switching windows
      retry: 1, // Only retry failed requests once
    },
  },
})

createRoot(document.getElementById('root')).render(
    <BrowserRouter>
            <Provider store={store}>
                <QueryClientProvider client={queryClient}>
                    <App />
                </QueryClientProvider>
            </Provider>
    </BrowserRouter>,
)