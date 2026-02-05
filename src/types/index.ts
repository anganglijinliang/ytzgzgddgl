export type UserRole = 'admin' | 'order_entry' | 'production' | 'shipping' | 'operator';

export interface User {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  avatar?: string;
  createdAt?: string;
}

// 规格、级别等基础数据，用于智能记忆下拉
export interface MasterData {
  specs: string[]; // 规格
  levels: string[]; // 级别
  interfaces: string[]; // 接口形式
  linings: string[]; // 内衬
  lengths: string[]; // 长度
  coatings: string[]; // 防腐措施
  warehouses: string[]; // 仓库
}

export type ProductionProcess = 'pulling' | 'hydrostatic' | 'lining' | 'packaging';

export type OrderStatus = 'new' | 'in_production' | 'shipping_during_production' | 'production_completed' | 'shipping_completed_production' | 'completed';

export interface SubOrder {
  id: string;
  orderId: string;
  spec: string; // 规格
  level: string; // 级别
  interfaceType: string; // 接口形式
  lining: string; // 内衬
  length: string; // 长度
  coating: string; // 防腐措施
  plannedQuantity: number; // 计划支数
  unitWeight?: number; // 单重 (吨)
  totalWeight?: number; // 重量 (吨)
  batchNo?: string; // 批次号 (Mock for MTC)
  
  // 实时计算字段
  producedQuantity: number; // 已生产支数 (成品/打包)
  pullingQuantity?: number; // 拉管支数
  hydrostaticQuantity?: number; // 水压支数
  liningQuantity?: number; // 衬管支数
  shippedQuantity: number; // 已发运支数
  status: OrderStatus;
}

export interface Order {
  id: string;
  orderNo: string; // 订单号
  customerName?: string;
  deliveryDate?: string; // 交货日期
  workshop?: string; // 产线 (一车间、二车间...)
  warehouse?: string; // 仓库
  remarks?: string; // 备注 (富文本)
  
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  
  status: OrderStatus;
  
  // 关联子订单
  items: SubOrder[];
}

export interface ProductionRecord {
  id: string;
  orderId: string; // 关联主订单
  subOrderId: string; // 关联子订单
  
  team: '甲班' | '乙班' | '丙班' | '丁班';
  shift: '白班' | '中班' | '夜班';
  quantity: number; // 完成支数
  workshop: string;
  warehouse?: string;
  
  operatorId: string;
  timestamp: string;
  heatNo?: string; // 炉号
  process?: ProductionProcess; // 工序
}

export interface ShippingRecord {
  id: string;
  orderId: string;
  subOrderId: string;
  
  quantity: number; // 发运支数
  transportType: 'train' | 'truck'; // 火车、汽运
  shippingType: 'delivery' | 'pickup'; // 自发、自提
  shippingWarehouse?: string;
  vehicleInfo?: string; // 车辆信息
  shippingNo?: string; // 发运单号
  destination?: string; // 发运地
  
  operatorId: string;
  timestamp: string;
}
