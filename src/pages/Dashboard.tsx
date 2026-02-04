import { useStore } from '@/store/useStore';
import { 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { FileText, Factory, Truck, AlertCircle } from 'lucide-react';

export default function Dashboard() {
  const { orders, productionRecords, shippingRecords } = useStore();

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
      
      {/* System Status Banner for Demo */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between text-sm text-blue-800">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          <span>当前运行模式: <strong>演示环境 (Demo)</strong> - 数据存储于本地浏览器</span>
        </div>
        <span className="px-2 py-1 bg-blue-100 rounded text-xs font-mono">v1.0.0-MVP</span>
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
