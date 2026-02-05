import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from './useStore';

describe('Order System Store', () => {
  beforeEach(() => {
    useStore.setState({
      orders: [],
      productionRecords: [],
      currentUser: null
    });
  });

  it('should add an order correctly', () => {
    const { addOrder } = useStore.getState();
    
    const newOrder = {
      orderNo: 'TEST-001',
      customerName: 'Test Customer',
      items: [
        {
          spec: 'DN100',
          level: 'K9',
          interfaceType: 'T型',
          lining: '水泥',
          length: '6m',
          coating: '沥青',
          plannedQuantity: 100
        }
      ]
    };

    addOrder(newOrder as any);

    const { orders } = useStore.getState();
    expect(orders).toHaveLength(1);
    expect(orders[0].orderNo).toBe('TEST-001');
    expect(orders[0].items).toHaveLength(1);
    expect(orders[0].status).toBe('new');
    expect(orders[0].items[0].plannedQuantity).toBe(100);
  });

  it('should update production progress correctly', () => {
    const { addOrder, addProductionRecord } = useStore.getState();
    
    const newOrder = {
      orderNo: 'PROD-001',
      items: [{ spec: 'DN100', plannedQuantity: 10 }]
    };
    addOrder(newOrder as any);
    
    const order = useStore.getState().orders[0];
    const subOrderId = order.items[0].id;

    addProductionRecord({
      orderId: order.id,
      subOrderId: subOrderId,
      quantity: 5,
      team: '甲班',
      shift: '白班',
      workshop: '一车间',
      operatorId: 'admin'
    });

    const updatedOrder = useStore.getState().orders[0];
    expect(updatedOrder.items[0].producedQuantity).toBe(5);
    expect(updatedOrder.items[0].status).toBe('in_production');
    expect(updatedOrder.status).toBe('in_production');

    // Complete production
    addProductionRecord({
      orderId: order.id,
      subOrderId: subOrderId,
      quantity: 5,
      team: '甲班',
      shift: '白班',
      workshop: '一车间',
      operatorId: 'admin'
    });

    const completedOrder = useStore.getState().orders[0];
    expect(completedOrder.items[0].producedQuantity).toBe(10);
    expect(completedOrder.items[0].status).toBe('production_completed');
    expect(completedOrder.status).toBe('production_completed');
  });
});
