import { useStore } from '@/store/useStore';
import { 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { FileText, Factory, Truck, AlertCircle, Upload, Download, Database } from 'lucide-react';
import React, { useState } from 'react';

export default function Dashboard() {
  const { orders, productionRecords, shippingRecords, importData, error } = useStore();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [initDbLoading, setInitDbLoading] = useState(false);

  const handleInitDb = async () => {
    if (!confirm('警告：此操作将初始化数据库表结构。如果表已存在，不会删除数据。确定继续吗？')) return;
    
    setInitDbLoading(true);
    try {
      const res = await fetch('/.netlify/functions/init-db', { method: 'POST' });
      const result = await res.json();
      if (res.ok) {
        alert('数据库初始化成功！');
      } else {
        alert('初始化失败: ' + result.details);
      }
    } catch (err) {
      alert('网络请求失败');
    } finally {
      setInitDbLoading(false);
    }
  };

  const handleExport = () => {
    const state = useStore.getState();
    const dataToExport = {
      orders: state.orders,
      productionRecords: state.productionRecords,
      shippingRecords: state.shippingRecords,
      masterData: state.masterData
    };
    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `angang_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        importData(data);
        alert('数据导入成功！');
      } catch (err) {
        alert('导入失败：文件格式错误');
      }
    };
    reader.readAsText(file);
  };

  const stats = [
    { 
      label: '总订单数', 
      value: orders.length, 
      icon: FileText,
      color: 'bg-blue-500',
      textColor: 'text-blue-500'
    },
    { 
      label: '今日生产', 
      value: productionRecords.filter(r => r.timestamp.startsWith(new Date().toISOString().split('T')[0])).reduce((acc, cur) => acc + cur.quantity, 0), 
      icon: Factory,
      color: 'bg-green-500',
      textColor: 'text-green-500'
    },
    { 
      label: '今日发运', 
      value: shippingRecords.filter(r => r.timestamp.startsWith(new Date().toISOString().split('T')[0])).reduce((acc, cur) => acc + cur.quantity, 0), 
      icon: Truck,
      color: 'bg-orange-500',
      textColor: 'text-orange-500'
    },
    { 
      label: '未完成订单', 
      value: orders.filter(o => o.status !== 'shipping_completed').length, 
      icon: AlertCircle,
      color: 'bg-red-500',
      textColor: 'text-red-500'
    },
  ];

  // Prepare Chart Data
  const orderStatusData = [
    { name: '新建', value: orders.filter(o => o.status === 'new').length },
    { name: '生产中', value: orders.filter(o => o.status === 'production_partial').length },
    { name: '生产完成', value: orders.filter(o => o.status === 'production_completed').length },
    { name: '发运中', value: orders.filter(o => o.status === 'shipping_partial').length },
    { name: '已完成', value: orders.filter(o => o.status === 'shipping_completed').length },
  ].filter(d => d.value > 0);

  const COLORS = ['#3b82f6', '#f59e0b', '#10b981', '#8b5cf6', '#64748b'];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">系统概览</h2>
      
      {/* System Status Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex flex-col md:flex-row items-center justify-between text-sm text-blue-800 gap-4">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          <span>当前运行模式: <strong>企业版 (Neon Postgres)</strong> {error && <span className="text-red-500"> - 连接失败: {error}</span>}</span>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={handleInitDb}
            disabled={initDbLoading}
            className="flex items-center gap-1 px-3 py-1 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded transition-colors disabled:opacity-50"
            title="初始化数据库表结构 (仅限首次)"
          >
            <Database className="h-3 w-3" />
            <span className="hidden sm:inline">{initDbLoading ? '初始化中...' : '初始化数据库'}</span>
          </button>
          <button 
            onClick={handleExport}
            className="flex items-center gap-1 px-3 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded transition-colors"
            title="导出当前数据快照"
          >
            <Download className="h-3 w-3" />
            <span className="hidden sm:inline">导出数据</span>
          </button>
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1 px-3 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded transition-colors"
            title="导入数据快照"
          >
            <Upload className="h-3 w-3" />
            <span className="hidden sm:inline">导入数据</span>
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept=".json" 
            onChange={handleImport} 
          />
        </div>
        
        <span className="hidden md:inline px-2 py-1 bg-blue-100 rounded text-xs font-mono">v1.0.0-MVP</span>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, idx) => (
          <div key={idx} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
            <div className={`p-3 rounded-lg ${stat.color} bg-opacity-10`}>
              <stat.icon className={`h-6 w-6 ${stat.textColor}`} />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">{stat.label}</p>
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Area */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Order Status Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-800 mb-4">订单状态分布</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={orderStatusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  fill="#8884d8"
                  paddingAngle={5}
                  dataKey="value"
                  label
                >
                  {orderStatusData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Activity Placeholder */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-800 mb-4">最新动态</h3>
          <div className="space-y-4">
            {orders.slice(0, 5).map(order => (
              <div key={order.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-900">{order.orderNo}</p>
                  <p className="text-xs text-gray-500">
                    {order.status === 'new' ? '新订单' : 
                     order.status === 'production_completed' ? '生产完成' : 
                     order.status === 'shipping_completed' ? '已发运' : '处理中'}
                  </p>
                </div>
                <span className="text-xs text-gray-400">{new Date(order.updatedAt).toLocaleDateString()}</span>
              </div>
            ))}
            {orders.length === 0 && (
              <p className="text-center text-gray-400 py-8">暂无数据</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
