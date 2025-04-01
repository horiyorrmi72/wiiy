import { useParams } from 'react-router';

import DocumentToolbar from '../../documents/components/DocumentToolbar';
import { LoadingScreen } from '../../layout/components/LoadingScreen';
import { UserTemplateDocumentsPath } from '../../nav/paths';
import useTemplateDocumentByIdQuery from '../hooks/useTemplateDocumentByIdQuery';
import { TemplateDetail } from './TemplateDetail';

export const TemplateDetailPage = () => {
  const { id } = useParams();
  if (!id) {
    throw new Error('You must specify a template document ID parameter');
  }
  const { data: template, isLoading } = useTemplateDocumentByIdQuery(id);

  if (isLoading) {
    return <LoadingScreen />;
  }
  if (!template) {
    throw new Error('Could not find this document template:' + id);
  }

  const breadcrumbItems = [
    {
      key: 'templates',
      label: 'Document Templates',
      link: `/${UserTemplateDocumentsPath}`,
    },
    {
      key: 'template',
      label: `${template.name}`,
    },
  ];

  return (
    <div className="page-container">
      <DocumentToolbar breadcrumbItems={breadcrumbItems} docActions={[]} />
      <TemplateDetail templateData={template} />
    </div>
  );
};
