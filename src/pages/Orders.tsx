import React from 'react';
import { useStore } from '@/store/useStore';
import { Order } from '@/types';
import { 
  Plus, 
  Search, 
  ChevronDown, 
  ChevronRight, 
  Edit, 
  Trash2, 
  QrCode, 
  FileSpreadsheet,
  Printer
} from 'lucide-react';
import OrderForm from '@/components/OrderForm';
import { QRCodeCanvas } from 'qrcode.react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

export default function Orders() {
  const { orders, addOrder, updateOrder, deleteOrder, currentUser } = useStore();
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editingOrder, setEditingOrder] = React.useState<Order | undefined>(undefined);
  const [expandedOrders, setExpandedOrders] = React.useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = React.useState('');
  const [showQRCode, setShowQRCode] = React.useState<string | null>(null);

  const canEdit = currentUser?.role === 'admin' || currentUser?.role === 'order_entry';

  const filteredOrders = orders.filter(o => 
    o.orderNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.customerName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleExpand = (id: string) => {
    const newSet = new Set(expandedOrders);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setExpandedOrders(newSet);
  };

  const handleCreate = (data: any) => {
    if (editingOrder) {
      updateOrder(editingOrder.id, data);
    } else {
      addOrder(data);
    }
    setIsFormOpen(false);
    setEditingOrder(undefined);
  };

  const handleEdit = (order: Order) => {
    setEditingOrder(order);
    setIsFormOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('确定要删除此订单吗？')) {
      deleteOrder(id);
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
        发运支数: item.shippedQuantity,
        状态: item.status
      }))
    );
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Orders");
    XLSX.writeFile(wb, "orders_export.xlsx");
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    // Use a font that supports Chinese or just English for demo if font not loaded
    // In real app, need to load custom font for Chinese support in jsPDF
    doc.text("Order Report", 14, 15);
    
    const tableData = orders.flatMap(o => 
      o.items.map(item => [
        o.orderNo,
        item.spec,
        item.level,
        String(item.plannedQuantity),
        String(item.producedQuantity)
      ])
    );

    autoTable(doc, {
      head: [['Order No', 'Spec', 'Level', 'Plan', 'Done']],
      body: tableData,
      startY: 20,
    });

    doc.save("orders_report.pdf");
  };

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
            <button
              onClick={() => { setEditingOrder(undefined); setIsFormOpen(true); }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              <Plus className="h-4 w-4" /> 新增订单
            </button>
          )}
          <button onClick={exportExcel} className="p-2 text-green-600 bg-green-50 rounded-lg hover:bg-green-100" title="导出 Excel">
            <FileSpreadsheet className="h-5 w-5" />
          </button>
          <button onClick={exportPDF} className="p-2 text-red-600 bg-red-50 rounded-lg hover:bg-red-100" title="导出 PDF">
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
                            order.status.includes('completed') ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                          {order.status === 'new' ? '新建' : 
                           order.status === 'production_completed' ? '生产完成' :
                           order.status === 'shipping_completed' ? '已发运' : '进行中'}
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
                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                              <button 
                                onClick={() => handleDelete(order.id)}
                                className="p-1.5 text-red-600 hover:bg-red-50 rounded-md"
                              >
                                <Trash2 className="h-4 w-4" />
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
                                  <th className="px-4 py-2 font-medium text-gray-600">已发</th>
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
                                    <td className="px-4 py-2 text-orange-600">{item.shippedQuantity}</td>
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
