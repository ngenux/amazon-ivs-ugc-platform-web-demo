import React, { useEffect, useRef } from 'react';
import SharedCanvas from './SharedCanvas.jsx';
const { StreamType } = window.IVSBroadcastClient;
export default function MainTeacher({
  chatConfig,
  activeUser,
  dimensions,
  localParticipant,
  remoteParticipant,
  focusedParticipantId,
  mediaConfig
}) {
  const {
    isSmall,
    isWhiteBoardActive,
    displayRef,
    whiteboardRef,
    screenShareVideoRef
  } = mediaConfig;
  const { annotationCanvasState } = chatConfig;
  const remoteVideoRef = useRef(null);

  useEffect(() => {
    if (
      remoteParticipant &&
      (remoteParticipant?.id === annotationCanvasState?.participantId ||
        remoteParticipant?.id === focusedParticipantId)
    ) {
      const videoStream = remoteParticipant?.streams?.find(
        (stream) => stream.streamType === StreamType.VIDEO
      );
      if (remoteVideoRef.current && videoStream) {
        const stream = new MediaStream([videoStream.mediaStreamTrack]);
        remoteVideoRef.current.srcObject = stream;
      }
    }
  }, [remoteParticipant]);

  return (
    <div className="h-full">
      <div className="h-full ">
        <div className="w-full h-full relative">
          {/* {JSON.stringify(localParticipant)} */}
          <canvas
            ref={displayRef}
            width={1280}
            height={720}
            style={{
              height: dimensions.height,
              width: dimensions.width,
              display:
                isWhiteBoardActive ||
                isSmall ||
                annotationCanvasState.open ||
                !!focusedParticipantId
                  ? 'none'
                  : 'block'
            }}
          />
          {isWhiteBoardActive && (
            <canvas
              ref={whiteboardRef}
              width={1280}
              height={720}
              style={{
                height: '100%',
                width: '100%',
                borderWidth: 1
              }}
            />
          )}
          {annotationCanvasState.open &&
            annotationCanvasState.participantId !== localParticipant?.id && (
              <video
                ref={remoteVideoRef}
                autoPlay
                style={{
                  display: !annotationCanvasState.open ? 'none' : 'block',
                  height: dimensions.height,
                  width: dimensions.width,
                  objectFit: 'fill'
                }}
              >
                <track kind="captions"></track>
              </video>
            )}
          {!!focusedParticipantId &&
            focusedParticipantId !== localParticipant?.id && (
              <video
                ref={remoteVideoRef}
                autoPlay
                style={{
                  display: !focusedParticipantId ? 'none' : 'block',
                  height: dimensions.height,
                  width: dimensions.width,
                  objectFit: 'fill'
                }}
              >
                <track kind="captions"></track>
              </video>
            )}

          <video
            ref={screenShareVideoRef}
            autoPlay
            style={{
              display: !isSmall || isWhiteBoardActive || !!remoteParticipant?.id ? 'none' : 'block',
              height: dimensions.height,
              width: dimensions.width,
              objectFit: 'fill'
            }}
          >
            <track kind="captions"></track>
          </video>
          {annotationCanvasState.open ? (
            <SharedCanvas
              {...chatConfig}
              activeUser={activeUser}
              dimensions={dimensions}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
