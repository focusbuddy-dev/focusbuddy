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

export function mapPrismaUserToContractUserRef(user: PrismaUser): ContractUserRef {
  return {
    id: user.id,
    firebaseUid: user.firebaseUid,
  };
}

export function mapPrismaFocusTargetToContract(target: PrismaFocusTargetRecord): ContractFocusTarget {
  return {
    id: target.id,
    owner: mapPrismaUserToContractUserRef(target.owner),
    title: target.title,
    sourceType: targetSourceTypeMap[target.sourceType],
    sourceUrl: target.sourceUrl ?? null,
    genre: target.genre ?? null,
    publicSummaryEnabled: target.publicSummaryEnabled,
    createdAt: target.createdAt.toISOString(),
    updatedAt: target.updatedAt.toISOString(),
  };
}

export function mapPrismaResumeSourceToContract(resumeSource: PrismaResumeSource): ContractResumeSource {
  return {
    id: resumeSource.id,
    targetId: resumeSource.targetId,
    startedSessionId: resumeSource.startedSessionId,
    previousSessionId: resumeSource.previousSessionId,
    isEffective: resumeSource.isEffective,
    invalidatedAt: resumeSource.invalidatedAt?.toISOString() ?? null,
    invalidationNote: resumeSource.invalidationNote ?? null,
    createdAt: resumeSource.createdAt.toISOString(),
    updatedAt: resumeSource.updatedAt.toISOString(),
  };
}

export function mapPrismaFocusSessionToContract(session: PrismaFocusSessionRecord): ContractFocusSession {
  return {
    id: session.id,
    targetId: session.targetId,
    visibility: sessionVisibilityMap[session.visibility],
    note: session.note ?? null,
    noteVisibility: session.noteVisibility ? noteVisibilityMap[session.noteVisibility] : null,
    completedByUser: session.completedByUser,
    startedAt: session.startedAt.toISOString(),
    endedAt: session.endedAt?.toISOString() ?? null,
    durationSeconds: session.durationSeconds ?? null,
    createdAt: session.createdAt.toISOString(),
    updatedAt: session.updatedAt.toISOString(),
    resumeSource: session.startedResume ? mapPrismaResumeSourceToContract(session.startedResume) : null,
  };
}