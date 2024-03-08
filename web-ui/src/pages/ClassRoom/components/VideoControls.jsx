import React, {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState
} from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  CallDisconnect,
  MicOff,
  MicOn,
  ScreenShare,
  ScreenShareOff,
  VideoBG,
  VideoCamera,
  VideoCameraOff,
  WhiteBoard,
  WhiteBoardOff,
  CollabSS
} from '../../../assets/icons/index.js';
import { BroadcastContext } from '../contexts/BroadcastContext.js';
import { LocalMediaContext } from '../contexts/LocalMediaContext.js';
import { StageContext } from '../contexts/StageContext.js';
import VirtualBackgroundSelector from './VirtualBackgroundSelector.jsx';

const { StreamType } = window.IVSBroadcastClient;
let count = 0;

export default function VideoControls({
  stageData,
  setStageData,
  isStageOwner,
  setIsStageOwner,
  userData,
  annotationCanvasState,
  startSSWithAnnots,
  stopSSWithAnnots,
  localParticipant,
  toggleScreenShare,
  toggleWhiteBoard,
  isWhiteBoardActive,
  isScreenShareActive,
  setIsVideoMuted,
  toggleBackground,
  nextPage,
  previousPage,
  currentPageIndex
}) {
  const { currentAudioDevice, currentVideoDevice } =
    useContext(LocalMediaContext);
  const [audioMuted, setAudioMuted] = useState(true);
  const [videoMuted, setVideoMuted] = useState(true);
  const [openVirtualBgPanel, setOpenVirtualBgPanel] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const isCollabSSRef = useRef(false);

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

  const { joinStage, stageJoined, leaveStage } = useContext(StageContext);

  const { state } = useLocation();
  const navigate = useNavigate();
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

  useEffect(() => {
    stageJoined && toggleBroadcast();
  }, [stageJoined]);

  useEffect(() => {
    if (isScreenShareActive) {
      // startSSWithAnnots(localParticipant?.id);

      if (isCollabSSRef.current) {
        startSSWithAnnots(localParticipant?.id);
      }
    } else {
      stopSSWithAnnots();
      isCollabSSRef.current = false;
    }
  }, [isScreenShareActive, localParticipant, isCollabSSRef]);

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
  const handleLeaveStage = async () => {
    if (state?.joinAsParticipant) {
      if (annotationCanvasState?.open) {
        const stopResponse = await stopSSWithAnnots();
        if (stopResponse) {
          toggleScreenShare();
        }
      }
      count = 0;
      leaveStage();
      navigate(-1);
    }
  };

  const handleCollabSS = useCallback(() => {
    isCollabSSRef.current = !isCollabSSRef.current;
    toggleScreenShare();
  }, [isCollabSSRef.current, isScreenShareActive]);

  const ScreenShareToggle = ({
    isScreenShareActive,
    isCollabSSRef,
    handleCollabSS,
    toggleScreenShare,
    isWhiteBoardActive,
    annotationCanvasState,
    localParticipant
  }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

    const handleButtonClick = () => {
      if (isScreenShareActive) {
        isCollabSSRef.current ? handleCollabSS() : toggleScreenShare();
      } else {
        toggleMenu();
      }
    };

    return (
      <div className="relative">
        <button
          className="text-xs bg-gray-300 p-2 rounded-full mx-1"
          onClick={handleButtonClick}
          disabled={
            isWhiteBoardActive ||
            (annotationCanvasState?.open && annotationCanvasState?.participantId !== localParticipant?.id)
          }
        >
          {!isScreenShareActive ? (
            <ScreenShare style={{ height: 20 }} />
          ) : (
            <ScreenShareOff style={{ height: 20 }} />
          )}
        </button>
        {isMenuOpen && (
          <div className="absolute bottom-full mb-2 bg-white shadow-md rounded-lg p-2 flex flex-col">
            <button
              className="mb-2 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md text-left px-4"
              onClick={() => {
                toggleScreenShare();
                toggleMenu();
              }}
            >
              Individual
            </button>
            <button
              className="py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md text-left px-4"
              onClick={() => {
                handleCollabSS();
                toggleMenu();
              }}
            >
              Collaborative
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    /* Video Controls Panel - fixed height */
    <div className="h-18  p-4">
      <div className="flex flex-wrap justify-center items-center px-4 h-full ">
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
        {/* <button
          className="text-xs bg-gray-300 p-2 rounded-full mx-1"
          // onClick={toggleScreenShare}
          // disabled={isWhiteBoardActive || isCollabSSRef.current}
          onClick={toggleScreenShare}
          disabled={
            isWhiteBoardActive ||
            (annotationCanvasState?.open &&
              annotationCanvasState?.participantId !== localParticipant?.id)
          }
        >
          {!isScreenShareActive ? (
            <ScreenShare style={{ height: 20 }} />
          ) : (
            <ScreenShareOff style={{ height: 20 }} />
          )}
        </button> */}


        <ScreenShareToggle
          isScreenShareActive={isScreenShareActive}
          isCollabSSRef={isCollabSSRef}
          handleCollabSS={handleCollabSS}
          toggleScreenShare={toggleScreenShare}
          isWhiteBoardActive={isWhiteBoardActive}
          annotationCanvasState={annotationCanvasState}
          localParticipant={localParticipant}
        />


        <button
          className="text-xs bg-gray-300 p-2 px-5 rounded-full mx-1"
          disabled={isScreenShareActive}
          onClick={toggleWhiteBoard}
        >
          {!isWhiteBoardActive ? (
            <WhiteBoard style={{ height: 20 }} />
          ) : (
            <WhiteBoardOff style={{ height: 20 }} />
          )}
        </button>
        <button
          className="text-xs bg-gray-300 p-2 px-5 rounded-full mx-1"
          onClick={handleLeaveStage}
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

        <button
          className="text-xs bg-gray-300 p-2 px-5 rounded-full mx-1"
          onClick={() => setOpenVirtualBgPanel((prev) => !prev)}
          disabled={openVirtualBgPanel}
        >
          <VideoBG style={{ height: 20 }} />
        </button>
        <VirtualBackgroundSelector
          toggleBackground={toggleBackground}
          isOpen={openVirtualBgPanel}
          setIsOpen={setOpenVirtualBgPanel}
        />
        <div className="relative left-40 zIndex-30">
          {isWhiteBoardActive && (
            <>
              <button
                className="text-xs bg-gray-300 p-2 px-5 rounded-full mx-1"
                onClick={previousPage}
              >
                {'<'}
              </button>
              <span>Page: {currentPageIndex + 1}</span>
              <button
                className="text-xs bg-gray-300 p-2 px-5 rounded-full mx-1"
                onClick={nextPage}
              >
                {'>'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
