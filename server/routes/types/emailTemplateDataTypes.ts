export type DocumentShareTemplateData = Readonly<{
  recipient_name: string;
  sender_name: string;
  doc_name: string;
  link: string;
}>;

export type DocumentRequestAccessTemplateData = Readonly<{
  recipient_name: string;
  sender_name: string;
  doc_name: string;
  link: string;
  message?: string;
}>;
