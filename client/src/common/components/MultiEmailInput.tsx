import { useEffect, useState } from 'react';
import { SelectProps } from 'antd';
import { ReactMultiEmail } from 'react-multi-email';

import 'react-multi-email/dist/style.css';
import './mutil-email-input.scss';

export type MultiEmailInputProps = {
  value: string[];
  onChange?: SelectProps<string[]>['onChange'];
};

export const MultiEmailInput: React.FC<MultiEmailInputProps> = ({
  value,
  onChange,
  ...selectProps
}) => {
  const [emails, setEmails] = useState<string[]>([]);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    onChange && onChange(emails, {});
  }, [emails]);

  return (
    <ReactMultiEmail
      placeholder="Please enter email to share the doc with"
      emails={emails}
      onChange={(_emails: string[]) => {
        setEmails(_emails);
      }}
      getLabel={(email, index, removeEmail) => {
        return (
          <div data-tag key={index}>
            <div data-tag-item>{email}</div>
            <span data-tag-handle onClick={() => removeEmail(index)}>
              ×
            </span>
          </div>
        );
      }}
    />
  );
};
