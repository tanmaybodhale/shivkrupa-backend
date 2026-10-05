import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IBanner extends Document {
  image: string;
  link?: string;
  title?: string;
  order: number;
  active: boolean;
}

const BannerSchema = new Schema<IBanner>(
  {
    image: { type: String, required: true },
    link: { type: String, default: '' },
    title: { type: String, default: '' },
    order: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const Banner = (mongoose.models.Banner as Model<IBanner>) || mongoose.model<IBanner>('Banner', BannerSchema);

export default Banner;
