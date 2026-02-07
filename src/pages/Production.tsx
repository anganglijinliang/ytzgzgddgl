import { useState, useEffect, useMemo } from 'react';
import { useStore } from '@/store/useStore';
import { Order, ProductionPlan, SubOrder, ProductionProcess } from '@/types';
import { 
  Search, CheckCircle2, ListTodo, Settings, X, Calendar, 
  Factory, ClipboardList, ArrowRight, Package, ShieldCheck
} from 'lucide-react';
import { Loader2 } from 'lucide-react';
import LoadingSpinner from '@/components/LoadingSpinner';
import EmptyState from '@/components/EmptyState';
import { useToast } from '@/context/ToastContext';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';

// --- Types & Interfaces ---

// --- Components ---

// 1. Workshop Mode (Touch Friendly) - Preserved & Polished
const WorkshopView = ({ 
  currentUser, orders, plans, addProductionRecord, updatePlan, masterData 
}: any) => {
  const { showToast } = useToast();
  
  // Constants for Localization
  const PROCESS_MAP: Record<string, string> = {
    pulling: '拉管工序',
    hydrostatic: '水压试验',
    lining: '内衬工序',
    coating: '外防工序',
    packaging: '打包入库'
  };

  const TEAMS = ['甲班', '乙班', '丙班', '丁班'];
  const SHIFTS = ['白班', '中班', '夜班'];

  // State
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedSubOrder, setSelectedSubOrder] = useState<string>('');
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');

  const [quantity, setQuantity] = useState<number>(0);
  const [team, setTeam] = useState<string>(localStorage.getItem('prod_team') || '甲班');
  const [shift, setShift] = useState<string>(localStorage.getItem('prod_shift') || '白班');
  const [workshop, setWorkshop] = useState<string>(localStorage.getItem('prod_workshop') || '一车间');
  const [recordDate, setRecordDate] = useState<string>(localStorage.getItem('prod_date') || new Date().toISOString().split('T')[0]);
  const [heatNo] = useState<string>('');
  const [process, setProcess] = useState<string>(localStorage.getItem('prod_process') || 'pulling');
  
  // Quality Params State
  const [pressure, setPressure] = useState<string>('');
  const [pressureTime, setPressureTime] = useState<string>('');
  const [zincWeight, setZincWeight] = useState<string>('');
  const [liningThickness, setLiningThickness] = useState<string>('');
  
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
    // Use the selected recordDate but keep current time
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
      timestamp: recordTimestamp,
      // Quality Params
      pressure: pressure ? Number(pressure) : undefined,
      pressureTime: pressureTime ? Number(pressureTime) : undefined,
      zincWeight: zincWeight ? Number(zincWeight) : undefined,
      liningThickness: liningThickness ? Number(liningThickness) : undefined,
    });

    if (success) {
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 1500);
      setQuantity(0);
      setPressure('');
      setPressureTime('');
      setZincWeight('');
      setLiningThickness('');
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
    <div className="h-full md:h-[calc(100vh-64px)] bg-slate-100 flex flex-col overflow-hidden font-sans relative">
      {/* Top Bar - Industrial Style */}
      <div className="bg-slate-900 text-white px-6 py-4 flex justify-between items-center shadow-md z-20 shrink-0">
        <div className="flex items-center gap-6">
            <div className="p-2.5 bg-blue-600 rounded-lg shadow-lg shadow-blue-900/50">
                <Factory size={28} className="text-white" />
            </div>
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-100">智能车间终端</h1>
                <div className="flex items-center gap-3 text-sm text-slate-400 mt-0.5">
                    <span className="font-medium text-slate-300">{workshop}</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                    <span className="text-blue-400 font-bold">{PROCESS_MAP[process] || process}</span>
                </div>
            </div>
        </div>
        
        <div className="flex items-center gap-4">
            {/* Status Indicators */}
            <div className="flex bg-slate-800 p-1.5 rounded-xl border border-slate-700/50">
                <div className="px-4 py-1.5 rounded-lg text-sm font-medium text-slate-300 border-r border-slate-700/50">
                  <span className="text-slate-500 mr-2">班组</span>
                  <span className="text-white">{team}</span>
                </div>
                <div className="px-4 py-1.5 rounded-lg text-sm font-medium text-slate-300 border-r border-slate-700/50">
                  <span className="text-slate-500 mr-2">班次</span>
                  <span className="text-white">{shift}</span>
                </div>
                <button 
                    onClick={() => setShowSettings(true)}
                    className="px-4 py-1.5 rounded-lg text-sm font-medium text-slate-300 flex items-center gap-2 hover:bg-slate-800 transition-colors cursor-pointer border-l border-slate-700/50"
                >
                   <Calendar size={14} className="text-slate-500" />
                   <span className="text-white font-mono">{recordDate}</span>
                </button>
            </div>

            <button 
                onClick={() => setShowSettings(true)}
                className="p-3 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition-all border border-slate-700/50 active:scale-95"
            >
                <Settings className="w-6 h-6" />
            </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden relative">
        {/* Left: Task List */}
        <div className={clsx(
            "flex-col bg-white border-r border-slate-200 transition-all duration-300 absolute inset-0 z-10 md:static md:w-96 md:flex shadow-[4px_0_24px_-12px_rgba(0,0,0,0.1)]",
            selectedPlanId ? "hidden md:flex" : "flex"
        )}>
            <div className="p-5 border-b border-slate-100 bg-slate-50/80 backdrop-blur">
                <h3 className="font-bold text-slate-700 flex items-center gap-2.5 text-lg">
                    <div className="p-1.5 bg-indigo-100 text-indigo-600 rounded-lg">
                        <ListTodo size={20} />
                    </div>
                    待办任务 <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full text-xs font-bold">{availablePlans.length}</span>
                </h3>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50">
                {availablePlans.length === 0 ? (
                    <EmptyState 
                        title="暂无生产任务" 
                        description="请等待调度下发" 
                        className="h-64"
                    />
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
                                    "relative p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 group",
                                    selectedPlanId === plan.id 
                                        ? "border-blue-600 bg-white shadow-lg shadow-blue-900/5 scale-[1.02] z-10" 
                                        : "border-white bg-white shadow-sm hover:border-blue-200 hover:shadow-md"
                                )}
                            >
                                <div className="flex justify-between items-start mb-3">
                                    <span className="font-black text-slate-800 text-lg tracking-tight">{order.orderNo}</span>
                                    <span className={clsx(
                                        "px-2.5 py-1 rounded-lg text-xs font-bold font-mono",
                                        selectedPlanId === plan.id ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"
                                    )}>
                                        x{plan.quantity}
                                    </span>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                                        <span className="px-1.5 py-0.5 bg-slate-100 rounded text-xs text-slate-500">规格</span>
                                        {item.spec}
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-slate-500">
                                        <span className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-500">{item.level}</span>
                                        <span>•</span>
                                        <span>{plan.team}</span>
                                        <span>•</span>
                                        <span>{plan.shift}</span>
                                    </div>
                                </div>
                                {selectedPlanId === plan.id && (
                                    <div className="absolute left-0 top-4 bottom-4 w-1 bg-blue-600 rounded-r-full" />
                                )}
                            </div>
                        );
                    })
                )}
            </div>
        </div>

        {/* Right: Operation Area */}
        <div className={clsx(
            "flex-1 bg-slate-100 flex-col absolute inset-0 z-20 md:static md:flex",
            selectedPlanId ? "flex" : "hidden"
        )}>
            {/* Mobile Back Button */}
            <div className="md:hidden bg-white border-b px-4 py-3 flex items-center gap-2 shadow-sm">
                <button 
                    onClick={() => { setSelectedPlanId(''); setSelectedSubOrder(''); }}
                    className="p-2 -ml-2 hover:bg-slate-100 rounded-lg active:bg-slate-200"
                >
                    <ArrowRight className="rotate-180 w-6 h-6 text-slate-600" />
                </button>
                <span className="font-bold text-slate-800">返回任务列表</span>
            </div>

            <div className="flex-1 p-4 md:p-8 pb-32 md:pb-8 flex flex-col overflow-y-auto max-w-5xl mx-auto w-full">
            {/* Info Card - Industrial Design */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-6 flex-shrink-0">
                {selectedOrder && selectedSubOrder ? (
                    <div className="flex flex-col md:flex-row">
                        <div className="flex-1 p-6 md:p-8 border-b md:border-b-0 md:border-r border-slate-100">
                            <div className="flex items-center gap-3 mb-2">
                                <span className="px-2.5 py-1 bg-blue-600 text-white text-xs font-bold rounded-md uppercase tracking-wider">生产中</span>
                                <span className="text-slate-400 text-sm font-medium">订单编号</span>
                            </div>
                            <div className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight mb-4">{selectedOrder.orderNo}</div>
                            <div className="grid grid-cols-2 gap-4">
                                {(() => {
                                    const item = selectedOrder.items.find(i => i.id === selectedSubOrder);
                                    if (!item) return null;
                                    return (
                                        <>
                                            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                                <div className="text-xs text-slate-500 mb-1">规格型号</div>
                                                <div className="font-bold text-slate-700">{item.spec}</div>
                                            </div>
                                            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                                <div className="text-xs text-slate-500 mb-1">等级/长度</div>
                                                <div className="font-bold text-slate-700">{item.level} / {item.length}</div>
                                            </div>
                                        </>
                                    );
                                })()}
                            </div>
                        </div>
                        <div className="md:w-72 p-6 md:p-8 bg-slate-50/50 flex flex-col justify-center items-center md:items-end border-l border-slate-100">
                             <div className="text-sm font-bold text-slate-500 mb-2 uppercase tracking-wide">本次录入数量</div>
                             <div className={clsx(
                                 "text-7xl font-black font-mono tracking-tighter transition-all",
                                 quantity > 0 ? "text-blue-600" : "text-slate-300"
                             )}>
                                {quantity}
                             </div>
                        </div>
                    </div>
                ) : (
                    <div className="h-48 flex flex-col items-center justify-center text-slate-400 font-medium bg-slate-50/50">
                        <div className="p-4 bg-white rounded-full shadow-sm mb-3">
                            <ClipboardList size={32} className="text-slate-300" />
                        </div>
                        <p>请从左侧选择任务开始生产</p>
                    </div>
                )}
            </div>

            {/* Quality Parameter Inputs */}
            {selectedOrder && selectedSubOrder && (process === 'hydrostatic' || process === 'coating' || process === 'lining') && (
              <div className="grid grid-cols-2 gap-4 mb-6">
                 <div className="col-span-2 text-sm font-bold text-slate-500 uppercase tracking-wide mb-1 flex items-center gap-2">
                   <ShieldCheck size={16} />
                   质量参数 (Quality Data)
                 </div>
                 
                 {process === 'hydrostatic' && (
                   <>
                     <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col relative group focus-within:ring-2 ring-blue-500 ring-offset-2 transition-all">
                        <label className="text-xs text-slate-400 font-bold uppercase mb-1">稳压压力 (MPa)</label>
                        <input 
                          type="number" 
                          value={pressure}
                          onChange={e => setPressure(e.target.value)}
                          placeholder="0.0"
                          className="text-2xl font-bold text-slate-800 outline-none w-full bg-transparent placeholder:text-slate-200"
                        />
                     </div>
                     <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col relative group focus-within:ring-2 ring-blue-500 ring-offset-2 transition-all">
                        <label className="text-xs text-slate-400 font-bold uppercase mb-1">稳压时间 (s)</label>
                        <input 
                          type="number" 
                          value={pressureTime}
                          onChange={e => setPressureTime(e.target.value)}
                          placeholder="0"
                          className="text-2xl font-bold text-slate-800 outline-none w-full bg-transparent placeholder:text-slate-200"
                        />
                     </div>
                   </>
                 )}

                 {process === 'coating' && (
                    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col relative group focus-within:ring-2 ring-blue-500 ring-offset-2 transition-all">
                        <label className="text-xs text-slate-400 font-bold uppercase mb-1">锌层重量 (g/m²)</label>
                        <input 
                          type="number" 
                          value={zincWeight}
                          onChange={e => setZincWeight(e.target.value)}
                          placeholder="0.0"
                          className="text-2xl font-bold text-slate-800 outline-none w-full bg-transparent placeholder:text-slate-200"
                        />
                     </div>
                 )}

                 {process === 'lining' && (
                    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col relative group focus-within:ring-2 ring-blue-500 ring-offset-2 transition-all">
                        <label className="text-xs text-slate-400 font-bold uppercase mb-1">内衬厚度 (mm)</label>
                        <input 
                          type="number" 
                          value={liningThickness}
                          onChange={e => setLiningThickness(e.target.value)}
                          placeholder="0.0"
                          className="text-2xl font-bold text-slate-800 outline-none w-full bg-transparent placeholder:text-slate-200"
                        />
                     </div>
                 )}
              </div>
            )}

            {/* Numpad Area */}
            <div className="flex-1 flex flex-col md:flex-row gap-4 md:gap-8 min-h-[350px] md:min-h-[400px]">
                <div className="flex-1 bg-white rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-200 p-4 md:p-6 order-1 md:order-1">
                     {/* Modern NumPad */}
                     <div className="grid grid-cols-3 gap-3 md:gap-4 h-full">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                            <button
                                key={num}
                                onClick={() => handleNumInput(num)}
                                className="bg-white border-b-4 border-slate-200 hover:border-blue-600 hover:bg-blue-50 hover:text-blue-600 active:border-b-0 active:translate-y-1 text-2xl md:text-4xl font-bold text-slate-700 rounded-2xl transition-all flex items-center justify-center"
                            >
                                {num}
                            </button>
                        ))}
                        <button 
                            onClick={handleClear} 
                            className="bg-red-50 border-b-4 border-red-100 text-red-500 text-lg md:text-xl font-bold rounded-2xl hover:bg-red-100 hover:border-red-200 active:border-b-0 active:translate-y-1 transition-all flex items-center justify-center"
                        >
                            清空
                        </button>
                        <button 
                            onClick={() => handleNumInput(0)} 
                            className="bg-white border-b-4 border-slate-200 hover:border-blue-600 hover:bg-blue-50 hover:text-blue-600 active:border-b-0 active:translate-y-1 text-2xl md:text-4xl font-bold text-slate-700 rounded-2xl transition-all flex items-center justify-center"
                        >
                            0
                        </button>
                        <button 
                            onClick={handleBackspace} 
                            className="bg-slate-100 border-b-4 border-slate-200 hover:bg-slate-200 text-slate-600 text-lg md:text-xl font-bold rounded-2xl active:border-b-0 active:translate-y-1 transition-all flex items-center justify-center"
                        >
                            ⌫
                        </button>
                    </div>
                </div>
                <div className="flex w-full md:w-64 h-24 md:h-auto flex-shrink-0 flex-col order-2 md:order-2">
                    <button 
                        onClick={handleSubmit}
                        disabled={!selectedOrder || quantity <= 0}
                        className="h-full w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-xl md:text-2xl font-bold rounded-2xl shadow-xl shadow-blue-200 border-b-8 border-blue-800 hover:border-blue-700 active:border-b-0 active:translate-y-2 transition-all flex flex-row md:flex-col items-center justify-center gap-4 group"
                    >
                        <div className="p-2 md:p-3 bg-blue-500 rounded-full group-hover:scale-110 transition-transform">
                            <CheckCircle2 size={32} className="md:w-12 md:h-12" />
                        </div>
                        <span>确认提交</span>
                    </button>
                </div>
            </div>
        </div>
      </div>
      </div>

      {/* Settings Modal (Enhanced) */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
           <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
               <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                   <h3 className="text-xl font-bold text-slate-800">终端设置</h3>
                   <button onClick={() => setShowSettings(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X className="text-slate-500" /></button>
               </div>
               
               <div className="p-8 space-y-8">
                   {/* Date Setting */}
                   <div>
                       <label className="block text-sm font-bold text-slate-500 mb-3 uppercase tracking-wider">生产日期</label>
                       <div className="relative">
                           <input 
                               type="date" 
                               value={recordDate}
                               onChange={(e) => setRecordDate(e.target.value)}
                               className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-200 rounded-xl text-lg font-bold text-slate-800 focus:outline-none focus:border-blue-500 transition-colors"
                           />
                           <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                       </div>
                   </div>

                   {/* Workshop Setting */}
                   <div>
                       <label className="block text-sm font-bold text-slate-500 mb-3 uppercase tracking-wider">所属车间</label>
                       <div className="grid grid-cols-2 gap-3">
                           {(masterData?.workshops || ['一车间', '二车间', '三车间']).map((ws: string) => (
                               <button 
                                   key={ws} 
                                   onClick={() => setWorkshop(ws)} 
                                   className={clsx(
                                       "py-3 rounded-xl border-2 font-bold transition-all", 
                                       workshop === ws 
                                        ? "bg-purple-600 text-white border-purple-600 shadow-lg shadow-purple-200" 
                                        : "bg-white text-slate-600 border-slate-200 hover:border-purple-300"
                                   )}
                               >
                                   {ws}
                               </button>
                           ))}
                       </div>
                   </div>

                   {/* Team Setting */}
                   <div>
                       <label className="block text-sm font-bold text-slate-500 mb-3 uppercase tracking-wider">生产班组</label>
                       <div className="grid grid-cols-4 gap-3">
                           {TEAMS.map(t => (
                               <button 
                                   key={t} 
                                   onClick={() => setTeam(t)} 
                                   className={clsx(
                                       "py-3 rounded-xl border-2 font-bold transition-all", 
                                       team === t 
                                        ? "bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-200" 
                                        : "bg-white text-slate-600 border-slate-200 hover:border-blue-300"
                                   )}
                               >
                                   {t}
                               </button>
                           ))}
                       </div>
                   </div>
                   
                   {/* Shift Setting */}
                    <div>
                       <label className="block text-sm font-bold text-slate-500 mb-3 uppercase tracking-wider">班次</label>
                       <div className="grid grid-cols-3 gap-3">
                           {SHIFTS.map(s => (
                               <button 
                                   key={s} 
                                   onClick={() => setShift(s)} 
                                   className={clsx(
                                       "py-3 rounded-xl border-2 font-bold transition-all", 
                                       shift === s 
                                        ? "bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-200" 
                                        : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300"
                                   )}
                               >
                                   {s}
                               </button>
                           ))}
                       </div>
                   </div>

                   {/* Process Setting */}
                   <div>
                       <label className="block text-sm font-bold text-slate-500 mb-3 uppercase tracking-wider">当前工序</label>
                       <div className="grid grid-cols-2 gap-3">
                           {Object.entries(PROCESS_MAP).map(([key, label]) => (
                               <button 
                                   key={key} 
                                   onClick={() => setProcess(key)} 
                                   className={clsx(
                                       "py-4 px-4 rounded-xl border-2 font-bold transition-all flex items-center justify-center gap-2", 
                                       process === key 
                                        ? "bg-slate-800 text-white border-slate-800 shadow-lg" 
                                        : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"
                                   )}
                               >
                                   {label}
                               </button>
                           ))}
                       </div>
                   </div>
               </div>
               
               <div className="p-6 border-t border-slate-100 bg-slate-50">
                   <button onClick={() => setShowSettings(false)} className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-lg shadow-xl shadow-blue-200 transition-all active:scale-95">
                       保存设置
                   </button>
               </div>
           </div>
        </div>
      )}

      {/* Mobile Fixed Submit Button */}
       {selectedPlanId && (
       <div className="md:hidden fixed bottom-[80px] left-0 right-0 p-4 bg-white/90 backdrop-blur-sm border-t border-slate-200 z-30 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
           <button 
               onClick={handleSubmit}
               disabled={!selectedOrder || quantity <= 0}
               className="w-full h-14 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-xl font-bold rounded-full shadow-lg shadow-blue-200 flex items-center justify-center gap-3 active:scale-95 transition-transform"
           >
               <CheckCircle2 size={24} />
               <span>确认提交 ({quantity})</span>
           </button>
       </div>
       )}

      {/* Success Overlay */}
      <AnimatePresence>
        {showSuccess && (
            <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm"
            >
                <motion.div 
                    initial={{ scale: 0.8, opacity: 0, y: 20 }} 
                    animate={{ scale: 1, opacity: 1, y: 0 }} 
                    exit={{ scale: 0.8, opacity: 0, y: 20 }}
                    className="bg-white rounded-2xl p-12 flex flex-col items-center shadow-2xl max-w-sm w-full mx-4"
                >
                    <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center text-green-600 mb-6 shadow-inner">
                        <CheckCircle2 size={56} strokeWidth={3} />
                    </div>
                    <h2 className="text-3xl font-black text-slate-800 mb-2">提交成功</h2>
                    <p className="text-slate-500 font-medium">数据已同步至服务器</p>
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
                    "md:col-span-4 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col absolute inset-0 z-10 md:static",
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
                        {pendingOrders.length === 0 ? (
                            <EmptyState 
                                title="暂无待排产订单" 
                                description="当前没有处于待排产状态的订单" 
                                className="h-48"
                            />
                        ) : (
                            pendingOrders.map((order: Order) => (
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
                        )))}
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
                            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex-1 overflow-hidden flex flex-col">
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
                                        className="bg-white rounded-2xl border border-slate-200 shadow-xl p-6 border-l-4 border-l-blue-600"
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
                                            <div className="col-span-6 md:col-span-2">
                                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">工序</label>
                                                <select 
                                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:border-blue-500 transition-all"
                                                    value={planForm.process}
                                                    onChange={e => setPlanForm({...planForm, process: e.target.value as any})}
                                                >
                                                    <option value="pulling">拉管工序</option>
                                                    <option value="hydrostatic">水压工序</option>
                                                    <option value="lining">内衬工序</option>
                                                    <option value="coating">外防工序</option>
                                                    <option value="packaging">打包入库</option>
                                                </select>
                                            </div>
                                            <div className="col-span-6 md:col-span-2">
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
                                            <div className="col-span-6 md:col-span-2">
                                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">计划数量</label>
                                                <input 
                                                    type="number"
                                                    className="w-full p-3 bg-white border-2 border-blue-100 rounded-xl font-black text-blue-700 outline-none focus:border-blue-500 transition-all"
                                                    value={planForm.quantity}
                                                    onChange={e => setPlanForm({...planForm, quantity: Number(e.target.value)})}
                                                />
                                            </div>
                                            <div className="col-span-6 md:col-span-2">
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
                                            <div className="col-span-6 md:col-span-2">
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
                                             <div className="col-span-6 md:col-span-2">
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
                        <div className="flex-1 flex items-center justify-center bg-white rounded-2xl border border-dashed border-slate-200">
                            <EmptyState 
                                title="准备开始派工" 
                                description="请从左侧列表选择一个订单，查看明细并创建生产计划"
                                icon={ClipboardList}
                            />
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
                <div className="fixed bottom-32 md:bottom-6 right-6 z-50 flex bg-white rounded-full shadow-2xl p-1 border border-slate-200">
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
