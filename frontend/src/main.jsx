import ReactDOM from 'react-dom/client';
import { CustomAuthProvider } from './hooks/useCustomAuth';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import './index.css';

const __origConsoleError = console.error;
console.error = (...args) => {
    const first = args[0];
    const str = args.map(a => {
        try { return typeof a === 'string' ? a : JSON.stringify(a); } catch { return String(a); }
    }).join(' ');
    if (str.includes('net::ERR_ABORTED') || str.includes('AbortError')) {
        return;
    }
    __origConsoleError(...args);
};

const queryClient = new QueryClient({
    logger: {
        log: () => {},
        warn: () => {},
        error: () => {}
    },
    defaultOptions: {
        queries: {
            retry: 0,
            refetchOnWindowFocus: false,
            refetchOnReconnect: false
        }
    }
});

ReactDOM.createRoot(document.getElementById('root')).render(
    <QueryClientProvider client={queryClient}>
        <CustomAuthProvider>
            <App />
        </CustomAuthProvider>
    </QueryClientProvider>
);
