import React, { useState } from 'react';
import type { TourProps } from 'antd';
import { Button, Flex, Input, Tour, Typography } from 'antd';

import { useCurrentUser } from '../../../common/contexts/currentUserContext';
import tourImage from '../../../common/icons/tourImage.jpg';
import { updateUserProfile } from '../../profile/api/profileApi';
import EditProfilePopUp from '../../profile/components/EditProfilePopUp';

const HelpNeeded: Record<string, string> = {
  improve_workflow: 'Improve product development workflow',
  automate_documents: 'Automate documents creation (PRD,Tech Design etc)',
  automate_tasks: 'Automate Task Breakdown and scheduling',
  track_timeline: 'Track timeline and execution',
  improve_communication: 'Improve team communication and alignment',
  gain_visibility: 'Gain visibility to project progress',
};

interface FTUEProp {
  openTour: boolean;
}

const FTUETour: React.FC<FTUEProp> = ({ openTour }) => {
  const [open, setOpen] = useState<boolean>(openTour);
  const { user, organization } = useCurrentUser();
  const [neededHelp, setNeededHelp] = useState<string[]>([]);
  const [otherHelpNeeded, setOtherHelpNeeded] = useState<string>('');

  const helpKeys = Object.keys(HelpNeeded);

  function addHelp(key: string) {
    let helpKeys = [...neededHelp];
    let isKeyIncluded = helpKeys.includes(key);
    if (isKeyIncluded) {
      helpKeys = helpKeys.filter((h) => h !== key);
    } else {
      helpKeys = [...helpKeys, key];
    }
    setNeededHelp(helpKeys);
  }

  const steps: TourProps['steps'] = [
    {
      title: (
        <Typography.Title level={4}>
          Hello, welcome to Omniflow!
        </Typography.Title>
      ),
      description: (
        <Flex vertical>
          <Typography.Paragraph>
            You can brainstorm ideas, generate documents, create dev tasks, and
            build end to end project workflow with our AI.
          </Typography.Paragraph>
          <Typography.Paragraph>
            {' '}
            Let’s begin with a few quick questions, so we can get to know you
            better.
          </Typography.Paragraph>
        </Flex>
      ),
      cover: <img alt="tour.png" src={tourImage} />,
    },
    {
      title: (
        <Typography.Title level={4}>
          What help do you need the most?
        </Typography.Title>
      ),
      description: (
        <Flex wrap gap="middle">
          {helpKeys.map((key, i) => {
            return (
              <Button
                key={key}
                type="default"
                onClick={() => addHelp(key)}
                style={{
                  background: neededHelp.includes(key) ? 'lightgray' : 'white',
                }}
              >
                {HelpNeeded[key]}
              </Button>
            );
          })}
          <Input.TextArea
            autoSize={{ minRows: 6, maxRows: 10 }}
            placeholder="Please add anything else that's not mentioned above"
            onBlur={(e) => {
              setOtherHelpNeeded(e.target.value);
            }}
            style={{ width: '100%', fontSize: '14px', marginBottom: '20px' }}
          />
        </Flex>
      ),
      nextButtonProps: {
        onClick: async () => {
          await updateUserProfile({
            id: user.id,
            organizationId: organization.id,
            email: user.email,
            firstname: user.firstname,
            lastname: user.lastname,
            username: user.username,
            neededHelp: neededHelp.join(',') + ',' + otherHelpNeeded,
          });
        },
      },
    },
    {
      title: (
        <Typography.Title level={4}>
          Tell us more about you & your company
        </Typography.Title>
      ),
      description: (
        <EditProfilePopUp requireCompanyData={true} requireProfileData={true} />
      ),
      nextButtonProps: {
        style:
          user.firstname && organization.website
            ? {}
            : { opacity: 0.5, pointerEvents: 'none' },
      },
    },
  ];
  return (
    <Tour
      open={open}
      onClose={() => setOpen(false)}
      steps={steps}
      closable={false}
    />
  );
};

export default FTUETour;
