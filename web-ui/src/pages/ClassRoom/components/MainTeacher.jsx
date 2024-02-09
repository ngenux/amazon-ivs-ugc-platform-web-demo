import React,{useEffect,useState,useRef} from 'react';
import { useMediaCanvas } from '../hooks/useMediaCanvas.js';
const aspectRatio=16/9
export default function MainTeacher() {
  const {
    isSmall,
    isWhiteBoardActive,
    displayRef,
    whiteboardRef,
    screenShareVideoRef
    // displayMouseDown,
    // displayMouseMove, //Uncomment these for draggable small video.
    // displayMouseUp
  } = useMediaCanvas();
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const containerRef = useRef(null);

  useEffect(() => {
    const updateCanvasSize = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.offsetWidth;
        const height = containerWidth / aspectRatio; // Maintain aspect ratio
        setDimensions({ width: containerWidth, height });
    
      }
    };

    window.addEventListener('resize', updateCanvasSize);
    updateCanvasSize();

    return () => window.removeEventListener('resize', updateCanvasSize);
  }, []);

  return (
    <div className="h-full">
      <div className="h-full ">
        <div className="w-full h-full" ref={containerRef}>
          
          <canvas
            ref={displayRef}
            // onMouseDown={displayMouseDown}
            // onMouseMove={displayMouseMove}  //Uncomment these for draggable small video.
            // onMouseUp={displayMouseUp}
            // onMouseLeave={displayMouseUp}
            width={1280}
            height={720}
            style={{
              height: dimensions.height,
              width: dimensions.width,
              display: isWhiteBoardActive || isSmall ? 'none' : 'block',
              
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
          <video
            ref={screenShareVideoRef}
            autoPlay
            style={{
              display: !isSmall || isWhiteBoardActive ? 'none' : 'block',
              height: dimensions.height,
              width: dimensions.width,
              objectFit:'fill'
            }}
          >
            <track kind="captions" ></track>
          </video>
        </div>
      </div>
    </div>
  );
}
