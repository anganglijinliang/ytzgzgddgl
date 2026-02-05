import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Order, User, MasterData, ProductionRecord, ShippingRecord } from '@/types';
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
  
  // User Actions
  fetchUsers: () => Promise<void>;
  addUser: (user: Omit<User, 'id'>) => Promise<void>;
  updateUser: (id: string, data: Partial<User>) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  
  // Actions
  login: (username: string) => void;
  logout: () => void;
  
  fetchInitialData: () => Promise<void>;
  
  addOrder: (order: Omit<Order, 'id' | 'createdAt' | 'updatedAt' | 'status'>) => Promise<void>;
  updateOrder: (id: string, data: Partial<Order>) => void; // Keeping sync for now, should be async later
  deleteOrder: (id: string) => Promise<void>;
  
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

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      currentUser: null,
      users: [],
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
          const [ordersRes, prodRes, shipRes, usersRes] = await Promise.all([
            fetch('/.netlify/functions/orders'),
            fetch('/.netlify/functions/production'),
            fetch('/.netlify/functions/shipping'),
            fetch('/.netlify/functions/users')
          ]);

          if (ordersRes.ok && prodRes.ok && shipRes.ok) {
            const orders = await ordersRes.json();
            const productionRecords = await prodRes.json();
            const shippingRecords = await shipRes.json();
            const users = usersRes.ok ? await usersRes.json() : []; // Users might fail if table empty/not migrated yet
            
            set({ orders, productionRecords, shippingRecords, users: users.length ? users : get().users, isLoading: false });
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

      fetchUsers: async () => {
        try {
          const response = await fetch('/.netlify/functions/users');
          if (response.ok) {
            const users = await response.json();
            set({ users });
          }
        } catch (error) {
          console.error('Failed to fetch users:', error);
        }
      },

      addUser: async (userData) => {
        try {
          const response = await fetch('/.netlify/functions/users', {
            method: 'POST',
            body: JSON.stringify(userData),
          });
          if (response.ok) {
            await get().fetchUsers();
          }
        } catch (error) {
          console.error('Failed to add user:', error);
        }
      },

      updateUser: async (id, data) => {
        try {
          const response = await fetch('/.netlify/functions/users', {
            method: 'PUT',
            body: JSON.stringify({ id, ...data }),
          });
          if (response.ok) {
            await get().fetchUsers();
          }
        } catch (error) {
          console.error('Failed to update user:', error);
        }
      },

      deleteUser: async (id) => {
        try {
          const response = await fetch(`/.netlify/functions/users?id=${id}`, {
            method: 'DELETE',
          });
          if (response.ok) {
            await get().fetchUsers();
          }
        } catch (error) {
          console.error('Failed to delete user:', error);
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

      deleteOrder: async (id) => {
    try {
      await fetch(`/.netlify/functions/orders?id=${id}`, { method: 'DELETE' });
      // Optimistic update
      set(state => ({
        orders: state.orders.filter(o => o.id !== id)
      }));
    } catch (error) {
      console.error('Failed to delete order:', error);
    }
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
