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
} from 'recharts';
import { FileText, Factory, Activity, Layers, Database, TrendingUp, CheckCircle2, RefreshCw } from 'lucide-react';
import LoadingSpinner from '@/components/LoadingSpinner';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import { useToast } from '@/context/ToastContext';
import { useState } from 'react';

export default function Dashboard() {
  const { orders, productionRecords, isLoading } = useStore();
  const { showToast } = useToast();
  const [isInitDbLoading, setIsInitDbLoading] = useState(false);

  const handleInitDb = async () => {
    if (!confirm('确定要初始化数据库吗？这将创建所需的表结构（如果不存在）。')) return;
    
    setIsInitDbLoading(true);
    try {
      const res = await fetch('/api/init-db', { method: 'POST' });
      if (!res.ok) throw new Error('Failed to initialize DB');
      showToast('数据库初始化成功', 'success');
    } catch (error) {
      console.error(error);
      showToast('数据库初始化失败', 'error');
    } finally {
      setIsInitDbLoading(false);
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
  const processTotals = orders.reduce((acc, order) => {
    order.items.forEach(item => {
      acc.pulling += (item.pullingQuantity || 0);
      acc.hydrostatic += (item.hydrostaticQuantity || 0);
      acc.lining += (item.liningQuantity || 0);
      acc.packaging += (item.producedQuantity || 0); 
    });
    return acc;
  }, { pulling: 0, hydrostatic: 0, lining: 0, packaging: 0 });

  const processData = [
    {
      name: '累计产量',
      ...processTotals
    }
  ];

  const wipChartData = [
    { name: '离心浇铸', total: processTotals.pulling, wip: Math.max(0, processTotals.pulling - processTotals.hydrostatic) },
    { name: '水压试验', total: processTotals.hydrostatic, wip: Math.max(0, processTotals.hydrostatic - processTotals.lining) },
    { name: '内衬工序', total: processTotals.lining, wip: Math.max(0, processTotals.lining - processTotals.packaging) },
    { name: '成品包装', total: processTotals.packaging, wip: 0 },
  ];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 rounded-xl shadow-xl border border-slate-100">
          <p className="font-bold text-slate-800 mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2 text-sm mb-1">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color || entry.fill }}></div>
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
    <div className="space-y-8 p-6">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4"
      >
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">仪表盘</h1>
          <p className="text-slate-500 mt-2 font-medium">实时监控生产状态与订单进度</p>
        </div>
        <div className="text-sm text-slate-400 font-medium">
          最后更新: {new Date().toLocaleTimeString()}
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-xl transition-all hover:-translate-y-1 group relative overflow-hidden"
          >
            {/* Background Decoration */}
            <div className={clsx("absolute -right-6 -top-6 w-32 h-32 rounded-full opacity-10 blur-2xl transition-all group-hover:scale-150", stat.bgColor.replace('bg-', 'bg-gradient-to-br from-white to-'))}></div>
            
            <div className="flex justify-between items-start mb-4 relative z-10">
              <div className={clsx("p-3 rounded-xl bg-gradient-to-br text-white shadow-lg", stat.color)}>
                <stat.icon size={24} />
              </div>
              <span className={clsx("text-xs font-bold px-2 py-1 rounded-full", stat.bgColor, stat.textColor)}>
                {stat.trend}
              </span>
            </div>
            <div className="relative z-10">
              <div className="text-slate-500 text-sm font-medium mb-1">{stat.label}</div>
              <div className="text-3xl font-black text-slate-800 tracking-tight">{stat.value}</div>
              <div className="text-xs text-slate-400 mt-2 font-medium">{stat.desc}</div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Production Trend */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="lg:col-span-2 bg-white p-8 rounded-3xl shadow-sm border border-slate-100"
        >
          <div className="flex justify-between items-center mb-8">
             <div>
                <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  <Activity className="text-blue-500" />
                  生产趋势监控
                </h3>
                <p className="text-sm text-slate-400 mt-1">最近7天各工序产量统计</p>
             </div>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={processData} barSize={20}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                <Tooltip 
                  cursor={{fill: '#f8fafc'}}
                  content={<CustomTooltip />}
                />
                <Legend wrapperStyle={{paddingTop: '20px'}} />
                <Bar name="拉管" dataKey="pulling" stackId="a" fill="#818cf8" radius={[0, 0, 0, 0]} />
                <Bar name="水压" dataKey="hydrostatic" stackId="a" fill="#34d399" radius={[0, 0, 0, 0]} />
                <Bar name="衬管" dataKey="lining" stackId="a" fill="#fbbf24" radius={[0, 0, 0, 0]} />
                <Bar name="打包" dataKey="packaging" stackId="a" fill="#f87171" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* WIP Status */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 flex flex-col"
        >
           <div className="mb-8">
              <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <Layers className="text-amber-500" />
                积压库存 (WIP)
              </h3>
              <p className="text-sm text-slate-400 mt-1">各工序在制品数量监控</p>
           </div>
           <div className="flex-1 min-h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={wipChartData} layout="vertical" barSize={32}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 13, fontWeight: 500}} width={60} />
                  <Tooltip cursor={{fill: 'transparent'}} content={<CustomTooltip />} />
                  <Bar dataKey="wip" radius={[0, 4, 4, 0]}>
                    {wipChartData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={['#818cf8', '#34d399', '#fbbf24', '#f87171'][index % 4]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
           </div>
        </motion.div>
      </div>

      {/* Bottom Section: Order Distribution */}
      <motion.div 
         initial={{ opacity: 0, y: 20 }}
         animate={{ opacity: 1, y: 0 }}
         transition={{ delay: 0.6 }}
         className="grid grid-cols-1 lg:grid-cols-3 gap-8"
      >
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 lg:col-span-1">
              <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                <Database className="text-indigo-500" />
                订单状态分布
              </h3>
              <div className="h-64">
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
          </div>
          
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 lg:col-span-2 flex flex-col justify-center items-center text-center space-y-4 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-slate-50 to-white opacity-50"></div>
              <div className="relative z-10 p-6 max-w-lg">
                <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <TrendingUp size={32} />
                </div>
                <h3 className="text-2xl font-black text-slate-800 mb-2">系统运行状态良好</h3>
                <p className="text-slate-500 mb-4">所有生产节点数据同步正常，数据库连接稳定。无需额外维护。</p>
                <button 
                  onClick={handleInitDb}
                  disabled={isInitDbLoading}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold rounded-xl shadow-lg shadow-blue-200 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RefreshCw size={18} className={clsx(isInitDbLoading && "animate-spin")} />
                  {isInitDbLoading ? '正在初始化...' : '初始化数据库'}
                </button>
              </div>
          </div>
      </motion.div>
    </div>
  );
}
