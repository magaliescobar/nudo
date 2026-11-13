import type { Order } from "@nudo/commerce/catalog";
import { type Db, MongoServerError, ObjectId } from "mongodb";
import { collections, type OrderDoc, toOrder } from "../mongo/collections";

const duplicateKey = 11000;

export type NewOrder = Omit<Order, "id">;

export function createOrderRepository(db: Db) {
  const { orders } = collections(db);

  return {
    /**
     * Idempotente: `idempotencyKey` es único, así que un reintento del mismo pedido
     * devuelve el pedido ya creado en lugar de duplicarlo.
     */
    async create(order: NewOrder): Promise<{ order: Order; created: boolean }> {
      const doc: OrderDoc = {
        ...order,
        _id: new ObjectId(),
        lines: [...order.lines],
      };
      try {
        await orders.insertOne(doc);
        return { order: toOrder(doc), created: true };
      } catch (error) {
        if (!(error instanceof MongoServerError) || error.code !== duplicateKey) throw error;
        const existing = await orders.findOne({ idempotencyKey: order.idempotencyKey });
        if (!existing) throw error;
        return { order: toOrder(existing), created: false };
      }
    },

    /** Confirmación de invitado: requiere número + token de acceso (sin login). */
    async findForConfirmation(number: string, accessToken: string): Promise<Order | null> {
      const doc = await orders.findOne({ number, accessToken });
      return doc ? toOrder(doc) : null;
    },

    async setStatus(id: string, status: Order["status"]): Promise<void> {
      await orders.updateOne({ _id: new ObjectId(id) }, { $set: { status } });
    },
  };
}

export type OrderRepository = ReturnType<typeof createOrderRepository>;
