import prisma from '../lib/prisma';

export type ImportNfcPayload = {
  uid: string;
  mode?: 'manual' | 'scan';
  unitId?: string;
  santriId?: string;
  userId?: string;
};

export type ImportNfcResult = {
  uid: string;
  status: string;
  santri_id?: string;
  user_id?: string;
};

export async function findSantriByUid(uid: string): Promise<string | null> {
  const normalizedUid = uid.replace(/:/g, '').toUpperCase();
  const santri = await prisma.santri.findUnique({
    where: { cardUid: normalizedUid },
    select: { id: true },
  });
  return santri?.id ?? null;
}

export async function importNfc(payload: ImportNfcPayload): Promise<ImportNfcResult> {
  const { uid, mode = 'manual', unitId, santriId, userId } = payload;

  const normalizedUid = uid.replace(/:/g, '').toUpperCase();

  // Validate UID format
  if (!/^[0-9A-Fa-f]+$/.test(normalizedUid) || normalizedUid.length < 8) {
    throw new Error('Invalid UID format. Must be colon-separated hex bytes.');
  }

  // Autodetect Santri by cardUid if not provided
  let finalSantriId = santriId;
  if (!finalSantriId) {
    const detected = await findSantriByUid(uid);
    if (detected) {
      finalSantriId = detected;
    }
  }

  // Duplicate UID check
  const existing = await prisma.nfc.findUnique({
    where: { uid: normalizedUid },
  });
  if (existing) {
    throw new Error('UID already exists in the system.');
  }

  // Validate Santri if provided
  if (finalSantriId) {
    const santri = await prisma.santri.findUnique({
      where: { id: finalSantriId },
    });
    if (!santri) {
      throw new Error('Referenced santri not found.');
    }
  }

  let nfcSaved;

  if (finalSantriId) {
    // Check if Santri already has an NFC
    const existingNfcForSantri = await prisma.nfc.findFirst({
      where: { santriId: finalSantriId },
    });

    if (existingNfcForSantri) {
      // Update existing NFC to new UID and update Santri cardUid
      nfcSaved = await prisma.nfc.update({
        where: { id: existingNfcForSantri.id },
        data: {
          uid: normalizedUid,
          status: 'ACTIVE',
        },
      });
      // Update Santri's cardUid
      await prisma.santri.update({
        where: { id: finalSantriId },
        data: { cardUid: normalizedUid },
      });
    } else {
      // Create new NFC with mapping
      nfcSaved = await prisma.nfc.create({
        data: {
          uid: normalizedUid,
          status: 'ACTIVE',
          createdAt: new Date(),
          updatedAt: new Date(),
          santri: {
            connect: { id: finalSantriId },
          },
        },
      });
      // Update Santri's cardUid
      await prisma.santri.update({
        where: { id: finalSantriId },
        data: { cardUid: normalizedUid },
      });
    }
  } else {
    // No Santri mapping, create without Santri
    nfcSaved = await prisma.nfc.create({
      data: {
        uid: normalizedUid,
        status: 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
  }

  // Log the import/scan action
  const action = mode === 'scan' ? 'SCAN' : 'IMPORT';
  await prisma.nfcLog.create({
    data: {
      nfcId: nfcSaved.id,
      action,
      timestamp: new Date(),
    },
  });

  // Build response
  const result: ImportNfcResult = {
    uid: nfcSaved.uid,
    status: nfcSaved.status,
  };
  if (finalSantriId) {
    result.santri_id = finalSantriId;
  }

  return result;
}
