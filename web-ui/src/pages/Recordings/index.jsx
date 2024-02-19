import React, { useEffect, useRef } from 'react';
import StreamVideo from '../Channel/Player/StreamVideo';
import LocalMediaProvider from '../ClassRoom/contexts/LocalMediaContext';
import BroadcastProvider from '../ClassRoom/contexts/BroadcastContext';
import StageProvider from '../ClassRoom/contexts/StageContext';
import { Provider as NotificationProvider } from '../../contexts/Notification';
import { Provider as PollProvider } from '../../contexts/StreamManagerActions/Poll';
import { Provider as ChatProvider } from '../../contexts/Chat';
import { MediaCanvasProvider } from '../ClassRoom/hooks/useMediaCanvas.js';
import ReactPlayer from 'react-player';
import { useState } from 'react';
import { Play } from '../../assets/icons/index.js';

export default function App() {
  const [videoUrl, setVideoUrl] = useState('');
  const [playbackUrl, setPlaybackUrl] = useState('');

  return (
    <div className="grid gap-6 m-20 justify-center">
      <div>
        <label
          for="first_name"
          class="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
        >
          URL:
          <input
            className="w-80 ml-2"
            type="text"
            id="first_name"
            class="bg-gray-50 ring-gray-500 border border-gray-500 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
            value={videoUrl}
            onChange={(e) => {
              setVideoUrl(e.target.value);
            }}
          />
          <button
            className="float-right relative bottom-10"
            onClick={() => setPlaybackUrl(videoUrl)}
          >
            <Play />
          </button>
        </label>
      </div>
      {/* <div className="w-80 x-scroll">
        Eg:
        https://d3kw8stie17haj.cloudfront.net/ivs/v1/056897565140/oQBhCt3cexDy/2024/2/14/11/43/1FTrixZAMTEV/media/hls/master.m3u8
      </div> */}
      <ReactPlayer
        url={playbackUrl}
        controls
        width="640px"
        height="360px"
        playing
        config={{
          hls: {
            withCredentials: false
          }
        }}
      />
    </div>
  );
}
