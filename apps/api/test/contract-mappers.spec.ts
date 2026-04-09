import { NoteVisibility, SessionVisibility, TargetSourceType } from '@prisma/client';

import { mapPrismaFocusSessionToContract, mapPrismaFocusTargetToContract } from '../src/contracts/contract-mappers';

describe('contract mappers', () => {
  it('maps a Prisma focus target into the generated contract shape', () => {
    const createdAt = new Date('2026-04-08T00:00:00.000Z');
    const updatedAt = new Date('2026-04-08T01:00:00.000Z');

    const contractTarget = mapPrismaFocusTargetToContract({
      id: 'target_1',
      ownerUserId: 'user_1',
      title: 'Read Prisma docs',
      sourceType: TargetSourceType.URL,
      sourceUrl: 'https://www.prisma.io/docs',
      genre: 'study',
      publicSummaryEnabled: true,
      createdAt,
      updatedAt,
      owner: {
        id: 'user_1',
        firebaseUid: 'firebase-uid-1',
        createdAt,
        updatedAt,
      },
    });

    expect(contractTarget).toEqual({
      id: 'target_1',
      owner: {
        id: 'user_1',
        firebaseUid: 'firebase-uid-1',
      },
      title: 'Read Prisma docs',
      sourceType: 'URL',
      sourceUrl: 'https://www.prisma.io/docs',
      genre: 'study',
      publicSummaryEnabled: true,
      createdAt: createdAt.toISOString(),
      updatedAt: updatedAt.toISOString(),
    });
  });

  it('maps a Prisma focus session into the generated contract shape', () => {
    const createdAt = new Date('2026-04-08T00:00:00.000Z');
    const updatedAt = new Date('2026-04-08T01:00:00.000Z');

    const contractSession = mapPrismaFocusSessionToContract({
      id: 'session_1',
      targetId: 'target_1',
      visibility: SessionVisibility.PUBLIC,
      note: 'Finished the first Prisma section',
      noteVisibility: NoteVisibility.PUBLIC,
      completedByUser: false,
      startedAt: createdAt,
      endedAt: updatedAt,
      durationSeconds: 3600,
      createdAt,
      updatedAt,
    });

    expect(contractSession).toEqual({
      id: 'session_1',
      targetId: 'target_1',
      visibility: 'PUBLIC',
      note: 'Finished the first Prisma section',
      noteVisibility: 'PUBLIC',
      completedByUser: false,
      startedAt: createdAt.toISOString(),
      endedAt: updatedAt.toISOString(),
      durationSeconds: 3600,
      createdAt: createdAt.toISOString(),
      updatedAt: updatedAt.toISOString(),
    });
  });
});