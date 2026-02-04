import React from 'react';
import { useStore } from '@/store/useStore';
import { Order } from '@/types';
import { Factory, Save, Search, CheckCircle2 } from 'lucide-react';

export default function Production() {
  const { orders, addProductionRecord, productionRecords, currentUser } = useStore();
  const [selectedOrderNo, setSelectedOrderNo] = React.useState('');
  const [selectedOrder, setSelectedOrder] = React.useState<Order | null>(null);
  
  // Form State
  const [selectedSubOrder, setSelectedSubOrder] = React.useState<string>('');
  const [quantity, setQuantity] = React.useState<number>(0);
  const [team, setTeam] = React.useState<string>('甲班');
  const [shift, setShift] = React.useState<string>('白班');
  const [workshop, setWorkshop] = React.useState<string>('一车间');
  
  const canOperate = currentUser?.role === 'admin' || currentUser?.role === 'production';

  // Search Order
  React.useEffect(() => {
    if (selectedOrderNo) {
      const order = orders.find(o => o.orderNo === selectedOrderNo);
      if (order) setSelectedOrder(order);
      else setSelectedOrder(null);
    } else {
      setSelectedOrder(null);
    }
  }, [selectedOrderNo, orders]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder || !selectedSubOrder || quantity <= 0) return;

    addProductionRecord({
      orderId: selectedOrder.id,
      subOrderId: selectedSubOrder,
      team: team as any,
      shift: shift as any,
      quantity: Number(quantity),
      workshop,
      operatorId: currentUser?.id || 'unknown'
    });

    alert('生产记录已提交');
    setQuantity(0);
    // Optional: Reset selection or keep for continuous entry
  };

  const recentRecords = productionRecords.slice(0, 10);

  if (!canOperate) return <div className="p-8 text-center text-gray-500">您没有权限访问此模块</div>;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-100px)]">
      {/* Left: Entry Form */}
      <div className="lg:col-span-2 space-y-6 overflow-y-auto pr-2">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Factory className="h-6 w-6 text-blue-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-800">生产报工</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">订单号搜索</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  list="order-list"
                  type="text"
                  value={selectedOrderNo}
                  onChange={(e) => setSelectedOrderNo(e.target.value)}
                  className="w-full pl-9 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg font-medium"
                  placeholder="输入或选择订单号..."
                />
                <datalist id="order-list">
                  {orders.filter(o => o.status !== 'shipping_completed').map(o => (
                    <option key={o.id} value={o.orderNo} />
                  ))}
                </datalist>
              </div>
            </div>

            {selectedOrder && (
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 mb-4">
                <p className="text-sm text-blue-800 font-medium">当前订单: {selectedOrder.customerName || '无客户信息'}</p>
                <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
                  {selectedOrder.items.map(item => (
                    <div 
                      key={item.id}
                      onClick={() => setSelectedSubOrder(item.id)}
                      className={`cursor-pointer p-3 rounded-md border transition-all ${selectedSubOrder === item.id ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-white border-gray-200 hover:border-blue-400'}`}
                    >
                      <div className="flex justify-between items-center text-sm">
                        <span className="font-bold">{item.spec} / {item.level}</span>
                        <span className="opacity-80">{item.length}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs mt-1 opacity-90">
                        <span>{item.interfaceType} | {item.coating}</span>
                        <span>{item.producedQuantity} / {item.plannedQuantity}</span>
                      </div>
                      {/* Progress Bar */}
                      <div className="mt-2 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-green-400" 
                          style={{ width: `${Math.min((item.producedQuantity / item.plannedQuantity) * 100, 100)}%` }} 
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">班组</label>
                <select
                  value={team}
                  onChange={(e) => setTeam(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="甲班">甲班</option>
                  <option value="乙班">乙班</option>
                  <option value="丙班">丙班</option>
                  <option value="丁班">丁班</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">班次</label>
                <select
                  value={shift}
                  onChange={(e) => setShift(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="白班">白班</option>
                  <option value="中班">中班</option>
                  <option value="夜班">夜班</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">产线</label>
                <select
                  value={workshop}
                  onChange={(e) => setWorkshop(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="一车间">一车间</option>
                  <option value="二车间">二车间</option>
                  <option value="三车间">三车间</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">本次完成支数</label>
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
              disabled={!selectedOrder || !selectedSubOrder || quantity <= 0}
              className="w-full bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2"
            >
              <Save className="h-5 w-5" />
              确认提交
            </button>
          </form>
        </div>
      </div>

      {/* Right: Recent Records */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 overflow-y-auto">
        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-green-500" />
          最近生产记录
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
                    <span className="text-green-600 font-bold">+{record.quantity}</span>
                  </div>
                  <div className="text-xs text-gray-500">
                    {item?.spec} {item?.level} - {record.team}/{record.shift}
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
