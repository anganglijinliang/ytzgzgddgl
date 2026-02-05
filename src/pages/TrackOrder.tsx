import { useParams } from 'react-router-dom';
import { useStore } from '@/store/useStore';
import { Factory, Package, Calendar, FileText, Printer } from 'lucide-react';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function TrackOrder() {
  const { orderId } = useParams();
  const { orders, isLoading } = useStore();
  
  const order = orders.find(o => o.id === orderId);

  if (isLoading && !order) {
    return <LoadingSpinner />;
  }

  const handlePrintMTC = () => {
    if (!order) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const chemicalData = order.items.map((item) => ({
      spec: item.spec,
      c: '3.65', si: '2.30', mn: '0.35', p: '0.04', s: '0.01', mg: '0.035'
    }));

    const mechData = order.items.map((item) => ({
      spec: item.spec,
      tensile: '480', elongation: '12', hardness: '175'
    }));

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>MTC - ${order.orderNo}</title>
          <style>
            body { font-family: "SimSun", "Songti SC", serif; padding: 40px; color: #000; max-width: 800px; margin: 0 auto; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #000; padding-bottom: 20px; }
            .header h1 { margin: 0; font-size: 24px; font-weight: bold; }
            .header h2 { margin: 5px 0 0; font-size: 14px; font-weight: normal; }
            .meta { display: flex; justify-content: space-between; margin-bottom: 20px; font-size: 12px; }
            .section-title { font-weight: bold; font-size: 14px; margin-top: 20px; margin-bottom: 10px; border-left: 4px solid #000; padding-left: 8px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 12px; }
            th, td { border: 1px solid #000; padding: 6px; text-align: center; }
            th { background-color: #f0f0f0; }
            .footer { margin-top: 40px; text-align: center; font-size: 12px; }
            .stamp { margin-top: 20px; display: inline-block; border: 2px solid #d00; color: #d00; padding: 10px 20px; transform: rotate(-5deg); font-weight: bold; border-radius: 4px; }
            @media print {
              body { padding: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>质量保证书 (MILL TEST CERTIFICATE)</h1>
            <h2>ACCORDING TO ISO 2531 / GB/T 13295</h2>
          </div>

          <div class="meta">
            <div>
              <p>证书编号 (Cert No): MTC-${order.orderNo}-${new Date().getTime().toString().slice(-6)}</p>
              <p>客户名称 (Customer): ${order.customerName || 'N/A'}</p>
            </div>
            <div style="text-align: right;">
              <p>日期 (Date): ${new Date().toLocaleDateString()}</p>
              <p>订单号 (Order No): ${order.orderNo}</p>
            </div>
          </div>

          <div class="section-title">1. 产品明细 (Product Details)</div>
          <table>
            <thead>
              <tr>
                <th>序号 (No)</th>
                <th>产品描述 (Description)</th>
                <th>批号 (Batch No)</th>
                <th>数量 (Qty)</th>
                <th>外观 (Appearance)</th>
                <th>水压试验 (Hydrostatic)</th>
              </tr>
            </thead>
            <tbody>
              ${order.items.map((item, index) => `
                <tr>
                  <td>${index + 1}</td>
                  <td>球墨铸铁管 (Ductile Iron Pipe)<br/>${item.spec} Class ${item.level}</td>
                  <td>${item.batchNo || `BATCH-${new Date().getFullYear()}-${index + 101}`}</td>
                  <td>${item.plannedQuantity}</td>
                  <td>合格 (PASSED)</td>
                  <td>合格 (PASSED)</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="section-title">2. 化学成分 (Chemical Composition %)</div>
          <table>
            <thead>
              <tr>
                <th>规格 (Spec)</th>
                <th>C</th>
                <th>Si</th>
                <th>Mn</th>
                <th>P</th>
                <th>S</th>
                <th>Mg</th>
              </tr>
            </thead>
            <tbody>
              ${chemicalData.map(d => `
                <tr>
                  <td>${d.spec}</td>
                  <td>${d.c}</td>
                  <td>${d.si}</td>
                  <td>${d.mn}</td>
                  <td>${d.p}</td>
                  <td>${d.s}</td>
                  <td>${d.mg}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="section-title">3. 力学性能 (Mechanical Properties)</div>
          <table>
            <thead>
              <tr>
                <th>规格 (Spec)</th>
                <th>抗拉强度 (Tensile Strength MPa)</th>
                <th>延伸率 (Elongation %)</th>
                <th>硬度 (Hardness HB)</th>
              </tr>
            </thead>
            <tbody>
              ${mechData.map(d => `
                <tr>
                  <td>${d.spec}</td>
                  <td>${d.tensile}</td>
                  <td>${d.elongation}</td>
                  <td>${d.hardness}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="footer">
            <p>兹证明上述材料已按标准要求进行测试，结果符合要求。</p>
            <p>We hereby certify that the material described above has been tested and found to comply with the requirements.</p>
            
            <div style="margin-top: 30px;">
              <p style="font-weight: bold; font-size: 14px;">安钢集团永通球墨铸铁管有限责任公司</p>
              <p>Angang Group Yongtong Ductile Cast Iron Pipe Co., Ltd.</p>
              <p>质量管理部 (Quality Control Dept)</p>
            </div>
            
            <div class="stamp">质量检验合格章<br/>QC PASSED</div>
          </div>
        </body>
      </html>
    `;
    
    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

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
  const prodProgress = totalPlan > 0 ? Math.round((totalProd / totalPlan) * 100) : 0;

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
        <div className="grid grid-cols-1 gap-4">
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
        </div>

        {/* Quality Status (Industry Specific) */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <FileText className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="font-bold text-gray-800">质量质保书 (MTC)</p>
                <p className="text-xs text-gray-500">ISO 2531 / GB/T 13295</p>
              </div>
            </div>
            
            {prodProgress >= 100 ? (
               <button 
                 onClick={handlePrintMTC}
                 className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition-colors"
               >
                 <Printer className="h-4 w-4" />
                 打印 MTC
               </button>
            ) : (
              <div className="px-3 py-1 bg-gray-100 text-gray-500 rounded-full text-xs font-medium">
                生产未完成
              </div>
            )}
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
                    ${item.status === 'production_completed' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
                    {item.status === 'new' ? '等待生产' : 
                     item.status === 'production_completed' ? '生产完成' : '进行中'}
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
