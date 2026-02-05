import React from 'react';
import { useStore } from '@/store/useStore';
import { Order } from '@/types';
import { Factory, Save, Search, CheckCircle2, ShieldCheck, AlertTriangle } from 'lucide-react';
import { Loader2 } from 'lucide-react';
import LoadingSpinner from '@/components/LoadingSpinner';
import { useToast } from '@/context/ToastContext';

export default function Production() {
  const { orders, addProductionRecord, productionRecords, currentUser, isLoading } = useStore();
  const { showToast } = useToast();
  const [selectedOrderNo, setSelectedOrderNo] = React.useState('');
  const [selectedOrder, setSelectedOrder] = React.useState<Order | null>(null);
  
  // Form State
  const [selectedSubOrder, setSelectedSubOrder] = React.useState<string>('');
  const [quantity, setQuantity] = React.useState<number>(0);
  const [team, setTeam] = React.useState<string>('甲班');
  const [shift, setShift] = React.useState<string>('白班');
  const [workshop, setWorkshop] = React.useState<string>('一车间');
  const [heatNo, setHeatNo] = React.useState<string>('');
  const [process, setProcess] = React.useState<string>('pulling');
  
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder || !selectedSubOrder || quantity <= 0) return;

    // Expert Validation: Heat No is mandatory for Pulling process
    if (process === 'pulling' && !heatNo.trim()) {
      showToast('质量管控要求：离心浇铸工序必须录入炉号 (Heat No)！', 'error');
      return;
    }

    const success = await addProductionRecord({
      orderId: selectedOrder.id,
      subOrderId: selectedSubOrder,
      team: team as any,
      shift: shift as any,
      quantity: Number(quantity),
      workshop,
      heatNo,
      process: process as any,
      operatorId: currentUser?.id || 'unknown'
    });

    if (success) {
      showToast('生产记录已提交', 'success');
      setQuantity(0);
      // Keep heatNo for batch entry if needed, or clear it. Usually keeps for same batch.
      // setHeatNo(''); 
    } else {
      showToast('提交失败，请重试', 'error');
    }
  };

  const recentRecords = productionRecords.slice(0, 10);

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
            <div className="p-2 bg-blue-100 rounded-lg">
              <Factory className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">生产报工 (MES)</h2>
              <p className="text-xs text-gray-500">录入生产实绩与质量追溯信息</p>
            </div>
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
                  {orders.filter(o => !['completed', 'shipping_completed_production', 'shipping_completed'].includes(o.status)).map(o => (
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
                        <span>{item.producedQuantity} / {item.plannedQuantity} (成品)</span>
                      </div>
                      <div className="grid grid-cols-3 gap-1 text-[10px] mt-1 text-gray-500">
                         <div className={selectedSubOrder === item.id ? "text-blue-100" : ""}>拉管: {item.pullingQuantity || 0}</div>
                         <div className={selectedSubOrder === item.id ? "text-blue-100" : ""}>水压: {item.hydrostaticQuantity || 0}</div>
                         <div className={selectedSubOrder === item.id ? "text-blue-100" : ""}>衬管: {item.liningQuantity || 0}</div>
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

            <div className="border-t border-gray-100 pt-4">
              <div className="flex items-center gap-2 mb-4">
                 <ShieldCheck className="h-4 w-4 text-purple-600" />
                 <h3 className="text-sm font-bold text-gray-800">工序与质量追溯</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">当前工序 (Process Step)</label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {[
                      { id: 'pulling', label: '1. 离心浇铸' },
                      { id: 'hydrostatic', label: '2. 水压试验' },
                      { id: 'lining', label: '3. 内衬工序' },
                      { id: 'packaging', label: '4. 打包/入库' }
                    ].map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setProcess(p.id)}
                        className={`py-2 px-3 rounded-lg border text-sm font-medium transition-all ${
                          process === p.id 
                            ? 'bg-blue-600 text-white border-blue-600 shadow-md ring-2 ring-blue-200' 
                            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    炉号 (Heat No) 
                    {process === 'pulling' && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={heatNo}
                      onChange={(e) => setHeatNo(e.target.value)}
                      placeholder={process === 'pulling' ? "必填: 例如 H20231001" : "选填"}
                      className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-all ${
                        process === 'pulling' && !heatNo 
                          ? 'border-red-300 focus:ring-red-200 bg-red-50' 
                          : 'border-gray-300 focus:ring-blue-500'
                      }`}
                    />
                    {process === 'pulling' && !heatNo && (
                      <AlertTriangle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-red-400" />
                    )}
                  </div>
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
              </div>
            </div>

            <button
              type="submit"
              disabled={!selectedOrder || !selectedSubOrder || quantity <= 0 || isLoading}
              className="w-full bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2"
            >
              {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
              {isLoading ? '提交中...' : '确认报工'}
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
                    <span className={`ml-2 px-1.5 py-0.5 rounded text-gray-700 text-[10px] ${
                      record.process === 'pulling' ? 'bg-orange-100 text-orange-700' :
                      record.process === 'hydrostatic' ? 'bg-blue-100 text-blue-700' :
                      record.process === 'lining' ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'
                    }`}>
                      {record.process === 'pulling' ? '拉管' : 
                       record.process === 'hydrostatic' ? '水压' : 
                       record.process === 'lining' ? '衬管' : '打包'}
                    </span>
                  </div>
                  {record.heatNo && (
                    <div className="text-xs text-gray-600 mt-1 font-mono bg-gray-100 px-1 rounded w-fit">
                      炉号: {record.heatNo}
                    </div>
                  )}
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
