import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');
const syncConfig = args.has('--sync-config');

const CARD_IMAGES_BUCKET = 'card-images';

const cardSeeds = [
  {
    name: 'AbbraCadabbra Card',
    description: 'A wildcard reward for creative picks and unexpected momentum.',
    assetFile: 'abbracadabra-card.png',
    storagePath: 'definitions/seeds/abbracadabra-card.png',
    award_stage: 'GROUP',
    threshold_percent: 70,
    usable_from_stage: 'GROUP',
    usable_until_stage: 'ROUND_OF_16',
    max_uses: 1,
    multiplier_bonus: 1,
  },
  {
    name: 'Elite Card',
    description: 'A premium reward card for strong stage performance.',
    assetFile: 'elite-card.png',
    storagePath: 'definitions/seeds/elite-card.png',
    award_stage: 'GROUP',
    threshold_percent: 85,
    usable_from_stage: 'GROUP',
    usable_until_stage: 'FINAL',
    max_uses: 1,
    multiplier_bonus: 2,
  },
  {
    name: 'Legends Card',
    description: 'A knockout reward card for consistent winning predictions.',
    assetFile: 'legends-card.png',
    storagePath: 'definitions/seeds/legends-card.png',
    award_stage: 'ROUND_OF_32',
    threshold_percent: 70,
    usable_from_stage: 'ROUND_OF_32',
    usable_until_stage: 'QUARTER_FINAL',
    max_uses: 1,
    multiplier_bonus: 1,
  },
  {
    name: 'Golden Card',
    description: 'A sharp knockout-stage boost for high-value predictions.',
    assetFile: 'golden-card.png',
    storagePath: 'definitions/seeds/golden-card.png',
    award_stage: 'ROUND_OF_16',
    threshold_percent: 75,
    usable_from_stage: 'ROUND_OF_16',
    usable_until_stage: 'SEMI_FINAL',
    max_uses: 1,
    multiplier_bonus: 1,
  },
  {
    name: 'Joker Card',
    description: 'A flexible wild card for late tournament prediction swings.',
    assetFile: 'joker-card.png',
    storagePath: 'definitions/seeds/joker-card.png',
    award_stage: 'ROUND_OF_16',
    threshold_percent: 80,
    usable_from_stage: 'ROUND_OF_16',
    usable_until_stage: 'FINAL',
    max_uses: 1,
    multiplier_bonus: 2,
  },
];

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;

  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const equalsAt = trimmed.indexOf('=');
    if (equalsAt === -1) continue;

    const key = trimmed.slice(0, equalsAt).trim();
    let value = trimmed.slice(equalsAt + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

function assertLocalAssets() {
  for (const seed of cardSeeds) {
    const assetPath = path.join(projectRoot, 'assets', 'card-seeds', seed.assetFile);
    if (!fs.existsSync(assetPath)) {
      throw new Error(`Missing seed asset: ${path.relative(projectRoot, assetPath)}`);
    }
  }
}

function createSupabaseAdminClient() {
  loadEnvFile(path.join(projectRoot, '.env.local'));
  loadEnvFile(path.join(projectRoot, '.env'));

  const supabaseUrl = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl) {
    throw new Error('Missing SUPABASE_URL or EXPO_PUBLIC_SUPABASE_URL.');
  }

  if (!serviceRoleKey) {
    throw new Error(
      'Missing SUPABASE_SERVICE_ROLE_KEY. Set it locally before running this seed script. Do not prefix it with EXPO_PUBLIC_.'
    );
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

async function ensureCardImagesBucket(supabase) {
  const { error } = await supabase.storage.getBucket(CARD_IMAGES_BUCKET);
  if (!error) return;

  const { error: createError } = await supabase.storage.createBucket(CARD_IMAGES_BUCKET, {
    public: true,
  });

  if (createError && !String(createError.message).toLowerCase().includes('already exists')) {
    throw new Error(`Could not create ${CARD_IMAGES_BUCKET} bucket: ${createError.message}`);
  }
}

async function uploadSeedImage(supabase, seed) {
  const assetPath = path.join(projectRoot, 'assets', 'card-seeds', seed.assetFile);
  const buffer = fs.readFileSync(assetPath);

  const { error } = await supabase.storage
    .from(CARD_IMAGES_BUCKET)
    .upload(seed.storagePath, buffer, {
      cacheControl: '31536000',
      contentType: 'image/png',
      upsert: true,
    });

  if (error) {
    throw new Error(`Failed to upload ${seed.assetFile}: ${error.message}`);
  }
}

async function seedCardDefinition(supabase, seed) {
  const payload = {
    name: seed.name,
    description: seed.description,
    image_path: seed.storagePath,
    award_stage: seed.award_stage,
    threshold_percent: seed.threshold_percent,
    usable_from_stage: seed.usable_from_stage,
    usable_until_stage: seed.usable_until_stage,
    max_uses: seed.max_uses,
    multiplier_bonus: seed.multiplier_bonus,
    is_active: true,
  };

  const { data: existingRows, error: findError } = await supabase
    .from('card_definitions')
    .select('id,name')
    .eq('name', seed.name)
    .order('created_at', { ascending: true });

  if (findError) {
    throw new Error(`Failed to find existing ${seed.name}: ${findError.message}`);
  }

  const existing = existingRows?.[0];
  if (existingRows && existingRows.length > 1) {
    console.warn(
      `Warning: found ${existingRows.length} definitions named "${seed.name}". Updating the oldest row only.`
    );
  }

  if (existing) {
    const updatePayload = syncConfig ? payload : { image_path: seed.storagePath };
    const { error: updateError } = await supabase
      .from('card_definitions')
      .update(updatePayload)
      .eq('id', existing.id);

    if (updateError) {
      throw new Error(`Failed to update ${seed.name}: ${updateError.message}`);
    }

    console.log(
      `Updated ${seed.name}: ${syncConfig ? 'artwork and config' : 'artwork only'}`
    );
    return;
  }

  const { error: insertError } = await supabase.from('card_definitions').insert(payload);
  if (insertError) {
    throw new Error(`Failed to insert ${seed.name}: ${insertError.message}`);
  }

  console.log(`Inserted ${seed.name}`);
}

async function main() {
  assertLocalAssets();

  if (dryRun) {
    console.log('Dry run only. No Supabase writes will be performed.');
    for (const seed of cardSeeds) {
      console.log(
        `Would upload ${seed.assetFile} -> ${CARD_IMAGES_BUCKET}/${seed.storagePath} and seed "${seed.name}".`
      );
    }
    return;
  }

  const supabase = createSupabaseAdminClient();
  await ensureCardImagesBucket(supabase);

  for (const seed of cardSeeds) {
    await uploadSeedImage(supabase, seed);
    await seedCardDefinition(supabase, seed);
  }

  console.log('Stage card seed completed.');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
