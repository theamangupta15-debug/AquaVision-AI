import mongoose from 'mongoose';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ENV } from '../config/env.js';
import HealthGuidance from '../models/HealthGuidance.js';
import Location from '../models/Location.js';
import ParameterStandard from '../models/ParameterStandard.js';
import Source from '../models/Source.js';
import {
  SEED_HEALTH_GUIDANCE,
  SEED_LOCATIONS,
  SEED_SOURCES,
  SEED_STANDARDS
} from './seedData.js';

async function upsertRecords(Model, key, records) {
  for (const record of records) {
    await Model.updateOne(
      { [key]: record[key] },
      { $set: record },
      { upsert: true, runValidators: true }
    );
  }
}

export async function seedReferenceData() {
  if (!ENV.MONGODB_URI) {
    throw new Error('MONGODB_URI must be configured before seeding reference data.');
  }

  await mongoose.connect(ENV.MONGODB_URI);

  try {
    const locations = SEED_LOCATIONS.map((location) => ({
      ...location,
      slug: location.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    }));

    await upsertRecords(Location, 'locationId', locations);
    await upsertRecords(Source, 'sourceId', SEED_SOURCES);
    await upsertRecords(ParameterStandard, 'parameterCode', SEED_STANDARDS);
    await upsertRecords(HealthGuidance, 'topicSlug', SEED_HEALTH_GUIDANCE);

    return {
      locations: locations.length,
      sources: SEED_SOURCES.length,
      standards: SEED_STANDARDS.length,
      healthGuidance: SEED_HEALTH_GUIDANCE.length
    };
  } finally {
    await mongoose.disconnect();
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  seedReferenceData()
    .then((counts) => console.info('[Reference data ready]', counts))
    .catch((error) => {
      console.error('[Reference data seed failed]', error);
      process.exitCode = 1;
    });
}
