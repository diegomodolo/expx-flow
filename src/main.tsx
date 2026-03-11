import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { initErrorReporter } from '@/lib/errorReporter'

initErrorReporter();

createRoot(document.getElementById("root")!).render(<App />);
