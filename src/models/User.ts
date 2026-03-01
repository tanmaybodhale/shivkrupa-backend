import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  uid: string;
  name: string;
  phone: string;
  email?: string;
  password: string;
  role: 'customer' | 'shopkeeper';
  joinedAt: Date;
  address?: {
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
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const UserSchema = new Schema<IUser>(
  {
    uid: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    phone: { type: String, required: true, unique: true },
    email: { type: String, sparse: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['customer', 'shopkeeper'], default: 'customer' },
    joinedAt: { type: Date, default: Date.now },
    address: {
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
  {
    timestamps: true,
  }
);

UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

UserSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
