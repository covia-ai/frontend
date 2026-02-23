import { useEffect, useState } from "react";
import { Asset, Venue } from "@covia/covia-sdk";
import { useStore } from "zustand";
import { useVenue } from "@/hooks/use-venue";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTrigger } from "./ui/dialog";
import { ScrollArea, ScrollBar } from "./ui/scroll-area";

export const CsvViewer = (props:any) => {
   const venueObj = useStore(useVenue, (x) => x.currentVenue);
   const venue = new Venue({baseUrl:venueObj?.baseUrl, venueId:venueObj?.venueId, name:venueObj?.metadata.name})
  
   const [headers, setHeaders] = useState<string[]>([]);
   const [dataRows, setRowData] = useState<string[][]>();

   const parseCSV = (csv: string) => {
    const lines = csv.trim().split('\n');
    return lines.map(line => line.split(',').map(val => val.trim()));
   };

  
   useEffect(() => { 
     
      venue.getContent(props.assetId).then((response) => {
        
        response?.getReader().read().then(({done, value}) => {
          const decoder = new TextDecoder();
          const result = decoder.decode(value);
          const rows = parseCSV(result);
          setHeaders(rows[0]);
          setRowData(rows.slice(1));
      });
      
      })
    },[])

    
  return (
 <Dialog>
  <DialogTrigger className="h-8 text-sm text-secondary dark:text-secondary-light underline">
    View
  </DialogTrigger>
  <DialogContent className="bg-card text-card-foreground max-h-[90vh] w-full max-w-4xl p-0 flex flex-col items-center">
    <DialogHeader className="px-6 pt-2 pb-2">
      CSV Data
    </DialogHeader>
    
    <ScrollArea className="h-[500px] w-11/12 ounded-md [&>[data-radix-scroll-area-viewport]>div]:!block  m-2 border border-slate-100 rounded-md">
      <div className="px-6 pb-6">
        
        <Table>
          <TableHeader className="sticky top-0 bg-background z-10">
            <TableRow>
              {headers.map((header, index) => (
                <TableHead key={index} className="font-semibold whitespace-nowrap">
                  {header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {dataRows?.map((row, rowIndex) => (
              <TableRow key={rowIndex}>
                {row.map((cell, cellIndex) => (
                  <TableCell key={cellIndex} className="whitespace-nowrap">
                    {cell}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <ScrollBar orientation="horizontal" className=""/>
     <ScrollBar orientation="vertical" className=""/>
    </ScrollArea>
  </DialogContent>
</Dialog>
  );
}