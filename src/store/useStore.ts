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
  isLoading: boolean;
  error: string | null;
  
  // Actions
  login: (username: string) => void;
  logout: () => void;
  
  fetchInitialData: () => Promise<void>;
  
  addOrder: (order: Omit<Order, 'id' | 'createdAt' | 'updatedAt' | 'status'>) => Promise<void>;
  updateOrder: (id: string, data: Partial<Order>) => void; // Keeping sync for now, should be async later
  deleteOrder: (id: string) => void; // Keeping sync for now
  
  addProductionRecord: (record: Omit<ProductionRecord, 'id' | 'timestamp'>) => Promise<void>;
  addShippingRecord: (record: Omit<ShippingRecord, 'id' | 'timestamp'>) => Promise<void>;
  
  // Helper to update master data automatically
  updateMasterData: (key: keyof MasterData, value: string) => void;
  
  // Data Sync (Legacy / Demo Backup)
  importData: (data: Partial<AppState>) => void;
}

// Mock Initial Data (Still used for MasterData defaults)
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
      isLoading: false,
      error: null,

      login: (username) => {
        const user = get().users.find(u => u.username === username);
        if (user) set({ currentUser: user });
      },
      logout: () => set({ currentUser: null }),

      fetchInitialData: async () => {
        set({ isLoading: true, error: null });
        try {
          const [ordersRes, prodRes, shipRes] = await Promise.all([
            fetch('/.netlify/functions/orders'),
            fetch('/.netlify/functions/production'),
            fetch('/.netlify/functions/shipping')
          ]);

          if (ordersRes.ok && prodRes.ok && shipRes.ok) {
            const orders = await ordersRes.json();
            const productionRecords = await prodRes.json();
            const shippingRecords = await shipRes.json();
            set({ orders, productionRecords, shippingRecords, isLoading: false });
          } else {
             // Fallback for demo if API fails (e.g. no DB connection yet)
             console.warn('API fetch failed, using local fallback');
             set({ isLoading: false });
          }
        } catch (error) {
          console.error('Failed to fetch data:', error);
          set({ error: 'Failed to sync with database', isLoading: false });
        }
      },

      addOrder: async (orderData) => {
        set({ isLoading: true });
        try {
          // Optimistic update
          const tempId = uuidv4();
          const newOrder: Order = {
            ...orderData,
            id: tempId,
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

          // API Call
          const response = await fetch('/.netlify/functions/orders', {
            method: 'POST',
            body: JSON.stringify(orderData),
          });

          if (!response.ok) throw new Error('Failed to save order');
          
          // Ideally we should replace the temp ID with the real ID from DB, 
          // but for now we'll just re-fetch to be safe and simple
          await get().fetchInitialData();
          
          // Update master data
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

        } catch (error) {
           console.error('Add Order Error:', error);
           set({ error: 'Failed to save order to database', isLoading: false });
        }
      },

      updateOrder: (id, data) => {
        set(state => ({
          orders: state.orders.map(o => o.id === id ? { ...o, ...data, updatedAt: new Date().toISOString() } : o)
        }));
      },

      deleteOrder: (id) => {
        set(state => ({
          orders: state.orders.filter(o => o.id !== id)
        }));
      },

      addProductionRecord: async (record) => {
        set({ isLoading: true });
        try {
            const response = await fetch('/.netlify/functions/production', {
                method: 'POST',
                body: JSON.stringify(record),
            });
            if (!response.ok) throw new Error('Failed to save production record');
            await get().fetchInitialData();
        } catch (error) {
            console.error(error);
            set({ error: 'Failed to save production record', isLoading: false });
        }
      },

      addShippingRecord: async (record) => {
        set({ isLoading: true });
        try {
            const response = await fetch('/.netlify/functions/shipping', {
                method: 'POST',
                body: JSON.stringify(record),
            });
            if (!response.ok) throw new Error('Failed to save shipping record');
            await get().fetchInitialData();
        } catch (error) {
             console.error(error);
             set({ error: 'Failed to save shipping record', isLoading: false });
        }
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
          currentUser: state.currentUser, 
        }));
      }
    }),
    {
      name: 'angang-order-storage',
      version: 2, // Bump version to 2 for async refactor
      partialize: (state) => ({
        currentUser: state.currentUser,
        // We still persist masterData locally for faster load, but orders/records should come from DB
        masterData: state.masterData, 
      }),
    }
  )
);
