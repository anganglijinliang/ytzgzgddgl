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
      value: orders.filter(o => o.status !== 'completed').length, 
      icon: AlertCircle,
      color: 'bg-red-500',
      textColor: 'text-red-500'
    },
  ];

  // Prepare Chart Data
  const orderStatusData = [
    { name: '新建', value: orders.filter(o => o.status === 'new').length },
    { name: '生产中', value: orders.filter(o => o.status === 'in_production').length },
    { name: '边生产边发运', value: orders.filter(o => o.status === 'shipping_during_production').length },
    { name: '生产完成', value: orders.filter(o => o.status === 'production_completed').length },
    { name: '生产完发运中', value: orders.filter(o => o.status === 'shipping_completed_production').length },
    { name: '已完成', value: orders.filter(o => o.status === 'completed').length },
  ].filter(d => d.value > 0);

  const COLORS = ['#3b82f6', '#f59e0b', '#fb923c', '#10b981', '#6366f1', '#64748b'];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">系统概览</h2>
          <p className="text-gray-500 mt-1">欢迎回来，查看今日生产动态</p>
        </div>
        <div className="flex gap-2">
          {/* Admin tools hidden for regular users or if not needed in production */}
        </div>
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
                     order.status === 'completed' ? '已完成' : '处理中'}
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
