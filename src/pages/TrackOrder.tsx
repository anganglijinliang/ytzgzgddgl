import { useParams } from 'react-router-dom';
import { useStore } from '@/store/useStore';
import { Factory, Truck, Package, Calendar } from 'lucide-react';

export default function TrackOrder() {
  const { orderId } = useParams();
  const { orders } = useStore();
  
  const order = orders.find(o => o.id === orderId);

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">订单不存在</h1>
          <p className="text-gray-500">请确认二维码或链接是否正确</p>
        </div>
      </div>
    );
  }

  const totalPlan = order.items.reduce((acc, i) => acc + i.plannedQuantity, 0);
  const totalProd = order.items.reduce((acc, i) => acc + i.producedQuantity, 0);
  const totalShip = order.items.reduce((acc, i) => acc + i.shippedQuantity, 0);
  const prodProgress = totalPlan > 0 ? Math.round((totalProd / totalPlan) * 100) : 0;
  const shipProgress = totalPlan > 0 ? Math.round((totalShip / totalPlan) * 100) : 0;

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 text-center">
          <div className="inline-block p-3 bg-blue-100 rounded-full mb-4">
            <Factory className="h-8 w-8 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">安钢永通订单追踪</h1>
          <p className="text-gray-500 text-sm">订单号: <span className="font-mono font-bold text-gray-900 text-lg">{order.orderNo}</span></p>
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center gap-2 mb-2 text-green-600">
              <Factory className="h-5 w-5" />
              <span className="font-bold">生产进度</span>
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-1">{prodProgress}%</div>
            <div className="w-full bg-gray-100 rounded-full h-2">
              <div className="bg-green-500 h-2 rounded-full transition-all duration-1000" style={{ width: `${prodProgress}%` }} />
            </div>
            <p className="text-xs text-gray-400 mt-2">{totalProd} / {totalPlan} 支</p>
          </div>
          
          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center gap-2 mb-2 text-orange-600">
              <Truck className="h-5 w-5" />
              <span className="font-bold">发运进度</span>
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-1">{shipProgress}%</div>
            <div className="w-full bg-gray-100 rounded-full h-2">
              <div className="bg-orange-500 h-2 rounded-full transition-all duration-1000" style={{ width: `${shipProgress}%` }} />
            </div>
            <p className="text-xs text-gray-400 mt-2">{totalShip} / {totalPlan} 支</p>
          </div>
        </div>

        {/* Basic Info */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">基本信息</h3>
          <div className="grid grid-cols-2 gap-y-4 text-sm">
            <div>
              <span className="text-gray-500 block">客户名称</span>
              <span className="font-medium">{order.customerName || '-'}</span>
            </div>
            <div>
              <span className="text-gray-500 block">交货日期</span>
              <span className="font-medium flex items-center gap-1">
                <Calendar className="h-4 w-4 text-gray-400" />
                {order.deliveryDate || '-'}
              </span>
            </div>
            <div className="col-span-2">
              <span className="text-gray-500 block">备注</span>
              <span className="font-medium">{order.remarks || '无'}</span>
            </div>
          </div>
        </div>

        {/* Detailed List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 bg-gray-50 border-b border-gray-200">
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <Package className="h-5 w-5" />
              明细清单
            </h3>
          </div>
          <div className="divide-y divide-gray-100">
            {order.items.map((item, idx) => (
              <div key={idx} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex justify-between items-start mb-2">
                  <span className="font-bold text-gray-900 text-lg">{item.spec}</span>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium
                    ${item.status === 'shipping_completed' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
                    {item.status === 'new' ? '等待生产' : 
                     item.status === 'production_completed' ? '待发运' :
                     item.status === 'shipping_completed' ? '已完成' : '进行中'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm text-gray-600 mb-3">
                  <span>级别: {item.level}</span>
                  <span>接口: {item.interfaceType}</span>
                  <span>内衬: {item.lining}</span>
                  <span>长度: {item.length}</span>
                </div>
                
                <div className="space-y-2">
                  <div>
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>生产 ({item.producedQuantity}/{item.plannedQuantity})</span>
                      <span>{Math.round(item.producedQuantity/item.plannedQuantity*100)}%</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div className="bg-green-500 h-1.5 rounded-full" style={{ width: `${Math.min(item.producedQuantity/item.plannedQuantity*100, 100)}%` }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>发运 ({item.shippedQuantity}/{item.plannedQuantity})</span>
                      <span>{Math.round(item.shippedQuantity/item.plannedQuantity*100)}%</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div className="bg-orange-500 h-1.5 rounded-full" style={{ width: `${Math.min(item.shippedQuantity/item.plannedQuantity*100, 100)}%` }} />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="text-center text-xs text-gray-400 py-4">
          安钢集团永通球墨铸铁管有限责任公司 &copy; 2025
        </div>
      </div>
    </div>
  );
}
