import React from 'react';
import { useStore } from '@/store/useStore';
import { Order, ProductionPlan } from '@/types';
import { Search, CheckCircle2, ListTodo } from 'lucide-react';
import { Loader2, AlertTriangle } from 'lucide-react';
import LoadingSpinner from '@/components/LoadingSpinner';

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: Error | null }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Production Error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 text-center bg-red-50 text-red-600 rounded-xl m-4">
          <AlertTriangle className="h-12 w-12 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">页面出错了</h2>
          <p className="text-sm opacity-80 mb-4">{this.state.error?.message}</p>
          <button 
            onClick={() => { this.setState({ hasError: false }); window.location.reload(); }}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            刷新页面
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
import { useToast } from '@/context/ToastContext';

export default function Production() {
  const { orders: rawOrders, addProductionRecord, productionRecords: rawRecords, currentUser, isLoading, plans: rawPlans, addPlan, updatePlan } = useStore();
  
  // Defensive checks for data types - Prevents blank screen if store data is corrupted/loading
  const orders = Array.isArray(rawOrders) ? rawOrders : [];
  const productionRecords = Array.isArray(rawRecords) ? rawRecords : [];
  const plans = Array.isArray(rawPlans) ? rawPlans : [];
  const { showToast } = useToast();
  
  const [activeTab, setActiveTab] = React.useState<'tasks' | 'all'>('tasks');
  
  // Selection State
  const [selectedOrderNo, setSelectedOrderNo] = React.useState('');
  const [selectedOrder, setSelectedOrder] = React.useState<Order | null>(null);
  const [selectedSubOrder, setSelectedSubOrder] = React.useState<string>('');
  const [selectedPlanId, setSelectedPlanId] = React.useState<string>('');

  // Form State - Initialize from localStorage
  const [quantity, setQuantity] = React.useState<number>(0);
  const [team, setTeam] = React.useState<string>(localStorage.getItem('prod_team') || '甲班');
  const [shift, setShift] = React.useState<string>(localStorage.getItem('prod_shift') || '白班');
  const [workshop, _setWorkshop] = React.useState<string>(localStorage.getItem('prod_workshop') || '一车间');
  const [heatNo, setHeatNo] = React.useState<string>('');
  const [process, setProcess] = React.useState<string>(localStorage.getItem('prod_process') || 'pulling');

  // Success Overlay State
  const [showSuccess, setShowSuccess] = React.useState(false);

  // Persist settings
  React.useEffect(() => {
    localStorage.setItem('prod_team', team);
    localStorage.setItem('prod_shift', shift);
    localStorage.setItem('prod_workshop', workshop);
    localStorage.setItem('prod_process', process);
  }, [team, shift, workshop, process]);
  
  const canOperate = currentUser?.role === 'admin' || currentUser?.role === 'production' || currentUser?.role === 'operator';

  // Search Order Logic
  React.useEffect(() => {
    if (selectedOrderNo) {
      const order = orders.find(o => o.orderNo === selectedOrderNo);
      if (order) {
        setSelectedOrder(order);
        // If searching manually, clear plan selection
        if (!selectedPlanId) setSelectedSubOrder('');
      } else {
        setSelectedOrder(null);
      }
    } else {
      setSelectedOrder(null);
    }
  }, [selectedOrderNo, orders]);

  // Handle Plan Selection
  const handleSelectPlan = (plan: ProductionPlan) => {
    const order = orders.find(o => o.id === plan.orderId);
    if (!order) return;

    setSelectedOrderNo(order.orderNo);
    setSelectedOrder(order);
    setSelectedSubOrder(plan.subOrderId);
    setSelectedPlanId(plan.id);
    setProcess(plan.process);
    setQuantity(plan.quantity); // Suggest plan quantity
    
    if (plan.team) setTeam(plan.team);
    if (plan.shift) setShift(plan.shift);
  };

  // Mock Dispatcher: Create a random plan for testing
  const createTestPlan = async () => {
    const validOrders = orders.filter(o => o.status !== 'production_completed');
    if (validOrders.length === 0) {
      showToast('没有可用的订单', 'error');
      return;
    }
    const randomOrder = validOrders[Math.floor(Math.random() * validOrders.length)];
    if (!randomOrder.items || randomOrder.items.length === 0) return;
    const randomItem = randomOrder.items[0];
    
    await addPlan({
      orderId: randomOrder.id,
      subOrderId: randomItem.id,
      workshop: workshop,
      team: team,
      shift: shift,
      plannedDate: new Date().toISOString().split('T')[0],
      quantity: 5,
      process: process as any
    });
    showToast('已生成测试派工单', 'success');
  };

  // Custom submit handler for workshop mode to show overlay
  const handleWorkshopSubmit = async () => {
      if (!selectedOrder || !selectedSubOrder || quantity <= 0) return;
      
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
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 1500); // Hide after 1.5s
        
        setQuantity(0);
        if (selectedPlanId) {
           await updatePlan(selectedPlanId, { status: 'completed' });
           setSelectedPlanId('');
           setSelectedSubOrder('');
        }
      }
  };

  const activePlans = (Array.isArray(plans) ? plans : []).filter(p => p && p.status === 'pending');

  if (!canOperate) return <div className="p-8 text-center text-gray-500">您没有权限访问此模块</div>;
  if (isLoading && orders.length === 0) return <LoadingSpinner />;

  // --- Render Helpers ---
  const NumPad = ({ onInput, onClear, onBackspace }: { onInput: (n: number) => void, onClear: () => void, onBackspace: () => void }) => (
    <div className="grid grid-cols-3 gap-3 h-full">
      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
        <button
          key={num}
          onClick={() => onInput(num)}
          className="bg-white border-2 border-gray-200 hover:border-blue-500 hover:bg-blue-50 text-3xl font-bold text-gray-800 rounded-xl shadow-sm active:scale-95 transition-all"
        >
          {num}
        </button>
      ))}
      <button onClick={onClear} className="bg-red-50 border-2 border-red-100 text-red-600 text-xl font-bold rounded-xl hover:bg-red-100 active:scale-95 transition-all">
        清除
      </button>
      <button onClick={() => onInput(0)} className="bg-white border-2 border-gray-200 hover:border-blue-500 hover:bg-blue-50 text-3xl font-bold text-gray-800 rounded-xl shadow-sm active:scale-95 transition-all">
        0
      </button>
      <button onClick={onBackspace} className="bg-gray-50 border-2 border-gray-200 text-gray-600 text-xl font-bold rounded-xl hover:bg-gray-100 active:scale-95 transition-all flex items-center justify-center">
        ⌫
      </button>
    </div>
  );

  const SuccessOverlay = ({ show, message }: { show: boolean, message: string }) => {
    if (!show) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-white rounded-3xl p-12 shadow-2xl flex flex-col items-center animate-in zoom-in-95 duration-200">
          <div className="h-32 w-32 bg-green-100 rounded-full flex items-center justify-center mb-6">
            <CheckCircle2 className="h-20 w-20 text-green-600" />
          </div>
          <h2 className="text-4xl font-black text-gray-900 mb-2">提交成功</h2>
          <p className="text-2xl text-gray-600">{message}</p>
        </div>
      </div>
    );
  };

  const renderPlanList = () => (
    <div className="space-y-3">
       {activePlans.length === 0 ? (
         <div className="text-center py-10 text-gray-400 bg-gray-50 rounded-xl border-2 border-dashed">
           <ListTodo className="h-10 w-10 mx-auto mb-2 opacity-50" />
           <p>暂无待办任务</p>
           {currentUser?.role === 'admin' && (
             <button onClick={createTestPlan} className="mt-4 text-blue-600 underline text-sm">生成测试任务</button>
           )}
         </div>
       ) : (
         activePlans.map(plan => {
           const order = orders.find(o => o.id === plan.orderId);
           const item = (order?.items || []).find(i => i.id === plan.subOrderId);
           if (!order || !item) return null;
           
           const isSelected = selectedPlanId === plan.id;
           
           return (
             <button
               key={plan.id}
               onClick={() => handleSelectPlan(plan)}
               className={`w-full text-left p-4 rounded-xl border-2 transition-all relative overflow-hidden ${isSelected ? 'border-blue-600 bg-blue-50 shadow-md ring-2 ring-blue-200' : 'border-gray-100 bg-white hover:border-blue-300'}`}
             >
               <div className="flex justify-between items-start mb-2">
                 <span className="font-bold text-gray-800 text-lg">{order.orderNo}</span>
                 <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full font-bold">
                   目标: {plan.quantity} 支
                 </span>
               </div>
               <div className="text-sm text-gray-600 mb-1 flex justify-between">
                  <span>{item.spec} {item.level}</span>
                  <span className="font-mono text-gray-400">{plan.plannedDate}</span>
               </div>
               <div className="flex gap-2 mt-2">
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded border">
                    {plan.process === 'pulling' ? '离心' : plan.process === 'hydrostatic' ? '水压' : plan.process === 'lining' ? '内衬' : '打包'}
                  </span>
                  {plan.team && <span className="text-xs bg-orange-50 text-orange-600 px-2 py-0.5 rounded border border-orange-100">{plan.team}</span>}
               </div>
               
               {/* Selection Indicator */}
               {isSelected && (
                 <div className="absolute top-0 right-0 p-1 bg-blue-600 rounded-bl-lg">
                   <CheckCircle2 className="h-4 w-4 text-white" />
                 </div>
               )}
             </button>
           );
         })
       )}
    </div>
  );

  return (
    <ErrorBoundary>
    <div className="h-[calc(100vh-100px)] flex flex-col bg-gray-50 -m-4 p-4">
      <SuccessOverlay show={showSuccess} message={`录入成功 +${quantity}`} />
      
      {/* Header Bar */}
      <div className="flex justify-between items-center mb-4 bg-white p-4 rounded-xl shadow-sm">
        <div className="flex items-center gap-4">
           <div>
             <h1 className="text-2xl font-bold text-gray-900">生产报工 (车间模式)</h1>
             <div className="flex gap-2 text-sm text-gray-500">
               <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded">{workshop}</span>
               <span className="bg-orange-100 text-orange-800 px-2 py-0.5 rounded">{team}</span>
               <span className="bg-purple-100 text-purple-800 px-2 py-0.5 rounded">{shift}</span>
             </div>
           </div>
        </div>
        <div className="text-right">
           <div className="text-3xl font-bold text-blue-600">
             {productionRecords
               .filter(r => r && r.timestamp && r.timestamp.startsWith(new Date().toISOString().split('T')[0]))
               .reduce((acc, cur) => acc + (cur.quantity || 0), 0)}
           </div>
           <div className="text-xs text-gray-400">今日累计产量</div>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-12 gap-4 overflow-hidden">
        {/* Left: Task/Order Selection */}
        <div className="col-span-4 bg-white rounded-xl shadow-sm p-4 overflow-hidden flex flex-col">
           {/* Tabs */}
           <div className="flex p-1 bg-gray-100 rounded-lg mb-4 shrink-0">
             <button
               onClick={() => setActiveTab('tasks')}
               className={`flex-1 py-3 text-lg font-bold rounded-md transition-all ${activeTab === 'tasks' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
             >
               待办任务 ({activePlans.length})
             </button>
             <button
               onClick={() => setActiveTab('all')}
               className={`flex-1 py-3 text-lg font-bold rounded-md transition-all ${activeTab === 'all' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
             >
               手动选择
             </button>
           </div>

           <div className="flex-1 overflow-y-auto pr-1">
             {activeTab === 'tasks' ? renderPlanList() : (
               <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">当前工序</label>
                    <div className="grid grid-cols-2 gap-2">
                        {[
                            { id: 'pulling', label: '离心浇铸' },
                            { id: 'hydrostatic', label: '水压试验' },
                            { id: 'lining', label: '内衬工序' },
                            { id: 'packaging', label: '打包入库' }
                        ].map(p => (
                          <button
                            key={p.id}
                            onClick={() => setProcess(p.id)}
                            className={`py-3 text-lg font-bold rounded-lg transition-all ${process === p.id ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-100 text-gray-600'}`}
                          >
                            {p.label}
                          </button>
                        ))}
                     </div>
                  </div>
                  <div>
                     <label className="block text-sm font-bold text-gray-700 mb-2">选择订单</label>
                     <div className="space-y-2">
                       {orders.filter(o => !['completed'].includes(o.status)).map(o => (
                         <button
                           key={o.id}
                           onClick={() => { setSelectedOrderNo(o.orderNo); setSelectedOrder(o); setSelectedSubOrder(''); setSelectedPlanId(''); }}
                           className={`w-full text-left p-4 rounded-xl border-2 transition-all ${selectedOrder?.id === o.id ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200' : 'border-gray-100 hover:bg-gray-50'}`}
                         >
                           <div className="font-bold text-lg">{o.orderNo}</div>
                           <div className="text-sm text-gray-500">{o.customerName}</div>
                         </button>
                       ))}
                     </div>
                  </div>
               </div>
             )}
           </div>
        </div>

        {/* Middle: Specs Selection (Only for 'all' tab or if order selected via task) */}
        <div className="col-span-4 bg-white rounded-xl shadow-sm p-4 overflow-y-auto">
           <label className="block text-sm font-bold text-gray-700 mb-2">选择规格</label>
           {!selectedOrder ? (
             <div className="text-gray-400 text-center mt-20 flex flex-col items-center">
               <Search className="h-12 w-12 opacity-20 mb-2" />
               <p>请先在左侧选择任务或订单</p>
             </div>
           ) : (
             <div className="grid grid-cols-1 gap-3">
               {(selectedOrder.items || []).map(item => (
                 <button
                   key={item.id}
                   onClick={() => setSelectedSubOrder(item.id)}
                   className={`p-4 rounded-xl border-2 transition-all text-left relative overflow-hidden ${selectedSubOrder === item.id ? 'border-green-500 bg-green-50 ring-2 ring-green-200' : 'border-gray-100 hover:bg-gray-50'}`}
                 >
                   <div className="flex justify-between items-center z-10 relative">
                     <span className="text-2xl font-bold text-gray-800">{item.spec}</span>
                     <span className="text-xl font-medium text-gray-600">{item.level}</span>
                   </div>
                   <div className="text-sm text-gray-500 mt-1 z-10 relative">{item.interfaceType} | {item.length}</div>
                   
                   {/* Progress Background */}
                   <div 
                      className="absolute bottom-0 left-0 h-1 bg-green-500 transition-all duration-500" 
                      style={{ width: `${Math.min((item.producedQuantity / (item.plannedQuantity || 1)) * 100, 100)}%` }} 
                   />
                 </button>
               ))}
             </div>
           )}
        </div>

        {/* Right: Operation Panel with NumPad */}
        <div className="col-span-4 bg-white rounded-xl shadow-sm p-4 flex flex-col gap-4">
           {process === 'pulling' && (
             <div>
               <label className="block text-sm font-bold text-red-600 mb-1">炉号 (Heat No)</label>
               <input 
                  type="text" 
                  value={heatNo}
                  onChange={e => setHeatNo(e.target.value)}
                  className="w-full text-2xl font-mono p-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none uppercase"
                  placeholder="输入炉号"
               />
             </div>
           )}

           <div className="flex-1 flex flex-col">
             <div className="text-center mb-4">
               <div className="text-sm text-gray-500 mb-1">本次录入数量</div>
               <div className="text-6xl font-black text-gray-900 tracking-tight">{quantity}</div>
             </div>
             
             {/* Numeric Keypad */}
             <div className="flex-1 min-h-[300px] mb-4">
                <NumPad 
                  onInput={(n) => setQuantity(prev => Number(`${prev}${n}`))} 
                  onClear={() => setQuantity(0)}
                  onBackspace={() => setQuantity(prev => Number(String(prev).slice(0, -1)) || 0)}
                />
             </div>
           </div>

           <button
             onClick={handleWorkshopSubmit}
             disabled={!selectedSubOrder || quantity <= 0 || isLoading}
             className={`w-full py-4 text-2xl font-bold rounded-xl shadow-lg transition-all ${
               !selectedSubOrder || quantity <= 0 || isLoading
                 ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                 : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 active:scale-95'
             }`}
           >
             {isLoading ? (
               <span className="flex items-center justify-center gap-2">
                 <Loader2 className="h-8 w-8 animate-spin" />
                 提交中...
               </span>
             ) : (
               '确认提交'
             )}
           </button>
        </div>
      </div>
    </div>
    </ErrorBoundary>
  );
}
