import React from 'react';
import { useStore } from '@/store/useStore';
import { FileDown, Printer, Search, Loader2 } from 'lucide-react';
import LoadingSpinner from '@/components/LoadingSpinner';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useToast } from '@/context/ToastContext';

export default function Reports() {
  const { orders, productionRecords, isLoading } = useStore();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = React.useState<'orders' | 'efficiency'>('orders');
  const [isExporting, setIsExporting] = React.useState(false);

  if (isLoading && orders.length === 0) {
    return <LoadingSpinner />;
  }
  
  // Filter States
  const [dateRange, setDateRange] = React.useState({ start: '', end: '' });
  const [statusFilter, setStatusFilter] = React.useState('all');
  const [searchQuery, setSearchQuery] = React.useState('');
  
  // Flatten data for table
  const flattenedData = React.useMemo(() => {
    return orders.flatMap(order => 
      order.items.map(item => ({
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
          ? item.status === 'completed' || item.status === 'production_completed'
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

  const exportExcel = async () => {
    setIsExporting(true);
    await new Promise(resolve => setTimeout(resolve, 100)); // Allow UI to update
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
        已发支数: item.shippedQuantity,
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

  const exportPDF = async () => {
    setIsExporting(true);
    await new Promise(resolve => setTimeout(resolve, 100)); // Allow UI to update
    try {
      const doc = new jsPDF();
      doc.text("Production & Shipping Report", 14, 15);
      
      const tableData = filteredData.map(item => [
        item.orderNo,
        item.spec,
        String(item.plannedQuantity),
        String(item.producedQuantity),
        String(item.shippedQuantity),
        item.status
      ]);

      autoTable(doc, {
        head: [['Order', 'Spec', 'Plan', 'Prod', 'Ship', 'Status']],
        body: tableData,
        startY: 20,
      });

      doc.save("report.pdf");
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
  const totalShip = React.useMemo(() => filteredData.reduce((acc, item) => acc + item.shippedQuantity, 0), [filteredData]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-800">报表查询</h2>
        
        {/* Tab Switcher */}
        <div className="flex bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
              activeTab === 'orders' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            订单报表
          </button>
          <button
            onClick={() => setActiveTab('efficiency')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
              activeTab === 'efficiency' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            生产效率分析
          </button>
        </div>

        <div className="flex gap-2">
          <button 
            onClick={exportExcel} 
            disabled={isExporting}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />} 导出 Excel
          </button>
          <button 
            onClick={exportPDF} 
            disabled={isExporting}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />} 导出 PDF
          </button>
        </div>
      </div>

      {activeTab === 'orders' ? (
        <>
          {/* Filters */}
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-medium text-gray-500 mb-1">关键词搜索</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="订单号 / 客户 / 规格"
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
        </div>
        
        <div className="w-40">
           <label className="block text-xs font-medium text-gray-500 mb-1">状态筛选</label>
           <select 
             value={statusFilter}
             onChange={(e) => setStatusFilter(e.target.value)}
             className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
           >
             <option value="all">全部状态</option>
             <option value="new">新建</option>
             <option value="in_production">生产中</option>
             <option value="shipping_during_production">边生产边发运</option>
             <option value="production_completed">生产完成</option>
             <option value="completed">已完成</option>
           </select>
        </div>

        <div className="flex gap-2 items-center">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">开始日期</label>
            <input 
              type="date" 
              value={dateRange.start}
              onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
          <span className="mb-2 text-gray-400">-</span>
          <div>
             <label className="block text-xs font-medium text-gray-500 mb-1">结束日期</label>
            <input 
              type="date" 
              value={dateRange.end}
              onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 text-center">
          <p className="text-sm text-blue-600 font-medium">计划总支数</p>
          <p className="text-2xl font-bold text-blue-800">{totalPlan}</p>
        </div>
        <div className="bg-green-50 p-4 rounded-lg border border-green-100 text-center">
          <p className="text-sm text-green-600 font-medium">已产总支数</p>
          <p className="text-2xl font-bold text-green-800">{totalProd}</p>
        </div>
        <div className="bg-orange-50 p-4 rounded-lg border border-orange-100 text-center">
          <p className="text-sm text-orange-600 font-medium">已发总支数</p>
          <p className="text-2xl font-bold text-orange-800">{totalShip}</p>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 font-semibold text-gray-700">订单号</th>
                <th className="px-6 py-3 font-semibold text-gray-700">规格</th>
                <th className="px-6 py-3 font-semibold text-gray-700">级别</th>
                <th className="px-6 py-3 font-semibold text-gray-700">计划</th>
                <th className="px-6 py-3 font-semibold text-gray-700">已产</th>
                <th className="px-6 py-3 font-semibold text-gray-700">已发</th>
                <th className="px-6 py-3 font-semibold text-gray-700">完成率</th>
                <th className="px-6 py-3 font-semibold text-gray-700">状态</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredData.map((item, idx) => (
                <tr key={`${item.id}-${idx}`} className="hover:bg-gray-50">
                  <td className="px-6 py-3 font-medium text-gray-900">{item.orderNo}</td>
                  <td className="px-6 py-3">{item.spec}</td>
                  <td className="px-6 py-3">{item.level}</td>
                  <td className="px-6 py-3 font-medium">{item.plannedQuantity}</td>
                  <td className="px-6 py-3 text-green-600">{item.producedQuantity}</td>
                  <td className="px-6 py-3 text-orange-600">{item.shippedQuantity}</td>
                  <td className="px-6 py-3">
                    {Math.round((item.producedQuantity / item.plannedQuantity) * 100)}%
                  </td>
                  <td className="px-6 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium
                      ${item.status === 'new' ? 'bg-gray-100 text-gray-800' : 
                        item.status === 'completed' ? 'bg-green-100 text-green-800' : 
                        item.status === 'production_completed' ? 'bg-teal-100 text-teal-800' : 'bg-yellow-100 text-yellow-800'}`}>
                      {item.status === 'new' ? '未开始' : 
                       item.status === 'production_completed' ? '产完' :
                       item.status === 'completed' ? '发完' : '进行中'}
                    </span>
                  </td>
                </tr>
              ))}
              {filteredData.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-gray-400">
                    没有找到匹配的数据
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      </>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
             <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <h3 className="text-lg font-bold text-gray-800 mb-4">班组生产对比</h3>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={efficiencyData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="quantity" name="总支数" fill="#3b82f6" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
             </div>
             <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <h3 className="text-lg font-bold text-gray-800 mb-4">工序明细</h3>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={efficiencyData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="pulling" name="拉管" stackId="a" fill="#8884d8" />
                      <Bar dataKey="hydrostatic" name="水压" stackId="a" fill="#82ca9d" />
                      <Bar dataKey="lining" name="衬管" stackId="a" fill="#ffc658" />
                      <Bar dataKey="packaging" name="打包" stackId="a" fill="#ff8042" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
             </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-800">详细数据</h3>
            </div>
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 font-semibold text-gray-700">班组/班次</th>
                  <th className="px-6 py-3 font-semibold text-gray-700">总完成支数</th>
                  <th className="px-6 py-3 font-semibold text-gray-700">拉管</th>
                  <th className="px-6 py-3 font-semibold text-gray-700">水压</th>
                  <th className="px-6 py-3 font-semibold text-gray-700">衬管</th>
                  <th className="px-6 py-3 font-semibold text-gray-700">打包</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {efficiencyData.map((item, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-6 py-3 font-medium text-gray-900">{item.name}</td>
                    <td className="px-6 py-3 font-bold text-blue-600">{item.quantity}</td>
                    <td className="px-6 py-3">{item.pulling}</td>
                    <td className="px-6 py-3">{item.hydrostatic}</td>
                    <td className="px-6 py-3">{item.lining}</td>
                    <td className="px-6 py-3">{item.packaging}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
