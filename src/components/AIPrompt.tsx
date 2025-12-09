"use client";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useState } from "react";
import { Dialog, DialogClose, DialogContent,  DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { MagicWandIcon } from "@radix-ui/react-icons";
import { EllipsisVertical, Info, LockKeyhole } from "lucide-react";
import { Badge } from "./ui/badge";

export const AIPrompt = () => {
  const [selectedOption, setSelectedOption] = useState('chatgpt')
  const [prompt, setPrompt] = useState('')
  const [key, setKey] = useState('')
  const promptSamples = [
    'Lorem Ipsum is simply dummy text of the printing1',
    'Lorem Ipsum is simply dummy text of the printing2',
    'Lorem Ipsum is simply dummy text of the printing3',
    'Lorem Ipsum is simply dummy text of the printing4',
    'Lorem Ipsum is simply dummy text of the printing5',
  ]
  return (
    <div data-testid="chat-container" className="flex flex-col items-center justify-center py-10 px-10 ">
        <h3 className="text-center text-4xl  font-thin">
          Do anything on   {" "}
          <span className="bg-gradient-to-b from-primary/60 to-primary text-transparent dark:text-primary-light bg-clip-text">
            the Grid ...
          </span>
        </h3>
        
        <div className="flex flex-row items-center justify-center w-full space-x-2 mb-0">
            <Input
            placeholder="Add a prompt, select LLM and configure API Key....."
            className="bg-card text-card-foreground "
            aria-label="prompt"
            value={prompt}
            onChange={ (e) => setPrompt(e.target.value)}
          />
           
          <Select onValueChange={value => setSelectedOption(value)} defaultValue="chatgpt">
              <SelectTrigger className="w-32px text-thin bg-card text-card-foreground mx-0">
                <SelectValue className="text-thin" placeholder="Choose an LLM" />
              </SelectTrigger>    
              <SelectContent >
                <SelectGroup>
                  <SelectItem className="hover:bg-primary-light" value="chatgpt">ChatGPT</SelectItem>
                  <SelectItem className="hover:bg-primary-light" value="claude">Claude</SelectItem>
                  <SelectItem className="hover:bg-primary-light" value="grok">Grok</SelectItem>
                  <SelectItem className="hover:bg-primary-light" value="perplexity">Perplexity</SelectItem>
                </SelectGroup>
              </SelectContent>
          </Select>
          <Dialog >         
             <DialogTrigger>
            <EllipsisVertical className="text-card-foreground" size={20}/>
             </DialogTrigger>
             <DialogContent data-testid="chat-dialog" className="flex flex-col items-center justify-center bg-card text-card-foreground ">
                  <DialogTitle>Create a connection </DialogTitle>
                  <Input placeholder="api_key" value={key} onChange={(e) => setKey(e.target.value)}></Input>
                  <DialogClose><Button data-testid="chat-connect-to-model" >Save</Button></DialogClose>
             </DialogContent>
          </Dialog>
           {key != '' && <Button data-testid="chat-button" variant="default" className="my-4 btn btn-xs mx-0 bg-primary dark:bg-primary-light text-white"><MagicWandIcon/></Button>}
           {key == '' && <Button disabled data-testid="chat-button" variant="default" className="my-4 btn btn-xs mx-0 bg-primary dark:bg-primary-light text-white "><MagicWandIcon/></Button>}

        </div>
   
         <div className="flex flex-row flex-wrap items-center justify-center w-full space-x-2 space-y-2 mt-4">
          {promptSamples.map( (promptText,index) => (

             prompt == promptText ? (

              <Badge key={index} variant="outline" className="bg-primary-light" 
              onClick={(e) => setPrompt(promptText)}>
                {promptText}
              </Badge>
             ) : (
              <Badge key={index} variant="outline" className="bg-muted px-2 hover:border-white" 
              onClick={(e) => setPrompt(promptText)}>
                {promptText}
              </Badge>
             )
          ))}
         </div>
      </div>
  );
};
