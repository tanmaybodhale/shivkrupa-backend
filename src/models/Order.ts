import mongoose, { Schema, Document, Model } from 'mongoose';

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
  deliveryAddress?: {
    street: string;
    area: string;
    city: string;
    state: string;
    pincode: string;
    location?: {
      lat: number;
      lng: number;
    };
  };
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
    deliveryAddress: {
      street: { type: String, default: '' },
      area: { type: String, default: '' },
      city: { type: String, default: '' },
      state: { type: String, default: '' },
      pincode: { type: String, default: '' },
      location: {
        lat: { type: Number },
        lng: { type: Number },
      },
    },
  },
  { timestamps: true }
);

const Order = (mongoose.models.Order as Model<IOrder>) || mongoose.model<IOrder>('Order', OrderSchema);

export default Order;
