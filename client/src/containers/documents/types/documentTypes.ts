import {
  ChatSessionTargetEntityType,
  DOCTYPE,
  Document,
  Organization,
  Project,
  TemplateDocument,
} from '@prisma/client';

export type TemplateDocumentOutput = Readonly<
  Pick<TemplateDocument, 'id' | 'name' | 'description' | 'type'>
>;

// Copied from /server/routes/types/documentTypes.ts
export type DocumentOutput = Readonly<
  Omit<Document, 'content'> & {
    // type: Exclude<DOCTYPE, typeof DOCTYPE.DEVELOPMENT_PLAN>;
    contents?: string;
    templateDocument?: TemplateDocument | null;
    project: Project | null;
    organization: Organization | null;
    meta?: {
      history?: string;
      sourceUrl?: string;
      builtFileUrl?: string;
    };
  }
>;

// copied from /server/lib/constant.ts
export const DocumentTypeNameMapping: Record<string, Record<string, string>> = {
  PRD: {
    type: DOCTYPE.PRD,
    name: 'PRD',
  },
  UI_DESIGN: {
    type: DOCTYPE.UI_DESIGN,
    name: 'UI/UX Design',
  },
  PROTOTYPE: {
    type: DOCTYPE.PROTOTYPE,
    name: 'Prototype',
  },
  TECH_DESIGN: {
    type: DOCTYPE.TECH_DESIGN,
    name: 'Technical Design',
  },
  DEVELOPMENT_PLAN: {
    type: DOCTYPE.DEVELOPMENT_PLAN,
    name: 'Development Plan',
  },
  QA_PLAN: {
    type: DOCTYPE.QA_PLAN,
    name: 'QA & Test Plan',
  },
  RELEASE_PLAN: {
    type: DOCTYPE.RELEASE_PLAN,
    name: 'Release Plan',
  },
  // PROPOSAL: {
  //   type: DOCTYPE.PROPOSAL,
  //   name: 'Business Proposal',
  // },
  BUSINESS: {
    type: DOCTYPE.BUSINESS,
    name: 'Business',
  },
  PRODUCT: {
    type: DOCTYPE.PRODUCT,
    name: 'Product',
  },
  ENGINEERING: {
    type: DOCTYPE.ENGINEERING,
    name: 'Engineering',
  },
  MARKETING: {
    type: DOCTYPE.MARKETING,
    name: 'Marketing',
  },
  SALES: {
    type: DOCTYPE.SALES,
    name: 'Sales',
  },
  SUPPORT: {
    type: DOCTYPE.SUPPORT,
    name: 'Customer Support',
  },
  OTHER: {
    type: DOCTYPE.OTHER,
    name: 'Other',
  },
  CHAT: {
    type: ChatSessionTargetEntityType.CHAT,
    name: 'Chat',
  },
};

export const DocTypeOptionsSelection = [{ value: '', label: 'All' }].concat(
  Object.values(DocumentTypeNameMapping).map((value) => {
    return {
      value: value.type,
      label: value.name,
    };
  })
);
