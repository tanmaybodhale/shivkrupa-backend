import mongoose, { Schema, Document } from 'mongoose';

export interface IOrder extends Document {
  orderId: string;
  uid: string;
  name: string;
  phone: string;
  items: {
    productId: string;
    name: string;
    price: number;
    qty: number;
    image?: string;
  }[];
  subtotal: number;
  delivery: number;
  total: number;
  paymentMethod: string;
  status: 'pending' | 'confirmed' | 'delivered' | 'cancelled';
  time: Date;
  timeStr: string;
}

const OrderSchema = new Schema<IOrder>(
  {
    orderId: { type: String, required: true, unique: true },
    uid: { type: String, required: true },
    name: { type: String, required: true },
    phone: { type: String, required: true },
    items: [{
      productId: { type: String, required: true },
      name: { type: String, required: true },
      price: { type: Number, required: true },
      qty: { type: Number, required: true },
      image: { type: String },
    }],
    subtotal: { type: Number, required: true },
    delivery: { type: Number, required: true },
    total: { type: Number, required: true },
    paymentMethod: { type: String, default: 'cod' },
    status: { type: String, enum: ['pending', 'confirmed', 'delivered', 'cancelled'], default: 'pending' },
    time: { type: Date, default: Date.now },
    timeStr: { type: String, required: true },
  },
  { timestamps: true }
);

export default mongoose.models.Order || mongoose.model<IOrder>('Order', OrderSchema);
