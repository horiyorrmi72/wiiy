import React, { useState } from 'react';
import { ArrowUpOutlined, LoadingOutlined } from '@ant-design/icons';
import { Document } from '@prisma/client';
import { Flex, Image, message, Spin, Upload, UploadProps } from 'antd';
import { RcFile, UploadFile } from 'antd/es/upload/interface';

import { base64ToFile, convertToBase64 } from '../util/image';
import { useAppModal } from './AppModal';

import './ImageUpload.scss';

interface ImageUploadProps {
  document: Partial<Document> & Pick<Document, 'id'>;
  setCurrentImage: (val: string | null) => void;
  currentImage: string | null;
}

const getProps: (
  fileList: UploadProps['fileList'],
  onPreview: UploadProps['onPreview'],
  onRemove: UploadProps['onRemove'],
  handleFileUpload: (file: RcFile) => Promise<string>
) => UploadProps = (fileList, onPreview, onRemove, handleFileUpload) => ({
  name: 'file',
  multiple: false,
  fileList,
  onRemove,
  action: handleFileUpload,
  onPreview,
  itemRender: (originNode, file) => (
    <div
      style={{
        width: '60px',
        height: '60px',
        backgroundColor: 'rgb(244, 245, 250)',
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {file.status !== 'done' && (
        <Spin indicator={<LoadingOutlined spin />} size="small">
          {originNode}
        </Spin>
      )}
      {file.status === 'done' && (
        <div
          style={{ backgroundColor: 'white', height: '100%', borderRadius: 6 }}
        >
          {originNode}
        </div>
      )}
    </div>
  ),
  onDrop(e) {
    handleFileUpload(e.dataTransfer.files[0] as any);
  },
  customRequest: ({ onSuccess }) => {
    onSuccess?.('ok');
  },
  accept: 'image/png, image/jpeg',
  maxCount: 1,
  listType: (fileList ?? []).length > 0 ? 'picture-card' : 'text',
});

const ImageUploadComponent: React.FC<ImageUploadProps> = ({
  document,
  setCurrentImage,
  currentImage,
}) => {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState('');
  const { showAppModal } = useAppModal();

  const handleFileUpload = async (file: RcFile) => {
    try {
      const base64 = await convertToBase64(file);

      setCurrentImage(base64);
      message.success('Image uploaded');
    } catch (error: any) {
      console.error(error);
      message.error('Image upload failed');

      return error.message;
    }
  };

  const uploadedFilesList: Array<UploadFile> | undefined = currentImage
    ? (() => {
        const fileFromBase64Image = base64ToFile(currentImage);
        const blobUrl = URL.createObjectURL(fileFromBase64Image);

        return [
          {
            uid: '-1',
            name: 'image',
            status: 'done',
            url: blobUrl,
            originFileObj: {
              ...fileFromBase64Image,
              url: blobUrl,
              uid: '-1',
              lastModified: Date.now(),
              lastModifiedDate: new Date(),
            },
          },
        ];
      })()
    : undefined;

  const onPreview = async (file: UploadFile) => {
    if (!file.url && !file.preview) {
      file.preview = await convertToBase64(file.originFileObj as any);
    }

    setPreviewImage(file.url || (file.preview as string));
    setPreviewOpen(true);
  };

  const UploadButton = () => (
    <button
      style={{
        border: 0,
        background: 'none',
      }}
      type="button"
    >
      {(uploadedFilesList?.length ?? 0) < 1 && (
        <Flex
          justify="center"
          gap={4}
          style={{
            backgroundColor: 'rgb(244, 245, 250)',
            textWrap: 'nowrap',
            cursor: 'pointer',
          }}
        >
          <ArrowUpOutlined />
          Upload image
        </Flex>
      )}
    </button>
  );

  return (
    <Flex
      align="center"
      gap={16}
      style={{
        backgroundColor: 'rgb(244, 245, 250)',
      }}
    >
      <Upload
        rootClassName="image-upload-container"
        {...getProps(
          uploadedFilesList,
          onPreview,
          () => {
            showAppModal({
              type: 'deleteDocumentImage',
              deleteImage: () => {
                setCurrentImage(null);
                message.success('Image deleted');
              },
              id: document.id as any,
            });
          },
          handleFileUpload
        )}
        multiple={false}
        maxCount={1}
      >
        {!((uploadedFilesList?.length ?? 0) >= 1) && <UploadButton />}
      </Upload>
      {previewImage && (
        <Image
          wrapperStyle={{ display: 'none' }}
          preview={{
            visible: previewOpen,
            onVisibleChange: (visible) => setPreviewOpen(visible),
            afterOpenChange: (visible) => !visible && setPreviewImage(''),
          }}
          src={previewImage}
        />
      )}
    </Flex>
  );
};

export default ImageUploadComponent;
