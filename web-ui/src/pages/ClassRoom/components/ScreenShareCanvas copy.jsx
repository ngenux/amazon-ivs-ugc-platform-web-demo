import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Layer, Line, Stage, Rect, Image } from 'react-konva';
import ColorPickerModal from './ColorPicker';
import useDebouncedEventQueue, {
  convertStringToJSON
} from './useDebouncedEventQueue';
const maxQueueSize = 40;
const initialCanvasState = {
  userLines: {},
  undoStacks: {},
  redoStacks: {}
};
const aspectRatio = 16 / 9;
const referenceDimensions = {
  width: 1000,
  height: 800
};
const baseStrokeWidth = 5;

async function captureScreen() {
  try {
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: true
    });
    return stream;
  } catch (err) {
    console.error('Error capturing screen:', err);
  }
}
function createVideoElement(stream) {
  const video = document.createElement('video');
  video.srcObject = stream;
  video.play(); // Start playing the video to ensure it's ready to be drawn
  return video;
}

const SharedCanvas = ({
  activeUser,
  sendDrawEvents,
  registerDrawingEventHandler
}) => {
  const [canvasState, setCanvasState] = useState(initialCanvasState);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [selectedColor, setSelectedColor] = useState('#df4b26');
  const [aspectRatio, setAspectRatio] = useState(getAspectRatio());

  const containerRef = useRef(null);
  const isDrawingRef = useRef(false);
  const imageRef = useRef(null);
  const videoRef = useRef(null);

  const scaleFactorRef = useRef({
    x: 0,
    y: 0
  });

  const commonMultiplier =
    (scaleFactorRef.current.x + scaleFactorRef.current.y) / 2;

  const adjustedStrokeWidth = baseStrokeWidth * commonMultiplier;

  const queueEvent = useDebouncedEventQueue(
    activeUser,
    maxQueueSize,
    sendDrawEvents
  );
  function getAspectRatio() {
    const width = screen.width;
    const height = screen.height;
    return (width / height).toFixed(2); // Keeping two decimal places for simplicity
  }
  useEffect(() => {
    const updateCanvasSize = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.offsetWidth;
        const height = containerWidth / aspectRatio; // Maintain aspect ratio
        setDimensions({ width: containerWidth, height });
        scaleFactorRef.current = {
          x: +(containerWidth / referenceDimensions.width).toFixed(3),
          y: +(height / referenceDimensions.height).toFixed(3)
        };
      }
    };

    window.addEventListener('resize', updateCanvasSize);
    updateCanvasSize();

    return () => window.removeEventListener('resize', updateCanvasSize);
  }, []);

  useEffect(() => {
    const handleDrawingEvent = (message) => {
      const data =
        message?.includes('UNDO') || message?.includes('REDO')
          ? JSON.parse(message)
          : convertStringToJSON(message);
      if (data.action === 'DRAW_EVENTS' && activeUser !== data.user) {
        console.log('DRAW_USER', activeUser, data.user);
        handleIncomingDrawEvent(data);
      } else if (data.action === 'UNDO') {
        performUndo(data.user);
      } else if (data.action === 'REDO') {
        performRedo(data.user);
      }
    };

    registerDrawingEventHandler(handleDrawingEvent);

    return () => registerDrawingEventHandler(null);
  }, [registerDrawingEventHandler, sendDrawEvents]);

  // useEffect(() => {
  //   captureScreen().then((stream) => {
  //     const videoElement = createVideoElement(stream);
  //     videoRef.current = videoElement;

  //     videoElement.onloadedmetadata = () => {
  //       // Force update the Konva Image once the video is ready
  //       imageRef.current.getLayer().batchDraw();
  //     };
  //     const trackLabel = stream.getVideoTracks()[0].label;
  //     console.log('trackLabel '+trackLabel)

  //     // Infer the source type from the track label (not reliable across all browsers)
  //     if (trackLabel.toLowerCase().includes('entire screen')) {
  //       console.log('User is sharing the entire screen.');
  //     } else if (trackLabel.toLowerCase().includes('window')) {
  //       console.log('User is sharing a window.');
  //     } else if (trackLabel.toLowerCase().includes('tab')) {
  //       console.log('User is sharing a browser tab.');
  //     } else {
  //       console.log('Could not determine the source type.');
  //     }
  //   });
  // }, []);

  // useEffect(() => {
  //   const anim = new Konva.Animation((frame) => {
  //     // This will get called on every frame and will trigger a redraw of the Konva.Image
  //     if (imageRef.current) {
  //       imageRef.current.getLayer().batchDraw();
  //     }
  //   }, imageRef.current?.getLayer());

  //   anim.start();

  //   return () => anim.stop();
  // }, []);

  const handleIncomingDrawEvent = useCallback(
    (data) => {
      console.log('handleIncomingDrawEvent', data);
      data.events.forEach((event) => {
        setCanvasState((prevCanvasState) => {
          const userLines = prevCanvasState.userLines[data.user] || [];
          let newLines;
          if (event.type === 'mousedown') {
            console.log('mousedown', event, scaleFactorRef.current);

            newLines = [
              ...userLines,
              {
                tool: 'pen',
                points: [
                  parseInt(event.x * scaleFactorRef.current.x),
                  parseInt(event.y * scaleFactorRef.current.y)
                ],
                color: event.color || '#000'
              }
            ];
          } else if (event.type === 'mousemove') {
            console.log('mousemove', event, scaleFactorRef.current);

            newLines = userLines.map((line, index) =>
              index === userLines.length - 1
                ? {
                    ...line,
                    points: line.points.concat([
                      parseInt(event.x * scaleFactorRef.current.x),
                      parseInt(event.y * scaleFactorRef.current.y)
                    ])
                  }
                : line
            );
          } else if (event.type === 'mouseup') {
            newLines = [...userLines];
            updateUndoStacks(data.user, newLines);
          }

          return {
            ...prevCanvasState,
            userLines: { ...prevCanvasState.userLines, [data.user]: newLines }
          };
        });
      });
    },
    [setCanvasState, selectedColor, scaleFactorRef]
  );

  const handleMouseDown = useCallback(
    (e) => {
      const currentUser = activeUser;
      isDrawingRef.current = true;

      setCanvasState((prevCanvasState) => {
        const newUserLines = [
          ...(prevCanvasState.userLines[currentUser] || []),
          {
            tool: 'pen',
            points: [e.evt.layerX, e.evt.layerY],
            color: selectedColor || '#000000'
          }
        ];

        return {
          ...prevCanvasState,
          userLines: {
            ...prevCanvasState.userLines,
            [currentUser]: newUserLines
          }
        };
      });
      console.log('scaleFactorRef', scaleFactorRef);
      queueEvent({
        type: 'mousedown',
        x: parseInt(e.evt.layerX / scaleFactorRef.current.x),
        y: parseInt(e.evt.layerY / scaleFactorRef.current.y),
        user: currentUser,
        color: selectedColor || '#000000'
      });
    },

    [activeUser, setCanvasState, selectedColor, dimensions, scaleFactorRef]
  );

  const handleMouseMove = useCallback(
    (e) => {
      if (!isDrawingRef.current) return;
      const currentUser = activeUser;

      setCanvasState((prevCanvasState) => {
        const currentUserLines = prevCanvasState.userLines[currentUser] || [];
        if (currentUserLines.length === 0) {
          return prevCanvasState;
        }

        const lastLineIndex = currentUserLines.length - 1;
        const lastLine = currentUserLines[lastLineIndex];
        const newPoints = lastLine.points.concat([e.evt.layerX, e.evt.layerY]);

        const newUserLines = {
          ...prevCanvasState.userLines,
          [currentUser]: [
            ...currentUserLines.slice(0, lastLineIndex),
            { ...lastLine, points: newPoints }
          ]
        };

        return {
          ...prevCanvasState,
          userLines: newUserLines
        };
      });
      console.log('scaleFactorRef', scaleFactorRef);

      queueEvent({
        type: 'mousemove',
        x: parseInt(e.evt.layerX / scaleFactorRef.current.x),
        y: parseInt(e.evt.layerY / scaleFactorRef.current.y),
        user: currentUser
      });
    },
    [activeUser, setCanvasState, dimensions, scaleFactorRef]
  );

  const handleMouseUp = useCallback(() => {
    isDrawingRef.current = false;
    const currentUser = activeUser;
    setTimeout(() => {
      setCanvasState((prevCanvasState) => {
        const userLines = prevCanvasState.userLines[currentUser] || [];
        if (!userLines.length) return prevCanvasState;

        const userUndoStacks = prevCanvasState.undoStacks[currentUser] || [];
        const newUserUndoStacks =
          userUndoStacks.length >= 5
            ? userUndoStacks.slice(1).concat([userLines])
            : userUndoStacks.concat([userLines]);

        return {
          ...prevCanvasState,
          userLines: {
            ...prevCanvasState.userLines,
            [currentUser]: []
          },
          undoStacks: {
            ...prevCanvasState.undoStacks,
            [currentUser]: []
          },
          redoStacks: {
            ...prevCanvasState.redoStacks,
            [currentUser]: []
          }
        };
      });
    }, 5000);
    updateUndoStacks(currentUser);

    queueEvent({ type: 'mouseup', user: currentUser });
  }, [activeUser, setCanvasState, dimensions]);

  const updateUndoStacks = useCallback(
    (currentUser) => {
      setCanvasState((prevCanvasState) => {
        const userLines = prevCanvasState.userLines[currentUser] || [];
        if (!userLines.length) return prevCanvasState;

        const userUndoStacks = prevCanvasState.undoStacks[currentUser] || [];
        const newUserUndoStacks =
          userUndoStacks.length >= 5
            ? userUndoStacks.slice(1).concat([userLines])
            : userUndoStacks.concat([userLines]);

        return {
          ...prevCanvasState,
          undoStacks: {
            ...prevCanvasState.undoStacks,
            [currentUser]: newUserUndoStacks
          }
        };
      });
    },
    [setCanvasState]
  );

  const performUndo = useCallback(
    (currentUser) => {
      setCanvasState((prevCanvasState) => {
        const userUndoStacks = prevCanvasState.undoStacks[currentUser] || [];

        if (userUndoStacks.length === 0) return prevCanvasState;

        const newStateToUndo = userUndoStacks[userUndoStacks.length - 1];

        const newUserUndoStacks = userUndoStacks.slice(0, -1);

        const newUserRedoStacks = [
          ...(prevCanvasState.redoStacks[currentUser] || []),
          newStateToUndo
        ];

        const linesToSet =
          newUserUndoStacks.length > 0
            ? newUserUndoStacks[newUserUndoStacks.length - 1]
            : [];

        return {
          ...prevCanvasState,
          undoStacks: {
            ...prevCanvasState.undoStacks,
            [currentUser]: newUserUndoStacks
          },
          redoStacks: {
            ...prevCanvasState.redoStacks,
            [currentUser]: newUserRedoStacks
          },
          userLines: {
            ...prevCanvasState.userLines,
            [currentUser]: linesToSet
          }
        };
      });
    },
    [setCanvasState]
  );

  const performRedo = useCallback(
    (currentUser) => {
      setCanvasState((prevCanvasState) => {
        const userRedoStacks = [
          ...(prevCanvasState.redoStacks[currentUser] || [])
        ];
        if (userRedoStacks.length === 0) return prevCanvasState;

        const newStateToRedo = userRedoStacks.pop();

        const newUserUndoStacks = [
          ...(prevCanvasState.undoStacks[currentUser] || []),
          newStateToRedo
        ];

        const newUserLines = {
          ...prevCanvasState.userLines,
          [currentUser]: newStateToRedo
        };

        return {
          ...prevCanvasState,
          undoStacks: {
            ...prevCanvasState.undoStacks,
            [currentUser]: newUserUndoStacks
          },
          userLines: newUserLines,
          redoStacks: {
            ...prevCanvasState.redoStacks,
            [currentUser]: userRedoStacks
          }
        };
      });
    },
    [setCanvasState]
  );

  const handleUndo = useCallback(() => {
    performUndo(activeUser);
    sendDrawEvents(JSON.stringify({ action: 'UNDO', user: activeUser }));
  }, [activeUser, sendDrawEvents]);

  const handleRedo = useCallback(() => {
    performRedo(activeUser);
    sendDrawEvents(JSON.stringify({ action: 'REDO', user: activeUser }));
  }, [activeUser, sendDrawEvents]);

  const handleButtonAction = (action) => {
    console.log(`${action} button clicked`);
    if (action === 'Color') {
      setShowColorPicker(!showColorPicker);
    }
  };

  const handleColorSelect = (color) => {
    setSelectedColor(color);
  };

  return (
    <div className="relative flex justify-center items-center w-full h-full">
      <div
        ref={containerRef}
        className="w-full h-full bg-white shadow-lg rounded-lg overflow-hidden relative border flex items-center justify-center"
      >
        <Stage
          width={dimensions.width}
          height={dimensions.height}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
        >
          <Layer>
            <Image
              ref={imageRef}
              image={videoRef.current}
              width={dimensions.width}
              height={dimensions.height}
            />
            {Object.entries(canvasState.userLines).map(([userId, userLines]) =>
              userLines.map((line, i) => (
                <Line
                  key={`${userId}-${i}`}
                  points={line.points}
                  stroke={line.color || '#df4b26'}
                  strokeWidth={adjustedStrokeWidth}
                  tension={0.5}
                  lineCap="round"
                  globalCompositeOperation="source-over"
                />
              ))
            )}
            {/* {isDrawingRef.current && (
              <Text
                x={mousePosition.x}
                y={mousePosition.y}
                text={activeUser}
                fontSize={14}
                fill="black"
                offsetX={-10}
                offsetY={10}
              />
            )} */}
          </Layer>
        </Stage>

        <div className="absolute inset-x-0 bottom-0 flex justify-center pb-4">
          {/* {canvasState.undoStacks[activeUser] && (
            <button
              className="btn mx-2" 
              onClick={handleUndo}
              disabled={canvasState.undoStacks[activeUser].length === 0}
            >
              Undo
            </button>
          )}
          {canvasState.redoStacks[activeUser] && (
            <button
              className="btn mx-2" 
              onClick={handleRedo}
              disabled={canvasState.redoStacks[activeUser].length === 0}
            >
              Redo
            </button>
          )} */}
        </div>
        <div className="absolute right-0 top-1/2 transform -translate-y-1/2 flex flex-col space-y-2">
          {/* <button
            className="btn" 
            onClick={() => handleButtonAction("Action 1")}
          >
            Pen
          </button>
          <button
            className="btn" 
            onClick={() => handleButtonAction("Action 1")}
          >
            Eraser
          </button> */}
          {/* Screen Aspect Ratio: {aspectRatio} */}
          <button className="btn" onClick={() => handleButtonAction('Color')}>
            Color 1
          </button>
          {showColorPicker && (
            <ColorPickerModal
              selectedColor={selectedColor}
              onSelectColor={handleColorSelect}
              onClose={() => setShowColorPicker(false)}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default SharedCanvas;
