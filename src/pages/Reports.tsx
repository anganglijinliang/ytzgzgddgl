import React from 'react';
import { useStore } from '@/store/useStore';
import { FileDown, Printer, Search, Loader2, Calendar, BarChart3, TrendingUp, ChevronDown } from 'lucide-react';
import LoadingSpinner from '@/components/LoadingSpinner';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { useToast } from '@/context/ToastContext';
import { clsx } from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';

export default function Reports() {
  const { orders, productionRecords, isLoading } = useStore();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = React.useState<'orders' | 'efficiency'>('orders');
  const [isExporting, setIsExporting] = React.useState(false);

  // Filter States
  const [dateRange, setDateRange] = React.useState({ start: '', end: '' });
  const [statusFilter, setStatusFilter] = React.useState('all');
  const [searchQuery, setSearchQuery] = React.useState('');

  if (isLoading && orders.length === 0) {
    return <LoadingSpinner />;
  }

  // Flatten data for table
  const flattenedData = React.useMemo(() => {
    return orders.flatMap(order => 
      (order.items || []).map(item => ({
        ...item,
        orderNo: order.orderNo,
        customerName: order.customerName,
        deliveryDate: order.deliveryDate,
        orderStatus: order.status,
        workshop: order.workshop
      }))
    );
  }, [orders]);

  const filteredData = React.useMemo(() => {
    return flattenedData.filter(item => {
      // Search Query
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = 
        item.orderNo.toLowerCase().includes(searchLower) ||
        item.customerName?.toLowerCase().includes(searchLower) ||
        item.spec.toLowerCase().includes(searchLower);

      // Status Filter
      const matchesStatus = statusFilter === 'all' 
        ? true 
        : statusFilter === 'completed' 
          ? item.status === 'production_completed'
          : item.status === statusFilter;

      // Date Range
      let matchesDate = true;
      if (dateRange.start && item.deliveryDate) {
        matchesDate = matchesDate && item.deliveryDate >= dateRange.start;
      }
      if (dateRange.end && item.deliveryDate) {
        matchesDate = matchesDate && item.deliveryDate <= dateRange.end;
      }

      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [flattenedData, searchQuery, statusFilter, dateRange]);

  // Export Excel
  const exportExcel = async () => {
    setIsExporting(true);
    // Give UI a moment to update
    await new Promise(resolve => setTimeout(resolve, 100));
    try {
      const ws = XLSX.utils.json_to_sheet(filteredData.map(item => ({
        订单号: item.orderNo,
        客户: item.customerName,
        规格: item.spec,
        级别: item.level,
        接口: item.interfaceType,
        内衬: item.lining,
        防腐: item.coating,
        长度: item.length,
        计划支数: item.plannedQuantity,
        已产支数: item.producedQuantity,
        状态: item.status,
        交货日期: item.deliveryDate
      })));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Report");
      XLSX.writeFile(wb, `report_${new Date().toISOString().split('T')[0]}.xlsx`);
      showToast('Excel 导出成功', 'success');
    } catch (error) {
      console.error("Export Excel failed:", error);
      showToast('Excel 导出失败', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  // Export PDF
  const exportPDF = async () => {
    setIsExporting(true);
    await new Promise(resolve => setTimeout(resolve, 100));
    try {
      const doc = new jsPDF();
      
      // Add font support if needed (basic support here)
      doc.setFontSize(18);
      doc.text("Production Report", 14, 22);
      doc.setFontSize(11);
      doc.text(`Date: ${new Date().toLocaleDateString()}`, 14, 30);

      const tableData = filteredData.map(item => [
        item.orderNo,
        item.spec,
        item.level,
        item.plannedQuantity,
        item.producedQuantity,
        item.status
      ]);

      autoTable(doc, {
        head: [['Order No', 'Spec', 'Level', 'Plan', 'Done', 'Status']],
        body: tableData,
        startY: 40,
      });

      doc.save(`report_${new Date().toISOString().split('T')[0]}.pdf`);
      showToast('PDF 导出成功', 'success');
    } catch (error) {
      console.error("Export PDF failed:", error);
      showToast('PDF 导出失败', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  // Stats for Efficiency
  const efficiencyData = React.useMemo(() => {
    const teamStats: Record<string, any> = {};
    
    productionRecords.forEach(record => {
      const key = `${record.team}-${record.shift}`;
      if (!teamStats[key]) {
        teamStats[key] = {
          name: key,
          team: record.team,
          shift: record.shift,
          quantity: 0,
          pulling: 0,
          hydrostatic: 0,
          lining: 0,
          packaging: 0
        };
      }
      teamStats[key].quantity += record.quantity;
      if (record.process === 'pulling') teamStats[key].pulling += record.quantity;
      else if (record.process === 'hydrostatic') teamStats[key].hydrostatic += record.quantity;
      else if (record.process === 'lining') teamStats[key].lining += record.quantity;
      else teamStats[key].packaging += record.quantity;
    });

    return Object.values(teamStats).sort((a, b) => b.quantity - a.quantity);
  }, [productionRecords]);

  // Calculate totals
  const totalPlan = React.useMemo(() => filteredData.reduce((acc, item) => acc + item.plannedQuantity, 0), [filteredData]);
  const totalProd = React.useMemo(() => filteredData.reduce((acc, item) => acc + item.producedQuantity, 0), [filteredData]);
  const completionRate = totalPlan > 0 ? Math.round((totalProd / totalPlan) * 100) : 0;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white/90 backdrop-blur-md p-4 rounded-xl shadow-xl border border-slate-100">
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
    <div className="space-y-6 max-w-[1600px] mx-auto">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/60 backdrop-blur-xl p-6 rounded-2xl shadow-sm border border-slate-200/60">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-lg text-white shadow-lg shadow-blue-200">
              <BarChart3 className="h-6 w-6" />
            </div>
            数据报表中心
          </h1>
          <p className="text-slate-500 mt-1 ml-14">实时监控生产进度与效率分析</p>
        </div>
        
        <div className="flex gap-3">
          <div className="flex bg-slate-100/80 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('orders')}
              className={clsx(
                "px-5 py-2.5 text-sm font-bold rounded-lg transition-all duration-200 flex items-center gap-2",
                activeTab === 'orders' 
                  ? "bg-white text-blue-600 shadow-md ring-1 ring-black/5" 
                  : "text-slate-500 hover:text-slate-700 hover:bg-white/50"
              )}
            >
              <TrendingUp className="h-4 w-4" /> 订单进度
            </button>
            <button
              onClick={() => setActiveTab('efficiency')}
              className={clsx(
                "px-5 py-2.5 text-sm font-bold rounded-lg transition-all duration-200 flex items-center gap-2",
                activeTab === 'efficiency' 
                  ? "bg-white text-indigo-600 shadow-md ring-1 ring-black/5" 
                  : "text-slate-500 hover:text-slate-700 hover:bg-white/50"
              )}
            >
              <BarChart3 className="h-4 w-4" /> 效率分析
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'orders' ? (
          <motion.div
            key="orders"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-6 rounded-2xl shadow-lg shadow-blue-200 text-white relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <TrendingUp className="h-24 w-24 transform translate-x-4 -translate-y-4" />
                </div>
                <p className="text-blue-100 font-medium mb-1">计划总支数</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-black tracking-tight">{totalPlan.toLocaleString()}</span>
                  <span className="text-sm opacity-80">支</span>
                </div>
              </div>

              <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 p-6 rounded-2xl shadow-lg shadow-emerald-200 text-white relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <CheckCircle2Icon className="h-24 w-24 transform translate-x-4 -translate-y-4" />
                </div>
                <p className="text-emerald-100 font-medium mb-1">已产总支数</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-black tracking-tight">{totalProd.toLocaleString()}</span>
                  <span className="text-sm opacity-80">支</span>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 relative overflow-hidden">
                <p className="text-slate-500 font-medium mb-1">总体完成率</p>
                <div className="flex items-center gap-4">
                  <span className={clsx(
                    "text-4xl font-black tracking-tight",
                    completionRate >= 80 ? "text-emerald-600" : completionRate >= 50 ? "text-blue-600" : "text-amber-500"
                  )}>{completionRate}%</span>
                  <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className={clsx("h-full rounded-full transition-all duration-1000",
                        completionRate >= 80 ? "bg-emerald-500" : completionRate >= 50 ? "bg-blue-500" : "bg-amber-500"
                      )}
                      style={{ width: `${Math.min(100, completionRate)}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Filters Bar */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-wrap gap-4 items-end">
              <div className="flex-1 min-w-[240px]">
                <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">关键词搜索</label>
                <div className="relative group">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="订单号 / 客户 / 规格..."
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>
              </div>
              
              <div className="w-48">
                 <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">状态筛选</label>
                 <div className="relative">
                   <select 
                     value={statusFilter}
                     onChange={(e) => setStatusFilter(e.target.value)}
                     className="w-full pl-3 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 appearance-none cursor-pointer transition-all"
                   >
                     <option value="all">全部状态</option>
                     <option value="new">新建</option>
                     <option value="in_production">生产中</option>
                     <option value="production_completed">生产完成</option>
                   </select>
                   <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                 </div>
              </div>

              <div className="flex gap-2 items-end">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">起止日期</label>
                  <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                    <Calendar className="h-4 w-4 text-slate-400" />
                    <input 
                      type="date" 
                      value={dateRange.start}
                      onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
                      className="bg-transparent border-none focus:ring-0 text-sm w-32 p-0 text-slate-600"
                    />
                    <span className="text-slate-300">|</span>
                    <input 
                      type="date" 
                      value={dateRange.end}
                      onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
                      className="bg-transparent border-none focus:ring-0 text-sm w-32 p-0 text-slate-600"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-2 ml-auto">
                <button 
                  onClick={exportExcel} 
                  disabled={isExporting}
                  className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 text-sm font-medium shadow-lg shadow-emerald-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
                >
                  {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />} 
                  <span className="hidden sm:inline">导出 Excel</span>
                </button>
                <button 
                  onClick={exportPDF} 
                  disabled={isExporting}
                  className="flex items-center gap-2 px-4 py-2.5 bg-rose-600 text-white rounded-xl hover:bg-rose-700 text-sm font-medium shadow-lg shadow-rose-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
                >
                  {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />} 
                  <span className="hidden sm:inline">导出 PDF</span>
                </button>
              </div>
            </div>

            {/* Data Table / Cards */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-4 font-bold text-slate-700">订单号</th>
                      <th className="px-6 py-4 font-bold text-slate-700">规格</th>
                      <th className="px-6 py-4 font-bold text-slate-700">级别</th>
                      <th className="px-6 py-4 font-bold text-slate-700">计划</th>
                      <th className="px-6 py-4 font-bold text-slate-700">已产</th>
                      <th className="px-6 py-4 font-bold text-slate-700">完成率</th>
                      <th className="px-6 py-4 font-bold text-slate-700">状态</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredData.map((item, idx) => (
                      <tr key={`${item.id}-${idx}`} className="hover:bg-slate-50/80 transition-colors group">
                        <td className="px-6 py-4 font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">{item.orderNo}</td>
                        <td className="px-6 py-4 text-slate-600">{item.spec}</td>
                        <td className="px-6 py-4 text-slate-600">{item.level}</td>
                        <td className="px-6 py-4 font-medium text-slate-900">{item.plannedQuantity}</td>
                        <td className="px-6 py-4 font-medium text-emerald-600">{item.producedQuantity}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium w-8">{Math.round((item.producedQuantity / item.plannedQuantity) * 100)}%</span>
                            <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-blue-500 rounded-full" 
                                style={{ width: `${Math.min(100, (item.producedQuantity / item.plannedQuantity) * 100)}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={clsx(
                            "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border",
                            item.status === 'new' ? 'bg-slate-100 text-slate-600 border-slate-200' : 
                            item.status === 'production_completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 
                            'bg-amber-50 text-amber-700 border-amber-200'
                          )}>
                            {item.status === 'new' ? '未开始' : 
                             item.status === 'production_completed' ? '已完成' : '生产中'}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {filteredData.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center text-slate-400 bg-slate-50/50">
                          <div className="flex flex-col items-center justify-center">
                            <Search className="h-10 w-10 mb-2 opacity-50" />
                            <p>没有找到匹配的数据</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden divide-y divide-slate-100">
                {filteredData.map((item, idx) => (
                  <div key={`${item.id}-${idx}-mobile`} className="p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-bold text-slate-900">{item.orderNo}</div>
                        <div className="text-sm text-slate-500 mt-0.5">{item.customerName}</div>
                      </div>
                      <span className={clsx(
                        "inline-flex items-center px-2 py-1 rounded-md text-xs font-bold border",
                        item.status === 'new' ? 'bg-slate-100 text-slate-600 border-slate-200' : 
                        item.status === 'production_completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 
                        'bg-amber-50 text-amber-700 border-amber-200'
                      )}>
                        {item.status === 'new' ? '未开始' : 
                         item.status === 'production_completed' ? '已完成' : '生产中'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="bg-slate-50 p-2 rounded-lg">
                        <span className="text-slate-400 text-xs block">规格</span>
                        <span className="font-medium text-slate-700">{item.spec}</span>
                      </div>
                      <div className="bg-slate-50 p-2 rounded-lg">
                        <span className="text-slate-400 text-xs block">级别</span>
                        <span className="font-medium text-slate-700">{item.level}</span>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">生产进度</span>
                        <span className="font-medium text-slate-900">{item.producedQuantity} / {item.plannedQuantity}</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className={clsx("h-full rounded-full transition-all duration-500",
                            (item.producedQuantity / item.plannedQuantity) >= 1 ? "bg-emerald-500" : "bg-blue-500"
                          )}
                          style={{ width: `${Math.min(100, (item.producedQuantity / item.plannedQuantity) * 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
                {filteredData.length === 0 && (
                  <div className="p-8 text-center text-slate-400 bg-slate-50/50">
                    <div className="flex flex-col items-center justify-center">
                      <Search className="h-10 w-10 mb-2 opacity-50" />
                      <p>没有找到匹配的数据</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="efficiency"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
               <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                      <BarChart3 className="h-5 w-5 text-blue-500" />
                      班组生产对比
                    </h3>
                  </div>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={efficiencyData} barSize={40}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                        <Tooltip content={<CustomTooltip />} cursor={{fill: '#f8fafc'}} />
                        <Bar dataKey="quantity" name="总支数" radius={[4, 4, 0, 0]}>
                          {efficiencyData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#3b82f6' : '#6366f1'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
               </div>
               
               <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-indigo-500" />
                      工序明细分析
                    </h3>
                  </div>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={efficiencyData} barSize={40}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                        <Tooltip content={<CustomTooltip />} cursor={{fill: '#f8fafc'}} />
                        <Legend wrapperStyle={{paddingTop: '20px'}} />
                        <Bar dataKey="pulling" name="拉管" stackId="a" fill="#818cf8" radius={[0, 0, 0, 0]} />
                        <Bar dataKey="hydrostatic" name="水压" stackId="a" fill="#34d399" radius={[0, 0, 0, 0]} />
                        <Bar dataKey="lining" name="衬管" stackId="a" fill="#fbbf24" radius={[0, 0, 0, 0]} />
                        <Bar dataKey="packaging" name="打包" stackId="a" fill="#f87171" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
               </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-6 border-b border-slate-200 bg-slate-50/50">
                <h3 className="text-lg font-bold text-slate-800">详细数据统计</h3>
              </div>
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4 font-bold text-slate-700">班组/班次</th>
                    <th className="px-6 py-4 font-bold text-slate-700">总完成支数</th>
                    <th className="px-6 py-4 font-bold text-slate-700">拉管</th>
                    <th className="px-6 py-4 font-bold text-slate-700">水压</th>
                    <th className="px-6 py-4 font-bold text-slate-700">衬管</th>
                    <th className="px-6 py-4 font-bold text-slate-700">打包</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {efficiencyData.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4 font-semibold text-slate-900">{item.name}</td>
                      <td className="px-6 py-4 font-bold text-blue-600 text-base">{item.quantity}</td>
                      <td className="px-6 py-4 text-slate-600">{item.pulling}</td>
                      <td className="px-6 py-4 text-slate-600">{item.hydrostatic}</td>
                      <td className="px-6 py-4 text-slate-600">{item.lining}</td>
                      <td className="px-6 py-4 text-slate-600">{item.packaging}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function CheckCircle2Icon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  )
}
