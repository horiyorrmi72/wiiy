import { SES } from '@aws-sdk/client-ses';

const AWS_SENDER = 'support@omniflow.team';

const ses = new SES({
  region: process.env.AWS_REGION,
});

export interface TemplateEmailSendInfo<T> {
  templateName: string;
  recipientEmails: string[];
  TemplateData: T;
  ccEmails?: string[];
  ReplyToAddresses?: string[];
}

export const sendTemplateEmail = async function <T>(inputData: TemplateEmailSendInfo<T>) {
  console.log("SES Tempate Email send START:");
  var params = {
    Destination: {
      CcAddresses: inputData.ccEmails,
      ToAddresses: inputData.recipientEmails,
    },
    Source: AWS_SENDER,
    Template: inputData.templateName,
    TemplateData: JSON.stringify(inputData.TemplateData),
    ReplyToAddresses: inputData.ReplyToAddresses || [],
  };
  try {
    const result = await ses.sendTemplatedEmail(params);
    console.log('SES Tempate Email send successful:', result);
  } catch (error) {
    console.error('SES Tempate Email send fail, Err:', error);
  }
}