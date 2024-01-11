import React, { memo, useContext, useEffect,useState } from 'react';
import LocalVideo from './LocalVideo.js';
import { useLocation } from 'react-router-dom';
import Button from '../../components/Button';
import { useChat } from '../../contexts/Chat.jsx';
import { useUser } from '../../contexts/User.jsx';
import { clsm } from '../../utils.js';
import { BroadcastContext } from '../contexts/BroadcastContext.js';
import { StageContext } from '../contexts/StageContext.js';
import { useChannel } from '../../contexts/Channel.jsx';

function LocalMedia() {
  const {
    init,
    startBroadcast,
    stopBroadcast,
    broadcastStarted,
    updateStreamKey
  } = useContext(BroadcastContext);

  const { joinStage, stageJoined, leaveStage } = useContext(StageContext);

  const { userData } = useUser();
  const { isModerator, setStageData, isStageOwner, setIsStageOwner} =
    useChat();
    const {isChannelLoading} = useChannel()
  const { state } = useLocation();
  const {joinAsParticipant,groupId} = state;
  function handleIngestChange(endpoint) {
    init(endpoint);
  }

  function handleStreamKeyChange(key) {
    updateStreamKey(key);
  }

  async function joinOrLeaveStage() {
    if (stageJoined) {
      leaveStage();
    } else {
      const response = await fetch(
        'https://pqyf6f3sk0.execute-api.us-east-1.amazonaws.com/prod/create',
        {
          body: JSON.stringify({
            groupIdParam: `${userData?.username}`,
            userId: userData?.username,
            attributes: {
              avatarUrl: '',
              username: userData?.username
            },
            channelData: {
              ingestEndpoint: userData?.ingestEndpoint,
              playbackUrl: userData?.ingestEndpoint,
              streamKey: userData?.streamKeyValue,
              channelId: userData?.channelArn,
              roomId: userData?.chatRoomArn
            }
          }),
          method: 'POST'
        }
      );
      const createStageResponse = await response.json();

      setStageData(createStageResponse);
      setIsStageOwner(true);
      handleUserChange(createStageResponse?.stage?.token?.token);
    }
    // console.log(userData);
  }

  function toggleBroadcast() {
    if (broadcastStarted) {
      stopBroadcast();
    } else {
      isStageOwner && startBroadcast();
    }
  }

  function handleUserChange(joinToken) {
    handleIngestChange(userData.ingestEndpoint);
    handleStreamKeyChange(userData.streamKeyValue);
    joinStage(joinToken);
  }

  useEffect(() => {
    if (joinAsParticipant && !isChannelLoading) {
      joinStageFn(groupId);
    console.log('isChannelLoading',isChannelLoading)

    }
    console.log('isChannelLoading',isChannelLoading)
  }, [joinAsParticipant,groupId,isChannelLoading]);

  useEffect(() => {
    stageJoined && toggleBroadcast();
  }, [stageJoined]);

  const joinStageFn = async (groupId) => {
    const joinRes = await fetch(
      'https://pqyf6f3sk0.execute-api.us-east-1.amazonaws.com/prod/join',
      {
        body: JSON.stringify({
          groupId,
          userId: userData?.username,
          attributes: {
            avatarUrl: '',
            username: userData?.username
          }
        }),
        method: 'POST'
      }
    );
    const joinData = await joinRes.json();
    handleUserChange(joinData?.stage?.token?.token);
  };
  return (
    <div className="row">
      <LocalVideo />
      <div className="column">
        <div className="row" style={{ marginTop: '2rem' }}>
          <div
            className="column"
            style={{ display: 'flex', marginTop: '1.5rem' }}
          >
            {(isModerator || isStageOwner) && (
              <Button
                onClick={joinOrLeaveStage}
                className={clsm([
                  'w-full',
                  'h-11',
                  'dark:[&>svg]:fill-black',
                  'relative',
                  '[&>svg]:h-6',
                  '[&>svg]:w-6',
                  'space-x-1',
                  'rounded-3xl',
                  stageJoined && [
                    'dark:bg-darkMode-red',
                    'bg-darkMode-red',
                    'hover:dark:bg-darkMode-red-hover',
                    'hover:bg-darkMode-red-hover',
                    'focus:bg-darkMode-red'
                  ]
                ])}
              >
                {stageJoined ? 'Leave ' : 'Create & Join '}Stage
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
export default memo(LocalMedia);
