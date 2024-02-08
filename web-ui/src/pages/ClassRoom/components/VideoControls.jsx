import React, { useContext, useEffect, useState } from 'react';
import { useLocation ,useNavigate} from 'react-router-dom';
import {
  CallDisconnect,
  MicOff,
  MicOn,
  ScreenShare,
  ScreenShareOff,
  VideoCamera,
  VideoCameraOff,
  WhiteBoard,
  WhiteBoardOff
} from '../../../assets/icons/index.js';
// import { useChat } from '../../../contexts/Chat.jsx';
// import { useUser } from '../../../contexts/User.jsx';
import { BroadcastContext } from '../contexts/BroadcastContext.js';
import { LocalMediaContext } from '../contexts/LocalMediaContext.js';
import { StageContext } from '../contexts/StageContext.js';
import { useMediaCanvas } from '../hooks/useMediaCanvas.js';

const { StreamType } = window.IVSBroadcastClient;
let count = 0;

export default function VideoControls({
  joinRequestStatus,
  stageData,
  setStageData,
  isStageOwner,
  setIsStageOwner,
  sendDrawEvents,
  registerDrawingEventHandler,
  userData
}) {
  const {
    isSmall,
    toggleScreenShare,
    toggleWhiteBoard,
    isWhiteBoardActive,
    isScreenShareActive,
    setIsVideoMuted,
    isVirtualBackgroundActive,
    toggleVirtualBackground
  } = useMediaCanvas();
  const { currentAudioDevice, currentVideoDevice } =
    useContext(LocalMediaContext);
  const [audioMuted, setAudioMuted] = useState(true);
  const [videoMuted, setVideoMuted] = useState(true);

  if (currentAudioDevice && audioMuted !== currentAudioDevice.isMuted) {
    setAudioMuted(currentAudioDevice.isMuted);
  }
  const {
    init,
    startBroadcast,
    stopBroadcast,
    broadcastStarted,
    updateStreamKey
  } = useContext(BroadcastContext);
  console.log(init, BroadcastContext);
  const {
    joinStage,
    stageJoined,
    leaveStage,
  } = useContext(StageContext);

  // const { userData } = useUser();
  // const {
  //   joinRequestStatus,
  //   stageData,
  //   setStageData,
  //   isStageOwner,
  //   setIsStageOwner,
  //   sendDrawEvents,
  //     registerDrawingEventHandler
  // } = useChat();
  const { state } = useLocation();
  const navigate = useNavigate()
  function handleIngestChange(endpoint) {
    init(endpoint);
  }

  function handleStreamKeyChange(key) {
    updateStreamKey(key);
  }

  async function joinOrLeaveStage() {
    if (stageJoined) {
      leaveStage();
      if (isStageOwner) {
        const joinRes = await fetch(
          'https://atwa6rbat3.execute-api.us-east-1.amazonaws.com/prod/delete',
          {
            body: JSON.stringify({
              groupId: stageData.groupId
            }),
            method: 'DELETE'
          }
        );
      }
    } else {
      const response = await fetch(
        'https://atwa6rbat3.execute-api.us-east-1.amazonaws.com/prod/create',
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
    if (state && count === 0) {
      state.joinAsParticipant && joinStageFn(state.groupId);
    }
  }, [state]);

  useEffect(()=>{
    stageJoined && toggleBroadcast()
  },[stageJoined])

  

  const joinStageFn = async (groupId) => {
    if (count > 0) return;
    count = 1;
    const joinRes = await fetch(
      'https://atwa6rbat3.execute-api.us-east-1.amazonaws.com/prod/join',
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

  function toggleDeviceMute(device) {
    device.setMuted(!device.isMuted);
    if (device.streamType === StreamType.VIDEO) {
      setVideoMuted(device.isMuted);
      setIsVideoMuted(device.isMuted);
    } else {
      setAudioMuted(device.isMuted);
    }
  }

  if (currentVideoDevice && videoMuted !== currentVideoDevice.isMuted) {
    setVideoMuted(currentVideoDevice.isMuted);
  }

  return (
    /* Video Controls Panel - fixed height */
    <div className="h-18  p-4">
      <div className="flex justify-center items-center px-4 h-full ">
        {!state?.joinAsParticipant && (
          <button
            className="text-xs bg-gray-300 p-3 px-5 rounded-full mx-1"
            onClick={joinOrLeaveStage}
          >
            <span style={{ fontSize: 12, color: 'black' }}>
              {stageJoined ? 'Stop ' : 'Start '} Class
            </span>
          </button>
        )}
        <button
          className="text-xs bg-gray-300 p-2 rounded-full mx-1"
          onClick={() => toggleDeviceMute(currentAudioDevice)}
        >
          {!audioMuted ? (
            <MicOn style={{ height: 20 }} />
          ) : (
            <MicOff style={{ height: 20 }} />
          )}
        </button>
        <button
          className="text-xs bg-gray-300 p-2 rounded-full mx-1"
          onClick={() => toggleDeviceMute(currentVideoDevice)}
        >
          {!videoMuted ? (
            <VideoCamera style={{ height: 20 }} />
          ) : (
            <VideoCameraOff style={{ height: 20 }} />
          )}
        </button>
        <button
          className="text-xs bg-gray-300 p-2 rounded-full mx-1"
          onClick={toggleScreenShare}
        >
          {!isScreenShareActive ? (
            <ScreenShare style={{ height: 20 }} />
          ) : (
            <ScreenShareOff style={{ height: 20 }} />
          )}
        </button>
        <button
          className="text-xs bg-gray-300 p-2 px-5 rounded-full mx-1"
          onClick={toggleWhiteBoard}
        >
          { !isWhiteBoardActive ? (
            <WhiteBoard style={{ height: 20 }} />
          ) : (
            <WhiteBoardOff style={{ height: 20 }} />
          )}
        </button>
        <button
          className="text-xs bg-gray-300 p-2 px-5 rounded-full mx-1"
          onClick={() => {
            if(state?.joinAsParticipant){
              count=0;
              leaveStage();
              navigate(-1);
            }
          }}
        >
          <CallDisconnect style={{ height: 20 }} />
        </button>
        {/* {!state?.joinAsParticipant && (
          <button
            className="text-xs bg-gray-300 p-3 px-5 rounded-full mx-1"
            onClick={toggleBroadcast}
          >
            <span style={{ fontSize: 12, color: 'black' }}>
              {' '}
              {broadcastStarted ? 'Stop ' : 'Start '} Streaming
            </span>
          </button>
        )} */}

        {/* <button
          className="text-xs bg-gray-300 p-2 px-5 rounded-full mx-1"
          onClick={()=>{
            sendDrawEvents('user1,#ff9911|1,333,256|1,335,256|1,335,257|1,337,258|1,339,259|1,342,261|1,343,262|1,345,263|1,348,265|1,349,265|1,351,266|1,353,267|1,354,267|1,356,268|1,357,268|1,359,268|1,359,268|1,360,268|1,361,268|1,362,268|1,363,268|1,364,268|1,365,268|1,367,268|1,368,267|1,369,267|1,370,266|1,372,266|1,373,265|1,374,264|1,375,263|1,376,262|1,377,261|1,379,259|1,379,258|1,381,256|1,382,253|1,383,251|1,385,249|1,386,245')
          }}
        >
          Send Events
        </button> */}
      </div>
    </div>
  );
}
