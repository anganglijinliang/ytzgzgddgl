import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Order, User, MasterData, ProductionRecord, ShippingRecord, OrderStatus } from '@/types';
import { v4 as uuidv4 } from 'uuid';

interface AppState {
  currentUser: User | null;
  users: User[];
  orders: Order[];
  productionRecords: ProductionRecord[];
  shippingRecords: ShippingRecord[];
  masterData: MasterData;
  
  // Actions
  login: (username: string) => void;
  logout: () => void;
  
  addOrder: (order: Omit<Order, 'id' | 'createdAt' | 'updatedAt' | 'status'>) => void;
  updateOrder: (id: string, data: Partial<Order>) => void;
  deleteOrder: (id: string) => void;
  
  addProductionRecord: (record: Omit<ProductionRecord, 'id' | 'timestamp'>) => void;
  addShippingRecord: (record: Omit<ShippingRecord, 'id' | 'timestamp'>) => void;
  
  // Helper to update master data automatically
  updateMasterData: (key: keyof MasterData, value: string) => void;
  
  // Data Sync
  importData: (data: Partial<AppState>) => void;
}

// Mock Initial Data
const INITIAL_MASTER_DATA: MasterData = {
  specs: ['DN100', 'DN200', 'DN300', 'DN400', 'DN500', 'DN600', 'DN800', 'DN1000', 'DN1200'],
  levels: ['K9', 'K8', 'K7', 'C40', 'C30', 'C25'],
  interfaces: ['T型', 'K型', 'S型', '法兰'],
  linings: ['水泥砂浆', '环氧陶瓷', '聚氨酯'],
  lengths: ['6米', '5.7米', '8米'],
  coatings: ['沥青漆', '环氧树脂', '锌层+沥青'],
  warehouses: ['成品库A', '成品库B', '待发区'],
};

const MOCK_USERS: User[] = [
  { id: '1', username: 'admin', name: '系统管理员', role: 'admin' },
  { id: '2', username: 'entry', name: '订单录入员', role: 'order_entry' },
  { id: '3', username: 'prod', name: '生产主管', role: 'production' },
  { id: '4', username: 'ship', name: '发运主管', role: 'shipping' },
];

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      currentUser: null,
      users: MOCK_USERS,
      orders: [],
      productionRecords: [],
      shippingRecords: [],
      masterData: INITIAL_MASTER_DATA,

      login: (username) => {
        const user = get().users.find(u => u.username === username);
        if (user) set({ currentUser: user });
      },
      logout: () => set({ currentUser: null }),

      addOrder: (orderData) => {
        const newOrder: Order = {
          ...orderData,
          id: uuidv4(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          status: 'new',
          items: orderData.items.map(item => ({
            ...item,
            id: uuidv4(),
            producedQuantity: 0,
            shippedQuantity: 0,
            status: 'new'
          }))
        };
        
        set(state => ({ orders: [newOrder, ...state.orders] }));
        
        // Update master data from new entries
        const { updateMasterData } = get();
        orderData.items.forEach(item => {
          updateMasterData('specs', item.spec);
          updateMasterData('levels', item.level);
          updateMasterData('interfaces', item.interfaceType);
          updateMasterData('linings', item.lining);
          updateMasterData('lengths', item.length);
          updateMasterData('coatings', item.coating);
        });
        if (orderData.warehouse) updateMasterData('warehouses', orderData.warehouse);
      },

      updateOrder: (id, data) => {
        set(state => ({
          orders: state.orders.map(o => o.id === id ? { ...o, ...data, updatedAt: new Date().toISOString() } : o)
        }));
      },

      deleteOrder: (id) => {
        // Soft delete logic can be implemented here, currently just removing
        set(state => ({
          orders: state.orders.filter(o => o.id !== id)
        }));
      },

      addProductionRecord: (record) => {
        const newRecord: ProductionRecord = {
          ...record,
          id: uuidv4(),
          timestamp: new Date().toISOString(),
        };

        set(state => {
          // Update suborder produced quantity
          const newOrders = state.orders.map(order => {
            if (order.id !== record.orderId) return order;
            
            const newItems = order.items.map(item => {
              if (item.id !== record.subOrderId) return item;
              
              const newProduced = item.producedQuantity + record.quantity;
              let newStatus: OrderStatus = item.status;
              if (newProduced >= item.plannedQuantity) newStatus = 'production_completed';
              else if (newProduced > 0) newStatus = 'production_partial';
              
              return { ...item, producedQuantity: newProduced, status: newStatus };
            });
            
            // Check if all items are completed
            const allCompleted = newItems.every(i => i.status === 'production_completed' || i.status === 'shipping_completed' || i.status === 'shipping_partial');
            const anyStarted = newItems.some(i => i.status !== 'new');
            let orderStatus: OrderStatus = order.status;
            if (allCompleted) orderStatus = 'production_completed'; // Simplification
            else if (anyStarted) orderStatus = 'production_partial';

            return { ...order, items: newItems, status: orderStatus, updatedAt: new Date().toISOString() };
          });
          
          return {
            productionRecords: [newRecord, ...state.productionRecords],
            orders: newOrders
          };
        });
      },

      addShippingRecord: (record) => {
        const newRecord: ShippingRecord = {
          ...record,
          id: uuidv4(),
          timestamp: new Date().toISOString(),
        };

        set(state => {
           // Update suborder shipped quantity
           const newOrders = state.orders.map(order => {
            if (order.id !== record.orderId) return order;
            
            const newItems = order.items.map(item => {
              if (item.id !== record.subOrderId) return item;
              
              const newShipped = item.shippedQuantity + record.quantity;
              let newStatus: OrderStatus = item.status;
              if (newShipped >= item.plannedQuantity) newStatus = 'shipping_completed';
              else if (newShipped > 0) newStatus = 'shipping_partial';
              
              return { ...item, shippedQuantity: newShipped, status: newStatus };
            });

             // Check order status logic (simplified)
            const allShipped = newItems.every(i => i.status === 'shipping_completed');
            const anyShipped = newItems.some(i => i.shippedQuantity > 0);
            let orderStatus: OrderStatus = order.status;
            if (allShipped) orderStatus = 'shipping_completed';
            else if (anyShipped) orderStatus = 'shipping_partial';

            return { ...order, items: newItems, status: orderStatus, updatedAt: new Date().toISOString() };
          });

          return {
            shippingRecords: [newRecord, ...state.shippingRecords],
            orders: newOrders
          };
        });
      },

      updateMasterData: (key, value) => {
        set(state => {
          if (!value || state.masterData[key].includes(value)) return {};
          return {
            masterData: {
              ...state.masterData,
              [key]: [...state.masterData[key], value]
            }
          };
        });
      },

      importData: (data) => {
        set((state) => ({
          ...state,
          ...data,
          // Ensure we don't overwrite current user session blindly, or maybe we should?
          // For demo, let's keep the current user unless specifically imported
          currentUser: state.currentUser, 
        }));
      }
    }),
    {
      name: 'angang-order-storage',
      version: 1, // Bump version to reset state and fix missing users
      partialize: (state) => ({
        currentUser: state.currentUser,
        orders: state.orders,
        productionRecords: state.productionRecords,
        shippingRecords: state.shippingRecords,
        masterData: state.masterData,
      }),
    }
  )
);
