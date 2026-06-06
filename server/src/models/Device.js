import mongoose from 'mongoose';

const deviceSchema = new mongoose.Schema({
  ownerId: { type: String, default: null },
  deviceId: { type: String, required: true, unique: true },
  deviceSecret: { type: String },
  deviceName: { type: String, default: 'Unknown' },
  pairCode: { type: String, required: true, unique: true },
  status: { type: String, enum: ['online', 'offline'], default: 'offline' },
  socketId: { type: String, default: null },
  paired: { type: Boolean, default: false },
  gracefulDisconnect: { type: Boolean, default: false },
  timerMinutes: { type: Number, default: 0 },
  timerStartedAt: { type: Date, default: null },
  lastSeen: { type: Date, default: Date.now },
}, { timestamps: true });

deviceSchema.index({ deviceId: 1, deviceSecret: 1 });

export default mongoose.model('Device', deviceSchema);
