import { useStore } from '@/store/useStore';
import { 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts';
import { FileText, Factory, Truck, AlertCircle, Activity, Layers } from 'lucide-react';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function Dashboard() {
  const { orders, productionRecords, shippingRecords, isLoading } = useStore();

  if (isLoading && orders.length === 0) {
    return <LoadingSpinner />;
  }

  const stats = [
    { 
      label: '总订单数', 
      value: orders.length, 
      icon: FileText,
      color: 'bg-blue-500',
      textColor: 'text-blue-500'
    },
    { 
      label: '今日生产 (成品)', 
      value: productionRecords.filter(r => r.timestamp.startsWith(new Date().toISOString().split('T')[0]) && (r.process === 'packaging' || !r.process)).reduce((acc, cur) => acc + cur.quantity, 0), 
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

  // WIP Data (Process Balance)
  // Aggregating data from sub-orders to see how many pipes are at each stage
  // Note: This is an estimation based on cumulative counters. 
  // Ideally: Pulling > Hydro > Lining > Packaging
  // Stock at Pulling = PullingQty - HydroQty
  // Stock at Hydro = HydroQty - LiningQty
  // Stock at Lining = LiningQty - PackagingQty
  const processData = orders.reduce((acc, order) => {
    order.items.forEach(item => {
      acc.pulling += (item.pullingQuantity || 0);
      acc.hydro += (item.hydrostaticQuantity || 0);
      acc.lining += (item.liningQuantity || 0);
      acc.packaging += (item.producedQuantity || 0); // producedQuantity is usually final packaging
    });
    return acc;
  }, { pulling: 0, hydro: 0, lining: 0, packaging: 0 });

  const wipChartData = [
    { name: '离心浇铸', total: processData.pulling, wip: Math.max(0, processData.pulling - processData.hydro) },
    { name: '水压试验', total: processData.hydro, wip: Math.max(0, processData.hydro - processData.lining) },
    { name: '内衬工序', total: processData.lining, wip: Math.max(0, processData.lining - processData.packaging) },
    { name: '成品包装', total: processData.packaging, wip: 0 }, // Final stage
  ];

  const COLORS = ['#3b82f6', '#f59e0b', '#fb923c', '#10b981', '#6366f1', '#64748b'];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">数字工厂概览</h2>
          <p className="text-gray-500 mt-1">实时监控生产瓶颈与质量追溯</p>
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
        {/* WIP / Process Balance Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-4">
             <Activity className="h-5 w-5 text-blue-600" />
             <h3 className="text-lg font-bold text-gray-800">工序平衡与在制品 (WIP)</h3>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={wipChartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar name="累计产量" dataKey="total" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                <Bar name="积压库存(WIP)" dataKey="wip" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-gray-400 mt-2 text-center">
            * 积压库存 = 当前工序累计 - 下一道工序累计 (反映工序瓶颈)
          </p>
        </div>

        {/* Order Status Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-4">
             <Layers className="h-5 w-5 text-purple-600" />
             <h3 className="text-lg font-bold text-gray-800">订单状态分布</h3>
          </div>
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
                >
                  {orderStatusData.map((_entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
