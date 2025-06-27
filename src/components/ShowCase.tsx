"use client";

import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel"
import { Card, CardContent, CardFooter } from "./ui/card";
import Autoplay from "embla-carousel-autoplay"
import { Button } from "./ui/button";
import Ops from "@/data/operations.json"
import { OperationDetails } from "@/config/types";

export const ShowCase = () => {
 
  const opsData: OperationDetails[] = Ops;
  
  return (
    <section id="newsletter">
      <div className=" py-24 sm:py-32 justify-center items-center bg-slate-100 px-10 lg:px-0 md:px-0">
        <h3 className="text-center text-4xl md:text-5xl font-bold lg:px-10 md:px-10">
        See what you can {" "}
          <span className="bg-gradient-to-b from-primary/60 to-primary text-transparent bg-clip-text">
            create
          </span>
        </h3>
        <p className="text-xl text-muted-foreground text-center mt-4 mb-8">
          Lorem ipsum dolor sit amet consectetur.
        </p>

        <Carousel
        opts={{ loop: true }}
        plugins={[
          Autoplay({
            delay: 4000,
          }),
        ]}
        >
        <CarouselContent className="">
                {opsData.map((op) => ( 

                  <CarouselItem key={op.id} className="md:basis-1/3 lg:basis-1/4  ">
                    <div className='p-1 '>
                      <Card className="w-64">
                        <CardContent className="flex flex-col items-center justify-center aspect-square">
                          <div className="text-lg font-semibold text-center">{op.name}</div>
                          <p className="text-md text-muted-foreground text-center mt-4 mb-8">
                           {op.description}
                          </p>
                        </CardContent>
                        <CardFooter className="flex flex-col itemsitems-center justify-center text-sm"> <Button>Execute this operation </Button></CardFooter>
                      
                      </Card>
                </div>
                </CarouselItem>

              ))}
         
        </CarouselContent>
       
      </Carousel>
       


      </div>
      <hr className="w-11/12 mx-auto" />
    </section>
  );
};
