import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Orders from './pages/Orders';
import Production from './pages/Production';
import Shipping from './pages/Shipping';
import Reports from './pages/Reports';
import Users from './pages/Users';
import TrackOrder from './pages/TrackOrder';
import { useStore } from './store/useStore';
import { ToastProvider } from './context/ToastContext';

function App() {
  const fetchInitialData = useStore(state => state.fetchInitialData);

  useEffect(() => {
    // Load data when app starts
    fetchInitialData();
  }, [fetchInitialData]);

  return (
    <ToastProvider>
      <BrowserRouter>
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
      </BrowserRouter>
    </ToastProvider>
  );
}

export default App;
