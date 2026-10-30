import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IAddress {
  label?: string;
  street: string;
  area: string;
  city: string;
  state: string;
  pincode: string;
  location?: {
    lat: number;
    lng: number;
  };
}

export interface IUser extends Document {
  uid: string;
  name: string;
  phone: string;
  email?: string;
  role: 'customer' | 'shopkeeper';
  joinedAt: Date;
  address?: IAddress;
  addresses?: IAddress[];
  wishlist?: string[];
}

const AddressSchema = new Schema<IAddress>({
  label: { type: String, default: 'Home' },
  street: { type: String, default: '' },
  area: { type: String, default: '' },
  city: { type: String, default: '' },
  state: { type: String, default: '' },
  pincode: { type: String, default: '' },
  location: {
    lat: { type: Number },
    lng: { type: Number },
  },
}, { _id: false });

const UserSchema = new Schema<IUser>(
  {
    uid: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    phone: { type: String, required: true, unique: true },
    email: { type: String, sparse: true },
    role: { type: String, enum: ['customer', 'shopkeeper'], default: 'customer' },
    joinedAt: { type: Date, default: Date.now },
    address: AddressSchema,
    addresses: [AddressSchema],
    wishlist: [{ type: String }],
  },
  {
    timestamps: true,
  }
);

const User = (mongoose.models.User as Model<IUser>) || mongoose.model<IUser>('User', UserSchema);

export default User;
