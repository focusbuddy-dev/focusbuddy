import type {
  FocusSession as PrismaFocusSession,
  FocusTarget as PrismaFocusTarget,
  NoteVisibility as PrismaNoteVisibility,
  ResumeSource as PrismaResumeSource,
  SessionVisibility as PrismaSessionVisibility,
  TargetSourceType as PrismaTargetSourceType,
  User as PrismaUser,
} from '@prisma/client';
import type { components } from '@focusbuddy/api-contract/generated/types';

type ContractFocusSession = components['schemas']['FocusSession'];
type ContractFocusTarget = components['schemas']['FocusTarget'];
type ContractNoteVisibility = components['schemas']['NoteVisibility'];
type ContractResumeSource = components['schemas']['ResumeSource'];
type ContractSessionVisibility = components['schemas']['SessionVisibility'];
type ContractTargetSourceType = components['schemas']['TargetSourceType'];
type ContractUserRef = components['schemas']['UserRef'];

type PrismaFocusTargetRecord = PrismaFocusTarget & {
  owner: PrismaUser;
};

type PrismaFocusSessionRecord = PrismaFocusSession & {
  startedResume?: PrismaResumeSource | null;
};

const targetSourceTypeMap: Record<PrismaTargetSourceType, ContractTargetSourceType> = {
  FREE_FORM: 'FREE_FORM',
  URL: 'URL',
};

const sessionVisibilityMap: Record<PrismaSessionVisibility, ContractSessionVisibility> = {
  PRIVATE: 'PRIVATE',
  PUBLIC: 'PUBLIC',
};

const noteVisibilityMap: Record<PrismaNoteVisibility, ContractNoteVisibility> = {
  PRIVATE: 'PRIVATE',
  PUBLIC: 'PUBLIC',
};

function withOptionalProperty<K extends string, V>(
  key: K,
  value: V | undefined,
): Partial<Record<K, V>> {
  return value === undefined ? {} : ({ [key]: value } as Record<K, V>);
}

export function mapPrismaUserToContractUserRef(user: PrismaUser): ContractUserRef {
  return {
    id: user.id,
    firebaseUid: user.firebaseUid,
  };
}

export function mapPrismaFocusTargetToContract(target: PrismaFocusTargetRecord): ContractFocusTarget {
  const sourceUrl = target.sourceUrl ?? undefined;
  const genre = target.genre ?? undefined;

  return {
    id: target.id,
    owner: mapPrismaUserToContractUserRef(target.owner),
    title: target.title,
    sourceType: targetSourceTypeMap[target.sourceType],
    ...withOptionalProperty('sourceUrl', sourceUrl),
    ...withOptionalProperty('genre', genre),
    publicSummaryEnabled: target.publicSummaryEnabled,
    createdAt: target.createdAt.toISOString(),
    updatedAt: target.updatedAt.toISOString(),
  };
}

export function mapPrismaResumeSourceToContract(resumeSource: PrismaResumeSource): ContractResumeSource {
  const invalidatedAt = resumeSource.invalidatedAt?.toISOString() ?? undefined;
  const invalidationNote = resumeSource.invalidationNote ?? undefined;

  return {
    id: resumeSource.id,
    targetId: resumeSource.targetId,
    startedSessionId: resumeSource.startedSessionId,
    previousSessionId: resumeSource.previousSessionId,
    isEffective: resumeSource.isEffective,
    ...withOptionalProperty('invalidatedAt', invalidatedAt),
    ...withOptionalProperty('invalidationNote', invalidationNote),
    createdAt: resumeSource.createdAt.toISOString(),
    updatedAt: resumeSource.updatedAt.toISOString(),
  };
}

export function mapPrismaFocusSessionToContract(session: PrismaFocusSessionRecord): ContractFocusSession {
  const note = session.note ?? undefined;
  const noteVisibility = session.noteVisibility ? noteVisibilityMap[session.noteVisibility] : undefined;
  const endedAt = session.endedAt?.toISOString() ?? undefined;
  const durationSeconds = session.durationSeconds ?? undefined;
  const resumeSource = session.startedResume
    ? mapPrismaResumeSourceToContract(session.startedResume)
    : undefined;

  return {
    id: session.id,
    targetId: session.targetId,
    visibility: sessionVisibilityMap[session.visibility],
    ...withOptionalProperty('note', note),
    ...withOptionalProperty('noteVisibility', noteVisibility),
    completedByUser: session.completedByUser,
    startedAt: session.startedAt.toISOString(),
    ...withOptionalProperty('endedAt', endedAt),
    ...withOptionalProperty('durationSeconds', durationSeconds),
    createdAt: session.createdAt.toISOString(),
    updatedAt: session.updatedAt.toISOString(),
    ...withOptionalProperty('resumeSource', resumeSource),
  };
}