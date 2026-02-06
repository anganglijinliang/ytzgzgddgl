import { useState, useEffect, useMemo } from 'react';
import { useStore } from '@/store/useStore';
import { Order, ProductionPlan, SubOrder, ProductionProcess } from '@/types';
import { 
  Search, CheckCircle2, ListTodo, Settings, X, Calendar, 
  Factory, ClipboardList, ArrowRight, Package
} from 'lucide-react';
import { Loader2 } from 'lucide-react';
import LoadingSpinner from '@/components/LoadingSpinner';
import { useToast } from '@/context/ToastContext';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';

// --- Types & Interfaces ---

// --- Components ---

// 1. Workshop Mode (Touch Friendly) - Preserved & Polished
const WorkshopView = ({ 
  currentUser, orders, plans, addProductionRecord, updatePlan 
}: any) => {
  const { showToast } = useToast();
  // ... (State from original file)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedSubOrder, setSelectedSubOrder] = useState<string>('');
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');

  const [quantity, setQuantity] = useState<number>(0);
  const [team, setTeam] = useState<string>(localStorage.getItem('prod_team') || '甲班');
  const [shift] = useState<string>(localStorage.getItem('prod_shift') || '白班');
  const [workshop] = useState<string>(localStorage.getItem('prod_workshop') || '一车间');
  const [recordDate] = useState<string>(localStorage.getItem('prod_date') || new Date().toISOString().split('T')[0]);
  const [heatNo] = useState<string>('');
  const [process, setProcess] = useState<string>(localStorage.getItem('prod_process') || 'pulling');
  
  const [showSettings, setShowSettings] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Persist settings
  useEffect(() => {
    localStorage.setItem('prod_team', team);
    localStorage.setItem('prod_shift', shift);
    localStorage.setItem('prod_workshop', workshop);
    localStorage.setItem('prod_process', process);
    localStorage.setItem('prod_date', recordDate);
  }, [team, shift, workshop, process, recordDate]);

  // Filter plans for current workshop/process
  const availablePlans = useMemo(() => {
    return plans.filter((p: ProductionPlan) => 
      p.status === 'pending' && 
      p.workshop === workshop && 
      p.process === process
    );
  }, [plans, workshop, process]);

  const handleSelectPlan = (plan: ProductionPlan) => {
    const order = orders.find((o: Order) => o.id === plan.orderId);
    if (!order) return;
    setSelectedOrder(order);
    setSelectedSubOrder(plan.subOrderId);
    setSelectedPlanId(plan.id);
    setQuantity(plan.quantity);
  };

  const handleNumInput = (num: number) => {
    setQuantity(prev => {
      const str = prev.toString();
      if (str.length >= 5) return prev; // Limit length
      return Number(str + num);
    });
  };

  const handleClear = () => setQuantity(0);
  const handleBackspace = () => setQuantity(prev => Math.floor(prev / 10));

  const handleSubmit = async () => {
    if (!selectedOrder || !selectedSubOrder || quantity <= 0) {
      showToast('请选择订单并输入数量', 'error');
      return;
    }

    const now = new Date();
    const [y, m, d] = recordDate.split('-').map(Number);
    const recordTimestamp = new Date(y, m - 1, d, now.getHours(), now.getMinutes(), now.getSeconds()).toISOString();

    const success = await addProductionRecord({
      orderId: selectedOrder.id,
      subOrderId: selectedSubOrder,
      team: team as any,
      shift: shift as any,
      quantity: Number(quantity),
      workshop,
      heatNo,
      process: process as any,
      operatorId: currentUser?.id || 'unknown',
      timestamp: recordTimestamp
    });

    if (success) {
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 1500);
      setQuantity(0);
      if (selectedPlanId) {
        await updatePlan(selectedPlanId, { status: 'completed' });
        setSelectedPlanId('');
        setSelectedSubOrder('');
        // Keep order selected for continuous entry
      }
    } else {
        showToast('提交失败', 'error');
    }
  };

  return (
    <div className="h-[calc(100vh-64px)] bg-slate-50 flex flex-col overflow-hidden">
      {/* Top Bar */}
      <div className="bg-white border-b px-6 py-4 flex justify-between items-center shadow-sm z-10">
        <div className="flex items-center gap-4">
            <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                <Factory size={24} />
            </div>
            <div>
                <h1 className="text-xl font-bold text-slate-800">车间生产终端</h1>
                <div className="flex items-center gap-2 text-sm text-slate-500">
                    <span>{workshop}</span>
                    <span>•</span>
                    <span>{process === 'pulling' ? '拉管' : process === 'hydrostatic' ? '水压' : process === 'lining' ? '衬里' : '打包'}</span>
                </div>
            </div>
        </div>
        <div className="flex items-center gap-4">
            <div className="flex gap-2 bg-slate-100 p-1 rounded-lg">
                <div className="px-3 py-1 bg-white rounded shadow-sm text-sm font-medium text-slate-700">{team}</div>
                <div className="px-3 py-1 bg-white rounded shadow-sm text-sm font-medium text-slate-700">{shift}</div>
                <div className="px-3 py-1 bg-white rounded shadow-sm text-sm font-medium text-slate-700">{recordDate}</div>
            </div>
            <button 
                onClick={() => setShowSettings(true)}
                className="p-3 hover:bg-slate-100 rounded-xl transition-colors"
            >
                <Settings className="w-6 h-6 text-slate-600" />
            </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden relative">
        {/* Left: Task List */}
        <div className={clsx(
            "flex-col bg-white border-r transition-all duration-300 absolute inset-0 z-10 md:static md:w-1/3 md:flex",
            selectedPlanId ? "hidden md:flex" : "flex"
        )}>
            <div className="p-4 border-b bg-slate-50/50">
                <h3 className="font-bold text-slate-700 flex items-center gap-2">
                    <ListTodo size={18} />
                    待办任务 ({availablePlans.length})
                </h3>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {availablePlans.length === 0 ? (
                    <div className="text-center py-10 text-slate-400">
                        <p>暂无生产任务</p>
                    </div>
                ) : (
                    availablePlans.map((plan: ProductionPlan) => {
                        const order = orders.find((o: Order) => o.id === plan.orderId);
                        const item = order?.items.find((i: SubOrder) => i.id === plan.subOrderId);
                        if (!order || !item) return null;
                        
                        return (
                            <div 
                                key={plan.id}
                                onClick={() => handleSelectPlan(plan)}
                                className={clsx(
                                    "p-4 rounded-xl border-2 cursor-pointer transition-all",
                                    selectedPlanId === plan.id 
                                        ? "border-blue-500 bg-blue-50 ring-2 ring-blue-200" 
                                        : "border-slate-100 hover:border-blue-200 hover:bg-slate-50"
                                )}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <span className="font-bold text-slate-800">{order.orderNo}</span>
                                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-bold">
                                        x{plan.quantity}
                                    </span>
                                </div>
                                <div className="text-sm text-slate-600 space-y-1">
                                    <div className="flex justify-between">
                                        <span>规格: {item.spec}</span>
                                        <span>{item.level}</span>
                                    </div>
                                    <div className="text-xs text-slate-400">
                                        {plan.team} / {plan.shift}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>

        {/* Right: Operation Area */}
        <div className={clsx(
            "flex-1 bg-slate-50 flex-col absolute inset-0 z-20 md:static md:flex",
            selectedPlanId ? "flex" : "hidden"
        )}>
            {/* Mobile Back Button */}
            <div className="md:hidden bg-white border-b px-4 py-3 flex items-center gap-2">
                <button 
                    onClick={() => { setSelectedPlanId(''); setSelectedSubOrder(''); }}
                    className="p-2 -ml-2 hover:bg-slate-100 rounded-lg"
                >
                    <ArrowRight className="rotate-180 w-6 h-6 text-slate-600" />
                </button>
                <span className="font-bold text-slate-800">返回任务列表</span>
            </div>

            <div className="flex-1 bg-slate-50 p-4 md:p-6 flex flex-col overflow-y-auto">
            {/* Info Card */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 mb-6 flex-shrink-0">
                {selectedOrder && selectedSubOrder ? (
                    <div className="flex justify-between items-center">
                        <div>
                            <div className="text-sm text-slate-500 mb-1">当前生产</div>
                            <div className="text-2xl font-black text-slate-800 mb-1">{selectedOrder.orderNo}</div>
                            <div className="text-slate-600 font-medium">
                                {(() => {
                                    const item = selectedOrder.items.find(i => i.id === selectedSubOrder);
                                    return item ? `${item.spec} · ${item.level} · ${item.interfaceType} · ${item.length}` : '-';
                                })()}
                            </div>
                        </div>
                        <div className="text-right">
                             <div className="text-sm text-slate-500 mb-1">本次录入数量</div>
                             <div className="text-5xl font-black text-blue-600 font-mono tracking-tighter">
                                {quantity}
                             </div>
                        </div>
                    </div>
                ) : (
                    <div className="h-24 flex items-center justify-center text-slate-400 font-medium border-2 border-dashed border-slate-200 rounded-xl">
                        请从左侧选择任务或直接扫码
                    </div>
                )}
            </div>

            {/* Numpad Area */}
            <div className="flex-1 flex gap-6">
                <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
                     {/* NumPad Component */}
                     <div className="grid grid-cols-3 gap-3 h-full">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                            <button
                                key={num}
                                onClick={() => handleNumInput(num)}
                                className="bg-slate-50 border border-slate-200 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600 text-3xl font-bold text-slate-700 rounded-xl transition-all active:scale-95 flex items-center justify-center shadow-sm"
                            >
                                {num}
                            </button>
                        ))}
                        <button onClick={handleClear} className="bg-red-50 border border-red-100 text-red-500 text-xl font-bold rounded-xl hover:bg-red-100 active:scale-95 transition-all flex items-center justify-center">
                            清空
                        </button>
                        <button onClick={() => handleNumInput(0)} className="bg-slate-50 border border-slate-200 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600 text-3xl font-bold text-slate-700 rounded-xl transition-all active:scale-95 flex items-center justify-center shadow-sm">
                            0
                        </button>
                        <button onClick={handleBackspace} className="bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-600 text-xl font-bold rounded-xl active:scale-95 transition-all flex items-center justify-center">
                            ⌫
                        </button>
                    </div>
                </div>
                <div className="w-48 flex flex-col">
                    <button 
                        onClick={handleSubmit}
                        disabled={!selectedOrder || quantity <= 0}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-2xl font-bold rounded-2xl shadow-lg shadow-blue-200 transition-all active:scale-95 flex flex-col items-center justify-center gap-2"
                    >
                        <CheckCircle2 size={48} />
                        <span>提交</span>
                    </button>
                </div>
            </div>
        </div>
      </div>

      {/* Settings Modal (Simplified) */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
           <div className="bg-white rounded-2xl w-[500px] p-6 shadow-2xl">
               <div className="flex justify-between items-center mb-6">
                   <h3 className="text-xl font-bold">生产环境设置</h3>
                   <button onClick={() => setShowSettings(false)}><X /></button>
               </div>
               {/* ... Keep existing settings inputs but cleaner ... */}
               <div className="space-y-4">
                   <div>
                       <label className="block text-sm font-bold text-slate-700 mb-2">生产班组</label>
                       <div className="grid grid-cols-4 gap-2">
                           {['甲班', '乙班', '丙班', '丁班'].map(t => (
                               <button key={t} onClick={() => setTeam(t)} className={clsx("py-2 rounded border", team === t ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-600 border-slate-200")}>{t}</button>
                           ))}
                       </div>
                   </div>
                   <div>
                       <label className="block text-sm font-bold text-slate-700 mb-2">工序</label>
                       <div className="grid grid-cols-2 gap-2">
                           {['pulling', 'hydrostatic', 'lining', 'packaging'].map(p => (
                               <button key={p} onClick={() => setProcess(p)} className={clsx("py-2 rounded border", process === p ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-600 border-slate-200")}>{p === 'pulling' ? '拉管' : p}</button>
                           ))}
                       </div>
                   </div>
               </div>
               <button onClick={() => setShowSettings(false)} className="w-full mt-6 py-3 bg-blue-600 text-white rounded-xl font-bold">完成</button>
           </div>
        </div>
      )}

      {/* Success Overlay */}
      <AnimatePresence>
        {showSuccess && (
            <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
            >
                <motion.div 
                    initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }}
                    className="bg-white rounded-3xl p-10 flex flex-col items-center shadow-2xl"
                >
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center text-green-600 mb-4">
                        <CheckCircle2 size={48} />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800">提交成功</h2>
                </motion.div>
            </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// 2. Dispatcher View (Modern Management UI)
const DispatcherView = ({ orders, plans, addPlan, masterData }: any) => {
    const { showToast } = useToast();
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [selectedItem, setSelectedItem] = useState<SubOrder | null>(null);
    
    // Plan Form State
    const [planForm, setPlanForm] = useState({
        workshop: '一车间',
        team: '甲班',
        shift: '白班',
        quantity: 0,
        process: 'pulling' as ProductionProcess,
        date: new Date().toISOString().split('T')[0]
    });

    const pendingOrders = useMemo(() => {
        // Filter orders that are not fully completed
        return orders.filter((o: Order) => o.status !== 'production_completed');
    }, [orders]);

    const handleCreatePlan = async () => {
        if (!selectedOrder || !selectedItem || planForm.quantity <= 0) {
            showToast('请完善派工信息', 'error');
            return;
        }

        const success = await addPlan({
            orderId: selectedOrder.id,
            subOrderId: selectedItem.id,
            workshop: planForm.workshop,
            team: planForm.team,
            shift: planForm.shift,
            plannedDate: planForm.date,
            quantity: Number(planForm.quantity),
            process: planForm.process
        });

        if (success) {
            showToast('派工单下发成功', 'success');
            // Reset form but keep order selected
            setPlanForm(prev => ({ ...prev, quantity: 0 }));
        } else {
            showToast('下发失败', 'error');
        }
    };

    // Auto-fill quantity based on remaining
    useEffect(() => {
        if (selectedItem) {
            const remaining = Math.max(0, selectedItem.plannedQuantity - selectedItem.producedQuantity);
            setPlanForm(prev => ({ ...prev, quantity: remaining }));
        }
    }, [selectedItem]);

    return (
        <div className="min-h-screen bg-slate-50/50 p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">生产调度中心</h1>
                    <p className="text-slate-500 mt-1 md:mt-2 font-medium text-sm md:text-base">管理订单生产任务与车间派工</p>
                </div>
                <div className="flex gap-3 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
                     <div className="bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg text-blue-600"><ClipboardList size={18} /></div>
                        <div>
                            <div className="text-xs text-slate-500 font-bold uppercase">待排产订单</div>
                            <div className="font-bold text-slate-800">{pendingOrders.length}</div>
                        </div>
                     </div>
                     <div className="bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
                        <div className="p-2 bg-orange-100 rounded-lg text-orange-600"><ListTodo size={18} /></div>
                        <div>
                            <div className="text-xs text-slate-500 font-bold uppercase">今日任务</div>
                            <div className="font-bold text-slate-800">{plans.filter((p: any) => p.status === 'pending').length}</div>
                        </div>
                     </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 h-[calc(100vh-200px)] relative">
                {/* Left: Order Pool */}
                <div className={clsx(
                    "md:col-span-4 bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col absolute inset-0 z-10 md:static",
                    selectedOrder ? "hidden md:flex" : "flex"
                )}>
                    <div className="p-5 border-b border-slate-100 bg-slate-50/50">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input 
                                type="text" 
                                placeholder="搜索订单号..." 
                                className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all"
                            />
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {pendingOrders.map((order: Order) => (
                            <div 
                                key={order.id}
                                onClick={() => { setSelectedOrder(order); setSelectedItem(null); }}
                                className={clsx(
                                    "p-4 rounded-xl border-2 cursor-pointer transition-all group",
                                    selectedOrder?.id === order.id 
                                        ? "border-blue-600 bg-blue-50/50 ring-1 ring-blue-100" 
                                        : "border-slate-100 hover:border-blue-200 hover:bg-slate-50"
                                )}
                            >
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <div className="font-bold text-slate-800 text-lg group-hover:text-blue-700 transition-colors">
                                            {order.orderNo}
                                        </div>
                                        <div className="text-xs font-bold text-slate-400 mt-1 flex items-center gap-1">
                                            <Calendar size={12} />
                                            {order.deliveryDate || '未指定交期'}
                                        </div>
                                    </div>
                                    <span className={clsx(
                                        "px-2 py-1 rounded-lg text-xs font-bold",
                                        order.status === 'new' ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"
                                    )}>
                                        {order.status === 'new' ? '新建' : '生产中'}
                                    </span>
                                </div>
                                {/* Progress Mini-bar */}
                                <div className="space-y-2">
                                    {order.items.slice(0, 3).map(item => {
                                        const progress = item.plannedQuantity > 0 ? (item.producedQuantity / item.plannedQuantity) * 100 : 0;
                                        return (
                                            <div key={item.id} className="text-xs">
                                                <div className="flex justify-between text-slate-500 mb-1">
                                                    <span>{item.spec} {item.level}</span>
                                                    <span>{item.producedQuantity}/{item.plannedQuantity}</span>
                                                </div>
                                                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                                    <div 
                                                        className="h-full bg-blue-500 rounded-full" 
                                                        style={{ width: `${Math.min(100, progress)}%` }} 
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {order.items.length > 3 && (
                                        <div className="text-xs text-center text-slate-400 pt-1">
                                            +{order.items.length - 3} 更多规格
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Center: Detail & Dispatch */}
                <div className={clsx(
                    "md:col-span-8 flex flex-col gap-6 absolute inset-0 z-20 md:static bg-slate-50 md:bg-transparent",
                    selectedOrder ? "flex" : "hidden md:flex"
                )}>
                    {selectedOrder ? (
                        <>
                            {/* Mobile Back Button */}
                            <button 
                                onClick={() => setSelectedOrder(null)}
                                className="md:hidden mb-2 flex items-center gap-2 text-slate-600 font-bold bg-white p-3 rounded-xl border border-slate-200 shadow-sm"
                            >
                                <ArrowRight className="rotate-180 w-5 h-5" />
                                返回订单列表
                            </button>

                            {/* Order Items Selection */}
                            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 flex-1 overflow-hidden flex flex-col">
                                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                                    <Package className="text-blue-600" />
                                    订单明细
                                    <span className="text-sm font-normal text-slate-400 ml-2">选择规格进行派工</span>
                                </h3>
                                <div className="overflow-y-auto flex-1">
                                    <table className="w-full">
                                        <thead className="bg-slate-50 sticky top-0">
                                            <tr>
                                                <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">规格</th>
                                                <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">级别/接口</th>
                                                <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">进度</th>
                                                <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">状态</th>
                                                <th className="px-4 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">操作</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {selectedOrder.items.map(item => {
                                                const progress = item.plannedQuantity > 0 ? (item.producedQuantity / item.plannedQuantity) * 100 : 0;
                                                const isSelected = selectedItem?.id === item.id;
                                                return (
                                                    <tr 
                                                        key={item.id} 
                                                        className={clsx(
                                                            "hover:bg-slate-50 transition-colors cursor-pointer",
                                                            isSelected ? "bg-blue-50/50" : ""
                                                        )}
                                                        onClick={() => setSelectedItem(item)}
                                                    >
                                                        <td className="px-4 py-4 font-bold text-slate-700">{item.spec}</td>
                                                        <td className="px-4 py-4 text-slate-600">{item.level} / {item.interfaceType}</td>
                                                        <td className="px-4 py-4 w-48">
                                                            <div className="flex justify-between text-xs mb-1">
                                                                <span className="font-bold text-slate-700">{Math.round(progress)}%</span>
                                                                <span className="text-slate-500">{item.producedQuantity}/{item.plannedQuantity}</span>
                                                            </div>
                                                            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                                                <div 
                                                                    className={clsx("h-full rounded-full", progress >= 100 ? "bg-green-500" : "bg-blue-500")}
                                                                    style={{ width: `${Math.min(100, progress)}%` }} 
                                                                />
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-4">
                                                            {progress >= 100 ? (
                                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700">
                                                                    <CheckCircle2 size={12} /> 完成
                                                                </span>
                                                            ) : (
                                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-700">
                                                                    <Loader2 size={12} className="animate-spin" /> 生产中
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-4 text-right">
                                                            <button 
                                                                className={clsx(
                                                                    "px-3 py-1.5 rounded-lg text-sm font-bold transition-all",
                                                                    isSelected ? "bg-blue-600 text-white shadow-md shadow-blue-200" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                                                )}
                                                            >
                                                                派工
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Dispatch Form Panel */}
                            <AnimatePresence>
                                {selectedItem && (
                                    <motion.div 
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: 20 }}
                                        className="bg-white rounded-3xl border border-slate-200 shadow-xl p-6 border-l-4 border-l-blue-600"
                                    >
                                        <div className="flex justify-between items-start mb-6">
                                            <div>
                                                <h3 className="text-lg font-bold text-slate-800">新建派工单</h3>
                                                <p className="text-sm text-slate-500">
                                                    针对 {selectedOrder.orderNo} - {selectedItem.spec} {selectedItem.level}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-sm text-slate-400 font-bold uppercase">剩余可派</div>
                                                <div className="text-2xl font-black text-slate-800">
                                                    {Math.max(0, selectedItem.plannedQuantity - selectedItem.producedQuantity)}
                                                    <span className="text-sm font-normal text-slate-400 ml-1">支</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-6 gap-4 mb-6">
                                            <div className="col-span-2">
                                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">工序</label>
                                                <select 
                                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:border-blue-500 transition-all"
                                                    value={planForm.process}
                                                    onChange={e => setPlanForm({...planForm, process: e.target.value as any})}
                                                >
                                                    <option value="pulling">拉管工序</option>
                                                    <option value="hydrostatic">水压工序</option>
                                                    <option value="lining">内衬工序</option>
                                                    <option value="packaging">打包入库</option>
                                                </select>
                                            </div>
                                            <div className="col-span-2">
                                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">执行车间</label>
                                                <select 
                                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:border-blue-500 transition-all"
                                                    value={planForm.workshop}
                                                    onChange={e => setPlanForm({...planForm, workshop: e.target.value})}
                                                >
                                                    {(masterData?.workshops || ['一车间', '二车间', '三车间']).map((w: string) => (
                                                        <option key={w} value={w}>{w}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="col-span-2">
                                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">计划数量</label>
                                                <input 
                                                    type="number"
                                                    className="w-full p-3 bg-white border-2 border-blue-100 rounded-xl font-black text-blue-700 outline-none focus:border-blue-500 transition-all"
                                                    value={planForm.quantity}
                                                    onChange={e => setPlanForm({...planForm, quantity: Number(e.target.value)})}
                                                />
                                            </div>
                                            <div className="col-span-2">
                                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">指定班组</label>
                                                <select 
                                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:border-blue-500 transition-all"
                                                    value={planForm.team}
                                                    onChange={e => setPlanForm({...planForm, team: e.target.value})}
                                                >
                                                    <option value="甲班">甲班</option>
                                                    <option value="乙班">乙班</option>
                                                    <option value="丙班">丙班</option>
                                                    <option value="丁班">丁班</option>
                                                </select>
                                            </div>
                                            <div className="col-span-2">
                                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">指定班次</label>
                                                <select 
                                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:border-blue-500 transition-all"
                                                    value={planForm.shift}
                                                    onChange={e => setPlanForm({...planForm, shift: e.target.value})}
                                                >
                                                    <option value="白班">白班</option>
                                                    <option value="中班">中班</option>
                                                    <option value="夜班">夜班</option>
                                                </select>
                                            </div>
                                             <div className="col-span-2">
                                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">计划日期</label>
                                                <input 
                                                    type="date"
                                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:border-blue-500 transition-all"
                                                    value={planForm.date}
                                                    onChange={e => setPlanForm({...planForm, date: e.target.value})}
                                                />
                                            </div>
                                        </div>

                                        <div className="flex justify-end gap-3">
                                            <button 
                                                onClick={() => setSelectedItem(null)}
                                                className="px-6 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition-colors"
                                            >
                                                取消
                                            </button>
                                            <button 
                                                onClick={handleCreatePlan}
                                                className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-200 transition-all active:scale-95 flex items-center gap-2"
                                            >
                                                <ArrowRight size={20} />
                                                确认下发
                                            </button>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-400 bg-white rounded-3xl border border-dashed border-slate-200">
                            <ClipboardList size={64} className="mb-4 text-slate-200" />
                            <p className="text-lg font-medium">请从左侧选择一个订单开始派工</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// --- Main Container ---
export default function Production() {
    const { 
        orders: rawOrders, 
        addProductionRecord, 
        plans: rawPlans, 
        addPlan, 
        updatePlan, 
        masterData, 
        currentUser, 
        isLoading 
    } = useStore();

    // Defensive data handling
    const orders = Array.isArray(rawOrders) ? rawOrders : [];
    const plans = Array.isArray(rawPlans) ? rawPlans : [];

    // Mode Toggle (For Admins/Managers)
    const [viewMode, setViewMode] = useState<'dispatcher' | 'workshop'>('dispatcher');

    useEffect(() => {
        // Auto-detect mode based on role
        if (currentUser?.role === 'operator') {
            setViewMode('workshop');
        } else {
            setViewMode('dispatcher');
        }
    }, [currentUser]);

    if (isLoading && orders.length === 0) return <LoadingSpinner />;

    return (
        <div className="bg-slate-50 min-h-screen">
            {/* View Switcher for Admins */}
            {(currentUser?.role === 'admin' || currentUser?.role === 'production') && (
                <div className="fixed bottom-6 right-6 z-50 flex bg-white rounded-full shadow-2xl p-1 border border-slate-200">
                    <button 
                        onClick={() => setViewMode('dispatcher')}
                        className={clsx(
                            "px-4 py-2 rounded-full text-sm font-bold transition-all flex items-center gap-2",
                            viewMode === 'dispatcher' ? "bg-blue-600 text-white shadow-md" : "text-slate-500 hover:bg-slate-100"
                        )}
                    >
                        <ListTodo size={16} /> 调度中心
                    </button>
                    <button 
                        onClick={() => setViewMode('workshop')}
                        className={clsx(
                            "px-4 py-2 rounded-full text-sm font-bold transition-all flex items-center gap-2",
                            viewMode === 'workshop' ? "bg-blue-600 text-white shadow-md" : "text-slate-500 hover:bg-slate-100"
                        )}
                    >
                        <Factory size={16} /> 车间终端
                    </button>
                </div>
            )}

            {viewMode === 'workshop' ? (
                <WorkshopView 
                    currentUser={currentUser}
                    masterData={masterData}
                    orders={orders}
                    plans={plans}
                    addProductionRecord={addProductionRecord}
                    updatePlan={updatePlan}
                />
            ) : (
                <DispatcherView 
                    currentUser={currentUser}
                    masterData={masterData}
                    orders={orders}
                    plans={plans}
                    addPlan={addPlan}
                />
            )}
        </div>
    );
}
