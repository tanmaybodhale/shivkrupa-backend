import mongoose, { Schema, Document } from 'mongoose';

export interface IProduct extends Document {
  name: string;
  category: string;
  price: number;
  mrp: number;
  description?: string;
  image: string;
  unit: string;
  inStock: boolean;
  isNew?: boolean;
  tag?: string;
  quantity?: number;
}

const ProductSchema = new Schema<IProduct>(
  {
    name: { type: String, required: true },
    category: { type: String, required: true },
    price: { type: Number, required: true },
    mrp: { type: Number, required: true },
    description: { type: String },
    image: { type: String, default: 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=300' },
    unit: { type: String, default: 'piece' },
    inStock: { type: Boolean, default: true },
    isNew: { type: Boolean, default: false },
    tag: { type: String, default: '' },
    quantity: { type: Number },
  },
  { timestamps: true }
);

export default mongoose.models.Product || mongoose.model<IProduct>('Product', ProductSchema);
