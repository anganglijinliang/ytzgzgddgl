import React from 'react';
import { useStore } from '@/store/useStore';
import { Order } from '@/types';
import { Truck, Save, Search, CheckCircle2, Loader2 } from 'lucide-react';
import LoadingSpinner from '@/components/LoadingSpinner';
import { useToast } from '@/context/ToastContext';

export default function Shipping() {
  const { orders, addShippingRecord, shippingRecords, currentUser, masterData, isLoading } = useStore();
  const { showToast } = useToast();
  const [selectedOrderNo, setSelectedOrderNo] = React.useState('');
  const [selectedOrder, setSelectedOrder] = React.useState<Order | null>(null);
  
  // Form State
  const [selectedSubOrder, setSelectedSubOrder] = React.useState<string>('');
  const [quantity, setQuantity] = React.useState<number>(0);
  const [transportType, setTransportType] = React.useState<string>('truck');
  const [shippingType, setShippingType] = React.useState<string>('delivery');
  const [shippingWarehouse, setShippingWarehouse] = React.useState<string>('');
  const [vehicleInfo, setVehicleInfo] = React.useState<string>('');
  const [shippingNo, setShippingNo] = React.useState<string>('');
  
  const canOperate = currentUser?.role === 'admin' || currentUser?.role === 'shipping';

  // Search Order
  React.useEffect(() => {
    if (selectedOrderNo) {
      const order = orders.find(o => o.orderNo === selectedOrderNo);
      if (order) {
        setSelectedOrder(order);
        // Auto fill warehouse if available in order
        if (order.warehouse) setShippingWarehouse(order.warehouse);
      } else setSelectedOrder(null);
    } else {
      setSelectedOrder(null);
    }
  }, [selectedOrderNo, orders]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder || !selectedSubOrder || quantity <= 0) return;

    // Validation: Cannot ship more than produced (simplified check, ideally should check produced - shipped)
    const item = selectedOrder.items.find(i => i.id === selectedSubOrder);
    if (item && quantity > (item.producedQuantity - item.shippedQuantity)) {
      if (!confirm(`警告：发运数量 (${quantity}) 超过当前库存 (${item.producedQuantity - item.shippedQuantity})，是否继续？`)) {
        return;
      }
    }

    const success = await addShippingRecord({
      orderId: selectedOrder.id,
      subOrderId: selectedSubOrder,
      quantity: Number(quantity),
      transportType: transportType as any,
      shippingType: shippingType as any,
      shippingWarehouse,
      vehicleInfo,
      shippingNo,
      operatorId: currentUser?.id || 'unknown'
    });

    if (success) {
      showToast('发运记录已提交', 'success');
      setQuantity(0);
    } else {
      showToast('提交失败，请重试', 'error');
    }
  };

  const recentRecords = shippingRecords.slice(0, 10);

  if (!canOperate) return <div className="p-8 text-center text-gray-500">您没有权限访问此模块</div>;

  if (isLoading && orders.length === 0) {
    return <LoadingSpinner />;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-100px)]">
      {/* Left: Entry Form */}
      <div className="lg:col-span-2 space-y-6 overflow-y-auto pr-2">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Truck className="h-6 w-6 text-orange-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-800">发运管理</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">订单号搜索</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  list="shipping-order-list"
                  type="text"
                  value={selectedOrderNo}
                  onChange={(e) => setSelectedOrderNo(e.target.value)}
                  className="w-full pl-9 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg font-medium"
                  placeholder="输入或选择订单号..."
                />
                <datalist id="shipping-order-list">
                  {orders.filter(o => o.status !== 'new').map(o => (
                    <option key={o.id} value={o.orderNo} />
                  ))}
                </datalist>
              </div>
            </div>

            {selectedOrder && (
              <div className="bg-orange-50 p-4 rounded-lg border border-orange-100 mb-4">
                <p className="text-sm text-orange-800 font-medium">当前订单: {selectedOrder.customerName || '无客户信息'}</p>
                <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
                  {selectedOrder.items.map(item => {
                    const availableStock = item.producedQuantity - item.shippedQuantity;
                    return (
                      <div 
                        key={item.id}
                        onClick={() => setSelectedSubOrder(item.id)}
                        className={`cursor-pointer p-3 rounded-md border transition-all ${selectedSubOrder === item.id ? 'bg-orange-600 text-white border-orange-600 shadow-md' : 'bg-white border-gray-200 hover:border-orange-400'}`}
                      >
                        <div className="flex justify-between items-center text-sm">
                          <span className="font-bold">{item.spec} / {item.level}</span>
                          <span className="opacity-80">可发: {availableStock}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs mt-1 opacity-90">
                          <span>{item.interfaceType}</span>
                          <span>已发: {item.shippedQuantity} / 计划: {item.plannedQuantity}</span>
                        </div>
                         {/* Progress Bar */}
                         <div className="mt-2 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-orange-400" 
                            style={{ width: `${Math.min((item.shippedQuantity / item.plannedQuantity) * 100, 100)}%` }} 
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">运输方式</label>
                <select
                  value={transportType}
                  onChange={(e) => setTransportType(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="truck">汽运</option>
                  <option value="train">火车</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">发运形式</label>
                <select
                  value={shippingType}
                  onChange={(e) => setShippingType(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="delivery">自发</option>
                  <option value="pickup">自提</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">发运仓库</label>
                <input
                  list="warehouse-list"
                  type="text"
                  value={shippingWarehouse}
                  onChange={(e) => setShippingWarehouse(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="选择仓库"
                />
                <datalist id="warehouse-list">
                  {masterData.warehouses.map(w => <option key={w} value={w} />)}
                </datalist>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">车牌号/车次</label>
                <input
                  type="text"
                  value={vehicleInfo}
                  onChange={(e) => setVehicleInfo(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="豫E..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">发运单号</label>
                <input
                  type="text"
                  value={shippingNo}
                  onChange={(e) => setShippingNo(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="FY..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">本次发运支数</label>
                <input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold text-lg"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={!selectedOrder || !selectedSubOrder || quantity <= 0 || isLoading}
              className="w-full bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-orange-700 text-white font-bold py-3 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2"
            >
              {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
              {isLoading ? '提交中...' : '确认发运'}
            </button>
          </form>
        </div>
      </div>

      {/* Right: Recent Records */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 overflow-y-auto">
        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-green-500" />
          最近发运记录
        </h3>
        <div className="space-y-4">
          {recentRecords.length === 0 ? (
            <p className="text-gray-400 text-center py-4">暂无记录</p>
          ) : (
            recentRecords.map(record => {
              const order = orders.find(o => o.id === record.orderId);
              const item = order?.items.find(i => i.id === record.subOrderId);
              return (
                <div key={record.id} className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-medium text-gray-900">{order?.orderNo}</span>
                    <span className="text-orange-600 font-bold">-{record.quantity}</span>
                  </div>
                  <div className="text-xs text-gray-500">
                    {item?.spec} {item?.level} - {record.vehicleInfo}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    {new Date(record.timestamp).toLocaleString()}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
