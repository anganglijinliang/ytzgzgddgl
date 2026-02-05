import { useForm, useFieldArray } from 'react-hook-form';
import { Order } from '@/types';
import { useStore } from '@/store/useStore';
import { Plus, Trash2, Save, X, Loader2 } from 'lucide-react';
import { getStandardWeight } from '@/constants/standards';

interface OrderFormProps {
  initialData?: Order;
  onClose: () => void;
  onSubmit: (data: any) => void;
}

export default function OrderForm({ initialData, onClose, onSubmit }: OrderFormProps) {
  const { masterData, isLoading } = useStore();
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

  // Auto-complete helper
  const DatalistInput = ({ name, options, placeholder, required = false, onChange }: any) => (
    <>
      <input
        list={`list-${name}`}
        {...register(name, { 
          required: required && "此项必填",
          onChange: (e) => onChange && onChange(e.target.value)
        })}
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
        placeholder={placeholder}
      />
      <datalist id={`list-${name}`}>
        {options.map((opt: string) => (
          <option key={opt} value={opt} />
        ))}
      </datalist>
    </>
  );

  // Watch for weight calculations
  const handleSpecLevelChange = (index: number) => {
    // Delay slightly to let form update
    setTimeout(() => {
        const item = watch(`items.${index}`);
        if (item.spec && item.level) {
            const unitWeightKg = getStandardWeight(item.spec, item.level);
            if (unitWeightKg) {
                setValue(`items.${index}.unitWeight`, unitWeightKg / 1000); // Convert kg to tons
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl my-8 flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-gray-50 rounded-t-xl">
          <h2 className="text-xl font-bold text-gray-800">
            {initialData ? '编辑订单' : '新增订单'}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto p-6 space-y-8">
          {/* Main Order Info */}
          <section>
            <h3 className="text-lg font-semibold text-gray-700 mb-4 pb-2 border-b">基本信息</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">订单号 *</label>
                <input
                  {...register("orderNo", { required: "订单号必填" })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="请输入订单号"
                />
                {errors.orderNo && <span className="text-red-500 text-xs">{errors.orderNo.message as string}</span>}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">客户名称</label>
                <input
                  {...register("customerName")}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">交货日期</label>
                <input
                  type="date"
                  {...register("deliveryDate")}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">产线</label>
                <select
                  {...register("workshop")}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">请选择</option>
                  <option value="一车间">一车间</option>
                  <option value="二车间">二车间</option>
                  <option value="三车间">三车间</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">仓库</label>
                <DatalistInput name="warehouse" options={masterData.warehouses} placeholder="选择或输入仓库" />
              </div>
            </div>
             
             <div className="mt-4">
               <label className="block text-sm font-medium text-gray-700 mb-1">备注</label>
               <textarea
                 {...register("remarks")}
                 className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 h-20"
                 placeholder="订单备注信息..."
               />
             </div>
          </section>

          {/* Sub Orders (Items) */}
          <section>
            <div className="flex justify-between items-center mb-4 pb-2 border-b">
              <h3 className="text-lg font-semibold text-gray-700">订单明细 (子订单)</h3>
              <button
                type="button"
                onClick={() => append({ spec: '', level: '', interfaceType: '', lining: '', length: '', coating: '', plannedQuantity: 0 } as any)}
                className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 text-sm font-medium"
              >
                <Plus className="h-4 w-4" /> 添加明细
              </button>
            </div>

            <div className="space-y-4">
              {fields.map((field, index) => (
                <div key={field.id} className="p-4 bg-gray-50 rounded-lg border border-gray-200 relative group">
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    className="absolute top-2 right-2 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-9 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">规格</label>
                      <DatalistInput 
                        name={`items.${index}.spec`} 
                        options={masterData.specs} 
                        placeholder="规格" 
                        required 
                        onChange={() => handleSpecLevelChange(index)}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">级别</label>
                      <DatalistInput 
                        name={`items.${index}.level`} 
                        options={masterData.levels} 
                        placeholder="级别" 
                        onChange={() => handleSpecLevelChange(index)}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">接口</label>
                      <DatalistInput name={`items.${index}.interfaceType`} options={masterData.interfaces} placeholder="接口" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">内衬</label>
                      <DatalistInput name={`items.${index}.lining`} options={masterData.linings} placeholder="内衬" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">长度</label>
                      <DatalistInput name={`items.${index}.length`} options={masterData.lengths} placeholder="长度" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">防腐</label>
                      <DatalistInput name={`items.${index}.coating`} options={masterData.coatings} placeholder="防腐" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">计划支数 *</label>
                      <input
                        type="number"
                        {...register(`items.${index}.plannedQuantity`, { 
                          required: true, 
                          min: 1,
                          onChange: () => handleQuantityChange(index)
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">单重(吨)</label>
                      <input
                        type="number"
                        step="0.001"
                        {...register(`items.${index}.unitWeight`, {
                          onChange: () => handleQuantityChange(index)
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        placeholder="自动"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">总重(吨)</label>
                      <input
                        type="number"
                        step="0.001"
                        {...register(`items.${index}.totalWeight`)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600 text-sm"
                        placeholder="自动"
                        readOnly
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {fields.length === 0 && (
              <div className="text-center py-8 text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">
                暂无明细，请点击上方按钮添加
              </div>
            )}
          </section>
        </form>

        <div className="p-6 border-t border-gray-200 bg-gray-50 rounded-b-xl flex justify-end gap-4">
          <button
            onClick={onClose}
            className="px-6 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-100 transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSubmit(onSubmit)}
            disabled={isLoading}
            className="px-6 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} 
            {isLoading ? '保存中...' : '保存订单'}
          </button>
        </div>
      </div>
    </div>
  );
}
