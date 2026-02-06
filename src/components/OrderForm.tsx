import React from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { Order } from '@/types';
import { useStore } from '@/store/useStore';
import { Plus, Trash2, X, Loader2, ChevronDown, Package, Calendar, User, FileText, Factory, Warehouse } from 'lucide-react';
import { getStandardWeight } from '@/constants/standards';
import clsx from 'clsx';

interface OrderFormProps {
  initialData?: Order;
  onClose: () => void;
  onSubmit: (data: any) => void;
}

export default function OrderForm({ initialData, onClose, onSubmit }: OrderFormProps) {
  const { masterData, orders, isLoading, removeMasterData } = useStore();
  
  // Combine master data with used values for smart suggestions
  const usedWorkshops = React.useMemo(() => {
    const s = new Set(masterData.workshops || ['一车间', '二车间', '三车间']);
    orders.forEach(o => { if (o.workshop) s.add(o.workshop); });
    return Array.from(s);
  }, [masterData.workshops, orders]);

  const { register, control, handleSubmit, setValue, watch, formState: { errors } } = useForm({
    defaultValues: initialData || {
      orderNo: '',
      customerName: '',
      deliveryDate: '',
      workshop: '',
      warehouse: '',
      remarks: '',
      items: [
        { spec: '', level: '', interfaceType: '', lining: '', length: '', coating: '', plannedQuantity: 0 }
      ]
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "items"
  });

  // Smart Combobox with Delete support
  const SmartCombobox = ({ name, options, placeholder, required = false, onChange, onDelete, icon: Icon }: any) => {
    const [isOpen, setIsOpen] = React.useState(false);
    const [filter, setFilter] = React.useState('');
    const wrapperRef = React.useRef<HTMLDivElement>(null);
    
    // Close when clicking outside
    React.useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
          setIsOpen(false);
        }
      };
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const filteredOptions = options.filter((opt: string) => 
      !filter || opt.toLowerCase().includes(filter.toLowerCase())
    );

    return (
      <div className="relative group" ref={wrapperRef}>
        <div className="relative">
          {Icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none group-focus-within:text-blue-500 transition-colors">
              <Icon className="h-4 w-4" />
            </div>
          )}
          <input
            {...register(name, { 
              required: required && "此项必填",
              onChange: (e) => {
                const val = e.target.value;
                setFilter(val);
                if (onChange) onChange(val);
                setIsOpen(true);
              }
            })}
            onFocus={() => setIsOpen(true)}
            onClick={() => setIsOpen(true)}
            className={clsx(
              "w-full py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition-all bg-slate-50 focus:bg-white",
              Icon ? "pl-9 pr-9" : "pl-3 pr-9"
            )}
            placeholder={placeholder}
            autoComplete="off"
          />
          <div 
            className="absolute inset-y-0 right-0 flex items-center px-3 cursor-pointer text-slate-400 hover:text-slate-600"
            onClick={(e) => {
              e.preventDefault();
              setIsOpen(!isOpen);
            }}
          >
            <ChevronDown className={clsx("h-4 w-4 transition-transform duration-200", isOpen && "rotate-180")} />
          </div>
        </div>

        {isOpen && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-slate-100 rounded-xl shadow-xl shadow-slate-200/50 max-h-60 overflow-auto animate-in fade-in zoom-in-95 duration-100">
            {filteredOptions.length === 0 && filter && (
              <div className="px-4 py-3 text-sm text-slate-500 cursor-default bg-slate-50">
                将创建新选项: <span className="font-medium text-blue-600">"{filter}"</span>
              </div>
            )}
            {filteredOptions.map((opt: string) => (
              <div 
                key={opt} 
                className="flex items-center justify-between px-4 py-2.5 text-sm hover:bg-blue-50 cursor-pointer group/item transition-colors"
                onClick={() => {
                  setValue(name, opt, { shouldValidate: true, shouldDirty: true });
                  setFilter(''); 
                  setIsOpen(false);
                  if (onChange) onChange(opt);
                }}
              >
                <span className="text-slate-700 group-hover/item:text-blue-700">{opt}</span>
                {onDelete && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(opt);
                    }}
                    className="p-1.5 text-slate-300 hover:text-red-500 rounded-lg hover:bg-red-50 opacity-0 group-hover/item:opacity-100 transition-all"
                    title="从列表中删除"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // Watch for weight calculations
  const handleSpecLevelChange = (index: number) => {
    setTimeout(() => {
        const item = watch(`items.${index}`);
        if (item.spec && item.level) {
            const unitWeightKg = getStandardWeight(item.spec, item.level);
            if (unitWeightKg) {
                setValue(`items.${index}.unitWeight`, unitWeightKg / 1000); 
                if (item.plannedQuantity) {
                    setValue(`items.${index}.totalWeight`, (unitWeightKg * item.plannedQuantity) / 1000);
                }
            }
        }
    }, 100);
  };

  const handleQuantityChange = (index: number) => {
     setTimeout(() => {
        const item = watch(`items.${index}`);
        if (item.unitWeight && item.plannedQuantity) {
             setValue(`items.${index}.totalWeight`, item.unitWeight * item.plannedQuantity);
        }
     }, 100);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-0 sm:p-6 overflow-y-auto transition-all duration-300">
      <div className="bg-white rounded-none sm:rounded-2xl shadow-2xl w-full max-w-6xl flex flex-col h-full sm:h-auto sm:max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-4 py-3 sm:px-8 sm:py-6 border-b border-slate-100 flex justify-between items-center bg-white rounded-none sm:rounded-t-2xl sticky top-0 z-10 safe-area-top">
          <div>
            <h2 className="text-lg sm:text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-3">
              {initialData ? (
                <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                   <FileText className="h-5 w-5 sm:h-6 sm:w-6" />
                </div>
              ) : (
                <div className="p-2 bg-green-100 text-green-600 rounded-lg">
                   <Plus className="h-5 w-5 sm:h-6 sm:w-6" />
                </div>
              )}
              {initialData ? '编辑订单' : '创建新订单'}
            </h2>
            <p className="text-slate-500 text-xs sm:text-sm mt-1 ml-12 sm:ml-14">
              {initialData ? `订单号: ${initialData.orderNo}` : '填写下方的表单以创建新的生产订单'}
            </p>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-50/50">
          <div className="space-y-6 sm:space-y-8 max-w-6xl mx-auto pb-20 sm:pb-0">
            
            {/* Section: Basic Info */}
            <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-100">
              <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                <span className="w-1 h-6 bg-blue-500 rounded-full"></span>
                基本信息
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">订单号 <span className="text-red-500">*</span></label>
                  <div className="relative group">
                    <FileText className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors h-4 w-4" />
                    <input
                      {...register("orderNo", { required: "订单号必填" })}
                      className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm bg-slate-50 focus:bg-white transition-all"
                      placeholder="请输入订单号"
                    />
                  </div>
                  {errors.orderNo && <span className="text-red-500 text-xs mt-1 block pl-1">{errors.orderNo.message as string}</span>}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">客户名称</label>
                  <div className="relative group">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors h-4 w-4" />
                    <input
                      {...register("customerName")}
                      className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm bg-slate-50 focus:bg-white transition-all"
                      placeholder="客户名称"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">交货日期</label>
                  <div className="relative group">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors h-4 w-4" />
                    <input
                      type="date"
                      {...register("deliveryDate")}
                      className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm bg-slate-50 focus:bg-white transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">产线</label>
                  <SmartCombobox 
                    name="workshop" 
                    options={usedWorkshops} 
                    placeholder="选择或输入产线"
                    icon={Factory}
                    onDelete={(val: string) => removeMasterData('workshops', val)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">仓库</label>
                  <SmartCombobox 
                    name="warehouse" 
                    options={masterData.warehouses} 
                    placeholder="选择或输入仓库" 
                    icon={Warehouse}
                    onDelete={(val: string) => removeMasterData('warehouses', val)}
                  />
                </div>
              </div>
               
               <div className="mt-6">
                 <label className="block text-sm font-medium text-slate-700 mb-2">订单备注</label>
                 <textarea
                   {...register("remarks")}
                   className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm bg-slate-50 focus:bg-white transition-all min-h-[80px]"
                   placeholder="填写订单相关的特殊要求或备注信息..."
                 />
               </div>
            </div>

            {/* Section: Sub Orders (Items) */}
            <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-100">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <span className="w-1 h-6 bg-green-500 rounded-full"></span>
                  订单明细
                  <span className="text-xs font-normal text-slate-400 ml-2 bg-slate-100 px-2 py-0.5 rounded-full">共 {fields.length} 条</span>
                </h3>
                <button
                  type="button"
                  onClick={() => append({ spec: '', level: '', interfaceType: '', lining: '', length: '', coating: '', plannedQuantity: 0 } as any)}
                  className="flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 bg-green-50 text-green-600 hover:bg-green-100 hover:text-green-700 rounded-xl text-xs sm:text-sm font-medium transition-all active:scale-95 border border-green-200"
                >
                  <Plus className="h-4 w-4" /> <span className="hidden sm:inline">添加明细</span><span className="sm:hidden">添加</span>
                </button>
              </div>

              <div className="space-y-3">
                {fields.length > 0 && (
                   <div className="hidden lg:grid grid-cols-[1fr_1fr_1fr_1fr_1fr_1fr_1.2fr_1fr_1fr_40px] gap-4 px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      <div>规格</div>
                      <div>级别</div>
                      <div>接口</div>
                      <div>内衬</div>
                      <div>长度</div>
                      <div>防腐</div>
                      <div>计划支数</div>
                      <div>单重(吨)</div>
                      <div>总重(吨)</div>
                      <div></div>
                   </div>
                )}

                {fields.map((field, index) => (
                  <div key={field.id} className="relative bg-white rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all duration-200 group p-3 sm:p-4 lg:p-0">
                    <div className="lg:grid lg:grid-cols-[1fr_1fr_1fr_1fr_1fr_1fr_1.2fr_1fr_1fr_40px] gap-3 items-start lg:items-center lg:px-4 lg:py-3 space-y-3 lg:space-y-0">
                      
                      {/* Mobile Labels are handled via grid/flex layout in mobile view */}
                      <div className="grid grid-cols-2 gap-3 lg:contents">
                        <div className="lg:contents">
                            <label className="lg:hidden text-xs text-slate-500 mb-1 block">规格</label>
                            <SmartCombobox 
                                name={`items.${index}.spec`} 
                                options={masterData.specs} 
                                placeholder="规格" 
                                required 
                                onChange={() => handleSpecLevelChange(index)}
                            />
                        </div>
                        <div className="lg:contents">
                            <label className="lg:hidden text-xs text-slate-500 mb-1 block">级别</label>
                            <SmartCombobox 
                                name={`items.${index}.level`} 
                                options={masterData.levels} 
                                placeholder="级别" 
                                onChange={() => handleSpecLevelChange(index)}
                            />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 lg:contents">
                        <div className="lg:contents">
                            <label className="lg:hidden text-xs text-slate-500 mb-1 block">接口</label>
                            <SmartCombobox name={`items.${index}.interfaceType`} options={masterData.interfaces} placeholder="接口" />
                        </div>
                        <div className="lg:contents">
                            <label className="lg:hidden text-xs text-slate-500 mb-1 block">内衬</label>
                            <SmartCombobox name={`items.${index}.lining`} options={masterData.linings} placeholder="内衬" />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 lg:contents">
                         <div className="lg:contents">
                            <label className="lg:hidden text-xs text-slate-500 mb-1 block">长度</label>
                            <SmartCombobox name={`items.${index}.length`} options={masterData.lengths} placeholder="长度" />
                        </div>
                        <div className="lg:contents">
                            <label className="lg:hidden text-xs text-slate-500 mb-1 block">防腐</label>
                            <SmartCombobox name={`items.${index}.coating`} options={masterData.coatings} placeholder="防腐" />
                        </div>
                      </div>

                      <div className="lg:contents">
                         <label className="lg:hidden text-xs text-slate-500 mb-1 block">计划支数</label>
                         <input
                            type="number"
                            {...register(`items.${index}.plannedQuantity`, { 
                            required: true, 
                            min: 1,
                            onChange: () => handleQuantityChange(index)
                            })}
                            className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm font-medium text-slate-700 bg-white"
                            placeholder="0"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3 lg:contents">
                         <div className="lg:contents">
                            <label className="lg:hidden text-xs text-slate-500 mb-1 block">单重</label>
                            <input
                                type="number"
                                step="0.001"
                                {...register(`items.${index}.unitWeight`, {
                                onChange: () => handleQuantityChange(index)
                                })}
                                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm text-slate-500 bg-slate-50"
                                placeholder="自动"
                            />
                        </div>
                        <div className="lg:contents">
                            <label className="lg:hidden text-xs text-slate-500 mb-1 block">总重</label>
                            <input
                                type="number"
                                step="0.001"
                                {...register(`items.${index}.totalWeight`)}
                                className="w-full px-3 py-2.5 border border-transparent rounded-xl bg-slate-100 text-slate-500 text-sm font-medium cursor-not-allowed"
                                placeholder="自动"
                                readOnly
                            />
                        </div>
                      </div>

                      <div className="absolute top-2 right-2 lg:static flex items-center justify-center">
                        <button
                            type="button"
                            onClick={() => remove(index)}
                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all lg:opacity-0 lg:group-hover:opacity-100"
                        >
                            <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {fields.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                  <Package className="h-12 w-12 text-slate-300 mb-3" />
                  <p className="font-medium">暂无订单明细</p>
                  <button
                    type="button"
                    onClick={() => append({ spec: '', level: '', interfaceType: '', lining: '', length: '', coating: '', plannedQuantity: 0 } as any)}
                    className="mt-4 text-blue-600 hover:text-blue-700 font-medium text-sm flex items-center gap-1 hover:underline"
                  >
                    <Plus className="h-4 w-4" /> 点击添加第一条明细
                  </button>
                </div>
              )}
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="px-8 py-5 border-t border-slate-100 bg-white rounded-b-2xl flex justify-end gap-4 sticky bottom-0 z-10">
          <button
            onClick={onClose}
            className="px-6 py-2.5 border border-slate-200 text-slate-600 font-medium rounded-xl hover:bg-slate-50 hover:text-slate-800 transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSubmit(onSubmit)}
            disabled={isLoading}
            className="px-8 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 font-medium shadow-lg shadow-blue-600/20 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
          >
            {isLoading && <Loader2 className="h-5 w-5 animate-spin" />}
            {isLoading ? '正在保存...' : '保存订单'}
          </button>
        </div>
      </div>
    </div>
  );
}
