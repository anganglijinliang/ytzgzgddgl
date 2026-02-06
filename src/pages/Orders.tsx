import React from 'react';
import { useStore } from '@/store/useStore';
import { Order } from '@/types';
import LoadingSpinner from '@/components/LoadingSpinner';
import { 
  Plus, 
  Search, 
  ChevronDown, 
  ChevronRight, 
  Edit, 
  Trash2, 
  QrCode, 
  FileSpreadsheet,
  Printer,
  Upload,
  Loader2,
  Calendar,
  User,
  Package
} from 'lucide-react';
import OrderForm from '@/components/OrderForm';
import { QRCodeCanvas } from 'qrcode.react';
import * as XLSX from 'xlsx';
import { useToast } from '@/context/ToastContext';

export default function Orders() {
  const { orders, addOrder, updateOrder, deleteOrder, currentUser, isLoading } = useStore();
  const { showToast } = useToast();
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editingOrder, setEditingOrder] = React.useState<Order | undefined>(undefined);
  const [expandedOrders, setExpandedOrders] = React.useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = React.useState('');
  const [showQRCode, setShowQRCode] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const canEdit = currentUser?.role === 'admin' || currentUser?.role === 'order_entry';

  const filteredOrders = orders.filter(o => 
    o.orderNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.customerName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const bstr = event.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);
        
        if (data.length === 0) {
          showToast('Excel文件为空', 'error');
          return;
        }

        // Group by OrderNo
        const ordersMap = new Map<string, any>();

        data.forEach((row: any) => {
          const orderNo = row['订单号'] || row['OrderNo'];
          if (!orderNo) return;

          if (!ordersMap.has(orderNo)) {
            ordersMap.set(orderNo, {
              orderNo,
              customerName: row['客户'] || row['Customer'] || '未命名客户',
              deliveryDate: row['交货日期'] || row['DeliveryDate'] || new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0],
              status: 'new',
              items: []
            });
          }

          const order = ordersMap.get(orderNo);
          const spec = row['规格'] || row['Spec'];
          const quantity = Number(row['数量'] || row['Quantity'] || 0);

          if (spec && quantity > 0) {
            order.items.push({
              spec: spec.toString().startsWith('DN') ? spec : `DN${spec}`,
              level: row['级别'] || row['Level'] || 'K9',
              interface: row['接口'] || row['Interface'] || 'T型',
              quantity,
              length: Number(row['长度'] || row['Length'] || 6),
              remarks: row['备注'] || row['Remarks'] || ''
            });
          }
        });

        let successCount = 0;
        for (const orderData of ordersMap.values()) {
           if (orderData.items.length === 0) continue;
           await addOrder(orderData);
           successCount++;
        }

        if (successCount > 0) {
          showToast(`成功导入 ${successCount} 个订单`, 'success');
        } else {
          showToast('未找到有效订单数据', 'error');
        }
      } catch (error) {
        console.error("Error reading file:", error);
        showToast("文件读取或解析失败", 'error');
      }
    };
    reader.readAsBinaryString(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const toggleExpand = (id: string) => {
    const newSet = new Set(expandedOrders);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setExpandedOrders(newSet);
  };

  const handleCreate = async (data: any) => {
    try {
      if (editingOrder) {
        updateOrder(editingOrder.id, data);
        showToast('订单更新成功', 'success');
        setIsFormOpen(false);
        setEditingOrder(undefined);
      } else {
        const success = await addOrder(data);
        if (success) {
          showToast('订单创建成功', 'success');
          setIsFormOpen(false);
          setEditingOrder(undefined);
        } else {
          showToast('创建失败，请重试', 'error');
        }
      }
    } catch (error) {
      showToast('操作失败', 'error');
    }
  };

  const handleEdit = (order: Order) => {
    setEditingOrder(order);
    setIsFormOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('确定要删除此订单吗？')) {
      const success = await deleteOrder(id);
      if (success) {
        showToast('订单删除成功', 'success');
      } else {
        showToast('订单删除失败', 'error');
      }
    }
  };

  const exportExcel = () => {
    const data = orders.flatMap(o => 
      o.items.map(item => ({
        订单号: o.orderNo,
        客户: o.customerName,
        规格: item.spec,
        级别: item.level,
        接口: item.interfaceType,
        内衬: item.lining,
        计划支数: item.plannedQuantity,
        完成支数: item.producedQuantity,
        状态: item.status
      }))
    );
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Orders");
    XLSX.writeFile(wb, "orders_export.xlsx");
    showToast('订单导出成功', 'success');
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const html = `
      <html>
        <head>
          <title>生产订单报表</title>
          <style>
            body { font-family: "Microsoft YaHei", "SimSun", sans-serif; padding: 20px; color: #333; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #005a9e; padding-bottom: 15px; }
            .header h1 { margin: 0 0 10px 0; font-size: 24px; color: #005a9e; }
            .header h2 { margin: 0; font-size: 18px; font-weight: normal; color: #666; }
            .meta { display: flex; justify-content: space-between; margin-bottom: 20px; font-size: 12px; color: #666; border-bottom: 1px solid #eee; padding-bottom: 10px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 12px; }
            th, td { border: 1px solid #ddd; padding: 8px 10px; text-align: left; }
            th { background-color: #f0f7ff; color: #005a9e; font-weight: bold; }
            tr:nth-child(even) { background-color: #f9f9f9; }
            .status { font-weight: bold; }
            .status-new { color: #2563eb; }
            .status-production { color: #d97706; }
            .status-done { color: #059669; }
            .footer { margin-top: 30px; text-align: center; font-size: 10px; color: #999; border-top: 1px solid #eee; padding-top: 10px; }
            @media print {
              .no-print { display: none; }
              th { -webkit-print-color-adjust: exact; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>安钢集团永通球墨铸铁管有限责任公司</h1>
            <h2>生产订单综合报表</h2>
          </div>
          <div class="meta">
            <div>打印时间: ${new Date().toLocaleString('zh-CN')}</div>
            <div>报表范围: ${searchTerm ? `搜索 "${searchTerm}"` : '所有订单'}</div>
          </div>
          <table>
            <thead>
              <tr>
                <th style="width: 10%">订单号</th>
                <th style="width: 15%">客户</th>
                <th style="width: 10%">交货日期</th>
                <th style="width: 35%">产品明细 (规格/级别/数量)</th>
                <th style="width: 10%">总进度</th>
                <th style="width: 10%">状态</th>
                <th style="width: 10%">备注</th>
              </tr>
            </thead>
            <tbody>
              ${orders.filter(o => 
                o.orderNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                o.customerName?.toLowerCase().includes(searchTerm.toLowerCase())
              ).map(o => {
                const totalPlan = o.items.reduce((acc, i) => acc + i.plannedQuantity, 0);
                const totalDone = o.items.reduce((acc, i) => acc + i.producedQuantity, 0);
                const progress = totalPlan > 0 ? Math.round((totalDone / totalPlan) * 100) : 0;
                
                return `
                <tr>
                  <td><strong>${o.orderNo}</strong></td>
                  <td>${o.customerName || '-'}</td>
                  <td>${o.deliveryDate || '-'}</td>
                  <td>
                    <table style="margin: 0; border: none; width: 100%;">
                      ${o.items.map(item => `
                        <tr style="background: transparent;">
                          <td style="border: none; padding: 2px 0;">
                            ${item.spec} / ${item.level} / <span style="font-weight:bold">${item.plannedQuantity}支</span>
                            <span style="color: #666; font-size: 11px;">(已产:${item.producedQuantity})</span>
                          </td>
                        </tr>
                      `).join('')}
                    </table>
                  </td>
                  <td>
                    <div style="font-weight: bold; color: ${progress === 100 ? '#059669' : '#005a9e'}">${progress}%</div>
                    <div style="font-size: 10px; color: #666;">${totalDone}/${totalPlan}</div>
                  </td>
                  <td class="status">
                    ${
                      o.status === 'new' ? '<span class="status-new">新建</span>' :
                      o.status === 'in_production' ? '<span class="status-production">生产中</span>' :
                      o.status === 'production_completed' ? '<span class="status-done">生产完成</span>' : o.status
                    }
                  </td>
                  <td style="font-size: 11px; color: #666;">${o.remarks || ''}</td>
                </tr>
              `}).join('')}
            </tbody>
          </table>
          <div class="footer">
            报表生成系统 - 内部使用
          </div>
        </body>
      </html>
    `;
    
    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  if (isLoading && orders.length === 0) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">订单管理</h2>
          <p className="text-sm text-slate-500 mt-1">管理所有生产订单、进度跟踪及导出</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
            <input 
              type="text" 
              placeholder="搜索订单号、客户..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm w-full sm:w-64 transition-all"
            />
          </div>
          
          <div className="flex gap-2">
            {canEdit && (
              <>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileUpload} 
                  className="hidden" 
                  accept=".xlsx,.xls" 
                  disabled={isLoading}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isLoading}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all text-sm font-medium shadow-sm"
                  title="导入Excel"
                >
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  <span className="hidden sm:inline">导入</span>
                </button>
                <button
                  onClick={() => { setEditingOrder(undefined); setIsFormOpen(true); }}
                  disabled={isLoading}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-600/20 transition-all text-sm font-medium"
                >
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  <span>新建订单</span>
                </button>
              </>
            )}
            <div className="h-10 w-px bg-slate-200 mx-1 hidden sm:block"></div>
            <button onClick={exportExcel} className="p-2.5 text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:text-green-600 transition-colors shadow-sm" title="导出 Excel">
              <FileSpreadsheet className="h-5 w-5" />
            </button>
            <button onClick={handlePrint} className="p-2.5 text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:text-blue-600 transition-colors shadow-sm" title="打印报表">
              <Printer className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Orders List */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/80 border-b border-slate-200 backdrop-blur-sm">
              <tr>
                <th className="px-6 py-4 font-semibold text-slate-600 w-12"></th>
                <th className="px-6 py-4 font-semibold text-slate-600">订单信息</th>
                <th className="px-6 py-4 font-semibold text-slate-600">客户 / 交期</th>
                <th className="px-6 py-4 font-semibold text-slate-600">生产进度</th>
                <th className="px-6 py-4 font-semibold text-slate-600">状态</th>
                <th className="px-6 py-4 font-semibold text-slate-600 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <Package className="h-12 w-12 text-slate-200" />
                      <p>暂无订单数据</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredOrders.map(order => {
                  const totalPlan = order.items.reduce((acc, i) => acc + i.plannedQuantity, 0);
                  const totalDone = order.items.reduce((acc, i) => acc + i.producedQuantity, 0);
                  const progress = totalPlan > 0 ? Math.round((totalDone / totalPlan) * 100) : 0;
                  const isExpanded = expandedOrders.has(order.id);
                  
                  return (
                    <React.Fragment key={order.id}>
                      <tr 
                        className={`group transition-all duration-200 ${isExpanded ? 'bg-blue-50/40' : 'hover:bg-slate-50'}`}
                      >
                        <td className="px-6 py-5">
                          <button 
                            onClick={() => toggleExpand(order.id)}
                            className={`p-1 rounded-full transition-colors ${isExpanded ? 'bg-blue-100 text-blue-600' : 'text-slate-400 group-hover:text-blue-500 group-hover:bg-blue-50'}`}
                          >
                            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          </button>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex flex-col">
                            <span className="text-base font-bold text-slate-800">{order.orderNo}</span>
                            <span className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                              <span className="inline-block w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                              {order.items.length} 个规格项
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2 text-slate-700 font-medium">
                              <User className="h-3.5 w-3.5 text-slate-400" />
                              {order.customerName || '未指定客户'}
                            </div>
                            <div className="flex items-center gap-2 text-slate-500 text-xs">
                              <Calendar className="h-3.5 w-3.5 text-slate-400" />
                              {order.deliveryDate || '未指定日期'}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <div className="w-48">
                            <div className="flex justify-between text-xs mb-1.5">
                              <span className="font-medium text-slate-700">{progress}%</span>
                              <span className="text-slate-500">{totalDone}/{totalPlan} 支</span>
                            </div>
                            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full transition-all duration-500 ${
                                  progress === 100 ? 'bg-green-500' : 'bg-blue-500'
                                }`} 
                                style={{ width: `${progress}%` }} 
                              />
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border
                            ${order.status === 'new' ? 'bg-blue-50 text-blue-700 border-blue-100' : 
                              order.status === 'in_production' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                              order.status === 'production_completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-slate-50 text-slate-700 border-slate-200'}`}>
                            <span className={`w-1.5 h-1.5 rounded-full mr-2 
                              ${order.status === 'new' ? 'bg-blue-500' : 
                                order.status === 'in_production' ? 'bg-amber-500' :
                                order.status === 'production_completed' ? 'bg-emerald-500' : 'bg-slate-500'}`}></span>
                            {order.status === 'new' ? '新建' : 
                             order.status === 'in_production' ? '生产中' :
                             order.status === 'production_completed' ? '已完成' : order.status}
                          </span>
                        </td>
                        <td className="px-6 py-5 text-right">
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            {canEdit && (
                              <>
                                <button 
                                  onClick={() => handleEdit(order)}
                                  className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                  title="编辑"
                                >
                                  <Edit className="h-4 w-4" />
                                </button>
                                <button 
                                  onClick={() => handleDelete(order.id)}
                                  className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                  title="删除"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </>
                            )}
                            <button 
                              onClick={() => setShowQRCode(order.orderNo)}
                              className="p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-all"
                              title="查看二维码"
                            >
                              <QrCode className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="bg-slate-50/50">
                          <td colSpan={6} className="px-6 py-4">
                            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm animate-in fade-in slide-in-from-top-2 duration-200">
                              <h4 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                                <span className="w-1 h-4 bg-blue-500 rounded-full"></span>
                                订单明细
                              </h4>
                              <div className="grid gap-2">
                                {order.items.map((item, idx) => (
                                  <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg text-sm border border-slate-100 hover:border-blue-200 transition-colors">
                                    <div className="flex items-center gap-4">
                                      <span className="font-bold text-slate-700 w-20">{item.spec}</span>
                                      <span className="px-2 py-0.5 bg-white border border-slate-200 rounded text-xs text-slate-500">{item.level}</span>
                                      <span className="text-slate-600">{item.interfaceType} / {item.lining} / {item.coating}</span>
                                    </div>
                                    <div className="flex items-center gap-6">
                                      <div className="text-right">
                                        <div className="text-xs text-slate-400">计划/已产</div>
                                        <div className="font-medium text-slate-700">
                                          {item.plannedQuantity} <span className="text-slate-300">/</span> <span className="text-blue-600">{item.producedQuantity}</span>
                                        </div>
                                      </div>
                                      <div className={`text-xs px-2 py-1 rounded-md font-medium
                                        ${item.status === 'production_completed' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                                        {item.status === 'production_completed' ? '完成' : '生产中'}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden divide-y divide-slate-100">
          {filteredOrders.length === 0 ? (
             <div className="px-6 py-12 text-center text-slate-400">
                <div className="flex flex-col items-center justify-center gap-3">
                  <Package className="h-12 w-12 text-slate-200" />
                  <p>暂无订单数据</p>
                </div>
              </div>
          ) : (
            filteredOrders.map(order => {
              const totalPlan = order.items.reduce((acc, i) => acc + i.plannedQuantity, 0);
              const totalDone = order.items.reduce((acc, i) => acc + i.producedQuantity, 0);
              const progress = totalPlan > 0 ? Math.round((totalDone / totalPlan) * 100) : 0;
              const isExpanded = expandedOrders.has(order.id);

              return (
                <div key={order.id} className="p-4 bg-white space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                         <h3 className="text-lg font-bold text-slate-800">{order.orderNo}</h3>
                         <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border
                            ${order.status === 'new' ? 'bg-blue-50 text-blue-700 border-blue-100' : 
                              order.status === 'in_production' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                              order.status === 'production_completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-slate-50 text-slate-700 border-slate-200'}`}>
                            {order.status === 'new' ? '新建' : 
                             order.status === 'in_production' ? '生产中' :
                             order.status === 'production_completed' ? '已完成' : order.status}
                          </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-sm text-slate-500">
                        <span className="flex items-center gap-1"><User className="h-3 w-3" /> {order.customerName || '未指定'}</span>
                        <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {order.deliveryDate || '未指定'}</span>
                      </div>
                    </div>
                    <div className="flex gap-1">
                       {canEdit && (
                          <button 
                            onClick={() => handleEdit(order)}
                            className="p-2 text-blue-600 bg-blue-50 rounded-lg"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                       )}
                       <button 
                          onClick={() => toggleExpand(order.id)}
                          className={`p-2 rounded-lg transition-colors ${isExpanded ? 'bg-slate-100 text-slate-600' : 'bg-slate-50 text-slate-400'}`}
                        >
                          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </button>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-slate-500">
                      <span>生产进度</span>
                      <span>{progress}% ({totalDone}/{totalPlan})</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                       <div 
                          className={`h-full rounded-full transition-all duration-500 ${
                            progress === 100 ? 'bg-green-500' : 'bg-blue-500'
                          }`} 
                          style={{ width: `${progress}%` }} 
                        />
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="pt-2 border-t border-slate-100 mt-2 space-y-2 animate-in fade-in slide-in-from-top-2">
                       {order.items.map((item, idx) => (
                          <div key={idx} className="bg-slate-50 p-3 rounded-lg text-sm border border-slate-100">
                             <div className="flex justify-between mb-1">
                                <span className="font-bold text-slate-700">{item.spec} <span className="font-normal text-slate-500 text-xs">/ {item.level}</span></span>
                                <span className={`text-xs px-1.5 py-0.5 rounded ${item.status === 'production_completed' ? 'bg-green-100 text-green-700' : 'bg-blue-50 text-blue-600'}`}>
                                  {item.status === 'production_completed' ? '完成' : '生产中'}
                                </span>
                             </div>
                             <div className="text-xs text-slate-500 mb-2">
                               {item.interfaceType} / {item.lining} / {item.coating}
                             </div>
                             <div className="flex justify-between items-end">
                                <span className="text-xs text-slate-400">计划: {item.plannedQuantity}</span>
                                <span className="text-sm font-medium text-blue-600">已产: {item.producedQuantity}</span>
                             </div>
                          </div>
                       ))}
                       
                       <div className="flex justify-end gap-2 pt-2">
                          {canEdit && (
                            <button 
                              onClick={() => handleDelete(order.id)}
                              className="flex items-center gap-1 px-3 py-1.5 text-xs text-red-600 bg-red-50 rounded-lg"
                            >
                              <Trash2 className="h-3 w-3" /> 删除订单
                            </button>
                          )}
                           <button 
                              onClick={() => setShowQRCode(order.orderNo)}
                              className="flex items-center gap-1 px-3 py-1.5 text-xs text-slate-600 bg-slate-100 rounded-lg"
                            >
                              <QrCode className="h-3 w-3" /> 二维码
                            </button>
                       </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {isFormOpen && (
        <OrderForm 
          initialData={editingOrder} 
          onClose={() => {
            setIsFormOpen(false);
            setEditingOrder(undefined);
          }} 
          onSubmit={handleCreate}
        />
      )}

      {showQRCode && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowQRCode(null)}>
          <div className="bg-white p-8 rounded-2xl shadow-2xl max-w-sm w-full text-center transform transition-all scale-100" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-slate-800 mb-2">订单二维码</h3>
            <p className="text-slate-500 text-sm mb-6">扫描二维码查看订单详情</p>
            <div className="flex justify-center bg-white p-4 rounded-xl border border-slate-100 shadow-inner mb-6">
              <QRCodeCanvas value={showQRCode} size={200} level="H" />
            </div>
            <div className="text-xs text-slate-400 mb-6 font-mono break-all px-4">
              ID: {showQRCode}
            </div>
            <button 
              onClick={() => setShowQRCode(null)}
              className="w-full py-2.5 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 font-medium transition-colors"
            >
              关闭
            </button>
          </div>
        </div>
      )}
    </div>
  );
}