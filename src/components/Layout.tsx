import React from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useStore } from '@/store/useStore';
import { 
  LayoutDashboard, 
  FileInput, 
  Factory, 
  LogOut, 
  BarChart3,
  Users,
  WifiOff
} from 'lucide-react';
import { clsx } from 'clsx';
import { AnimatePresence, motion } from 'framer-motion';

export default function Layout() {
  const { currentUser, logout } = useStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [isOnline, setIsOnline] = React.useState(navigator.onLine);

  React.useEffect(() => {
    const handleStatusChange = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', handleStatusChange);
    window.addEventListener('offline', handleStatusChange);
    return () => {
      window.removeEventListener('online', handleStatusChange);
      window.removeEventListener('offline', handleStatusChange);
    };
  }, []);

  if (!currentUser) {
    React.useEffect(() => {
      navigate('/login');
    }, [navigate]);
    return null;
  }

  const navItems = [
    { label: '概览', path: '/', icon: LayoutDashboard, roles: ['admin', 'order_entry', 'production'] },
    { label: '订单管理', path: '/orders', icon: FileInput, roles: ['admin', 'order_entry'] },
    { label: '生产跟踪', path: '/production', icon: Factory, roles: ['admin', 'production'] },
    { label: '报表查询', path: '/reports', icon: BarChart3, roles: ['admin', 'order_entry', 'production'] },
    { label: '用户管理', path: '/users', icon: Users, roles: ['admin'] },
  ];

  const filteredNavItems = navItems.filter(item => item.roles.includes(currentUser.role));

  return (
    <div className="min-h-screen bg-gray-50 flex font-sans text-gray-900">
      {/* Sidebar Desktop - Modern Dark Theme */}
      <aside className="hidden md:flex flex-col w-72 bg-slate-900 text-white shadow-xl z-20 transition-all duration-300">
        <div className="p-6 border-b border-slate-800 flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-lg shadow-lg shadow-blue-500/20">
             <Factory className="h-6 w-6 text-white" />
          </div>
          <div>
             <h1 className="text-lg font-bold tracking-tight">安钢永通</h1>
             <p className="text-xs text-slate-400 font-medium tracking-wide">智能订单管理系统</p>
          </div>
        </div>
        
        {!isOnline && (
            <div className="mx-6 mt-4 flex items-center gap-2 text-xs text-red-200 bg-red-900/30 border border-red-800 px-3 py-2 rounded-lg">
              <WifiOff className="h-3 w-3" />
              <span>离线模式运行中</span>
            </div>
        )}

        <nav className="flex-1 p-4 space-y-1.5 mt-2">
          {filteredNavItems.map(item => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={clsx(
                  "flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium transition-all duration-200 group relative overflow-hidden",
                  isActive
                    ? "bg-blue-600 text-white shadow-md shadow-blue-900/20"
                    : "text-slate-400 hover:bg-slate-800 hover:text-white"
                )}
              >
                <item.icon className={clsx("h-5 w-5 transition-transform duration-200", isActive ? "scale-110" : "group-hover:scale-110")} />
                <span className="relative z-10">{item.label}</span>
                {isActive && <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white/20 rounded-l-full" />}
              </Link>
            );
          })}
        </nav>
        
        <div className="p-4 border-t border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-3 mb-4 px-2 py-2 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer group">
            <div className="relative">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold shadow-lg">
                    {currentUser.name.charAt(0)}
                </div>
                <div className="absolute bottom-0 right-0 h-3 w-3 bg-green-500 border-2 border-slate-900 rounded-full"></div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate group-hover:text-blue-400 transition-colors">{currentUser.name}</p>
              <p className="text-xs text-slate-400 truncate">
                  {currentUser.role === 'admin' ? '系统管理员' : currentUser.role === 'order_entry' ? '订单录入员' : '生产主管'}
              </p>
            </div>
          </div>
          <button
            onClick={() => { logout(); navigate('/login'); }}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-red-400 hover:text-white hover:bg-red-600/20 border border-transparent hover:border-red-600/30 rounded-xl transition-all duration-200"
          >
            <LogOut className="h-4 w-4" />
            退出登录
          </button>
        </div>
      </aside>

      {/* Mobile Header - Glassmorphism */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-white/80 backdrop-blur-md border-b border-gray-200 z-50 flex items-center justify-between px-4 shadow-sm">
        <div className="flex flex-col">
          <h1 className="text-lg font-bold text-blue-700 flex items-center gap-2">
            <Factory className="h-5 w-5" />
            安钢永通
          </h1>
          {!isOnline && (
            <span className="text-[10px] text-red-600 flex items-center gap-1">
              <WifiOff className="h-3 w-3" /> 离线
            </span>
          )}
        </div>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-1">
           <div className="h-9 w-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold shadow-md">
              {currentUser.name.charAt(0)}
           </div>
        </button>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-50 pb-[env(safe-area-inset-bottom)]">
        <div className="flex justify-around items-center h-16 px-2">
          {filteredNavItems.slice(0, 5).map(item => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={clsx(
                  "flex flex-col items-center justify-center flex-1 h-full space-y-1 transition-colors active:scale-95",
                  isActive ? "text-blue-600" : "text-slate-400 hover:text-slate-600"
                )}
              >
                <item.icon className={clsx("h-6 w-6", isActive && "fill-blue-100")} strokeWidth={isActive ? 2.5 : 2} />
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Mobile Menu Overlay (Profile & Logout) */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)}>
          <motion.div 
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl p-6 pb-8" 
            onClick={e => e.stopPropagation()}
          >
             <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-6"></div>
             
             <div className="flex items-center gap-4 mb-8">
                 <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                    {currentUser.name.charAt(0)}
                 </div>
                 <div>
                    <h3 className="text-xl font-bold text-slate-900">{currentUser.name}</h3>
                    <p className="text-slate-500 font-medium">
                      {currentUser.role === 'admin' ? '系统管理员' : currentUser.role === 'order_entry' ? '订单录入员' : '生产主管'}
                    </p>
                 </div>
             </div>

             <div className="space-y-2">
                <button
                  onClick={() => { logout(); navigate('/login'); }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-4 text-base font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-2xl transition-colors"
                >
                  <LogOut className="h-5 w-5" />
                  退出登录
                </button>
             </div>
          </motion.div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-auto md:p-8 p-4 pt-20 pb-24 md:pt-8 md:pb-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="min-h-full"
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
