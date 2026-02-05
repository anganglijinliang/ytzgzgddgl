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
  Loader2
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
        // Optimistic update handled by store, but if we had async updateOrder:
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
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-gray-800">订单管理</h2>
        <div className="flex flex-wrap gap-2">
           <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="搜索订单号/客户..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm w-64"
            />
          </div>
          {canEdit && (
            <div className="flex gap-2">
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
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} 导入订单
              </button>
              <button
                onClick={() => { setEditingOrder(undefined); setIsFormOpen(true); }}
                disabled={isLoading}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} 新增订单
              </button>
            </div>
          )}
          <button onClick={exportExcel} className="p-2 text-green-600 bg-green-50 rounded-lg hover:bg-green-100" title="导出 Excel">
            <FileSpreadsheet className="h-5 w-5" />
          </button>
          <button onClick={handlePrint} className="p-2 text-red-600 bg-red-50 rounded-lg hover:bg-red-100" title="打印报表">
            <Printer className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 font-semibold text-gray-700 w-10"></th>
                <th className="px-6 py-3 font-semibold text-gray-700">订单号</th>
                <th className="px-6 py-3 font-semibold text-gray-700">客户</th>
                <th className="px-6 py-3 font-semibold text-gray-700">交货日期</th>
                <th className="px-6 py-3 font-semibold text-gray-700">总进度</th>
                <th className="px-6 py-3 font-semibold text-gray-700">状态</th>
                <th className="px-6 py-3 font-semibold text-gray-700 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredOrders.map(order => {
                const totalPlan = order.items.reduce((acc, i) => acc + i.plannedQuantity, 0);
                const totalDone = order.items.reduce((acc, i) => acc + i.producedQuantity, 0);
                const progress = totalPlan > 0 ? Math.round((totalDone / totalPlan) * 100) : 0;
                
                return (
                  <React.Fragment key={order.id}>
                    <tr className={`hover:bg-gray-50 transition-colors ${expandedOrders.has(order.id) ? 'bg-blue-50/30' : ''}`}>
                      <td className="px-6 py-4">
                        <button 
                          onClick={() => toggleExpand(order.id)}
                          className="text-gray-400 hover:text-blue-600"
                        >
                          {expandedOrders.has(order.id) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </button>
                      </td>
                      <td className="px-6 py-4 font-medium text-gray-900">{order.orderNo}</td>
                      <td className="px-6 py-4 text-gray-600">{order.customerName || '-'}</td>
                      <td className="px-6 py-4 text-gray-600">{order.deliveryDate || '-'}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div className="h-full bg-green-500 rounded-full" style={{ width: `${progress}%` }} />
                          </div>
                          <span className="text-xs text-gray-500">{progress}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                          ${order.status === 'new' ? 'bg-blue-100 text-blue-800' : 
                            order.status === 'in_production' ? 'bg-yellow-100 text-yellow-800' :
                            order.status === 'production_completed' ? 'bg-teal-100 text-teal-800' : 'bg-gray-100 text-gray-800'}`}>
                          {order.status === 'new' ? '新建' : 
                           order.status === 'in_production' ? '生产中' :
                           order.status === 'production_completed' ? '生产完成' : order.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => setShowQRCode(order.id)}
                            className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-md"
                            title="查看二维码"
                          >
                            <QrCode className="h-4 w-4" />
                          </button>
                          {canEdit && (
                            <>
                              <button 
                                onClick={() => handleEdit(order)}
                                disabled={isLoading}
                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                              <button 
                                onClick={() => handleDelete(order.id)}
                                disabled={isLoading}
                                className="p-1.5 text-red-600 hover:bg-red-50 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                    {expandedOrders.has(order.id) && (
                      <tr className="bg-gray-50/50">
                        <td colSpan={7} className="px-6 py-4 pl-16">
                          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                            <table className="w-full text-xs">
                              <thead className="bg-gray-100">
                                <tr>
                                  <th className="px-4 py-2 font-medium text-gray-600">规格</th>
                                  <th className="px-4 py-2 font-medium text-gray-600">级别</th>
                                  <th className="px-4 py-2 font-medium text-gray-600">接口</th>
                                  <th className="px-4 py-2 font-medium text-gray-600">内衬</th>
                                  <th className="px-4 py-2 font-medium text-gray-600">计划</th>
                                  <th className="px-4 py-2 font-medium text-gray-600">已产</th>
                                  <th className="px-4 py-2 font-medium text-gray-600">状态</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100">
                                {order.items.map(item => (
                                  <tr key={item.id}>
                                    <td className="px-4 py-2">{item.spec}</td>
                                    <td className="px-4 py-2">{item.level}</td>
                                    <td className="px-4 py-2">{item.interfaceType}</td>
                                    <td className="px-4 py-2">{item.lining}</td>
                                    <td className="px-4 py-2 font-medium">{item.plannedQuantity}</td>
                                    <td className="px-4 py-2 text-green-600">{item.producedQuantity}</td>
                                    <td className="px-4 py-2">{item.status === 'new' ? '-' : '进行中'}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
              {filteredOrders.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-400">
                    没有找到匹配的订单
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isFormOpen && (
        <OrderForm 
          initialData={editingOrder} 
          onClose={() => { setIsFormOpen(false); setEditingOrder(undefined); }} 
          onSubmit={handleCreate} 
        />
      )}

      {showQRCode && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowQRCode(null)}>
          <div className="bg-white p-8 rounded-xl shadow-2xl flex flex-col items-center gap-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-800">订单追踪二维码</h3>
            <div className="p-4 bg-white border border-gray-200 rounded-lg">
               <QRCodeCanvas value={`${window.location.origin}/track/${showQRCode}`} size={200} />
            </div>
            <p className="text-sm text-gray-500 text-center max-w-xs">
              客户扫描此二维码即可无需登录直接查询订单生产和发运进度
            </p>
            <button 
              onClick={() => setShowQRCode(null)}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm"
            >
              关闭
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
