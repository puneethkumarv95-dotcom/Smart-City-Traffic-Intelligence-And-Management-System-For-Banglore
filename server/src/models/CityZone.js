const mongoose = require('mongoose');

const cityZoneSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true
    },
    city: {
      type: String,
      default: 'Bengaluru'
    },
    description: {
      type: String,
      default: ''
    },
    center: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      // GeoJSON standard: [longitude, latitude]
      coordinates: {
        type: [Number],
        required: true
      }
    },
    radiusKm: {
      type: Number,
      default: 5
    },
    boundaryCoordinates: {
      type: [[Number]], // Array of [lng, lat] pairs defining polygon outline
      default: []
    },
    assignedOfficersCount: {
      type: Number,
      default: 0
    },
    congestionLevel: {
      type: String,
      enum: ['low', 'moderate', 'high', 'severe'],
      default: 'moderate'
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

cityZoneSchema.index({ center: '2dsphere' });

module.exports = mongoose.model('CityZone', cityZoneSchema);

