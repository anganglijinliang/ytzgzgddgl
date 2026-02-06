import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Order, User, MasterData, ProductionRecord, ProductionPlan } from '@/types';
import { v4 as uuidv4 } from 'uuid';

interface AppState {
  currentUser: User | null;
  users: User[];
  orders: Order[];
  productionRecords: ProductionRecord[];
  plans: ProductionPlan[];
  masterData: MasterData;
  isLoading: boolean;
  error: string | null;
  
  // User Actions
  fetchUsers: () => Promise<void>;
  addUser: (user: Omit<User, 'id'>) => Promise<boolean>;
  updateUser: (id: string, data: Partial<User>) => Promise<boolean>;
  deleteUser: (id: string) => Promise<boolean>;
  
  // Actions
  login: (username: string, password?: string) => Promise<boolean>;
  logout: () => void;
  
  fetchInitialData: () => Promise<void>;
  
  addOrder: (order: Omit<Order, 'id' | 'createdAt' | 'updatedAt' | 'status'>) => Promise<boolean>;
  updateOrder: (id: string, data: Partial<Order>) => void; // Keeping sync for now, should be async later
  deleteOrder: (id: string) => Promise<boolean>;
  
  addProductionRecord: (record: Omit<ProductionRecord, 'id' | 'timestamp'> & { timestamp?: string }) => Promise<boolean>;
  
  // Plan Actions
  addPlan: (plan: Omit<ProductionPlan, 'id' | 'status'>) => Promise<boolean>;
  updatePlan: (id: string, updates: Partial<ProductionPlan>) => Promise<boolean>;

  // Helper to update master data automatically
  updateMasterData: (key: keyof MasterData, value: string) => void;
  removeMasterData: (key: keyof MasterData, value: string) => void;
  
  // Data Sync (Legacy / Demo Backup)
  importData: (data: Partial<AppState>) => void;
}

// Mock Initial Data (Still used for MasterData defaults)
const INITIAL_MASTER_DATA: MasterData = {
  specs: [
    'DN40', 'DN50', 'DN60', 'DN65',
    'DN80', 'DN100', 'DN125', 'DN150', 'DN200', 'DN250', 
    'DN300', 'DN350', 'DN400', 'DN450', 'DN500', 'DN600', 
    'DN700', 'DN800', 'DN900', 'DN1000', 'DN1100', 'DN1200', 
    'DN1400', 'DN1500', 'DN1600', 'DN1800', 'DN2000', 'DN2200', 
    'DN2400', 'DN2600'
  ],
  levels: ['K12', 'K11', 'K10', 'K9', 'K8', 'K7', 'C100', 'C64', 'C50', 'C40', 'C30', 'C25', 'C20'],
  interfaces: ['T型', 'K型', 'S型', '法兰'],
  linings: ['水泥砂浆', '环氧陶瓷', '聚氨酯'],
  lengths: ['6米', '5.7米', '8米'],
  coatings: ['沥青漆', '环氧树脂', '锌层+沥青'],
  warehouses: ['成品库A', '成品库B', '待发区'],
  workshops: ['一车间', '二车间', '三车间', '四车间'],
};

const MOCK_USERS: User[] = [
  {
    id: 'mock-admin-id',
    username: 'admin',
    name: '系统管理员',
    role: 'admin',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin',
    createdAt: new Date().toISOString()
  },
  {
    id: 'mock-entry-id',
    username: 'entry',
    name: '订单录入员',
    role: 'order_entry',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=entry',
    createdAt: new Date().toISOString()
  },
  {
    id: 'mock-prod-id',
    username: 'prod',
    name: '生产主管',
    role: 'production',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=prod',
    createdAt: new Date().toISOString()
  },
  {
    id: 'mock-operator-id',
    username: 'operator',
    name: '操作员',
    role: 'operator',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=operator',
    createdAt: new Date().toISOString()
  }
];

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      currentUser: null,
      users: [],
      orders: [],
      productionRecords: [],
      plans: [],
      masterData: INITIAL_MASTER_DATA,
      isLoading: false,
      error: null,

      login: async (username, password) => {
        set({ isLoading: true, error: null });
        
        // Helper for local fallback login
        const performLocalLogin = () => {
          console.warn('Attempting local fallback login');
          const users = get().users.length ? get().users : MOCK_USERS;
          const user = users.find(u => u.username === username);
          
          // Simple password check for demo/offline
          // Allow '123456' for everyone, or specific passwords if needed
          if (user && (password === '123456' || (user.role === 'admin' && password === 'admin123'))) {
            set({ currentUser: user, isLoading: false });
            return true;
          }
          set({ isLoading: false });
          return false;
        };

        try {
          const response = await fetch('/.netlify/functions/login', {
            method: 'POST',
            body: JSON.stringify({ username, password }),
          });

          if (response.ok) {
            const user = await response.json();
            set({ currentUser: user, isLoading: false });
            return true;
          } else {
            // If API fails (404/500/etc), try local fallback
            return performLocalLogin();
          }
        } catch (error) {
          console.error('Login connection failed:', error);
          // If network error, try local fallback
          return performLocalLogin();
        }
      },
      logout: () => set({ currentUser: null }),

      fetchInitialData: async () => {
        set({ isLoading: true, error: null });
        try {
          const [ordersRes, prodRes, usersRes] = await Promise.all([
            fetch('/.netlify/functions/orders'),
            fetch('/.netlify/functions/production'),
            fetch('/.netlify/functions/users')
          ]);

          if (ordersRes.ok && prodRes.ok) {
            const orders = await ordersRes.json();
            const productionRecords = await prodRes.json();
            const users = usersRes.ok ? await usersRes.json() : []; // Users might fail if table empty/not migrated yet
            
            set({ orders, productionRecords, users: users.length ? users : (get().users.length ? get().users : MOCK_USERS), isLoading: false });
          } else {
             // Fallback for demo if API fails (e.g. no DB connection yet)
             console.warn('API fetch failed, using local fallback');
             set({ isLoading: false, users: get().users.length ? get().users : MOCK_USERS });
          }
        } catch (error) {
          console.error('Failed to fetch data:', error);
          set({ error: 'Failed to sync with database', isLoading: false, users: get().users.length ? get().users : MOCK_USERS });
        }
      },

      fetchUsers: async () => {
        set({ isLoading: true });
        try {
          const response = await fetch('/.netlify/functions/users');
          if (response.ok) {
            const users = await response.json();
            set({ users, isLoading: false });
          } else {
            set({ isLoading: false });
          }
        } catch (error) {
          console.error('Failed to fetch users:', error);
          set({ isLoading: false });
        }
      },

      addUser: async (userData) => {
        set({ isLoading: true });
        try {
          const response = await fetch('/.netlify/functions/users', {
            method: 'POST',
            body: JSON.stringify(userData),
          });
          if (response.ok) {
            await get().fetchUsers(); 
            return true;
          } else {
            set({ isLoading: false });
            return false;
          }
        } catch (error) {
          console.error('Failed to add user:', error);
          set({ isLoading: false });
          return false;
        }
      },

      updateUser: async (id, data) => {
        set({ isLoading: true });
        try {
          const response = await fetch('/.netlify/functions/users', {
            method: 'PUT',
            body: JSON.stringify({ id, ...data }),
          });
          if (response.ok) {
            await get().fetchUsers();
            return true;
          } else {
             set({ isLoading: false });
             return false;
          }
        } catch (error) {
          console.error('Failed to update user:', error);
          set({ isLoading: false });
          return false;
        }
      },

      deleteUser: async (id) => {
        set({ isLoading: true });
        
        // Handle mock users (client-side only deletion)
        if (id.startsWith('mock-')) {
          set(state => ({
            users: state.users.filter(u => u.id !== id),
            isLoading: false
          }));
          return true;
        }

        try {
          const response = await fetch(`/.netlify/functions/users?id=${id}`, {
            method: 'DELETE',
          });
          if (response.ok) {
            await get().fetchUsers();
            return true;
          } else {
             set({ isLoading: false });
             return false;
          }
        } catch (error) {
          console.error('Failed to delete user:', error);
          set({ isLoading: false });
          return false;
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
          
          return true;
        } catch (error) {
           console.error('Add Order Error:', error);
           set({ error: 'Failed to save order to database', isLoading: false });
           return false;
        }
      },

      updateOrder: (id, data) => {
        set(state => ({
          orders: state.orders.map(o => o.id === id ? { ...o, ...data, updatedAt: new Date().toISOString() } : o)
        }));
      },

      deleteOrder: async (id) => {
        set({ isLoading: true });
        try {
          await fetch(`/.netlify/functions/orders?id=${id}`, { method: 'DELETE' });
          // Optimistic update
          set(state => ({
            orders: state.orders.filter(o => o.id !== id),
            isLoading: false
          }));
          return true;
        } catch (error) {
          console.error('Failed to delete order:', error);
          set({ isLoading: false });
          return false;
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
            return true;
        } catch (error) {
            console.error(error);
            set({ error: 'Failed to save production record', isLoading: false });
            return false;
        }
      },
      
      addPlan: async (planData) => {
        const newPlan: ProductionPlan = {
          ...planData,
          id: uuidv4(),
          status: 'pending'
        };
        set(state => ({ plans: [newPlan, ...state.plans] }));
        return true;
      },

      updatePlan: async (id, updates) => {
        set(state => ({
          plans: state.plans.map(p => p.id === id ? { ...p, ...updates } : p)
        }));
        return true;
      },

      updateMasterData: (key, value) => {
        if (!value) return;
        set(state => {
          const list = state.masterData[key] || [];
          if (!list.includes(value)) {
            return {
              masterData: {
                ...state.masterData,
                [key]: [...list, value]
              }
            };
          }
          return state;
        });
      },

      removeMasterData: (key, value) => {
        set(state => ({
          masterData: {
            ...state.masterData,
            [key]: (state.masterData[key] || []).filter(item => item !== value)
          }
        }));
      },

      importData: (data) => {
        set((state) => ({
          ...state,
          ...data,
          // Merge master data if needed, or just replace
          masterData: { ...state.masterData, ...data.masterData }
        }));
      }
    }),
    {
      name: 'angang-storage',
      version: 1, // Increment this if schema changes
      partialize: (state) => ({ 
        currentUser: state.currentUser,
        masterData: state.masterData 
      }), // Only persist user session and local master data preferences
    }
  )
);
