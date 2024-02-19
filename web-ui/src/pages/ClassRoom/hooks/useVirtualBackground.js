import { SelfieSegmentation } from '@mediapipe/selfie_segmentation';
import { useCallback, useEffect, useRef, useState } from 'react';
const Image1 =
  'https://www.wework.com/ideas/wp-content/uploads/sites/4/2020/04/WeWork_CommonArea_Kitchen-scaled.jpg';

const useVirtualBackground = (videoStream, isSmall) => {
  const [isVirtualBgActive, setIsVirtualBgActive] = useState(false);
  const [activeVirtualBg, setActiveVirtualBg] = useState(Image1);
  const [virtualBgMode, setVirtualBgMode] = useState('blur');
  const virtualBgRef = useRef(null);
  const contextRef = useRef(null);
  const backgroundImageRef = useRef(null);
  const canvasStreamRef = useRef(null);
  const animationFrameIdRef = useRef();
  const selfieSegmentationRef = useRef();
  try {
    selfieSegmentationRef.current = new SelfieSegmentation({
      locateFile: (file) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`
    });
  } catch (error) {
    console.error('Error initializing SelfieSegmentation', error);
  }

  const onResults = useCallback(
    (results) => {
      try {
        const canvas = virtualBgRef.current;
        const context = virtualBgRef.current.getContext('2d');
        if (!canvas || !context) return;

        context.clearRect(0, 0, canvas.width, canvas.height);

        if (isVirtualBgActive) {
          context.drawImage(
            results.segmentationMask,
            0,
            0,
            canvas.width,
            canvas.height
          );
          context.globalCompositeOperation = 'source-out';
          if (virtualBgMode === 'image') {
            context.drawImage(
              backgroundImageRef.current,
              0,
              0,
              canvas.width,
              canvas.height
            );
          } else if (virtualBgMode === 'blur') {
            context.filter = 'blur(10px)';
            context.drawImage(results.image, 0, 0, canvas.width, canvas.height);
            context.filter = 'none';
          }
          context.globalCompositeOperation = 'destination-atop';
        }

        context.drawImage(results.image, 0, 0, canvas.width, canvas.height);
      } catch (error) {
        console.error('Error processing video frame', error);
      }
    },
    [isVirtualBgActive, virtualBgMode]
  );

  useEffect(() => {
    if (!videoStream) {
      return;
    }

    const videoElement = document.createElement('video');
    try {
      videoElement.srcObject = videoStream;
      videoElement.play();
    } catch (error) {
      console.error('Error playing video stream', error);
    }

    const sendToMediaPipe = async () => {
      try {
        if (videoElement.readyState >= 2) {
          await selfieSegmentationRef.current.send({ image: videoElement });
        }
        animationFrameIdRef.current = requestAnimationFrame(sendToMediaPipe);
      } catch (error) {
        console.error('Error sending frame to MediaPipe', error);
      }
    };

    try {
      backgroundImageRef.current = new Image();
      backgroundImageRef.current.crossOrigin = 'anonymous';
      backgroundImageRef.current.src = activeVirtualBg;
      backgroundImageRef.current.onload = () => {
        try {
          selfieSegmentationRef.current.setOptions({
            modelSelection: 1,
            selfieMode: false
          });
          selfieSegmentationRef.current.onResults(onResults);
          sendToMediaPipe();
        } catch (error) {
          console.error('Error setting up SelfieSegmentation', error);
        }
      };

      contextRef.current = virtualBgRef.current.getContext('2d');

      canvasStreamRef.current = virtualBgRef.current.captureStream(30);
    } catch (error) {
      console.error('Error setting up virtual background', error);
    }

    return () => {
      try {
        videoElement.pause();
        videoElement.srcObject = null;
        if (animationFrameIdRef.current) {
          cancelAnimationFrame(animationFrameIdRef.current);
        }
      } catch (error) {
        console.error('Error cleaning up', error);
      }
    };
  }, [activeVirtualBg, videoStream, onResults, isSmall]);

  const toggleBackground = useCallback(
    (active, bgUrl, bgMode) => {
      try {
        setIsVirtualBgActive(active);
        setActiveVirtualBg(bgUrl || Image1);
        setVirtualBgMode(bgMode);
      } catch (error) {
        console.error('Error toggling background', error);
      }
    },
    [isVirtualBgActive, activeVirtualBg, virtualBgMode]
  );

  return {
    toggleBackground,
    isVirtualBgActive,
    virtualBgRef,
    virtualBgStream: canvasStreamRef.current,
    activeVirtualBg,
    virtualBgMode
  };
};

export default useVirtualBackground;
