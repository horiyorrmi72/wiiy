import { Flex, Progress } from 'antd';

import LoadingBar from '../../../common/components/LoadingBar';

type GeneratingDocLoaderProps = Readonly<{
  loadingPercent?: number;
}>;

export default function GeneratingDocLoader({
  loadingPercent,
}: GeneratingDocLoaderProps) {
  return (
    <Flex
      style={{
        position: 'absolute',
        zIndex: 100,
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Flex
        style={{
          width: '60%',
          marginTop: '-10%',
          flexDirection: 'column',
          justifyContent: 'center',
        }}
      >
        <Flex style={{ marginBottom: '10px', justifyContent: 'center' }}>
          <LoadingBar />
        </Flex>
        <Progress percent={loadingPercent} status="active" size="small" />
        <div style={{ marginTop: '20px', textAlign: 'center' }}>
          Generating the document for you...
        </div>
      </Flex>
    </Flex>
  );
}
