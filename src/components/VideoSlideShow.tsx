import ReactPlayer from 'react-player'
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"

export const VideoSlideShow = () => {
    const demoVideos = [
       "https://www.youtube.com/embed/b0HwKymJbnA?si=w5aKxeNECLn5JuAE",
       "https://www.youtube.com/embed/5FtCG8bYS3w?si=2_cTwJ--Psoil98s"
    ]
    return (
       <div className="w-full max-w-4xl mx-auto space-y-8">
      {/* Carousel */}
      <div className="relative group">
        <Carousel className="w-10/12" opts={{ align: "center", loop: true }}>
          <CarouselContent className="m-0">
            {demoVideos.map((video,index) => (
              <CarouselItem key={index} className="pl-0">
                <div className="flex justify-center">
                  <div className="relative w-full max-w-2xl aspect-video  rounded-lg overflow-hidden">
                    {/* Video */}
                    <ReactPlayer url={video} className="w-full h-full object-cover " controls preload="metadata" />
                  </div>
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>

          {/* Navigation Buttons - positioned on sides */}
          <CarouselPrevious className="absolute left-10 top-1/2 -translate-y-1/2 -translate-x-16 md:-translate-x-20 h-12 w-12 border-secondary bg-secondary  text-secondary-foreground transition-all" />
          <CarouselNext className="absolute right-10 top-1/2 -translate-y-1/2 translate-x-16 md:translate-x-20 h-12 w-12 border-secondary  bg-secondary text-secondary-foreground transition-all" />
        </Carousel>
      </div>

      
    </div>
    )
}