import mongoose, { Schema, Document, Model } from 'mongoose';

// Generic "service" document — covers Xerox/Printing today, and any future
// service (passport photos, lamination, etc.) without needing a new model
// or route per service. `pricing` is a flat label -> price map so the
// admin UI can be one generic "add a rate row" editor for every service,
// e.g. for xerox: { "A4 - B&W": 2, "A4 - Color": 10, "A3 - B&W": 5, ... }
// and for a future service: { "Matte": 50, "Glossy": 60 }.
//
// Bulk pricing: if `bulkThreshold` is above 0, orders whose total printed
// pages are >= bulkThreshold use `bulkPricing` instead of `pricing`
// (same label keys, e.g. "A4 - B&W": 1.5). Any label missing from
// `bulkPricing` (or priced 0) falls back to the normal `pricing` rate.
export interface IService extends Document {
  key: string;            // unique slug, e.g. "xerox", "passport-photos"
  name: string;            // display name, e.g. "Xerox / Printing"
  icon?: string;            // emoji shown in admin + (optionally) storefront
  pricing: Record<string, number>;
  bulkPricing: Record<string, number>; // rate per page once the threshold is reached
  bulkThreshold: number;               // total pages at which bulkPricing kicks in (0 = off)
  active: boolean;
}

const ServiceSchema = new Schema<IService>(
  {
    key: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, required: true },
    icon: { type: String, default: '🛠️' },
    pricing: { type: Schema.Types.Mixed, default: {} },
    bulkPricing: { type: Schema.Types.Mixed, default: {} },
    bulkThreshold: { type: Number, default: 20, min: 0 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const Service = (mongoose.models.Service as Model<IService>) || mongoose.model<IService>('Service', ServiceSchema);

export default Service;
