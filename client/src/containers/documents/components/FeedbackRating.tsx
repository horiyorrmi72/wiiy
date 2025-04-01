import { useState } from 'react';
import { Document } from '@prisma/client';
import { Flex, message, Rate } from 'antd';
import { omit } from 'lodash';

import { rateGeneration } from '../../project/api/document';
import { DocHistoryItem } from './DocumentEditor';

interface IProps {
  historyData: DocHistoryItem;
  docData: Partial<Document>;
  userId: string;
  existingRating?: { userId: string; value: number };
  disabled: boolean;
  refresh?: (...args: any) => void;
}

const FeedbackRating = ({
  historyData,
  docData,
  userId,
  existingRating,
  disabled,
  refresh,
}: IProps) => {
  const [rating, setRating] = useState(existingRating?.value ?? 0);

  const handleRatingChange = async (value: any) => {
    setRating(value);

    const parsedHistory: Array<DocHistoryItem> = JSON.parse(
      (docData.meta as any)?.history ?? '{}'
    ).filter((x: DocHistoryItem) => x.date != historyData.date);

    const parsedMeta =
      Object.keys(docData.meta ?? {}).length > 1
        ? JSON.parse(docData.meta as any)
        : {};

    const ratingUpdate = [
      ...(historyData.rating ?? []).filter((x) => x.userId != userId),
      { userId: userId, value: value },
    ];

    parsedHistory.push({
      ...historyData,
      rating: ratingUpdate,
    });

    const updatedDoc: Partial<Document> = {
      ...docData,
      meta: {
        history: parsedHistory as any,
        ...omit(parsedMeta, 'history'),
      },
    };
    await rateGeneration(updatedDoc);
    refresh?.();
    message.success('Thank you for your feedback!');
  };

  const desc = [
    'Very poor',
    'Needs improvement',
    'Acceptable',
    'Good',
    'Excellent',
  ];

  return (
    <Flex aria-disabled={disabled} align="center" gap={4}>
      {!disabled && (
        <h4 style={{ textWrap: 'nowrap', margin: '5px' }}>
          Rate latest generation:
        </h4>
      )}
      <Rate
        style={{ fontSize: 15 }}
        disabled={disabled}
        tooltips={desc}
        onChange={handleRatingChange}
        value={rating}
      />
    </Flex>
  );
};

export default FeedbackRating;
