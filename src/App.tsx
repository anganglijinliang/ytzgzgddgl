import { useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useStore } from './store/useStore';
import { ToastProvider } from './context/ToastContext';
import LoadingSpinner from './components/LoadingSpinner';

// Lazy load components
const Layout = lazy(() => import('./components/Layout'));
const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Orders = lazy(() => import('./pages/Orders'));
const Production = lazy(() => import('./pages/Production'));
const Shipping = lazy(() => import('./pages/Shipping'));
const Reports = lazy(() => import('./pages/Reports'));
const Users = lazy(() => import('./pages/Users'));
const TrackOrder = lazy(() => import('./pages/TrackOrder'));

function App() {
  const fetchInitialData = useStore(state => state.fetchInitialData);

  useEffect(() => {
    // Load data when app starts
    fetchInitialData();
  }, [fetchInitialData]);

  return (
    <ToastProvider>
      <BrowserRouter>
        <Suspense fallback={<div className="h-screen flex items-center justify-center"><LoadingSpinner /></div>}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/track/:orderId" element={<TrackOrder />} />
            
            <Route path="/" element={<Layout />}>
              <Route index element={<Dashboard />} />
              <Route path="orders" element={<Orders />} />
              <Route path="production" element={<Production />} />
              <Route path="shipping" element={<Shipping />} />
              <Route path="reports" element={<Reports />} />
              <Route path="users" element={<Users />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ToastProvider>
  );
}

export default App;
