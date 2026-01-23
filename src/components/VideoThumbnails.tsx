"use client"

import { Play } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/Navigation";
export const VideoThumbnails = () => {
  const router = useRouter()
  const [selectedVideo, setSelectedVideo] = useState(null);
  const videos = [
    { id: 'b0HwKymJbnA', title: 'Covia.ai App Demo showing federated orchestration' },
    { id: '5FtCG8bYS3w', title: 'Covia.ai Venue Operation with Gemini Demo' },
    { id: 'qgfCdKwG4Rs', title: 'Covia.ai multi-agent coordination and agentic economics' },
  ];
    return (
        <div className="flex flex-row items-center space-x-4">
          {videos.map((video, index) => (
            <div
              key={video.id}
              className={` bg-card dark:bg-white text-card-foreground  p-4 pb-8 rounded-md dark:shadow-slate-100/50 shadow-2xl cursor-pointer group transition-all duration-300 hover:scale-105 hover:shadow-3xl
                ${index === 1 ? 'w-80 md:w-80 h-68' : 'w-64 md:w-64 h-60 '}
              `}
              onClick={() => router.push(`https://www.youtube.com/watch?v=${video.id}`)}
            >
              {/* Thumbnail */}
              <div className="relative aspect-video  overflow-hidden rounded-md">
                <img
                
                  src={`https://img.youtube.com/vi/${video.id}/maxresdefault.jpg`}
                  alt={video.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  onError={(e) => {
                    e.target.src = `https://img.youtube.com/vi/${video.id}/hqdefault.jpg`;
                  }}
                />
                
                {/* Play Overlay */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                  <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center shadow-xl">
                    <Play size={28} className="text-white fill-white ml-1" />
                  </div>
                </div>
              </div>
              
              {/* Caption */}
              <div className="mt-1 text-center">
                <p className="text-gray-700 font-thin text-md">{video.title}</p>
              </div>
            </div>
          ))}
        </div>

    )
}