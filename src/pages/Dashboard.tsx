import React from 'react';
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
  CartesianGrid,
  AreaChart,
  Area
} from 'recharts';
import { FileText, Factory, AlertCircle, Activity, Layers, Database, Loader2, TrendingUp, Package, CheckCircle2, Clock } from 'lucide-react';
import LoadingSpinner from '@/components/LoadingSpinner';
import { useToast } from '@/context/ToastContext';
import clsx from 'clsx';

export default function Dashboard() {
  const { orders, productionRecords, isLoading, currentUser } = useStore();
  const { showToast } = useToast();
  const [isInitializing, setIsInitializing] = React.useState(false);

  const handleInitDB = async () => {
    if (!confirm('确定要初始化数据库吗？这将创建必要的表结构（如果不存在）。')) return;
    
    setIsInitializing(true);
    try {
      const res = await fetch('/.netlify/functions/init-db', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        showToast('数据库初始化成功', 'success');
      } else {
        showToast(`初始化失败: ${data.error}`, 'error');
      }
    } catch (error) {
      showToast('初始化请求失败', 'error');
    } finally {
      setIsInitializing(false);
    }
  };

  if (isLoading && orders.length === 0) {
    return <LoadingSpinner />;
  }

  const today = new Date().toISOString().split('T')[0];
  const todayProduction = productionRecords.filter(r => r.timestamp.startsWith(today) && (r.process === 'packaging' || !r.process)).reduce((acc, cur) => acc + cur.quantity, 0);

  const stats = [
    { 
      label: '总订单数', 
      value: orders.length, 
      icon: FileText,
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-600',
      trend: '+12%', // Mock trend
      desc: '较上月'
    },
    { 
      label: '今日生产 (成品)', 
      value: todayProduction, 
      icon: Factory,
      color: 'from-emerald-500 to-emerald-600',
      bgColor: 'bg-emerald-50',
      textColor: 'text-emerald-600',
      trend: '+5%',
      desc: '较昨日'
    },
    { 
      label: '生产中订单', 
      value: orders.filter(o => o.status === 'in_production').length, 
      icon: Activity,
      color: 'from-amber-500 to-amber-600',
      bgColor: 'bg-amber-50',
      textColor: 'text-amber-600',
      trend: '进行中',
      desc: '当前活跃'
    },
    { 
      label: '生产完成', 
      value: orders.filter(o => o.status === 'production_completed').length, 
      icon: CheckCircle2,
      color: 'from-indigo-500 to-indigo-600',
      bgColor: 'bg-indigo-50',
      textColor: 'text-indigo-600',
      trend: '累计',
      desc: '历史总量'
    },
  ];

  // Prepare Chart Data
  const orderStatusData = [
    { name: '新建', value: orders.filter(o => o.status === 'new').length, color: '#3b82f6' },
    { name: '生产中', value: orders.filter(o => o.status === 'in_production').length, color: '#f59e0b' },
    { name: '生产完成', value: orders.filter(o => o.status === 'production_completed').length, color: '#10b981' },
  ].filter(d => d.value > 0);

  // WIP Data (Process Balance)
  const processData = orders.reduce((acc, order) => {
    order.items.forEach(item => {
      acc.pulling += (item.pullingQuantity || 0);
      acc.hydro += (item.hydrostaticQuantity || 0);
      acc.lining += (item.liningQuantity || 0);
      acc.packaging += (item.producedQuantity || 0); 
    });
    return acc;
  }, { pulling: 0, hydro: 0, lining: 0, packaging: 0 });

  const wipChartData = [
    { name: '离心浇铸', total: processData.pulling, wip: Math.max(0, processData.pulling - processData.hydro) },
    { name: '水压试验', total: processData.hydro, wip: Math.max(0, processData.hydro - processData.lining) },
    { name: '内衬工序', total: processData.lining, wip: Math.max(0, processData.lining - processData.packaging) },
    { name: '成品包装', total: processData.packaging, wip: 0 },
  ];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 rounded-xl shadow-xl border border-slate-100">
          <p className="font-bold text-slate-800 mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2 text-sm mb-1">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></div>
              <span className="text-slate-500">{entry.name}:</span>
              <span className="font-medium text-slate-800">{entry.value}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold text-slate-800 tracking-tight">数字工厂概览</h2>
          <p className="text-slate-500 mt-2 flex items-center gap-2">
            <Activity className="h-4 w-4" />
            实时监控生产瓶颈与质量追溯系统
          </p>
        </div>
        
        {currentUser?.role === 'admin' && (
          <button
            onClick={handleInitDB}
            disabled={isInitializing}
            className="flex items-center gap-2 px-5 py-2.5 bg-white text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-50 hover:text-blue-600 disabled:opacity-50 transition-all shadow-sm font-medium"
          >
            {isInitializing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Database className="h-4 w-4" />
            )}
            {isInitializing ? '初始化中...' : '初始化数据库'}
          </button>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, idx) => (
          <div key={idx} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow group relative overflow-hidden">
            <div className="flex justify-between items-start mb-4">
              <div className={clsx("p-3 rounded-xl bg-gradient-to-br text-white shadow-lg shadow-blue-500/20", stat.color)}>
                <stat.icon className="h-6 w-6" />
              </div>
              <div className={clsx("flex items-center text-xs font-medium px-2 py-1 rounded-full", stat.bgColor, stat.textColor)}>
                {stat.trend}
              </div>
            </div>
            <div>
              <p className="text-sm text-slate-500 font-medium mb-1">{stat.label}</p>
              <h3 className="text-3xl font-bold text-slate-800 tracking-tight">{stat.value}</h3>
              <p className="text-xs text-slate-400 mt-2">{stat.desc}</p>
            </div>
            {/* Decorative background circle */}
            <div className="absolute -bottom-4 -right-4 w-24 h-24 rounded-full bg-slate-50 opacity-50 group-hover:scale-110 transition-transform duration-500" />
          </div>
        ))}
      </div>

      {/* Charts Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* WIP / Process Balance Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-6">
             <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800">工序平衡与在制品 (WIP)</h3>
                  <p className="text-xs text-slate-400">各工序累计产量与积压情况对比</p>
                </div>
             </div>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={wipChartData} barSize={40}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                <Tooltip content={<CustomTooltip />} cursor={{fill: '#f8fafc'}} />
                <Legend iconType="circle" wrapperStyle={{paddingTop: '20px'}} />
                <Bar name="累计产量" dataKey="total" fill="#e2e8f0" radius={[4, 4, 0, 0]} />
                <Bar name="积压库存(WIP)" dataKey="wip" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                   {wipChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={['#3b82f6', '#f59e0b', '#fb923c', '#10b981'][index % 4]} />
                    ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Order Status Chart */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col">
          <div className="flex items-center gap-3 mb-6">
             <div className="p-2 bg-purple-50 rounded-lg text-purple-600">
               <Layers className="h-5 w-5" />
             </div>
             <div>
               <h3 className="text-lg font-bold text-slate-800">订单状态分布</h3>
               <p className="text-xs text-slate-400">实时订单进度统计</p>
             </div>
          </div>
          <div className="h-64 flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={orderStatusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {orderStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend verticalAlign="bottom" height={36} iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4">
             {orderStatusData.map((item, idx) => (
               <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                 <div className="flex items-center gap-2">
                   <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                   <span className="text-xs font-medium text-slate-600">{item.name}</span>
                 </div>
                 <span className="text-sm font-bold text-slate-800">{item.value}</span>
               </div>
             ))}
          </div>
        </div>
      </div>
    </div>
  );
}