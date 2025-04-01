import {
  createContext,
  PropsWithChildren,
  ReactElement,
  useCallback,
  useContext,
  useState,
} from 'react';
import { Access, ChatSession } from '@prisma/client';
import { Divider, Modal } from 'antd';

import { ProjectOutput } from '../../../../shared/types';
import AddChat from '../../containers/chats/components/AddChat';
import { DeleteChat } from '../../containers/chats/components/DeleteChat';
import ErrorMessage from '../../containers/common/ErrorMessage';
import AddDocument from '../../containers/documents/components/addDocument';
import { TutorialVideo } from '../../containers/myIssues/components/TutorialVideo';
import AddProject from '../../containers/project/components/AddProject';
import { DeleteDocument } from '../../containers/project/components/DeleteDocument';
import { DeleteDocumentImage } from '../../containers/project/components/DeleteDocumentImage';
import { DeleteProject } from '../../containers/project/components/DeleteProject';
import EditProject from '../../containers/project/components/EditProject';
import { EditProjectWorkflow } from '../../containers/project/components/planning/ProjectBuilder';
import BuildableEditor from '../../containers/project/components/projectBuilder/BuildableEditor';
import IssueEditor from '../../containers/project/components/projectBuilder/IssueEditor';
import {
  IssueBuildableTypes,
  LegacyDocumentOutput,
} from '../../containers/project/types/projectType';
import { AddTeam } from '../../containers/team/components/AddTeam';
import {
  AddTeamMember,
  InviteNewUser,
} from '../../containers/team/components/AddTeamMember';
import DeleteTeam from '../../containers/team/components/DeleteTeam';
import EditTeam from '../../containers/team/components/EditTeam';
import { TeamOutput } from '../../containers/team/types/teamTypes';
import AddTemplateDocument from '../../containers/templateDocument/components/AddTemplateDocument';
import { AddVirtualUser } from '../../containers/user/components/addVirtualUser';
import trackEvent from '../../trackingClient';
import { useCurrentUser } from '../contexts/currentUserContext';
import { DocSharingModal } from './DocSharingModal/DocSharingModal';
import {
  UpdateSubscription,
  UpdateSubscriptionProps,
} from './PricingPlansModal/PricingPlans';

import './AppModal.scss';

type ModalPayload =
  | Readonly<{ type: 'addProject'; teamId?: string }>
  | Readonly<{ type: 'addDocument'; teamId?: string; chatSessionId?: string }>
  | Readonly<{ type: 'addChat' }>
  | Readonly<{ type: 'addIssue'; workPlanId?: string }>
  | Readonly<{ type: 'addTeam'; parentTeamid?: string }>
  | Readonly<{ type: 'addTeamMember'; teamId?: string }>
  | Readonly<{ type: 'inviteUser' }>
  | Readonly<{ type: 'addVirtualUser' }>
  | Readonly<{ type: 'editDocument'; document: LegacyDocumentOutput }>
  | Readonly<{ type: 'deleteDocument'; document: LegacyDocumentOutput }>
  | Readonly<{ type: 'editChat'; chat: ChatSession }>
  | Readonly<{ type: 'deleteChat'; chat: ChatSession }>
  | Readonly<{ type: 'viewTutorial' }>
  | Readonly<{ type: 'deleteProject'; projectId: string }>
  | Readonly<{ type: 'editProject'; project: ProjectOutput }>
  | Readonly<{ type: 'editTeam'; team: TeamOutput }>
  | Readonly<{ type: 'deleteTeam'; teamId: string }>
  | Readonly<{ type: 'deleteTeamInvalid'; message: string }>
  | Readonly<{ type: IssueBuildableTypes; issueShortName: string }>
  | Readonly<{ type: 'updateSubscription'; payload: UpdateSubscriptionProps }>
  | Readonly<{ type: 'purchaseCredits'; payload: UpdateSubscriptionProps }>
  | Readonly<{ type: 'editWorkflow'; project: ProjectOutput }>
  | Readonly<{
      type: 'docSharing';
      docId: string;
      title: string;
      documentAccess: Access;
    }>
  | Readonly<{
      type: 'deleteDocumentImage';
      id: string;
      deleteImage: () => void;
    }>
  | Readonly<{
      type: 'addTemplateDocument';
      templateCreated: () => void;
    }>;

type ModalType = ModalPayload['type'];

export type ShowModalMethod = (payload: ModalPayload) => void;
type ModalContextType = Readonly<{
  showAppModal: ShowModalMethod;
}>;

const ModalConfig: Record<ModalType, [string, number]> = {
  addProject: ['Add Project', 510],
  addDocument: ['Add Document', 510],
  addChat: ['Add Idea', 510],
  editDocument: ['Edit Document', 510],
  deleteDocument: ['Delete Document', 500],
  editChat: ['Edit Idea', 510],
  deleteChat: ['Delete Idea', 500],
  viewTutorial: ['Omniflow Demo', 1100],
  addIssue: ['Create Issue', 850],
  addTeam: ['Create Team', 600],
  addTeamMember: ['Add a Team Member', 600],
  inviteUser: ['Invite Team', 500],
  addVirtualUser: ['Create Virtual Teammate', 500],
  deleteProject: ['Delete Project', 500],
  editProject: ['Edit Project', 500],
  editTeam: ['Edit Team', 500],
  deleteTeam: ['Delete Team', 500],
  deleteTeamInvalid: ['Cannot Delete Team', 500],
  [IssueBuildableTypes.PRD]: ['Create PRD', 500],
  [IssueBuildableTypes.UIDESIGN]: ['Create UI/UX Design', 500],
  [IssueBuildableTypes.TECHDESIGN]: ['Create Technical Design', 500],
  [IssueBuildableTypes.DEVELOPMENT]: ['Create Development Plan', 500],
  [IssueBuildableTypes.QA]: ['Create QA Plan', 500],
  [IssueBuildableTypes.RELEASE]: ['Create Release Plan', 500],
  [IssueBuildableTypes.PROPOSAL]: ['Create Business Proposal', 500],
  updateSubscription: ['Upgrade Plan', 1100],
  purchaseCredits: ['Purchase Credits', 1100],
  editWorkflow: ['Customize Project Workflow', 500],
  docSharing: ['', 500],
  deleteDocumentImage: ['Delete Document Image', 500],
  addTemplateDocument: ['Create Document Template', 1100],
};
const DefaultModalConfig = ['', 500];

function ModalContents({
  payload,
  onSuccess,
}: Readonly<{ payload: ModalPayload; onSuccess: () => void }>): ReactElement {
  const { user } = useCurrentUser();

  trackEvent(payload.type, {
    distinct_id: user.email,
    payload: JSON.stringify(payload),
  });

  switch (payload.type) {
    case 'addProject':
      return <AddProject teamId={payload.teamId} onSuccess={onSuccess} />;
    case 'addDocument':
      return (
        <AddDocument
          onSuccess={onSuccess}
          chatSessionId={payload.chatSessionId}
        />
      );
    case 'editDocument':
      return <AddDocument document={payload.document} onSuccess={onSuccess} />;
    case 'deleteDocument':
      return (
        <DeleteDocument document={payload.document} onSuccess={onSuccess} />
      );
    case 'addChat':
      return <AddChat onSuccess={onSuccess} />;
    case 'editChat':
      return <AddChat chatSession={payload.chat} onSuccess={onSuccess} />;
    case 'deleteChat':
      return <DeleteChat chat={payload.chat} onSuccess={onSuccess} />;
    case 'viewTutorial':
      return <TutorialVideo />;
    case 'addIssue':
      return (
        <IssueEditor workPlanId={payload.workPlanId} onSuccess={onSuccess} />
      );
    case 'addTeam':
      return (
        <AddTeam parentTeamId={payload.parentTeamid} onSuccess={onSuccess} />
      );
    case 'addTeamMember':
      return (
        <AddTeamMember teamId={payload.teamId || ''} onSuccess={onSuccess} />
      );
    case 'inviteUser':
      return <InviteNewUser onSuccess={onSuccess} />;
    case 'addVirtualUser':
      return <AddVirtualUser onSuccess={onSuccess} />;
    case 'deleteProject':
      return (
        <DeleteProject projectId={payload.projectId} onSuccess={onSuccess} />
      );
    case 'deleteDocumentImage':
      return (
        <DeleteDocumentImage
          deleteImage={payload.deleteImage}
          documentId={payload.id}
          onSuccess={onSuccess}
        />
      );
    case 'editProject':
      return <EditProject project={payload.project} onSuccess={onSuccess} />;
    case 'editTeam':
      return <EditTeam team={payload.team} onSuccess={onSuccess} />;
    case 'deleteTeam':
      return <DeleteTeam teamId={payload.teamId} onSuccess={onSuccess} />;
    case 'deleteTeamInvalid':
      return <ErrorMessage message={payload.message} />;
    case 'updateSubscription':
    case 'purchaseCredits':
      return <UpdateSubscription payload={payload.payload} />;
    case 'editWorkflow':
      return (
        <EditProjectWorkflow project={payload.project} onSuccess={onSuccess} />
      );
    case IssueBuildableTypes.PRD:
    case IssueBuildableTypes.UIDESIGN:
    case IssueBuildableTypes.TECHDESIGN:
    case IssueBuildableTypes.DEVELOPMENT:
    case IssueBuildableTypes.QA:
    case IssueBuildableTypes.RELEASE:
    case IssueBuildableTypes.PROPOSAL:
      return (
        <BuildableEditor
          issueShortName={payload.issueShortName}
          onSuccess={onSuccess}
        />
      );
    case 'docSharing':
      return (
        <DocSharingModal
          docId={payload.docId}
          title={payload.title}
          documentAccess={payload.documentAccess}
          onSuccess={onSuccess}
        />
      );
    case 'addTemplateDocument':
      return (
        <AddTemplateDocument
          templateCreated={payload.templateCreated}
          onSuccess={onSuccess}
        />
      );
    default:
      return <></>;
  }
}

const ModalContext = createContext<ModalContextType>({
  showAppModal: () => {},
});

export function useAppModal(): ModalContextType {
  return useContext(ModalContext);
}

export function ModalProvider({ children }: PropsWithChildren) {
  const [payload, setPayload] = useState<ModalPayload | undefined>();
  const hideModal = useCallback(() => {
    setPayload(undefined);
  }, []);

  let [title, width] = payload ? ModalConfig[payload.type] : DefaultModalConfig;

  if (payload?.type === 'docSharing' && payload.title) {
    title = payload.title;
  }
  return (
    <ModalContext.Provider value={{ showAppModal: setPayload }}>
      <Modal
        title={title}
        open={Boolean(payload)}
        destroyOnClose={true}
        onCancel={hideModal}
        styles={{ body: { minHeight: 100 } }}
        width={width}
        maskClosable={false}
        centered
        className="custom-modal"
      >
        <Divider />
        {payload && <ModalContents payload={payload} onSuccess={hideModal} />}
      </Modal>
      {children}
    </ModalContext.Provider>
  );
}
