import { createRoot } from 'react-dom/client';
import { Studio } from './Studio';
import './styles.css';
import { telegram } from './telegram';

telegram?.ready();
telegram?.expand();
telegram?.setHeaderColor('#172d57');
telegram?.setBackgroundColor('#f7f9fc');
createRoot(document.getElementById('root')!).render(<Studio />);
